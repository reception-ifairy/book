import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { samplePage, startFakeAnthropic } from './fakeAnthropic';
import { startFakeOpenAI } from './fakeOpenAI';
import { ifairyPage, startFakeUniverse, UNIVERSE_KEY } from './fakeUniverse';

const fake = await startFakeAnthropic();
const fakeU = await startFakeUniverse();
const fakeO = await startFakeOpenAI();
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-ifairy-'));
process.env.DATA_DIR = DATA;
process.env.ANTHROPIC_BASE_URL = fake.url;
process.env.OPENAI_BASE_URL = fakeO.url;
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-0000';
process.env.OPENAI_API_KEY = 'sk-openai-test-0000';
delete process.env.ADMIN_PASSWORD;
delete process.env.UNIVERSE_API_KEY;

const { createApp } = await import('../server/app');
const config = await import('../server/config');
config.saveConfig({
  ...config.getConfig(),
  limits: { actionsPerMinute: 500, imagesPerDay: 10 },
  image: { provider: 'openai', model: 'gpt-image-1' },
  universe: { enabled: true, url: fakeU.url, grant: 'if-ai' },
});
let server: Server;
let base = '';

beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.close();
  await Promise.all([fake.close(), fakeU.close(), fakeO.close()]);
});

const call = async (method: string, url: string, body?: unknown) => {
  const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null) };
};
const lastUserText = () => fake.requests.at(-1)!.body.messages.at(-1).content.at(-1).text as string;
const start = (over: Record<string, unknown> = {}) => {
  fake.enqueue(ifairyPage());
  return call('POST', '/api/story', { world: 'ifairy', adventureId: 'hook-void-realm', lang: 'en', heroName: 'Nova', ...over });
};

describe('connecting the Universe', () => {
  it('keeps the iFairy world closed until the Archive is synced', async () => {
    const worlds = (await call('GET', '/api/worlds')).body;
    expect(worlds.find((w: any) => w.id === 'ifairy')).toMatchObject({ ready: false, adventures: 0 });
    const res = await call('POST', '/api/story', { world: 'ifairy', adventureId: 'hook-void-realm', lang: 'en', heroName: 'Nova' });
    expect(res.status).toBe(404);
    expect(fake.requests).toHaveLength(0);
  });

  it('saves the key, tests it with a real search, and syncs from the admin panel', async () => {
    const put = await call('PUT', '/api/admin/config', { keys: { universe: UNIVERSE_KEY } });
    expect(put.body.universeKey).toEqual({ source: 'admin', masked: 'uapi_t…0000' });
    expect(JSON.stringify(put.body)).not.toContain(UNIVERSE_KEY);

    const test = await call('POST', '/api/admin/universe/test', {});
    expect(test.body).toMatchObject({ ok: true, version: '2.2.0-EN', chunks: 1779 });
    expect(fakeU.requests.at(-1)!.url).toBe('/v1/search');

    const sync = await call('POST', '/api/admin/universe/sync');
    expect(sync.body.catalogue.counts).toEqual({ hook: 6, saga: 8, district: 26 });
    const worlds = (await call('GET', '/api/worlds')).body;
    expect(worlds.find((w: any) => w.id === 'ifairy')).toMatchObject({ ready: true, adventures: 40, canonVersion: '2.2.0-EN' });
    const cards = (await call('GET', '/api/adventures')).body;
    expect(cards[0]).toMatchObject({ id: 'hook-void-realm', kind: 'hook' });
    expect(cards[0]).not.toHaveProperty('premise');

    const preview = await call('GET', '/api/admin/universe/adventures/saga-1/prompt?lang=pl');
    expect(preview.body.prompt).toContain('Architectus Magnus Realitas');
    expect(preview.body.prompt).toContain('"Młody Architekcie"');
  });

  it('keeps Universe settings when other sections are saved, and merges partial sections', async () => {
    await call('PUT', '/api/admin/config', { story: { effort: 'low' } });
    let cfg = (await call('GET', '/api/admin/config')).body;
    expect(cfg.universe).toEqual({ enabled: true, url: fakeU.url, grant: 'if-ai' });
    expect(cfg.universeKey.source).toBe('admin');
    expect(cfg.story.model).toBe('claude-opus-5-5');
    await call('PUT', '/api/admin/config', { universe: { grant: 'book-gm' } });
    cfg = (await call('GET', '/api/admin/config')).body;
    expect(cfg.universe).toEqual({ enabled: true, url: fakeU.url, grant: 'book-gm' });
    expect((await call('PUT', '/api/admin/config', { universe: { url: 'not a url' } })).status).toBe(400);
  });
});

describe('playing an iFairy adventure', () => {
  let story: any;

  it('starts with the canon narrator and pins the adventure into the story', async () => {
    const res = await start();
    expect(res.status).toBe(200);
    story = res.body;
    expect(story.world).toBe('ifairy');
    expect(Object.keys(story.adventure).sort()).toEqual(['emoji', 'hue', 'id', 'kind', 'order', 'structure', 'tagline', 'title', 'version']);
    const root = story.pages[story.currentPageId];
    expect(root.choices.map((c: any) => c.kind)).toEqual(['logos', 'gnosis']);
    expect(root.freeForm).toMatch(/^Use your own words/);
    // C1 is the hook's own canon passage, L1 the first live excerpt; the unknown X9 is dropped.
    expect(root.lore.map((l: any) => l.ref)).toEqual(['REF:PORTALS_AND_GUARDIANS:story_hooks', 'REF:GLOSSARY:terms[9]']);
    expect(root.stats).toEqual({ chaos: 10, karma: 5, mana: 55 });

    const req = fake.requests.at(-1)!.body;
    const system = req.system[0].text as string;
    expect(system).toContain('Architectus Magnus Realitas');
    expect(system).toContain('A Portal is tuned (by accident or design)');
    expect(system).toContain("Use 'Narrative Portals', not 'Portal Hearts'.");
    expect(system).not.toContain('meatbag');
    expect(system).not.toContain('Nexus of iFairy civilisation'); // live excerpts never go into the cached prompt
    expect(lastUserText()).toContain('<canon_excerpts');
    expect(lastUserText()).toContain('[L1] REF:GLOSSARY:terms[9] — Golden City');
  });

  it('returns only the card of the pinned adventure, not the prompt material', async () => {
    const got = (await call('GET', `/api/story/${story.id}`)).body;
    expect(got.adventure.premise).toBeUndefined();
    expect(JSON.stringify(got)).not.toContain("Use 'Narrative Portals', not 'Portal Hearts'.");
    expect(JSON.stringify(got)).not.toContain('Canon text of REF:NARRATIVE_STYLE:safety');
    const saved = JSON.parse(fs.readFileSync(path.join(DATA, 'stories', `${story.id}.json`), 'utf8'));
    expect(saved.adventure.premise).toMatch(/^A Portal is tuned/);
  });

  it('keeps the system prompt byte-identical across turns, and sends the Universe only canon terms', async () => {
    const firstSystem = fake.requests.at(-1)!.body.system[0].text;
    const root = story.pages[story.currentPageId];
    fake.enqueue(ifairyPage({ scene: { location: 'The Golden City', present: ['Portal Guardians'] } }));
    const step = await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[0].id });
    expect(step.status).toBe(200);
    expect(step.body.page.action).toEqual({ kind: 'logos', label: 'Measure the dissonance pattern' });
    expect(fake.requests.at(-1)!.body.system[0].text).toBe(firstSystem);

    fake.enqueue(ifairyPage());
    const typed = 'my name is Tom 07123456789 and I open the Portal to the Nexus';
    const own = await call('POST', `/api/story/${story.id}/act`, { pageId: step.body.page.id, custom: typed });
    expect(own.status).toBe(200);
    expect(fake.requests.at(-1)!.body.system[0].text).toBe(firstSystem);
    expect(lastUserText()).toContain('IN THEIR OWN WORDS');
    const query = fakeU.searches.at(-1)!;
    expect(query).toContain('Nexus');
    expect(query).not.toMatch(/Tom|0712|name/);
    expect(fakeU.requests.some((r) => r.url === '/v1/search' && /Tom|0712/.test(JSON.stringify(r.body)))).toBe(false);
  });

  it('keeps playing when the Universe is down', async () => {
    fakeU.setDown(true);
    const current = (await call('GET', `/api/story/${story.id}`)).body;
    const page = current.pages[current.currentPageId];
    fake.enqueue(ifairyPage({ lore_refs: ['L1'] }));
    // A term not looked up before, so the 10-minute excerpt cache cannot answer for the Universe.
    const res = await call('POST', `/api/story/${story.id}/act`, { pageId: page.id, custom: 'I ask about the Holographic Memory' });
    fakeU.setDown(false);
    expect(res.status).toBe(200);
    expect(lastUserText()).not.toContain('<canon_excerpts');
    expect(res.body.page.lore).toEqual([]);
  });

  it('illustrates with the adventure anchor and the canon visual rule', async () => {
    const img = await call('POST', `/api/story/${story.id}/page/${story.rootPageId}/image`, {});
    expect(img.status).toBe(200);
    expect(fakeO.requests.at(-1)!.body.prompt).toContain('ring-shaped Narrative Portal');
    expect(fakeO.requests.at(-1)!.body.prompt).toContain('genderless robotic beings');
  });

  it('refuses a real-looking name, and an adventure that is not synced', async () => {
    const bad = await call('POST', '/api/story', { world: 'ifairy', adventureId: 'hook-void-realm', lang: 'en', heroName: 'my name is Tom' });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/made-up Architect name/);
    expect((await call('POST', '/api/story', { world: 'ifairy', adventureId: 'nope', lang: 'en', heroName: 'Nova' })).status).toBe(404);
  });

  it('caps an iFairy page: no deaths, at most three options, forces only', async () => {
    const res = await start({ adventureId: 'saga-1' });
    const root = res.body.pages[res.body.currentPageId];
    fake.enqueue(ifairyPage({ ending: { type: 'death', title: 'Gone' }, choices: [{ label: 'x', kind: 'sudo' }] }));
    const end = await call('POST', `/api/story/${res.body.id}/act`, { pageId: root.id, choiceId: root.choices[0].id });
    expect(end.body.page.ending).toEqual({ type: 'canon', title: 'Gone' });
    expect(end.body.page.choices).toEqual([]);
    expect(end.body.page.freeForm).toBeUndefined();
  });
});

describe('stories from before the iFairy world', () => {
  it('load and play as Grimm Protocol with no migration', async () => {
    const legacy = {
      id: 'legacy-story-0001', taleId: 'red-hood', lang: 'en', heroName: 'Mo', timeline: 'G-2000', rootPageId: 'p1', currentPageId: 'p1',
      pages: { p1: { ...samplePage(), id: 'p1', parentId: null, depth: 0, action: null, quip: 'Hi.', choices: [{ id: 'c1', label: 'Go', kind: 'sane' }], ending: null, imagePrompt: '', imageUrl: null, audioUrl: null, stats: { chaos: 0, karma: 0, mana: 60 }, canon: 100, inventory: [], summary: 's', createdAt: 1 } },
      createdAt: 1, updatedAt: 1,
    };
    fs.mkdirSync(path.join(DATA, 'stories'), { recursive: true });
    fs.writeFileSync(path.join(DATA, 'stories', 'legacy-story-0001.json'), JSON.stringify(legacy));
    expect((await call('GET', '/api/story/legacy-story-0001')).body.world).toBeUndefined();
    fake.enqueue(samplePage());
    const res = await call('POST', '/api/story/legacy-story-0001/act', { pageId: 'p1', choiceId: 'c1' });
    expect(res.status).toBe(200);
    expect(fake.requests.at(-1)!.body.system[0].text).toContain('You are IGNIS // OS');
  });
});
