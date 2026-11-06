import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';
import { CHECKLIST_LINE, startFakeUniverse, UNIVERSE_KEY } from './fakeUniverse';

const fake = await startFakeUniverse();
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-universe-'));
delete process.env.UNIVERSE_API_KEY;

const config = await import('../server/config');
const { searchCanonSafe, universe } = await import('../server/universe/client');
const { premiseOf, splitChecklist, syncCatalogue } = await import('../server/universe/catalogue');
const { getSnapshot, listCards } = await import('../server/universe/store');
const { buildLoreQuery, whitelistFor } = await import('../server/universe/terms');
const { SEEDS } = await import('../server/universe/seeds');

config.saveConfig({ ...config.getConfig(), keys: { universe: UNIVERSE_KEY }, universe: { enabled: true, url: fake.url, grant: 'if-ai' } });
afterAll(() => fake.close());

describe('the Edu-Verse catalogue', () => {
  it('holds the Seven Worlds in stage order, six labs and the Homework Portal', () => {
    const worlds = SEEDS.filter((s) => s.kind === 'world');
    expect(worlds.map((s) => s.title.en)).toEqual(['BleepWorld', 'Loopia', 'Textosfera', 'Probabilion', 'Narramagia', 'Fraktalia', 'Sympathos']);
    expect(worlds.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(SEEDS.filter((s) => s.kind === 'lab')).toHaveLength(6);
    expect(SEEDS.filter((s) => s.kind === 'homework').map((s) => s.structure)).toEqual(['homework']);
    expect(new Set(SEEDS.map((s) => s.id)).size).toBe(SEEDS.length);
  });

  it('gives every world a law, a translation home, outcomes, bilingual titles and canon lore terms', () => {
    for (const s of SEEDS) {
      expect(s.law.length).toBeGreaterThan(20);
      expect(s.translation.length).toBeGreaterThan(20);
      expect(s.outcomes.length).toBeGreaterThan(0);
      expect(s.title.pl && s.tagline.pl && s.title.en && s.tagline.en).toBeTruthy();
      // Lore lookups only ever send whitelisted canon terms.
      const whitelist = whitelistFor({ cast: s.cast, loreTerms: s.loreTerms });
      expect(s.loreTerms.every((t) => whitelist.includes(t))).toBe(true);
      // Every authored secret belongs to someone in the cast.
      for (const sec of s.secrets ?? []) expect(s.cast).toContain(sec.npc);
    }
    expect(premiseOf(SEEDS[0])).toMatch(/^Dominant law: The Principle of Utter Chaos/);
    expect(premiseOf(SEEDS[0])).toContain('Translation to our world:');
  });

  it('splits the consistency checklist into its ten rules', () => {
    const items = splitChecklist(CHECKLIST_LINE);
    expect(items).toHaveLength(10);
    expect(items[5]).toBe('Ascension = invitation, never abduction; respect Narrative Integrity.');
  });
});

describe('sync', () => {
  it('freezes every world into a snapshot with the canon it is told in', async () => {
    const cat = await syncCatalogue();
    expect(cat.canonVersion).toBe('2.2.0-EN');
    expect(cat.report.filter((r) => r.status === 'new')).toHaveLength(14);
    expect(cat.report.filter((r) => r.status === 'failed')).toHaveLength(0);

    const cards = listCards();
    expect(cards).toHaveLength(14);
    expect(cards.map((c) => c.kind).slice(0, 8)).toEqual(['world', 'world', 'world', 'world', 'world', 'world', 'world', 'lab']);
    expect(cards.at(-1)!.id).toBe('homework-portal');
    expect(cards[0]).not.toHaveProperty('premise');

    const snap = getSnapshot('world-loopia')!;
    expect(snap.premise).toMatch(/^Dominant law: Time operates in repeating, modifiable loops/);
    expect(snap.checklist).toHaveLength(10);
    expect(snap.sources[0]).toMatchObject({ handle: 'C1', ref: 'EDUVERSE:world-loopia', title: 'Quantum Edu-Verse: Loopia' });
    expect(snap.sources.map((s) => s.ref)).toContain('REF:NARRATIVE_STYLE:safety:privacy_rule');
    expect(snap.sources.map((s) => s.ref)).toContain('REF:SPECIES_IFAIRY:canonical_volume/books/BOOK_10B_PHYSIOLOGY_AND_NATURE/chapters/CH_10B_01_PHYSICAL_FORM/sections/SEC_10B_01_06_visual_identity_and_gender_neutrality');
    // The canon narrator's own persona is not part of the Edu-Verse: IGNIS narrates.
    expect(snap.sources.map((s) => s.ref)).not.toContain('REF:NARRATIVE_STYLE:narrator');
    expect(snap.imageLock?.text).toMatch(/^SUBJECT SPECIES RULE/);
    expect(snap.version).toMatch(/^2\.2\.0-EN#[0-9a-f]{8}$/);
  });

  it('is stable: unchanged canon keeps the version, a canon edit makes a new one', async () => {
    const before = getSnapshot('world-textosfera')!.version;
    expect((await syncCatalogue()).report.find((r) => r.id === 'world-textosfera')!.status).toBe('unchanged');
    fake.setRef('REF:NARRATIVE_STYLE:safety', { text: 'Canon text of REF:NARRATIVE_STYLE:safety, revised.' });
    const row = (await syncCatalogue()).report.find((r) => r.id === 'world-textosfera')!;
    expect(row.status).toBe('changed');
    expect(row.version).not.toBe(before);
  });

  it('fails closed when a canon REF lands on another node, keeping the last good snapshots', async () => {
    const good = getSnapshot('world-sympathos')!.version;
    fake.setRef('REF:FOUNDATIONS:CANON_LOCK', { id: 'FOUNDATIONS:/cross_references' });
    await expect(syncCatalogue()).rejects.toThrow(/expected FOUNDATIONS:\/CANON_LOCK/);
    expect(getSnapshot('world-sympathos')!.version).toBe(good);
    fake.setRef('REF:FOUNDATIONS:CANON_LOCK', { id: 'FOUNDATIONS:/CANON_LOCK' });
  });

  it('serves no snapshot from a catalogue synced before the Edu-Verse', async () => {
    const { writeCatalogue, getCatalogue } = await import('../server/universe/store');
    const cat = getCatalogue()!;
    const old = { ...cat, adventures: { ...cat.adventures, 'saga-1': { ...cat.adventures['world-loopia'], file: 'saga-1@00000000.json' } } };
    fs.mkdirSync(path.join(process.env.DATA_DIR!, 'universe', 'snapshots'), { recursive: true });
    fs.writeFileSync(path.join(process.env.DATA_DIR!, 'universe', 'snapshots', 'saga-1@00000000.json'), JSON.stringify({ id: 'saga-1', kind: 'saga', order: 1 }));
    writeCatalogue(old);
    expect(getSnapshot('saga-1')).toBeNull();
    expect(listCards().map((c) => c.id)).not.toContain('saga-1');
    writeCatalogue(cat);
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
    const snap = getSnapshot('world-probabilion')!;
    const whitelist = whitelistFor(snap);
    const typed = 'my name is Tom 07123456789, I live at 12 Oak Road. Take me to the Golden City and the Złote Miasto Nexus!';
    const terms = buildLoreQuery(snap, null, typed);
    expect(terms).toContain('Golden City');
    expect(terms).toContain('Nexus');
    expect(terms.every((t) => whitelist.includes(t))).toBe(true);
    expect(terms.join(' ')).not.toMatch(/Tom|0712|Oak|name/);
    expect(terms.length).toBeLessThanOrEqual(8);
  });

  it('follow the scene of the previous page and the world anchors', () => {
    const snap = getSnapshot('world-probabilion')!;
    const parent = { scene: { location: 'The Seedfield', present: ['Professor Maybe', 'a stranger called Bob'] } } as any;
    const terms = buildLoreQuery(snap, parent, 'I look around');
    expect(terms).toEqual(expect.arrayContaining(['Seedfield', 'Professor Maybe', 'Logos']));
    expect(buildLoreQuery(snap, null, '')).toEqual(['Logos', 'Etherium']);
    expect(terms.join(' ')).not.toMatch(/Bob/);
  });
});
