#!/usr/bin/env node
/**
 * Writes the story characters from db/t1000/characters.grimm.json into the t1000 tables
 * (db/t1000/002_ignis_characters.sql). Prints SQL; pipe it into MariaDB:
 *
 *   node scripts/t1000-characters.mjs | mysql t1000
 *
 * Idempotent: characters are upserted by slug, layers by their keys, so running it again refreshes everything.
 * Every string goes out as a hex literal, so no content can break the SQL.
 * The persona prompt (blueprint: character_system_prompt) is generated from the template in docs/postacie.sql, section 3.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONTENT_FILE = path.join(ROOT, 'db', 't1000', 'characters.grimm.json');
export const PERSONA_MODE = 'grimm';

// The ARB defaults for the technical persona columns (arb_narratoriusz.character_personas, Baba Jaga #69).
const RESPONSE_CONFIGURATION = { format: { structure_type: 'scene', length_preference: 'concise', max_response_length_tokens: 400 }, choices: { mode: 'offer_2_to_4', show_kind: true } };
const AI_PARAMETERS = { core: { temperature: 0.8, top_p: 1, max_tokens: 900 }, memory: { memory_depth: 6 } };

const DEFAULT_BOUNDARY = 'Komizm bierze na cel upór, regułę i sytuację; publiczność od 12 lat, kreskówkowe tarapaty, nikt nie zostaje skrzywdzony na serio.';

const hex = (v) => (v === null || v === undefined ? 'NULL' : `X'${Buffer.from(String(v), 'utf8').toString('hex')}'`);
const json = (v) => hex(JSON.stringify(v));
const num = (v) => (v === null || v === undefined ? 'NULL' : String(Number(v)));
const idOf = (slug) => `(SELECT id FROM ignis_characters WHERE slug = ${hex(slug)})`;

/** The blueprint template (docs/postacie.sql, section 3), filled the way ARB filled it for Baba Jaga. */
export function characterSystemPrompt(c, retelling) {
  const d = c.dna.arb_character_v1;
  const v = c.persona.arb_voice_v1;
  const start = retelling?.retelling_json.inciting_incident ?? 'sytuacji, w której gracz zastaje postać';
  const boundary = retelling?.retelling_json.humour_boundary ?? DEFAULT_BOUNDARY;
  return [
    `Wcielasz się w ${c.name} i prowadzisz scenę z perspektywy: ${v.point_of_view}.`,
    `Mów w rejestrze: ${v.register}. Rytm: ${v.cadence}.`,
    `Kieruj się pragnieniem: ${d.desire} Pod presją: ${v.pressure_response}`,
    `Trzymaj się faktów: ${d.immutable_facts.join(' ')}`,
    `Prawa świata: ${d.world_rules.join(' ')}`,
    `Zacznij od: ${start}`,
    `Odbiorca działa jako: ${v.player_role}.`,
    'Następny etap wybierz na podstawie jego działania, stanu rekwizytów i konsekwencji poprzedniej sceny.',
    'Przygotuj puentę i ujawnij ją dopiero po decyzji, która ją uruchamia.',
    `Granica humoru: ${boundary}`,
  ].join(' ');
}

export function buildSql(content) {
  const retellingOf = (slug) => content.retellings.find((r) => r.character_slug === slug);
  const out = ['SET NAMES utf8mb4;', 'START TRANSACTION;'];

  for (const c of content.characters) {
    out.push(
      'INSERT INTO ignis_characters (slug, name, name_en, epithet, role, kind, tale_id, arb_character_id, status, item_order) VALUES (' +
        [hex(c.slug), hex(c.name), hex(c.name_en), hex(c.epithet), hex(c.role), hex(c.kind), hex(c.tale_id), num(c.arb_character_id), '1', num(c.item_order)].join(', ') +
        ') ON DUPLICATE KEY UPDATE name = VALUES(name), name_en = VALUES(name_en), epithet = VALUES(epithet), role = VALUES(role), kind = VALUES(kind), tale_id = VALUES(tale_id), arb_character_id = VALUES(arb_character_id), status = 1, item_order = VALUES(item_order);',
    );

    const d = c.dna;
    out.push(
      'INSERT INTO ignis_character_dna (character_id, genre, narrative_structure, core_theme, emotional_profile, pacing_index, protagonist_archetype, system_prompt, dna_json, status) SELECT id, ' +
        [hex(d.genre), hex(d.narrative_structure), hex(d.core_theme), json(d.emotional_profile), num(d.pacing_index), hex(d.protagonist_archetype), hex(d.system_prompt), json({ arb_character_v1: d.arb_character_v1 }), '1'].join(', ') +
        ` FROM ignis_characters WHERE slug = ${hex(c.slug)}` +
        ' ON DUPLICATE KEY UPDATE genre = VALUES(genre), narrative_structure = VALUES(narrative_structure), core_theme = VALUES(core_theme), emotional_profile = VALUES(emotional_profile), pacing_index = VALUES(pacing_index), protagonist_archetype = VALUES(protagonist_archetype), system_prompt = VALUES(system_prompt), dna_json = VALUES(dna_json), status = 1;',
    );

    const p = c.persona;
    const prompt = characterSystemPrompt(c, retellingOf(c.slug));
    const voice = { arb_voice_v1: { ...p.arb_voice_v1, character_system_prompt: prompt } };
    out.push(
      'INSERT INTO ignis_character_personas (character_id, mode, description, welcome_message, display_welcome, expert, prompt, ai_parameters, interaction_style, response_configuration, status, item_order) SELECT id, ' +
        [hex(PERSONA_MODE), hex(p.description), hex(p.welcome_message), '1', hex(p.expert), hex(prompt), json(AI_PARAMETERS), json(voice), json(RESPONSE_CONFIGURATION), '1', num(c.item_order)].join(', ') +
        ` FROM ignis_characters WHERE slug = ${hex(c.slug)}` +
        ' ON DUPLICATE KEY UPDATE description = VALUES(description), welcome_message = VALUES(welcome_message), expert = VALUES(expert), prompt = VALUES(prompt), ai_parameters = VALUES(ai_parameters), interaction_style = VALUES(interaction_style), response_configuration = VALUES(response_configuration), status = 1, item_order = VALUES(item_order);',
    );
  }

  for (const r of content.relationships) {
    out.push(
      `INSERT INTO ignis_character_relationships (character_id, other_character_id, role, tension) VALUES (${idOf(r.from_slug)}, ${idOf(r.to_slug)}, ${hex(r.role)}, ${hex(r.tension)})` +
        ' ON DUPLICATE KEY UPDATE role = VALUES(role), tension = VALUES(tension);',
    );
  }

  for (const r of content.retellings) {
    out.push(
      'INSERT INTO ignis_character_retellings (character_id, slug, title, retelling_type, canon_anchor, humour_mechanism, retelling_json, status) SELECT id, ' +
        [hex(r.slug), hex(r.title), hex(r.retelling_type), hex(r.canon_anchor), hex(r.humour_mechanism), json(r.retelling_json), hex(r.status)].join(', ') +
        ` FROM ignis_characters WHERE slug = ${hex(r.character_slug)}` +
        ' ON DUPLICATE KEY UPDATE character_id = VALUES(character_id), title = VALUES(title), retelling_type = VALUES(retelling_type), canon_anchor = VALUES(canon_anchor), humour_mechanism = VALUES(humour_mechanism), retelling_json = VALUES(retelling_json), status = VALUES(status);',
    );
  }

  out.push('COMMIT;');
  return out.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
  console.log(buildSql(content));
}
