import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { samplePage, startFakeAnthropic } from './fakeAnthropic';

// The fake API and a throwaway data dir must be in place before the server modules load.
const fake = await startFakeAnthropic();
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-api-'));
process.env.ANTHROPIC_BASE_URL = fake.url;
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-0000';
delete process.env.ADMIN_PASSWORD;
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;

const { createApp } = await import('../server/app');
const config = await import('../server/config');
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

describe('public API', () => {
  it('reports health, tales and which modalities are live', async () => {
    expect((await call('GET', '/api/health')).body.ok).toBe(true);
    const tales = (await call('GET', '/api/tales')).body;
    expect(tales.length).toBeGreaterThanOrEqual(5);
    expect(tales[0]).toHaveProperty('tech');
    expect(tales[0]).not.toHaveProperty('beats');
    expect((await call('GET', '/api/config')).body).toEqual({ storyReady: true, image: false, tts: 'browser', vision: true });
  });

  it('plays a story: start, choose, fork from an earlier page', async () => {
    const start = await call('POST', '/api/story', { taleId: 'red-hood', lang: 'pl', heroName: 'Mo' });
    expect(start.status).toBe(200);
    const story = start.body;
    const root = story.pages[story.currentPageId];
    expect(root.choices).toHaveLength(4);

    const req = fake.requests.at(-1)!;
    expect(req.url).toContain('/v1/messages');
    expect(req.headers['anthropic-beta']).toContain('server-side-fallback-2026-07-01');
    expect(req.body.fallbacks).toBe('default');
    expect(req.body.output_config.format.type).toBe('json_schema');
    expect(req.body.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(req.body.system[0].text).toContain('Polish');

    const step = await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[1].id });
    expect(step.status).toBe(200);
    expect(step.body.page.parentId).toBe(root.id);
    expect(step.body.page.action).toEqual({ kind: 'chaos', label: 'Hack the wolf' });

    const back = await call('POST', `/api/story/${story.id}/goto`, { pageId: root.id });
    expect(back.body.currentPageId).toBe(root.id);
    const fork = await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, custom: 'I befriend the wolf' });
    expect(fork.body.page.action).toEqual({ kind: 'custom', label: 'I befriend the wolf' });
    expect(Object.values(fork.body.story.pages).filter((p: any) => p.parentId === root.id)).toHaveLength(2);
    expect(fake.requests.at(-1)!.body.messages.at(-1).content.at(-1).text).toContain('I befriend the wolf');
  });

  it('rejects bad input with clear errors', async () => {
    const { body: story } = await call('POST', '/api/story', { taleId: 'three-pigs', lang: 'en', heroName: 'Mo' });
    const pageId = story.currentPageId;
    expect((await call('POST', '/api/story', { taleId: 'nope', lang: 'en', heroName: 'Mo' })).status).toBe(400);
    expect((await call('POST', '/api/story', { taleId: 'red-hood', lang: 'en', heroName: '' })).body.error).toMatch(/Name/);
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId, choiceId: 'missing' })).status).toBe(400);
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId })).status).toBe(400);
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId, custom: 'x'.repeat(281) })).status).toBe(400);
    expect((await call('GET', '/api/story/does-not-exist-123')).status).toBe(404);
    expect((await call('GET', '/api/story/..%2F..%2Fconfig')).status).toBe(404);
    expect((await call('POST', '/api/story', '{oops')).body).toEqual({ error: 'Malformed JSON.' });
    expect((await call('GET', '/api/nothing-here')).status).toBe(404);
  });

  it('refuses sudo without mana and actions on an ended timeline', async () => {
    fake.enqueue(samplePage({ stat_changes: { chaos: 0, karma: 0, mana: -25 } }), samplePage({ stat_changes: { chaos: 0, karma: 0, mana: -25 } }));
    const { body: story } = await call('POST', '/api/story', { taleId: 'cinderella', lang: 'en', heroName: 'Mo' });
    const root = story.pages[story.currentPageId];
    const step = await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[0].id });
    const page = step.body.page;
    expect(page.stats.mana).toBe(10);
    const sudo = page.choices.find((c: any) => c.kind === 'sudo');
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId: page.id, choiceId: sudo.id })).status).toBe(409);

    fake.enqueue(samplePage({ ending: { type: 'death', title: 'Bonk' } }));
    const end = await call('POST', `/api/story/${story.id}/act`, { pageId: page.id, choiceId: page.choices[0].id });
    expect(end.body.page.choices).toEqual([]);
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId: end.body.page.id, custom: 'again' })).status).toBe(409);
  });

  it('lets only one page be written per story at a time', async () => {
    const { body: story } = await call('POST', '/api/story', { taleId: 'wawel-dragon', lang: 'en', heroName: 'Mo' });
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
    const { body: story } = await call('POST', '/api/story', { taleId: 'red-hood', lang: 'en', heroName: 'Mo' });
    const img = await call('POST', `/api/story/${story.id}/page/${story.currentPageId}/image`, {});
    expect(img.status).toBe(503);
    expect(img.body.error).toMatch(/gemini/i);
    expect((await call('POST', `/api/story/${story.id}/page/${story.currentPageId}/speech`, {})).body).toEqual({ url: null });
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
    const { body: story } = await call('POST', '/api/story', { taleId: 'red-hood', lang: 'en', heroName: 'Mo' });
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
