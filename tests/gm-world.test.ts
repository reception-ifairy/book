import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFakeAnthropic, toolUse } from './fakeAnthropic';
import { ifairyPage, startFakeUniverse, UNIVERSE_KEY } from './fakeUniverse';

const fake = await startFakeAnthropic();
const fakeU = await startFakeUniverse();
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-gm-world-'));
process.env.DATA_DIR = DATA;
process.env.ANTHROPIC_BASE_URL = fake.url;
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-0000';
delete process.env.ADMIN_PASSWORD;

const { createApp } = await import('../server/app');
const config = await import('../server/config');
const { syncCatalogue } = await import('../server/universe/catalogue');
const { getSnapshot } = await import('../server/universe/store');
const { ifairySystemPrompt } = await import('../server/story/worlds/ifairy/prompt');
const { applyQuest, questFor } = await import('../server/gm/kernel/quests');

config.saveConfig({
  ...config.getConfig(),
  keys: { universe: UNIVERSE_KEY },
  limits: { actionsPerMinute: 500, imagesPerDay: 10 },
  universe: { enabled: true, url: fakeU.url, grant: 'book-gm' },
  gm: { enabled: true, model: '', effort: 'low', maxRounds: 4, turnBudgetMs: 75000, outputCheck: 'off' },
});
await syncCatalogue();

let server: Server;
let base = '';
beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.close();
  await Promise.all([fake.close(), fakeU.close()]);
});

const call = async (method: string, url: string, body?: unknown) => {
  const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null) };
};
const gmPage = (over: Record<string, unknown> = {}) => {
  const { stat_changes: _s, inventory_add: _a, inventory_remove: _r, ...rest } = ifairyPage();
  return { ...rest, choices: [{ label: 'Map the maze between loops', kind: 'logos', risk: 'safe' }, { label: 'Ask the Loopkeeper how it feels', kind: 'gnosis', risk: 'safe' }], ...over };
};
const SECRET = 'not a trap but a practice room';
const userText = (r: any) => JSON.stringify(r.body.messages.at(-1).content);
const current = async (id: string) => {
  const s = (await call('GET', `/api/story/${id}`)).body;
  return { story: s, page: s.pages[s.currentPageId] };
};
const act = async (id: string, ...turns: any[]) => {
  const { page } = await current(id);
  fake.enqueue(...turns);
  return call('POST', `/api/story/${id}/act`, { pageId: page.id, custom: 'I keep going' });
};

describe('quest kernel', () => {
  it('opens the next goal, and a transformed goal opens its new form first', () => {
    let q = questFor('three-phase');
    expect(q.map((n) => n.status)).toEqual(['active', 'locked', 'locked', 'locked', 'locked']);
    expect(q.find((n) => n.climax)!.id).toBe('translate');
    q = applyQuest(q, 'portal', 'done');
    expect(q[1].status).toBe('active');
    q = applyQuest(q, 'experiment', 'transformed', 'Test the law with a song instead');
    expect(q.map((n) => `${n.id}:${n.status}`).slice(1, 4)).toEqual(['experiment:transformed', 'experiment-t5:active', 'pattern:locked']);
    expect(questFor('homework').map((n) => n.id)).toEqual(['show', 'understand', 'step', 'solve', 'explain']);
  });
});

describe('NPC cards', () => {
  it('come from the canon and the cast; secrets stay out of the prompt', () => {
    const snap = getSnapshot('world-loopia')!;
    const ids = snap.npcs!.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['loopkeeper', 'crow-again', 'quaeron', 'iridia', 'numerix', 'chronica']));
    expect(ids).toHaveLength(2 + 12 + 4);
    expect(snap.npcs!.find((n) => n.id === 'quaeron')!.role).toMatch(/Tinkermaster of the District of Wisdom \(Logos\)/);
    expect(snap.npcs!.find((n) => n.id === 'loopkeeper')).toMatchObject({ name: 'Loopkeeper', secret: { id: 'S1', trust: 2 } });
    const prompt = ifairySystemPrompt(snap, 'en', 12, true);
    expect(prompt).toContain('# NPC cards');
    expect(prompt).toContain('- quaeron: Quaeron');
    expect(prompt).not.toContain(SECRET);
    expect(ifairySystemPrompt(snap, 'en', 12, false)).not.toContain('# NPC cards');
  });
});

describe('a Game Master story with NPCs, quest and world', () => {
  let id = '';

  it('starts with the quest skeleton, clocks and a hidden starting state', async () => {
    fake.enqueue(gmPage({ scene: { location: 'The Maze Garden', present: ['the Loopkeeper'] } }));
    const res = await call('POST', '/api/story', { world: 'ifairy', adventureId: 'world-loopia', lang: 'en', heroName: 'Nova', strongest: 'gnosis' });
    id = res.body.id;
    const root = res.body.pages[res.body.currentPageId];
    expect(res.body.gmStart).toBeUndefined();
    expect(root.gm.state.quest[0]).toMatchObject({ id: 'portal', status: 'active' });
    expect(root.gm.state.world).toMatchObject({ day: 1, segment: 0 });
    expect(root.gm.state.world.clocks.map((c: any) => c.id)).toEqual(['wobble', 'portal']);
    expect(root.gm.state.npcs.loopkeeper.met).toBe(true); // named in the scene
    expect(userText(fake.requests.at(-1)!)).toContain('[active] portal');
    expect(userText(fake.requests.at(-1)!)).toContain('holds secret S1 (trust 2)');
  });

  it('builds trust step by step and keeps the secret until it is earned', async () => {
    const res = await act(id,
      toolUse(
        ['get_npc', { npc_id: 'loopkeeper' }],
        ['update_relationship', { npc_id: 'loopkeeper', axis: 'trust', delta: 1, cause: 'listened' }],
        ['update_relationship', { npc_id: 'loopkeeper', axis: 'trust', delta: 1, cause: 'again' }],
        ['npc_remember', { npc_id: 'loopkeeper', memory: 'The explorer listened patiently.', salience: '2' }],
        ['reveal_secret', { npc_id: 'loopkeeper' }],
      ),
      gmPage(),
    );
    expect(res.status).toBe(200);
    const results = fake.requests.at(-1)!.body.messages.at(-1).content;
    expect(results[2].content).toMatch(/already changed this page/);
    expect(results[4].content).toMatch(/Not yet: .* trust is 1/);
    const npc = res.body.page.gm.state.npcs.loopkeeper;
    expect(npc).toMatchObject({ trust: 1, revealed: [] });
    expect(npc.memories[0].text).toBe('The explorer listened patiently.');
    // The secret's text has never been sent to the model.
    expect(fake.requests.some((r) => JSON.stringify(r.body).includes(SECRET))).toBe(false);

    const next = await act(id,
      toolUse(['update_relationship', { npc_id: 'loopkeeper', axis: 'trust', delta: 1, cause: 'kept a promise' }]),
      toolUse(['reveal_secret', { npc_id: 'loopkeeper' }], ['roll_check', { approach: 'gnosis', risk: 'standard', intent: 'reassure them', helper_npc: 'loopkeeper' }]),
      gmPage(),
    );
    const out = fake.requests.at(-1)!.body.messages.at(-1).content;
    expect(out[0].content).toContain(SECRET);
    expect(next.body.page.gm.state.npcs.loopkeeper.revealed).toEqual(['S1']);
    expect(next.body.page.gm.rolls[0].mods.map((m: any) => m.label)).toContain('help from Loopkeeper');
  });

  it('moves the quest, plants a consequence that comes due, and runs the clock and rumours', async () => {
    const res = await act(id,
      toolUse(
        ['update_quest', { node_id: 'portal', status: 'done', into: null }],
        ['update_quest', { node_id: 'experiment', status: 'transformed', into: 'Test the loop with a song' }],
        ['schedule_consequence', { after_pages: 1, text: 'The rooster crows the song back, off-key.', visibility: 'hidden' }],
        ['tick_clock', { clock_id: 'wobble', delta: 1 }],
        ['spread_rumour', { text: 'A portal sings at the edge of the city.', is_true: false }],
      ),
      gmPage(),
    );
    const st = res.body.page.gm.state;
    expect(st.quest.find((n: any) => n.status === 'active').title).toBe('Test the loop with a song');
    expect(st.world.clocks[0].value).toBe(1);
    expect(st.world.rumours[0]).toEqual({ id: expect.any(String), text: 'A portal sings at the edge of the city.' }); // truth hidden
    expect(st.consequences ?? []).toEqual([]); // hidden consequence not shown
    const saved = JSON.parse(fs.readFileSync(path.join(DATA, 'stories', `${id}.json`), 'utf8'));
    expect(saved.pages[res.body.page.id].gm.state.consequences[0].visibility).toBe('hidden');

    const due = await act(id, gmPage());
    expect(userText(fake.requests.at(-1)!)).toContain('DUE CONSEQUENCES (make them happen on this page): The rooster crows the song back, off-key.');
    expect(due.body.page.gm.events.map((e: any) => e.type)).toEqual(expect.arrayContaining(['time', 'consequence_fire']));
    // One part of the day passes with every page.
    expect(due.body.page.gm.state.world).toMatchObject({ day: 2, segment: 0 });
  });

  it('asks for the climax before a canon ending', async () => {
    fake.requests.length = 0;
    const res = await act(id, gmPage({ ending: { type: 'canon', title: 'Done' }, choices: [] }), gmPage());
    expect(res.status).toBe(200);
    expect(JSON.stringify(fake.requests[1].body.messages.at(-1))).toMatch(/climax goal closed first/);
  });

  it('passes the audit with the new events', async () => {
    const audit = await call('GET', `/api/admin/story/${id}/audit`);
    expect(audit.body.problems).toEqual([]);
  });
});

describe('the Seven Worlds as a path', () => {
  it('continues with the next stage, carrying bonds, facts, items and the learning style', async () => {
    config.saveConfig({ ...config.getConfig(), story: { ...config.getConfig().story, maxDepth: 4 } });
    fake.enqueue(gmPage());
    const start = await call('POST', '/api/story', { world: 'ifairy', adventureId: 'world-bleepworld', lang: 'en', heroName: 'Nova', strongest: 'mythos' });
    const id = start.body.id;
    await act(id, toolUse(['grant_item', { name: 'a jar of quiet', reason: 'kept' }], ['update_relationship', { npc_id: 'chronica', axis: 'affinity', delta: 1, cause: 'shared a story' }], ['update_quest', { node_id: 'portal', status: 'done', into: null }]), gmPage());
    await act(id, toolUse(['update_quest', { node_id: 'experiment', status: 'done', into: null }], ['update_quest', { node_id: 'pattern', status: 'done', into: null }], ['update_quest', { node_id: 'translate', status: 'done', into: null }]), gmPage());
    await act(id, gmPage());
    const end = await act(id, gmPage({ ending: { type: 'canon', title: 'Order, three by three' }, choices: [] }));
    expect(end.body.page.ending).toEqual({ type: 'canon', title: 'Order, three by three' });

    fake.enqueue(gmPage());
    const next = await call('POST', `/api/story/${id}/next-chapter`);
    expect(next.status).toBe(200);
    expect(next.body.adventure.id).toBe('world-loopia');
    expect(next.body.campaign).toEqual({ fromStoryId: id, chapter: 2 });
    expect(next.body.style).toBe('mythos');
    const root = next.body.pages[next.body.currentPageId];
    expect(root.inventory).toContain('a jar of quiet');
    expect(root.gm.state.approaches.mythos).toBe(2);
    expect(root.gm.state.npcs.chronica.affinity).toBe(1);
    expect(root.gm.state.quest[0]).toMatchObject({ id: 'portal', status: 'active' });
    expect((await call('GET', `/api/admin/story/${next.body.id}/audit`)).body.problems).toEqual([]);
    expect((await call('POST', `/api/story/${next.body.id}/next-chapter`)).status).toBe(409); // stage 2 has not ended
  });

  it('does not continue a lab as a path', async () => {
    fake.enqueue(gmPage());
    const lab = await call('POST', '/api/story', { world: 'ifairy', adventureId: 'lab-gravi-lab', lang: 'en', heroName: 'Nova' });
    expect((await call('POST', `/api/story/${lab.body.id}/next-chapter`)).status).toBe(400);
  });
});
