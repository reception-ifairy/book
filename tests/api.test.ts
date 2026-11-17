import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { samplePage, startFakeAnthropic, refusal } from './fakeAnthropic';
import { ARCHIVE } from '../shared/archive';

// The fake API and a throwaway data dir must be in place before the server modules load.
const fake = await startFakeAnthropic();
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'arb-api-'));
process.env.ANTHROPIC_BASE_URL = fake.url;
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-0000';
delete process.env.ADMIN_PASSWORD;
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;

const { createApp } = await import('../server/app');
const config = await import('../server/config');
const agents = await import('../server/arb/agents');
// Tests fire far more actions per minute than a player; the limiter itself is checked separately below.
config.saveConfig({ ...config.getConfig(), limits: { actionsPerMinute: 500, imagesPerDay: 10 } });
let server: Server;
let base = '';

beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.close();
  await fake.close();
});

const call = async (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const register = async (spec = 'europa') => (await call('POST', '/api/agent', { codename: 'Sowa', specialization: spec, lang: 'pl' })).body;

/** Registers an agent, gets an offer and opens the case. */
async function openCase() {
  const agent = await register();
  const desk = (await call('POST', `/api/agent/${agent.id}/narratomat`, {})).body;
  const story = (await call('POST', `/api/agent/${agent.id}/mission`, { missionId: desk.offer.missionId })).body;
  return { agent, story, root: story.pages[story.currentPageId] };
}

describe('agents and the desk', () => {
  it('reports health and which modalities are live', async () => {
    expect((await call('GET', '/api/health')).body.ok).toBe(true);
    expect((await call('GET', '/api/config')).body).toEqual({ storyReady: true, image: false, tts: 'browser' });
  });

  it('registers an agent and validates the form', async () => {
    const agent = await register('azja');
    expect(agent).toMatchObject({ codename: 'Sowa', specialization: 'azja', xp: 0, offer: null, rerolls: { left: 2 } });
    expect((await call('GET', `/api/agent/${agent.id}`)).body.id).toBe(agent.id);
    expect((await call('POST', '/api/agent', { codename: 'X', specialization: 'europa' })).body.error).toMatch(/2 znaki/);
    expect((await call('POST', '/api/agent', { codename: 'Sowa', specialization: 'mars' })).status).toBe(400);
    expect((await call('GET', '/api/agent/does-not-exist-123')).status).toBe(404);
    expect((await call('GET', '/api/agent/..%2F..%2Fconfig')).status).toBe(404);
  });

  it('keeps the NarratoMat offer until a reroll, and limits rerolls per day', async () => {
    const agent = await register();
    const a = (await call('POST', `/api/agent/${agent.id}/narratomat`, {})).body.offer;
    const again = (await call('POST', `/api/agent/${agent.id}/narratomat`, {})).body.offer;
    expect(again.createdAt).toBe(a.createdAt);
    expect(a.reasons[0]).toMatch(/^K20 = \d+/);
    for (let i = 0; i < 2; i++) expect((await call('POST', `/api/agent/${agent.id}/narratomat`, { reroll: true })).status).toBe(200);
    const no = await call('POST', `/api/agent/${agent.id}/narratomat`, { reroll: true });
    expect(no.status).toBe(409);
    expect(no.body.error).toMatch(/Limit/);
  });

  it('brews coffee, books training and keeps map notes', async () => {
    const agent = await register();
    const brewed = (await call('POST', `/api/agent/${agent.id}/coffee`, {})).body;
    expect(brewed.result.text).toBeTruthy();
    const t1 = (await call('POST', `/api/agent/${agent.id}/training`, { game: 'alchemia', score: 80 })).body;
    expect(t1).toMatchObject({ xp: 13, newBest: true });
    const t2 = (await call('POST', `/api/agent/${agent.id}/training`, { game: 'alchemia', score: 50 })).body;
    expect(t2).toMatchObject({ xp: 5, newBest: false });
    expect(t2.agent.training.alchemia).toMatchObject({ best: 80, plays: 2 });
    expect(t2.agent.xp).toBe(18);
    expect((await call('POST', `/api/agent/${agent.id}/training`, { game: 'szachy', score: 50 })).status).toBe(400);

    const noted = (await call('POST', `/api/agent/${agent.id}/notes`, { x: 100, y: 200, text: 'Tu jest smok' })).body;
    expect(noted.notes).toHaveLength(1);
    expect((await call('POST', `/api/agent/${agent.id}/notes`, { x: 2000, y: 0, text: 'poza mapą' })).status).toBe(400);
    const removed = (await call('DELETE', `/api/agent/${agent.id}/notes/${noted.notes[0].id}`)).body;
    expect(removed.notes).toHaveLength(0);
  });
});

describe('missions', () => {
  it('opens a case only from the desk, with a cached system prompt and the agent in the first turn', async () => {
    const agent = await register();
    expect((await call('POST', `/api/agent/${agent.id}/mission`, { missionId: 'kapturek-ciastka' })).status).toBe(409);
    const desk = (await call('POST', `/api/agent/${agent.id}/narratomat`, {})).body;
    const res = await call('POST', `/api/agent/${agent.id}/mission`, { missionId: desk.offer.missionId });
    expect(res.status).toBe(200);
    expect(res.body.pages[res.body.currentPageId].stats.stamps).toBe(2);

    const req = fake.requests.at(-1)!;
    expect(req.headers['anthropic-beta']).toContain('server-side-fallback-2026-07-01');
    expect(req.body.output_config.format.type).toBe('json_schema');
    expect(req.body.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(req.body.system[0].text).toContain('Polish');
    expect(req.body.messages[0].content).toContain('codename "Sowa"');

    const after = (await call('GET', `/api/agent/${agent.id}`)).body;
    expect(after.offer).toBeNull();
    expect(after.activeStoryId).toBe(res.body.id);
    expect(after.history).toHaveLength(1);
  });

  it('rolls K20 in code for risky moves and tells the narrator the outcome', async () => {
    const { story, root } = await openCase();
    const safe = await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[0].id });
    expect(safe.status).toBe(200);
    expect(safe.body.page.roll).toBeNull();
    const page = safe.body.page;

    const risky = await call('POST', `/api/story/${story.id}/act`, { pageId: page.id, choiceId: page.choices[1].id });
    const roll = risky.body.page.roll;
    expect(roll.die).toBeGreaterThanOrEqual(1);
    expect(roll.die).toBeLessThanOrEqual(20);
    expect(roll.total).toBe(roll.die + roll.modifier);
    expect(fake.requests.at(-1)!.body.messages.at(-1).content).toContain(`K20 TEST: rolled ${roll.die}`);

    const custom = await call('POST', `/api/story/${story.id}/act`, { pageId: risky.body.page.id, custom: 'Częstuję wilka ciastkiem' });
    expect(custom.body.page.action).toEqual({ kind: 'custom', label: 'Częstuję wilka ciastkiem' });
    expect(custom.body.page.roll).not.toBeNull();
    expect(fake.requests.at(-1)!.body.messages.at(-1).content).toContain('Częstuję wilka ciastkiem');
  });

  it('spends stamps, refuses moves without them and on stale pages', async () => {
    const { story, root } = await openCase();
    let page = root;
    for (let i = 0; i < 2; i++) {
      const stamp = page.choices.find((c: any) => c.kind === 'pieczatka');
      const res = await call('POST', `/api/story/${story.id}/act`, { pageId: page.id, choiceId: stamp.id });
      expect(res.body.page.roll).toBeNull();
      expect(fake.requests.at(-1)!.body.messages.at(-1).content).toContain('STAMP: approved');
      page = res.body.page;
    }
    expect(page.stats.stamps).toBe(0);
    const stamp = page.choices.find((c: any) => c.kind === 'pieczatka');
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId: page.id, choiceId: stamp.id })).status).toBe(409);
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[0].id })).status).toBe(409);
  });

  it('books XP and closes the record when the case ends', async () => {
    const { agent, story, root } = await openCase();
    fake.enqueue(samplePage({ ending: { type: 'uratowana', title: 'Bajka uratowana' } }));
    const end = await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[0].id });
    expect(end.body.page.choices).toEqual([]);
    expect(end.body.story.settled.xp).toBeGreaterThan(0);
    expect(end.body.agent.xp).toBe(end.body.story.settled.xp);
    expect(end.body.agent.activeStoryId).toBeNull();
    expect(end.body.agent.history[0].ending).toBe('uratowana');
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId: end.body.page.id, custom: 'jeszcze raz' })).status).toBe(409);
    expect((await call('GET', `/api/agent/${agent.id}`)).body.xp).toBe(end.body.story.settled.xp);
  });

  it('rejects bad input with clear errors', async () => {
    const { story, root } = await openCase();
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: 'missing' })).status).toBe(400);
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId: root.id })).status).toBe(400);
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, custom: 'x'.repeat(281) })).status).toBe(400);
    fake.enqueue(refusal());
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, custom: 'coś' })).status).toBe(422);
    expect((await call('GET', '/api/story/does-not-exist-123')).status).toBe(404);
    expect((await call('POST', '/api/agent', '{oops')).body).toEqual({ error: 'Malformed JSON.' });
    expect((await call('GET', '/api/nothing-here')).status).toBe(404);
  });

  it('lets only one page be written per case at a time', async () => {
    const { story, root } = await openCase();
    fake.setDelay(300);
    const [a, b] = await Promise.all([
      call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[0].id }),
      call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[2].id }),
    ]);
    fake.setDelay(0);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });

  it('says clearly when a modality has no key', async () => {
    const { story } = await openCase();
    const img = await call('POST', `/api/story/${story.id}/page/${story.currentPageId}/image`, {});
    expect(img.status).toBe(503);
    expect(img.body.error).toMatch(/gemini/i);
    expect((await call('POST', `/api/story/${story.id}/page/${story.currentPageId}/speech`, {})).body).toEqual({ url: null });
  });
});

describe('archive', () => {
  const open = ARCHIVE.find((e) => e.clearance === 0)!;
  const secret = ARCHIVE.find((e) => e.clearance >= 3)!;

  it('lists every entry but cuts bodies above clearance', async () => {
    const agent = await register();
    expect((await call('GET', '/api/archive')).status).toBe(401);
    const list = (await call('GET', `/api/archive?agent=${agent.id}`)).body;
    expect(list).toHaveLength(ARCHIVE.length);
    expect(list.find((e: any) => e.id === secret.id)).toMatchObject({ locked: true });
    expect(list[0]).not.toHaveProperty('body');
    expect((await call('GET', `/api/archive/${open.id}?agent=${agent.id}`)).body.entry.body.length).toBeGreaterThan(0);
    const denied = await call('GET', `/api/archive/${secret.id}?agent=${agent.id}`);
    expect(denied.status).toBe(403);
    expect(denied.body.error).toMatch(/UTAJNIONE/);
  });

  it('opens with rank, and keeps comments with ratings and warnings', async () => {
    const agent = await register();
    const stored = agents.getAgent(agent.id)!;
    stored.xp = 3000;
    agents.saveAgent(stored);
    expect((await call('GET', `/api/archive/${secret.id}?agent=${agent.id}`)).status).toBe(200);

    const posted = await call('POST', `/api/archive/${open.id}/comments`, { agentId: agent.id, text: 'Uwaga na ananasy.', rating: 4, warning: true });
    expect(posted.body).toMatchObject({ codename: 'Sowa', rating: 4, warning: true });
    expect((await call('POST', `/api/archive/${open.id}/comments`, { agentId: agent.id, text: 'x'.repeat(401), rating: 4 })).status).toBe(400);
    const item = (await call('GET', `/api/archive?agent=${agent.id}`)).body.find((e: any) => e.id === open.id);
    expect(item).toMatchObject({ rating: 4, comments: 1, warnings: 1 });

    const rookie = await register();
    expect((await call('POST', `/api/archive/${secret.id}/comments`, { agentId: rookie.id, text: 'Wiem wszystko', rating: 5 })).status).toBe(403);
  });
});

describe('admin API', () => {
  it('answers localhost without a password and never returns full keys', async () => {
    const put = await call('PUT', '/api/admin/config', { keys: { openai: 'sk-proj-supersecret-ABCD' }, story: { model: 'claude-opus-5-5', effort: 'low', maxDepth: 8 } });
    expect(put.status).toBe(200);
    expect(JSON.stringify(put.body)).not.toContain('supersecret');
    expect(put.body.providers.openai).toEqual({ source: 'admin', masked: 'sk-pro…ABCD' });
    expect(put.body.story.effort).toBe('low');
    const removed = await call('PUT', '/api/admin/config', { keys: { openai: null }, story: { maxDepth: 12 } });
    expect(removed.body.providers.openai.source).toBe('none');
  });

  it('validates settings', async () => {
    expect((await call('PUT', '/api/admin/config', { story: { model: 'x', effort: 'turbo', maxDepth: 8 } })).status).toBe(400);
    expect((await call('POST', '/api/admin/providers/bogus/models', {})).status).toBe(404);
    expect((await call('POST', '/api/admin/providers/gemini/models', {})).body).toEqual({ ok: false, error: 'No key to test.' });
  });

  it('requires the password when ADMIN_PASSWORD is set', async () => {
    process.env.ADMIN_PASSWORD = 'hunter2';
    try {
      expect((await call('GET', '/api/admin/config')).status).toBe(401);
      expect((await call('GET', '/api/admin/config', undefined, { 'x-admin-password': 'nope' })).status).toBe(401);
      expect((await call('GET', '/api/admin/config', undefined, { 'x-admin-password': 'hunter2' })).status).toBe(200);
    } finally {
      delete process.env.ADMIN_PASSWORD;
    }
  });

  it('rate-limits mission actions per visitor', async () => {
    const { story } = await openCase();
    config.saveConfig({ ...config.getConfig(), limits: { actionsPerMinute: 1, imagesPerDay: 10 } });
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 3; i++) statuses.push((await call('POST', `/api/story/${story.id}/page/${story.currentPageId}/speech`, {})).status);
      expect(statuses).toContain(429);
    } finally {
      config.saveConfig({ ...config.getConfig(), limits: { actionsPerMinute: 500, imagesPerDay: 10 } });
    }
  });

  it('runs the live story probe through the story model', async () => {
    fake.enqueue({ line: 'NARRATORIUSZ ONLINE' });
    const probe = await call('POST', '/api/admin/probe/story', {});
    expect(probe.body).toMatchObject({ ok: true, text: 'NARRATORIUSZ ONLINE', model: 'claude-opus-5-5' });
  });
});
