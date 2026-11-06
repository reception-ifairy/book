import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { samplePage, startFakeAnthropic } from './fakeAnthropic';
import { startFakeUniverse, UNIVERSE_KEY } from './fakeUniverse';

// The fake APIs and a throwaway data dir must be in place before the server modules load.
const fake = await startFakeAnthropic();
const fakeU = await startFakeUniverse();
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-api-'));
process.env.DATA_DIR = DATA;
process.env.ANTHROPIC_BASE_URL = fake.url;
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-0000';
process.env.UNIVERSE_API_KEY = UNIVERSE_KEY;
delete process.env.ADMIN_PASSWORD;
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;

const { createApp } = await import('../server/app');
const config = await import('../server/config');
// Tests fire far more actions per minute than a player; the limiter itself is checked separately below.
config.saveConfig({ ...config.getConfig(), limits: { actionsPerMinute: 500, imagesPerDay: 10 }, universe: { enabled: true, url: fakeU.url, grant: 'if-ai' } });
let server: Server;
let base = '';

beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  expect((await call('POST', '/api/admin/universe/sync')).status).toBe(200);
});
afterAll(async () => {
  server.close();
  await Promise.all([fake.close(), fakeU.close()]);
  delete process.env.UNIVERSE_API_KEY;
});

const call = async (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};
const begin = (adventureId = 'world-bleepworld', over: Record<string, unknown> = {}) =>
  call('POST', '/api/story', { world: 'ifairy', adventureId, lang: 'en', heroName: 'Nova', ...over });

describe('public API', () => {
  it('reports health, the Edu-Verse and which modalities are live', async () => {
    expect((await call('GET', '/api/health')).body.ok).toBe(true);
    expect((await call('GET', '/api/tales')).status).toBe(404);
    const worlds = (await call('GET', '/api/worlds')).body;
    expect(worlds).toEqual([{ id: 'ifairy', ready: true, adventures: 14, canonVersion: '2.2.0-EN', gm: false }]);
    expect((await call('GET', '/api/config')).body).toEqual({ storyReady: true, image: false, tts: 'browser', vision: true });
  });

  it('plays a journey: start, choose, fork from an earlier page', async () => {
    const start = await begin('world-bleepworld', { lang: 'pl', strongest: 'phantasia' });
    expect(start.status).toBe(200);
    const story = start.body;
    expect(story.style).toBe('phantasia');
    const root = story.pages[story.currentPageId];
    expect(root.choices).toHaveLength(2);
    expect(root.phase).toBe('entry');

    const req = fake.requests.at(-1)!;
    expect(req.url).toContain('/v1/messages');
    expect(req.headers['anthropic-beta']).toContain('server-side-fallback-2026-07-01');
    expect(req.body.fallbacks).toBe('default');
    expect(req.body.output_config.format.type).toBe('json_schema');
    expect(req.body.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(req.body.system[0].text).toContain('Polish');
    expect(req.body.system[0].text).toContain('You are IGNIS, the winged cyber-grimoire');

    const step = await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[1].id });
    expect(step.status).toBe(200);
    expect(step.body.page.parentId).toBe(root.id);
    expect(step.body.page.action).toEqual({ kind: 'gnosis', label: 'Ask Blip and Blop how chaos feels' });

    const back = await call('POST', `/api/story/${story.id}/goto`, { pageId: root.id });
    expect(back.body.currentPageId).toBe(root.id);
    const fork = await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, custom: 'I sort things by how loud they are' });
    expect(fork.body.page.action).toEqual({ kind: 'custom', label: 'I sort things by how loud they are' });
    expect(Object.values(fork.body.story.pages).filter((p: any) => p.parentId === root.id)).toHaveLength(2);
    expect(fake.requests.at(-1)!.body.messages.at(-1).content.at(-1).text).toContain('I sort things by how loud they are');
  });

  it('rejects bad input with clear errors', async () => {
    const { body: story } = await begin('lab-levitas');
    const pageId = story.currentPageId;
    expect((await begin('nope')).status).toBe(404);
    expect((await begin('world-loopia', { heroName: '' })).body.error).toMatch(/explorer name/);
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId, choiceId: 'missing' })).status).toBe(400);
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId })).status).toBe(400);
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId, custom: 'x'.repeat(281) })).status).toBe(400);
    expect((await call('GET', '/api/story/does-not-exist-123')).status).toBe(404);
    expect((await call('GET', '/api/story/..%2F..%2Fconfig')).status).toBe(404);
    expect((await call('POST', '/api/story', '{oops')).body).toEqual({ error: 'Malformed JSON.' });
    expect((await call('GET', '/api/nothing-here')).status).toBe(404);
  });

  it('refuses actions on an ended journey', async () => {
    const { body: story } = await begin('lab-rewind-realm');
    const root = story.pages[story.currentPageId];
    fake.enqueue(samplePage({ ending: { type: 'canon', title: 'The first domino' } }));
    const end = await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[0].id });
    expect(end.body.page.choices).toEqual([]);
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId: end.body.page.id, custom: 'again' })).status).toBe(409);
  });

  it('lets only one page be written per story at a time', async () => {
    const { body: story } = await begin('world-fraktalia');
    const root = story.pages[story.currentPageId];
    fake.setDelay(300);
    const [a, b] = await Promise.all([
      call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[0].id }),
      call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[1].id }),
    ]);
    fake.setDelay(0);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });

  it('says clearly when a modality has no key', async () => {
    const { body: story } = await begin();
    const img = await call('POST', `/api/story/${story.id}/page/${story.currentPageId}/image`, {});
    expect(img.status).toBe(503);
    expect(img.body.error).toMatch(/gemini/i);
    expect((await call('POST', `/api/story/${story.id}/page/${story.currentPageId}/speech`, {})).body).toEqual({ url: null });
  });

  it('archives journeys from the retired worlds instead of playing them', async () => {
    const page = { id: 'p1', parentId: null, depth: 0, action: null, narration: 'n', quip: 'q', mood: 'smug', choices: [{ id: 'c1', label: 'Go', kind: 'sane' }], ending: null, imagePrompt: '', imageUrl: null, audioUrl: null, stats: { chaos: 0, karma: 0, mana: 60 }, canon: 100, inventory: [], summary: 's', createdAt: 1 };
    const grimm = { id: 'legacy-grimm-0001', taleId: 'red-hood', lang: 'en', heroName: 'Mo', timeline: 'G-2000', rootPageId: 'p1', currentPageId: 'p1', pages: { p1: page }, createdAt: 1, updatedAt: 1 };
    const saga = { ...grimm, id: 'legacy-saga-0001', world: 'ifairy', taleId: 'saga-1', adventure: { id: 'saga-1', kind: 'saga', order: 1 } };
    fs.mkdirSync(path.join(DATA, 'stories'), { recursive: true });
    for (const s of [grimm, saga]) fs.writeFileSync(path.join(DATA, 'stories', `${s.id}.json`), JSON.stringify(s));
    const calls = fake.requests.length;
    for (const id of [grimm.id, saga.id]) {
      const got = await call('GET', `/api/story/${id}`);
      expect(got.status).toBe(410);
      expect(got.body.error).toMatch(/retired world/);
      expect((await call('POST', `/api/story/${id}/act`, { pageId: 'p1', choiceId: 'c1' })).status).toBe(410);
    }
    expect(fake.requests.length).toBe(calls);
  });
});

describe('admin API', () => {
  it('answers localhost without a password and never returns full keys', async () => {
    const put = await call('PUT', '/api/admin/config', { keys: { openai: 'sk-proj-supersecret-ABCD' }, story: { model: 'claude-opus-5-5', effort: 'low', maxDepth: 8 } });
    expect(put.status).toBe(200);
    expect(JSON.stringify(put.body)).not.toContain('supersecret');
    expect(put.body.providers.openai).toEqual({ source: 'admin', masked: 'sk-pro…ABCD' });
    expect(put.body.story.effort).toBe('low');
    const removed = await call('PUT', '/api/admin/config', { keys: { openai: null } });
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

  it('rate-limits story actions per visitor', async () => {
    const { body: story } = await begin();
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
    fake.enqueue({ line: 'IGNIS ONLINE' });
    const probe = await call('POST', '/api/admin/probe/story', {});
    expect(probe.body).toMatchObject({ ok: true, text: 'IGNIS ONLINE', model: 'claude-opus-5-5' });
  });
});
