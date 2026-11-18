import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bureauDay, dayWindow, questProgress, type Quest } from '../shared/daily';
import type { Page, Story } from '../shared/types';
import { getTale } from '../shared/tales';
import { systemPrompt } from '../server/story/prompts';
import { buildDailySql } from '../scripts/t1000-daily.mjs';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-daily-'));
delete process.env.ADMIN_PASSWORD;
delete process.env.T1000_DATABASE_URL;

const { createApp } = await import('../server/app');
const daily = await import('../server/daily');
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'db', 't1000', 'daily.seed.json'), 'utf8'));

describe('Bureau day', () => {
  it('is the Warsaw calendar day, with windows that survive DST changes', () => {
    expect(bureauDay(Date.UTC(2026, 10, 18, 22, 30))).toBe('2026-11-18'); // 23:30 in Warsaw (CET)
    expect(bureauDay(Date.UTC(2026, 10, 18, 23, 30))).toBe('2026-11-19');
    const winter = dayWindow('2026-11-18');
    expect(winter.startsAt).toBe(Date.UTC(2026, 10, 17, 23));
    expect(winter.endsAt - winter.startsAt).toBe(24 * 3600_000);
    const springForward = dayWindow('2026-03-29'); // 23-hour day
    expect(springForward.endsAt - springForward.startsAt).toBe(23 * 3600_000);
    const fallBack = dayWindow('2026-10-25'); // 25-hour day
    expect(fallBack.endsAt - fallBack.startsAt).toBe(25 * 3600_000);
  });
});

describe('quest progress', () => {
  const win = { startsAt: 1000, endsAt: 2000 };
  const page = (o: Partial<Page>): Page =>
    ({ id: Math.random().toString(36), parentId: null, depth: 1, action: { kind: 'sane', label: 'x' }, narration: '', quip: '', mood: 'neutral', choices: [], ending: null, imagePrompt: '', imageUrl: null, audioUrl: null, stats: { chaos: 0, karma: 0, mana: 60 }, canon: 100, inventory: [], summary: '', createdAt: 1500, ...o }) as Page;
  const story = (taleId: string, pages: Page[], createdAt = 1500): Story =>
    ({ id: taleId + Math.random(), taleId, lang: 'en', heroName: 'Pip', timeline: '', rootPageId: pages[0].id, currentPageId: pages[0].id, pages: Object.fromEntries(pages.map((p) => [p.id, p])), createdAt, updatedAt: 1500 }) as Story;
  const q = (kind: Quest['kind'], params: Quest['params'] = {}): Quest => ({ slug: kind, title: kind, description: '', kind, params, reward_xp: 50 });

  const stories = [
    story('red-hood', [
      page({ action: { kind: 'boot', label: '' } }),
      page({ action: { kind: 'chaos', label: 'a' }, stats: { chaos: 85, karma: 0, mana: 40 } }),
      page({ action: { kind: 'chaos', label: 'b' } }),
      page({ action: { kind: 'custom', label: 'c' }, ending: { type: 'secret', title: 'x' }, canon: 90 }),
      page({ action: { kind: 'chaos', label: 'yesterday' }, createdAt: 500 }),
    ]),
    story('cinderella', [page({ action: { kind: 'sudo', label: 'd' }, ending: { type: 'cursed', title: 'y' }, canon: 20 })], 500),
  ];

  it('counts only today’s pages, per kind', () => {
    expect(questProgress(q('choice_kind', { choice: 'chaos', count: 3 }), stories, win)).toEqual({ value: 2, target: 3, done: false });
    expect(questProgress(q('close_case'), stories, win).done).toBe(true);
    expect(questProgress(q('close_case', { tale_id: 'three-pigs' }), stories, win).done).toBe(false);
    expect(questProgress(q('ending', { ending: 'secret' }), stories, win).done).toBe(true);
    expect(questProgress(q('ending', { ending: 'death' }), stories, win).done).toBe(false);
    expect(questProgress(q('custom_moves', { count: 2 }), stories, win)).toEqual({ value: 1, target: 2, done: false });
    expect(questProgress(q('pages', { count: 4 }), stories, win)).toEqual({ value: 4, target: 4, done: true }); // boot pages and yesterday do not count
    expect(questProgress(q('stat', { stat: 'chaos', op: 'gte', value: 80 }), stories, win).done).toBe(true);
    expect(questProgress(q('canon_finish', { min_canon: 80 }), stories, win)).toEqual({ value: 1, target: 1, done: true });
    expect(questProgress(q('open_case', { tale_id: 'cinderella' }), stories, win).done).toBe(false); // opened yesterday
    expect(questProgress(q('open_case', { tale_id: 'red-hood' }), stories, win).done).toBe(true);
  });
});

describe('daily ops API', () => {
  const quests = seed.quests.map((x: any) => ({ ...x, status: 'active' }));
  const glitches = seed.glitches.map((x: any) => ({ ...x, status: 'active' }));
  const days = new Map<string, any>();
  const store = {
    quests: async () => quests,
    glitches: async () => glitches,
    plannedDay: async (d: string) => days.get(d) ?? null,
    plannedDays: async () => [...days.entries()].map(([day, p]) => ({ day, ...p })),
    saveQuest: async (x: any) => {
      const i = quests.findIndex((q: any) => q.slug === x.slug);
      if (i >= 0) quests[i] = x;
      else quests.push(x);
    },
    saveGlitch: async (x: any) => {
      glitches.push(x);
    },
    planDay: async (d: string, p: any) => void days.set(d, p),
    unplanDay: async (d: string) => void days.delete(d),
  };
  let server: Server;
  let base = '';
  beforeAll(async () => {
    daily.setDailyStore(store);
    server = createApp().listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => {
    daily.setDailyStore(null);
    server.close();
  });
  const call = async (method: string, url: string, body?: unknown) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };

  it('rotates three quests and one glitch, the same all day', async () => {
    const a = await daily.boardFor('2026-11-18');
    const b = await daily.boardFor('2026-11-18');
    const c = await daily.boardFor('2026-11-19');
    expect(a.source).toBe('rotation');
    expect(a.quests).toHaveLength(3);
    expect(a.glitch).not.toBeNull();
    expect(b.quests.map((q) => q.slug)).toEqual(a.quests.map((q) => q.slug));
    expect(c.quests.map((q) => q.slug).join()).not.toBe(a.quests.map((q) => q.slug).join());
    expect(a.quests[0]).not.toHaveProperty('status');
  });

  it('serves today’s board publicly and lets the console plan a day', async () => {
    const today = bureauDay();
    const pub = await call('GET', '/api/daily');
    expect(pub.status).toBe(200);
    expect(pub.body.day).toBe(today);
    expect(pub.body.quests).toHaveLength(3);

    // Localhost without ADMIN_PASSWORD or a database login passes the admin guard.
    const planned = await call('PUT', `/api/admin/daily/days/${today}`, { briefing: 'Coffee is symbolic.', glitch_slug: 'rhyming-wolves', quest_slugs: ['secret-ending'] });
    expect(planned.status).toBe(200);
    expect(planned.body.today).toMatchObject({ source: 'schedule', briefing: 'Coffee is symbolic.', glitch: { slug: 'rhyming-wolves' } });
    expect(planned.body.today.quests.map((q: Quest) => q.slug)).toEqual(['secret-ending']);
    expect((await call('GET', '/api/daily')).body.quests.map((q: Quest) => q.slug)).toEqual(['secret-ending']);

    expect((await call('PUT', '/api/admin/daily/quests/Bad Slug', { title: 'x' })).status).toBe(400);
    const saved = await call('PUT', '/api/admin/daily/quests/frog-of-the-year', {
      title: 'Frog of the year',
      description: 'Pick the dumb move three times.',
      kind: 'choice_kind',
      params: { choice: 'dumb', count: 3 },
      reward_xp: 30,
      status: 'draft',
    });
    expect(saved.status).toBe(200);
    expect(saved.body.quests.find((q: any) => q.slug === 'frog-of-the-year').status).toBe('draft');

    expect((await call('DELETE', `/api/admin/daily/days/${today}`)).body.today.source).toBe('rotation');
  });
});

describe('glitch of the day in the story prompt', () => {
  const tale = getTale('red-hood')!;
  it('adds a section only when there is a glitch', () => {
    const p = systemPrompt(tale, 'en', 12, null, 'Every wolf speaks only in rhymes today.');
    expect(p).toContain('# Glitch of the day\nToday the whole Public Domain has a glitch: Every wolf speaks only in rhymes today.');
    expect(p.indexOf('# Glitch of the day')).toBeLessThan(p.indexOf('# Before you write'));
    expect(systemPrompt(tale, 'en', 12, null, null)).toBe(systemPrompt(tale, 'en', 12));
    expect(systemPrompt(tale, 'en', 12, null, '  ')).toBe(systemPrompt(tale, 'en', 12));
  });
});

describe('scripts/t1000-daily.mjs', () => {
  it('adds the starter pool without overwriting edits, hex-only', () => {
    const sql: string = buildDailySql(seed);
    expect(sql.match(/INSERT IGNORE INTO ignis_quests /g)).toHaveLength(seed.quests.length);
    expect(sql.match(/INSERT IGNORE INTO ignis_glitches /g)).toHaveLength(seed.glitches.length);
    expect(sql).not.toMatch(/ON DUPLICATE KEY/);
    expect(sql.replace(/X'[0-9a-f]*'/g, '')).not.toMatch(/'/);
  });
});
