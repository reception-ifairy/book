import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { MAIN_TALES as TALES, getTale } from '../shared/tales';
import { systemPrompt } from '../server/story/prompts';
import { castFromRows, type TaleCast } from '../server/story/characters';
import { buildSql, characterSystemPrompt } from '../scripts/t1000-characters.mjs';

const content = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'db', 't1000', 'characters.grimm.json'), 'utf8'));

const text = z.string().min(1);
const Dna = z.object({
  source_kind: z.enum(['literature', 'folklore', 'myth', 'historical', 'original']),
  source_variant: text,
  origin_summary: text,
  anchors: z.array(z.object({ kind: text, detail: text, basis: text })).min(1),
  immutable_facts: z.array(text).min(1),
  flexible_elements: z.array(text),
  desire: text,
  need: text,
  blind_spot: text,
  stakes: text,
  relationships: z.array(z.object({ name: text, role: text, tension: text })),
  signature_objects: z.array(z.object({ name: text, function: text, limit: text })).min(1),
  world_rules: z.array(text).min(1),
  arc_end: text,
  continuity_memory: z.array(text),
});
const Voice = z.object({
  point_of_view: text,
  register: text,
  cadence: text,
  speech_signature: z.array(text).min(1),
  body_language: z.array(text).min(1),
  pressure_response: text,
  player_role: text,
  welcome_line: text,
  voice_sample: text,
});
const Character = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: text,
  name_en: text,
  epithet: z.string().nullable(),
  role: z.string().nullable(),
  kind: z.enum(['postac', 'grupa', 'istota', 'obiekt']),
  tale_id: z.string().nullable(),
  arb_character_id: z.number().int().positive().nullable(),
  item_order: z.number().int(),
  dna: z.object({
    genre: z.string().max(50),
    narrative_structure: z.enum(['Linear', 'Non-linear', 'Reverse', 'Circular']),
    core_theme: z.string().max(100),
    emotional_profile: z.record(z.string(), z.number().min(0).max(1)),
    pacing_index: z.number().min(0).max(1),
    protagonist_archetype: z.string().max(100),
    system_prompt: text,
    arb_character_v1: Dna,
  }),
  persona: z.object({ description: text, welcome_message: text, expert: z.string().max(255), arb_voice_v1: Voice }),
});
const Retelling = z.object({
  character_slug: text,
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().max(200),
  retelling_type: z.enum(['alternate_scene', 'sequel', 'role_reversal', 'perspective_shift', 'setting_transplant']),
  canon_anchor: text,
  humour_mechanism: text,
  status: z.enum(['draft', 'review', 'active', 'retired']),
  retelling_json: z.object({
    schema_version: z.literal(1),
    retelling_title: text,
    invented_change: text,
    setting: text,
    scene_goal: text,
    inciting_incident: text,
    comic_contradiction: text,
    absurd_rule: text,
    setup: text,
    escalation: z.array(z.object({ action: text, consequence: text, next_pressure: text })).min(2).max(3),
    punchline: text,
    aftermath: text,
    humour_boundary: text,
    choices: z.array(z.object({ key: text, action: text, consequence: text, state_change: text })),
  }),
});
const Content = z.object({
  characters: z.array(Character),
  relationships: z.array(z.object({ from_slug: text, to_slug: text, role: text, tension: text })),
  retellings: z.array(Retelling),
});

describe('character content (db/t1000/characters.grimm.json)', () => {
  const data = Content.parse(content);
  const slugs = new Set(data.characters.map((c) => c.slug));

  it('follows the ARB blueprint contracts', () => {
    expect(data.characters).toHaveLength(23);
    expect(slugs.size).toBe(data.characters.length);
    expect(new Set(data.retellings.map((r) => r.slug)).size).toBe(data.retellings.length);
  });

  it('covers every main case file with its cast and exactly one active retelling', () => {
    for (const tale of TALES) {
      const cast = data.characters.filter((c) => c.tale_id === tale.id);
      expect(cast.length, tale.id).toBe(tale.cast.length);
      const active = data.retellings.filter((r) => r.status === 'active' && cast.some((c) => c.slug === r.character_slug));
      expect(active, tale.id).toHaveLength(1);
    }
    expect(data.characters.filter((c) => c.tale_id === null).map((c) => c.slug)).toEqual(['ignis']);
    for (const c of data.characters) if (c.tale_id) expect(getTale(c.tale_id), c.slug).toBeTruthy();
  });

  it('links relationships and retellings only to known characters', () => {
    for (const r of data.relationships) {
      expect(slugs.has(r.from_slug), r.from_slug).toBe(true);
      expect(slugs.has(r.to_slug), r.to_slug).toBe(true);
      expect(r.from_slug).not.toBe(r.to_slug);
    }
    for (const r of data.retellings) expect(slugs.has(r.character_slug), r.character_slug).toBe(true);
  });

  it('points at the right ARB counterparts', () => {
    const arb = Object.fromEntries(data.characters.filter((c) => c.arb_character_id).map((c) => [c.slug, c.arb_character_id]));
    expect(arb).toEqual({
      'kapturek-kurierka': 28,
      'wilk-mitm': 29,
      'babcia-serwer': 30,
      'gajowy-sysadmin': 31,
      'kopciuszek-junior': 20,
      'ksiaze-serwer': 21,
      'macocha-ceo': 22,
      'wrozka-kontraktorka': 23,
      'smok-wawelski-ai': 24,
      'skuba-pentester': 25,
      'krol-krak': 26,
    });
  });
});

describe('scripts/t1000-characters.mjs', () => {
  const sql: string = buildSql(content);

  it('writes every row as hex literals inside one transaction', () => {
    expect(sql.startsWith('SET NAMES utf8mb4;\nSTART TRANSACTION;')).toBe(true);
    expect(sql.trimEnd().endsWith('COMMIT;')).toBe(true);
    // No content text ever appears inside quotes: every string literal is X'..hex..'.
    expect(sql.replace(/X'[0-9a-f]*'/g, '')).not.toMatch(/'/);
    expect(sql.match(/INSERT INTO ignis_characters /g)).toHaveLength(23);
    expect(sql.match(/INSERT INTO ignis_character_personas /g)).toHaveLength(23);
    expect(sql.match(/INSERT INTO ignis_character_retellings /g)).toHaveLength(5);
  });

  it('builds the persona prompt from the blueprint template', () => {
    const wolf = content.characters.find((c: any) => c.slug === 'wilk-mitm');
    const retelling = content.retellings.find((r: any) => r.character_slug === 'wilk-mitm');
    const prompt = characterSystemPrompt(wolf, retelling);
    expect(prompt.startsWith('Wcielasz się w Wilk i prowadzisz scenę z perspektywy:')).toBe(true);
    expect(prompt).toContain(retelling.retelling_json.inciting_incident);
    expect(prompt).toContain('Granica humoru:');
  });
});

describe('characters in the story prompt', () => {
  const tale = getTale('wawel-dragon')!;
  const rows = content.characters.map((c: any) => ({
    ...c,
    dna_json: JSON.stringify({ arb_character_v1: c.dna.arb_character_v1 }),
    interaction_style: JSON.stringify({ arb_voice_v1: c.persona.arb_voice_v1 }),
  }));
  const retellings = content.retellings.map((r: any) => ({
    tale_id: content.characters.find((c: any) => c.slug === r.character_slug).tale_id,
    title: r.title,
    retelling_json: JSON.stringify(r.retelling_json),
  }));
  const cache = castFromRows(rows, retellings);
  const cast = cache.get('wawel-dragon') as TaleCast;

  it('groups the registry by tale and leaves the narrator out', () => {
    expect(cache.size).toBe(5);
    expect([...cache.values()].reduce((n, c) => n + c.characters.length, 0)).toBe(22);
    expect(cast.characters.map((c) => c.nameEn)).toEqual(['Skuba', 'King Krak', 'The Princess', 'The Wawel Dragon']);
    expect(cast.setPiece?.title).toBe('Smok bez walidacji danych');
  });

  it('adds a Characters section and an optional set piece, with names in the story language', () => {
    const en = systemPrompt(tale, 'en', 12, cast);
    expect(en).toContain('# Characters');
    expect(en).toContain('- The Princess (naprawdę najlepsza inżynierka)');
    expect(en).toContain('# Optional set piece: "Smok bez walidacji danych"');
    expect(en.indexOf('# Characters')).toBeGreaterThan(en.indexOf('# The tale'));
    expect(en.indexOf('# Characters')).toBeLessThan(en.indexOf('# Before you write'));
    expect(systemPrompt(tale, 'pl', 12, cast)).toContain('- Królewna (naprawdę najlepsza inżynierka)');
  });

  it('leaves the prompt byte-identical without a cast', () => {
    expect(systemPrompt(tale, 'en', 12, null)).toBe(systemPrompt(tale, 'en', 12));
    expect(systemPrompt(tale, 'en', 12, { characters: [], setPiece: null })).toBe(systemPrompt(tale, 'en', 12));
    expect(systemPrompt(tale, 'en', 12)).not.toContain('# Characters');
  });
});
