import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { refusal, samplePage, startFakeAnthropic } from './fakeAnthropic';
import { XP, rankFor, RANKS } from '../shared/xp';
import { bureauDay } from '../shared/daily';
import { suspectOfDay, MAX_QUESTIONS } from '../shared/suspects';
import { verdictKey } from '../shared/dailyPack';
import { getTale } from '../shared/tales';

// Fake Claude, a throwaway data dir and no database: agents live in the memory store.
const fake = await startFakeAnthropic();
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-agents-'));
process.env.ANTHROPIC_BASE_URL = fake.url;
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-0000';
delete process.env.ADMIN_PASSWORD;
delete process.env.T1000_DATABASE_URL;

const { createApp } = await import('../server/app');
const config = await import('../server/config');
const store = await import('../server/agents/store');
const daily = await import('../server/daily');
const { systemPrompt } = await import('../server/story/prompts');
config.saveConfig({ ...config.getConfig(), limits: { actionsPerMinute: 500, imagesPerDay: 10 } });

let server: Server;
let base = '';
beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  daily.setDailyStore(null);
  server.close();
  await fake.close();
});
beforeEach(() => store.setAgentStore(store.memoryAgentStore()));

const call = async (method: string, url: string, body?: unknown, key?: string) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...(key ? { authorization: `Agent ${key}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};
const enlist = async (codename = 'Pixel Pip', lang = 'en') => {
  const r = await call('POST', '/api/agent/enlist', { codename, lang });
  expect(r.status).toBe(200);
  return r.body as { agent: any; key: string };
};

describe('ranks', () => {
  it('maps XP to ranks with progress to the next one', () => {
    expect(rankFor(0)).toMatchObject({ level: 1, title: 'Rookie', next: 100 });
    expect(rankFor(150)).toMatchObject({ level: 2, title: 'Junior Patcher', from: 100, next: 300, progress: 0.25 });
    expect(rankFor(999_999)).toMatchObject({ level: RANKS.length, next: null, progress: 1 });
  });
});

describe('agents', () => {
  it('enlists with a codename, shows the key once, logs in with it (in any case or spacing)', async () => {
    const { agent, key } = await enlist();
    expect(key).toMatch(/^ARB-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(agent).toMatchObject({ codename: 'Pixel Pip', xp: 0 });
    expect(agent).not.toHaveProperty('keyHash');
    const login = await call('POST', '/api/agent/login', { key: key.toLowerCase().replace(/-/g, ' ') });
    expect(login.body.agent.id).toBe(agent.id);
    expect((await call('POST', '/api/agent/login', { key: 'ARB-0000-0000-0000-0000' })).status).toBe(401);
    expect((await call('POST', '/api/agent/enlist', { codename: '<script>' })).status).toBe(400);
    expect((await call('GET', '/api/agent/me')).status).toBe(401);
  });

  it('owns its cases: XP for pages, typed moves, endings and new endings, each paid once', async () => {
    const { agent, key } = await enlist();
    const start = await call('POST', '/api/story', { taleId: 'red-hood', lang: 'en' }, key);
    expect(start.status).toBe(200);
    expect(start.body).toMatchObject({ agentId: agent.id, heroName: 'Pixel Pip' });
    const story = start.body;

    // Another agent (or nobody) may read the case but not play it.
    const other = await enlist('Snoop');
    expect((await call('GET', `/api/story/${story.id}`)).status).toBe(200);
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId: story.currentPageId, custom: 'hi' }, other.key)).status).toBe(403);
    expect((await call('POST', `/api/story/${story.id}/act`, { pageId: story.currentPageId, custom: 'hi' })).status).toBe(403);

    const step = await call('POST', `/api/story/${story.id}/act`, { pageId: story.currentPageId, custom: 'I explain the firewall' }, key);
    expect(step.status).toBe(200);
    const sources = step.body.xp.gained.map((g: any) => g.source);
    expect(sources).toEqual(expect.arrayContaining(['page', 'move']));

    fake.enqueue(samplePage({ ending: { type: 'secret', title: 'The Wolf Opens a Bakery' }, choices: [] }));
    const end = await call('POST', `/api/story/${story.id}/act`, { pageId: step.body.page.id, choiceId: step.body.page.choices[0].id }, key);
    const gained = end.body.xp.gained;
    expect(gained.find((g: any) => g.source === 'ending').amount).toBe(XP.endingCase + XP.endingBonus.secret);
    expect(gained.find((g: any) => g.source === 'discovery').amount).toBe(XP.newEnding);

    const me = (await call('GET', '/api/agent/me', undefined, key)).body;
    expect(me.endings['red-hood']).toEqual(['secret']);
    expect(me.cases[0]).toMatchObject({ storyId: story.id, endingType: 'secret', format: 'case' });
    // Streak (first activity today) + page + move + page + ending + discovery.
    const expected = XP.streakStep + XP.page * 2 + XP.customMove + XP.endingCase + XP.endingBonus.secret + XP.newEnding;
    expect(me.agent.xp).toBe(expected);
    expect(me.todayXp).toBe(expected);
    expect(me.rank.title).toBe(rankFor(expected).title);
    expect(me.feed.length).toBeGreaterThanOrEqual(5);

    // Paying again for the same ref does nothing.
    expect(await store.agentStore().award(agent.id, { ref: `ending:${story.id}:${end.body.page.id}`, source: 'ending', amount: 999, label: 'x' })).toBe(false);
    expect((await call('GET', '/api/agent/me', undefined, key)).body.agent.xp).toBe(expected);
  });

  it('caps page XP per day', async () => {
    const { key } = await enlist();
    let story = (await call('POST', '/api/story', { taleId: 'three-pigs', lang: 'en' }, key)).body;
    let pageXp = 0;
    for (let i = 0; i < 10; i++) {
      const r = await call('POST', `/api/story/${story.id}/act`, { pageId: story.currentPageId, choiceId: story.pages[story.currentPageId].choices[0].id }, key);
      story = r.body.story;
      pageXp += r.body.xp.gained.filter((g: any) => g.source === 'page').reduce((n: number, g: any) => n + g.amount, 0);
    }
    expect(pageXp).toBe(XP.pageDailyCap);
  });

  it('claims cases played before enlisting, never someone else’s', async () => {
    const anon = (await call('POST', '/api/story', { taleId: 'cinderella', lang: 'en', heroName: 'Anon' })).body;
    const { key } = await enlist();
    const owned = (await call('POST', '/api/story', { taleId: 'red-hood', lang: 'en' }, (await enlist('Other')).key)).body;
    expect((await call('POST', '/api/agent/claim', { storyIds: [anon.id, owned.id, 'nope-nope'] }, key)).body).toEqual({ claimed: 1 });
    expect((await call('GET', '/api/agent/me', undefined, key)).body.cases.map((c: any) => c.storyId)).toEqual([anon.id]);
  });

  it('pays a Daily ops quest once it is done, from the agent’s own cases', async () => {
    daily.setDailyStore({
      quests: async () => [{ slug: 'open-any', title: 'Open a case', description: 'x', kind: 'open_case', params: {}, reward_xp: 40, status: 'active' }],
      glitches: async () => [],
      plannedDay: async () => null,
      plannedDays: async () => [],
      saveQuest: async () => {},
      saveGlitch: async () => {},
      planDay: async () => {},
      unplanDay: async () => {},
    });
    const { key } = await enlist();
    expect((await call('GET', '/api/agent/me', undefined, key)).body.quests['open-any']).toMatchObject({ done: false, claimed: false });
    await call('POST', '/api/story', { taleId: 'red-hood', lang: 'en' }, key);
    const me = (await call('GET', '/api/agent/me', undefined, key)).body;
    expect(me.quests['open-any']).toMatchObject({ done: true, claimed: true });
    expect(me.feed.some((f: any) => f.source === 'quest' && f.amount === 40)).toBe(true);
    daily.setDailyStore(null);
  });
});

describe('quick cases', () => {
  it('are short: their own page limit and a quick-case section; main cases keep the old prompt', () => {
    const quick = getTale('latency-race')!;
    const p = systemPrompt(quick, 'en', quick.maxDepth!);
    expect(p).toContain('# Quick case');
    expect(p).toContain('Never end before depth 3');
    expect(systemPrompt(getTale('red-hood')!, 'en', 12)).not.toContain('# Quick case');
    expect(systemPrompt(getTale('red-hood')!, 'en', 12)).toContain('Never end before depth 4');
  });

  it('use the quick ending XP', async () => {
    const { key } = await enlist();
    const story = (await call('POST', '/api/story', { taleId: 'false-positive', lang: 'en' }, key)).body;
    const req = fake.requests.at(-1);
    expect(req.body.system[0].text).toContain('# Quick case');
    fake.enqueue(samplePage({ ending: { type: 'canon', title: 'Alarm Tuned' }, choices: [] }));
    const end = await call('POST', `/api/story/${story.id}/act`, { pageId: story.currentPageId, choiceId: story.pages[story.currentPageId].choices[0].id }, key);
    expect(end.body.xp.gained.find((g: any) => g.source === 'ending').amount).toBe(XP.endingQuick + XP.endingBonus.canon);
  });
});

const quizOut = {
  title: 'Morning Check',
  intro: 'Hello Agent.',
  questions: [0, 1, 2].map((i) => ({
    question: `Q${i}?`,
    answers: ['A', 'B', 'C'].map((l) => ({ text: `${l}${i}`, outcome: `Outcome ${l}${i}` })),
    approved_index: i,
  })),
  verdicts: { A: { title: 'Kettle', text: 'a' }, B: { title: 'Owl', text: 'b' }, C: { title: 'Wizard', text: 'c' }, mixed: { title: 'Toaster', text: 'm' } },
};
const incidentOut = {
  title: 'Porridge Ransom',
  tale_id: 'just-right-server',
  report: 'Field report.',
  choices: [
    { label: 'Pay', outcome: 'Paid.', ending_title: 'Negotiator', xp: 25 },
    { label: 'Backup', outcome: 'Restored.', ending_title: 'Backup Hero', xp: 999 },
    { label: 'Cats', outcome: 'Cats.', ending_title: 'Tamer', xp: 1 },
  ],
  signoff: 'Filed.',
};

describe('daily pack', () => {
  it('quiz: written once by Claude, answers hidden until picked, in order, one per question, then a verdict', async () => {
    const { key } = await enlist();
    fake.enqueue(quizOut);
    const before = fake.requests.length;
    const first = (await call('GET', '/api/agent/daily/quiz', undefined, key)).body;
    expect(first.quiz.title).toBe('Morning Check');
    expect(JSON.stringify(first.quiz)).not.toContain('Outcome');
    expect(JSON.stringify(first.quiz)).not.toContain('approved');
    expect(first.answers).toEqual([]);

    expect((await call('POST', '/api/agent/daily/quiz/answer', { q: 1, letter: 'A' }, key)).status).toBe(409);
    const a0 = (await call('POST', '/api/agent/daily/quiz/answer', { q: 0, letter: 'A' }, key)).body;
    expect(a0.state.answers[0]).toMatchObject({ letter: 'A', outcome: 'Outcome A0', approved: true, xp: XP.quizAnswer + XP.quizApproved });
    expect((await call('POST', '/api/agent/daily/quiz/answer', { q: 0, letter: 'B' }, key)).status).toBe(409);
    await call('POST', '/api/agent/daily/quiz/answer', { q: 1, letter: 'A' }, key);
    const last = (await call('POST', '/api/agent/daily/quiz/answer', { q: 2, letter: 'A' }, key)).body;
    expect(last.state.verdict.title).toBe('Kettle');
    expect(last.xp.gained.map((g: any) => g.source)).toEqual(['quiz', 'quiz']);
    expect(verdictKey(['A', 'B', 'C'])).toBe('mixed');

    // A second agent gets the same stored quiz without another Claude call.
    const other = await enlist('Two');
    expect((await call('GET', '/api/agent/daily/quiz', undefined, other.key)).body.quiz.title).toBe('Morning Check');
    expect(fake.requests.length - before).toBe(1);
    expect((await call('GET', '/api/agent/me', undefined, key)).body.daily.find((d: any) => d.kind === 'quiz')).toMatchObject({ state: 'done' });
  });

  it('incident: one decision a day, XP clamped to the allowed range', async () => {
    const { key } = await enlist();
    fake.enqueue(incidentOut);
    const pub = (await call('GET', '/api/agent/daily/incident', undefined, key)).body;
    expect(pub.incident.choices).toEqual([{ label: 'Pay' }, { label: 'Backup' }, { label: 'Cats' }]);
    const r = (await call('POST', '/api/agent/daily/incident', { choice: 1 }, key)).body;
    expect(r.state.result).toMatchObject({ outcome: 'Restored.', ending_title: 'Backup Hero', xp: XP.incidentMax });
    expect((await call('POST', '/api/agent/daily/incident', { choice: 0 }, key)).status).toBe(409);
  });

  it('falls back to a hand-written pack when Claude fails, in the agent’s language', async () => {
    store.setAgentStore(store.memoryAgentStore());
    const { key } = await enlist('Pip', 'pl');
    fake.enqueue(refusal());
    const quiz = (await call('GET', '/api/agent/daily/quiz', undefined, key)).body;
    expect(quiz.lang).toBe('pl');
    expect(quiz.quiz.questions).toHaveLength(3);
    expect(quiz.quiz.title.length).toBeGreaterThan(3);
  });
});

describe('interrogation', () => {
  const turn = (over: Record<string, unknown> = {}) => ({
    suspect_reply: 'I was at a networking event!',
    ignis_note: 'Vague. Try evidence.',
    truth_delta: 10,
    mood: 'smug',
    confessed: false,
    verdict_title: '',
    verdict_report: '',
    ...over,
  });

  it('runs six questions at most, builds the truth meter and pays at the end', async () => {
    const { key } = await enlist();
    const start = (await call('GET', '/api/agent/interrogation', undefined, key)).body;
    expect(start.suspect.id).toBe(suspectOfDay(bureauDay()).id);
    expect(start.questionsLeft).toBe(MAX_QUESTIONS);
    for (let i = 0; i < MAX_QUESTIONS - 1; i++) fake.enqueue(turn({ truth_delta: 99 }));
    fake.enqueue(turn({ verdict_title: 'Case pending', verdict_report: 'IGNIS files it.' }));
    let last: any;
    for (let i = 0; i < MAX_QUESTIONS; i++) last = (await call('POST', '/api/agent/interrogation/ask', { question: `Where were you ${i}?` }, key)).body;
    expect(last.state.done).toBe(true);
    expect(last.state.truth).toBe(100); // each delta is clamped to 30, the meter to 100
    expect(last.state.verdict.title).toBe('Case pending');
    expect(last.xp.gained.find((g: any) => g.source === 'interrogation').amount).toBe(XP.interrogationBase + 50);
    expect((await call('POST', '/api/agent/interrogation/ask', { question: 'One more?' }, key)).status).toBe(409);
    // The transcript is replayed to Claude, and the suspect's secret sits in the system prompt.
    const req = fake.requests.at(-1);
    expect(req.body.messages.length).toBe(MAX_QUESTIONS * 2 - 1);
    expect(req.body.system[0].text).toContain(suspectOfDay(bureauDay()).secret);
  });

  it('ends early on a confession', async () => {
    const { key } = await enlist();
    fake.enqueue(turn({ truth_delta: 30 }), turn({ truth_delta: 30 }), turn({ truth_delta: 30, confessed: true, verdict_title: 'Full confession', verdict_report: 'Done.' }));
    let last: any;
    for (let i = 0; i < 3; i++) last = (await call('POST', '/api/agent/interrogation/ask', { question: `Evidence ${i}` }, key)).body;
    expect(last.state).toMatchObject({ done: true, questionsLeft: MAX_QUESTIONS - 3 });
    expect(last.state.verdict.title).toBe('Full confession');
  });
});
