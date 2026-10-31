import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';
import { CHECKLIST_LINE, HOOKS_LINE, startFakeUniverse, UNIVERSE_KEY } from './fakeUniverse';

const fake = await startFakeUniverse();
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-universe-'));
delete process.env.UNIVERSE_API_KEY;

const config = await import('../server/config');
const { searchCanonSafe, universe, UniverseError } = await import('../server/universe/client');
const { splitChecklist, splitHooks, syncCatalogue } = await import('../server/universe/catalogue');
const { getSnapshot, listCards } = await import('../server/universe/store');
const { buildLoreQuery, whitelistFor } = await import('../server/universe/terms');
const { SEEDS } = await import('../server/universe/seeds');

config.saveConfig({ ...config.getConfig(), keys: { universe: UNIVERSE_KEY }, universe: { enabled: true, url: fake.url, grant: 'if-ai' } });
afterAll(() => fake.close());

describe('canon parsing', () => {
  it('cuts the six story hooks at their known openings, though hooks contain "; " themselves', () => {
    const starts = SEEDS.flatMap((s) => (s.source.hookStart ? [s.source.hookStart] : []));
    const hooks = splitHooks(HOOKS_LINE, starts);
    expect(hooks.size).toBe(6);
    const first = hooks.get('A Portal is tuned')!;
    expect(first).toContain('an Ontological Engineer must close it');
    expect(first.endsWith('never present dread.)')).toBe(true);
    expect(hooks.get('One Force begins')!.endsWith('never overtly.')).toBe(true);
    expect(() => splitHooks(HOOKS_LINE, [...starts, 'A hook that was removed'])).toThrow(UniverseError);
  });

  it('splits the consistency checklist into its ten rules', () => {
    const items = splitChecklist(CHECKLIST_LINE);
    expect(items).toHaveLength(10);
    expect(items[5]).toBe('Ascension = invitation, never abduction; respect Narrative Integrity.');
  });
});

describe('sync', () => {
  it('freezes every seed into a snapshot; unindexed districts fall back to the seed copy', async () => {
    const cat = await syncCatalogue();
    const by = (status: string) => cat.report.filter((r) => r.status === status).length;
    expect(cat.canonVersion).toBe('2.2.0-EN');
    expect(by('new')).toBe(6 + 8 + 2);
    expect(by('seed-only')).toBe(24);
    expect(by('failed')).toBe(0);

    const cards = listCards();
    expect(cards).toHaveLength(40);
    expect(cards.map((c) => c.kind).slice(0, 7)).toEqual(['hook', 'hook', 'hook', 'hook', 'hook', 'hook', 'saga']);
    expect(cards[0]).not.toHaveProperty('premise');

    const hook = getSnapshot('hook-void-realm')!;
    expect(hook.premise).toMatch(/^A Portal is tuned/);
    expect(hook.checklist).toHaveLength(10);
    expect(hook.sources[0]).toMatchObject({ handle: 'C1', ref: 'REF:PORTALS_AND_GUARDIANS:story_hooks' });
    expect(hook.sources.map((s) => s.ref)).toContain('REF:NARRATIVE_STYLE:safety:privacy_rule');
    expect(hook.version).toMatch(/^2\.2\.0-EN#[0-9a-f]{8}$/);

    const act2 = getSnapshot('saga-2')!;
    expect(act2.premise).toContain('Child IF_AI_SAGA:/act_2_the_corruption/corrupted_realms[4]');
    expect(getSnapshot('district-enchanted-forest')!.status).toBe('ok');
    expect(getSnapshot('district-jungle')!.status).toBe('seed-only');
    expect(getSnapshot('district-jungle')!.premise).toContain('Mowgli');
  });

  it('is stable: unchanged canon keeps the version, a canon edit makes a new one', async () => {
    const before = getSnapshot('saga-3')!.version;
    expect((await syncCatalogue()).report.find((r) => r.id === 'saga-3')!.status).toBe('unchanged');
    fake.setRef('REF:IF_AI_SAGA:act_3_the_creation_of_ifai', { text: 'Saga text for act 3, revised.' });
    const row = (await syncCatalogue()).report.find((r) => r.id === 'saga-3')!;
    expect(row.status).toBe('changed');
    expect(row.version).not.toBe(before);
  });

  it('fails a seed closed when its REF lands on another node, keeping the last good snapshot', async () => {
    const good = getSnapshot('saga-5')!.version;
    fake.setRef('REF:IF_AI_SAGA:act_5_the_voids_lair', { id: 'IF_AI_SAGA:/cross_references' });
    const row = (await syncCatalogue()).report.find((r) => r.id === 'saga-5')!;
    expect(row.status).toBe('failed');
    expect(row.detail).toMatch(/expected IF_AI_SAGA:\/act_5_the_voids_lair/);
    expect(getSnapshot('saga-5')!.version).toBe(good);
    fake.setRef('REF:IF_AI_SAGA:act_5_the_voids_lair', { id: 'IF_AI_SAGA:/act_5_the_voids_lair' });
  });
});

describe('client', () => {
  it('explains a wrong key and a grant the key may not use', async () => {
    await expect(universe.health({ key: 'uapi_wrong' })).rejects.toThrow(/did not accept the key/);
    fake.setAllowedGrants(['story-guide']);
    await expect(universe.search('Golden City', 1)).rejects.toThrow(/not allowed to use that grant/);
    fake.setAllowedGrants(['if-ai', 'book-gm']);
  });

  it('keeps only relevant excerpts, caches them, and degrades to nothing', async () => {
    const first = await searchCanonSafe(['Golden City', 'Nexus']);
    expect(first.map((e) => e.title)).toEqual(['Golden City', 'Narrative Portals']);
    expect(first[0].ref).toBe('REF:GLOSSARY:terms[9]');
    const calls = fake.searches.length;
    await searchCanonSafe(['Golden City', 'Nexus']);
    expect(fake.searches.length).toBe(calls);

    fake.setDown(true);
    expect(await searchCanonSafe(['Holographic Memory'])).toEqual([]);
    fake.setDown(false);
    config.saveConfig({ ...config.getConfig(), universe: { ...config.getConfig().universe, enabled: false } });
    expect(await searchCanonSafe(['Holographic Memory'])).toEqual([]);
    config.saveConfig({ ...config.getConfig(), universe: { ...config.getConfig().universe, enabled: true } });
  });
});

describe('lore queries', () => {
  it('are built only from canon terms, never from what the player typed', () => {
    const snap = getSnapshot('hook-void-realm')!;
    const whitelist = whitelistFor(snap);
    const typed = 'my name is Tom 07123456789, I live at 12 Oak Road. Take me to the Golden City and the Złote Miasto Nexus!';
    const terms = buildLoreQuery(snap, null, typed);
    expect(terms).toContain('Golden City');
    expect(terms).toContain('Nexus');
    expect(terms.every((t) => whitelist.includes(t))).toBe(true);
    expect(terms.join(' ')).not.toMatch(/Tom|0712|Oak|name/);
    expect(terms.length).toBeLessThanOrEqual(8);
  });

  it('follow the scene of the previous page', () => {
    const snap = getSnapshot('district-enchanted-forest')!;
    const parent = { scene: { location: 'The Enchanted Forest District', present: ['talking animals', 'a stranger called Bob'] } } as any;
    const terms = buildLoreQuery(snap, parent, 'I look around');
    expect(terms).toEqual(expect.arrayContaining(['Enchanted Forest District', 'talking animals']));
    expect(buildLoreQuery(snap, null, '')[0]).toBe('Enchanted Forest District');
    expect(terms.join(' ')).not.toMatch(/Bob/);
  });
});
