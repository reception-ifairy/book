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
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-gm-'));
process.env.DATA_DIR = DATA;
process.env.ANTHROPIC_BASE_URL = fake.url;
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-0000';
delete process.env.ADMIN_PASSWORD;

const { createApp } = await import('../server/app');
const config = await import('../server/config');
const { syncCatalogue } = await import('../server/universe/catalogue');
const { rollD6, actionDigest } = await import('../server/gm/kernel/rng');
const { rollCheck, validateChoice, bandOf, startingApproaches } = await import('../server/gm/kernel/rules');
const { applyEvent, fold } = await import('../server/gm/kernel/events');
const { screenInput, lintPage } = await import('../server/gm/safety');

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

/** A Game Master page: no meters or items in the output, risk on each option. */
const gmPage = (over: Record<string, unknown> = {}) => {
  const { stat_changes: _s, inventory_add: _a, inventory_remove: _r, ...rest } = ifairyPage();
  return { ...rest, choices: [{ label: 'Climb the humming ring', kind: 'phantasia', risk: 'risky' }, { label: 'Listen to the Engineer', kind: 'gnosis', risk: 'safe' }], ...over };
};
const lastBody = () => fake.requests.at(-1)!.body;
const userText = (body: any) => JSON.stringify(body.messages.at(-1).content);

describe('rules kernel', () => {
  const seed = 'ab'.repeat(32);
  it('derives the same dice from the same seed and stream, and fair faces overall', () => {
    expect(rollD6(seed, 's|p|c:1|0', 2)).toEqual(rollD6(seed, 's|p|c:1|0', 2));
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 3000; i++) for (const d of rollD6(seed, `k${i}`, 2)) counts[d - 1]++;
    for (const c of counts) expect(c).toBeGreaterThan(850);
    expect(actionDigest({ custom: '  Hello   World ' })).toBe(actionDigest({ custom: 'hello world' }));
  });

  it('bands totals and asks for the right picks', () => {
    expect([bandOf(12), bandOf(10), bandOf(9), bandOf(7), bandOf(6), bandOf(2)]).toEqual(['bright', 'bright', 'but', 'but', 'twist', 'twist']);
    const state = { v: 1 as const, approaches: startingApproaches('logos'), conditions: ['Strained', 'Separated'], facts: [], rollCount: 0 };
    const roll = rollCheck({ seed, streamKey: 'x', id: 'r1', approach: 'logos', risk: 'high', intent: 'test', state });
    expect(roll.mods.reduce((s, m) => s + m.value, 0)).toBe(0); // +2 approach, -1 high risk, -1 conditions
    const fake = { ...roll, band: 'but' as const, options: rollCheck({ seed, streamKey: 'y', id: 'r2', approach: 'logos', risk: 'standard', intent: '', state: { ...state, conditions: [] } }).options };
    if (fake.options.some((o) => o.kind === 'cost')) {
      expect(validateChoice(fake, ['drain', 'insight'])).toBeNull();
      expect(validateChoice(fake, ['drain'])).toMatch(/exactly 1 benefit, 1 cost/);
    }
  });

  it('folds events purely', () => {
    const w = { stats: { chaos: 0, karma: 0, mana: 60 }, inventory: [], gm: { v: 1 as const, approaches: startingApproaches('mythos'), conditions: [], facts: [], rollCount: 0 } };
    const end = fold(w, [{ type: 'meter', meter: 'etherium', delta: -8, cause: 't' }, { type: 'item_add', name: 'glyph', cause: 't' }, { type: 'condition_add', name: 'Strained' }]);
    expect(end.stats.mana).toBe(52);
    expect(end.inventory).toEqual(['glyph']);
    expect(w.stats.mana).toBe(60);
    expect(applyEvent(w, { type: 'meter', meter: 'dissonance', delta: -50, cause: 't' }).stats.chaos).toBe(0);
  });
});

describe('safety', () => {
  it('removes personal details and notices distress before anything stores them', () => {
    const s = screenInput('my name is Tom Smith and I am 12 years old, I live in Leeds. Nobody likes me');
    expect(s.text).not.toMatch(/Tom|12|Leeds/);
    expect(s).toMatchObject({ privacy: true, distress: true });
    expect(screenInput('I open the Portal').privacy).toBe(false);
  });

  it('lints banned names, personal questions, early endings and the choice contract', () => {
    const page = { narration: 'Zeus appears.', narrator_aside: 'How old are you?', free_form_prompt: '', choices: [{ label: 'a', kind: 'logos' }, { label: 'b', kind: 'logos' }], ending: null };
    const issues = lintPage(page, 2);
    expect(issues.join(' ')).toMatch(/Zeus/);
    expect(issues.join(' ')).toMatch(/personal details/);
    expect(issues.join(' ')).toMatch(/different force/);
    expect(lintPage({ ...page, narration: 'Fine.', narrator_aside: '', choices: [], ending: { type: 'canon', title: 'x' } }, 2).join(' ')).toMatch(/Do not end/);
  });
});

describe('playing with the Game Master', () => {
  let story: any;
  let root: any;

  it('starts with a committed seed, the chosen strongest force and the tools on the request', async () => {
    fake.enqueue(gmPage());
    const res = await call('POST', '/api/story', { world: 'ifairy', adventureId: 'hook-void-realm', lang: 'en', heroName: 'Nova', strongest: 'phantasia' });
    expect(res.status).toBe(200);
    story = res.body;
    root = story.pages[story.currentPageId];
    expect(story.gm).toBe(true);
    expect(story.gmCommit).toMatch(/^[0-9a-f]{64}$/);
    expect(story.gmSecret).toBeUndefined();
    expect(root.gm.state.approaches.phantasia).toBe(2);
    expect(root.choices.map((c: any) => c.risk)).toEqual(['risky', 'safe']);
    expect(root.stats).toEqual({ chaos: 0, karma: 0, mana: 60 }); // no tool calls, no change

    const body = lastBody();
    expect(body.tools.map((t: any) => t.name)).toEqual([
      'roll_check', 'choose_outcome', 'grant_item', 'drop_item', 'adjust_meter', 'search_canon', 'add_canon_claim',
      'get_npc', 'npc_remember', 'update_relationship', 'reveal_secret', 'update_quest', 'schedule_consequence', 'advance_time', 'tick_clock', 'spread_rumour',
    ]);
    expect(body.tools.every((t: any) => t.strict === true && t.input_schema.additionalProperties === false)).toBe(true);
    // The API rejects numeric bounds in strict tool schemas (400 "properties maximum, minimum are not supported").
    expect(JSON.stringify(body.tools)).not.toMatch(/"(minimum|maximum|exclusiveMinimum|exclusiveMaximum|\$schema)"/);
    expect(body.tool_choice).toEqual({ type: 'auto' });
    expect(body.system[0].text).toContain('no tool call, no mechanical outcome');
    expect(body.messages.at(-1).content.at(-1).cache_control).toEqual({ type: 'ephemeral' });
    expect(userText(body)).toContain('GM CONTEXT');
  });

  it('rolls a risky option in code first, and applies only what the tools did', async () => {
    fake.requests.length = 0;
    fake.enqueue(
      toolUse(['roll_check', { approach: 'phantasia', risk: 'standard', intent: 'climb', helper_npc: null }]),
      gmPage(),
    );
    // The outcome is picked by the narrator in a second tool round; it needs the roll's band, so script it after seeing it.
    const res = await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[0].id });
    expect(res.status).toBe(200);
    const page = res.body.page;
    expect(userText(fake.requests[0].body)).toContain('PRE-ROLLED CHECK r1');
    expect(page.gm.rolls).toHaveLength(1);
    const roll = page.gm.rolls[0];
    expect(roll).toMatchObject({ id: 'r1', approach: 'phantasia', pre: true, auto: true });
    expect(roll.total).toBe(roll.dice[0] + roll.dice[1] + 2);
    // roll_check returned the pre-roll, not a second roll; tool results came back in one user message.
    const toolResult = JSON.parse(fake.requests[1].body.messages.at(-1).content[0].content);
    expect(toolResult.roll_id).toBe('r1');
    // Not resolved by the narrator, so the kernel applied its gentlest legal outcome; meters follow only from events.
    const meterSum = page.gm.events.filter((e: any) => e.type === 'meter' && e.meter === 'etherium').reduce((s: number, e: any) => s + e.delta, 0);
    expect(page.stats.mana).toBe(60 + meterSum);
    expect(page.inventory).toEqual([]);
  });

  it('gives the same dice after a rewind and the same move', async () => {
    const first = (await call('GET', `/api/story/${story.id}`)).body;
    const firstRoll = Object.values(first.pages).find((p: any) => p.parentId === root.id && p.gm.rolls.length) as any;
    await call('POST', `/api/story/${story.id}/goto`, { pageId: root.id });
    fake.enqueue(gmPage());
    const again = await call('POST', `/api/story/${story.id}/act`, { pageId: root.id, choiceId: root.choices[0].id });
    expect(again.body.page.gm.rolls[0].dice).toEqual(firstRoll.gm.rolls[0].dice);
  });

  it('lets the narrator pick outcomes, grant items, record facts, and enforces the limits', async () => {
    const res0 = await call('GET', `/api/story/${story.id}`);
    const current = res0.body.pages[res0.body.currentPageId];
    fake.requests.length = 0;
    fake.enqueue(
      toolUse(['roll_check', { approach: 'logos', risk: 'low', intent: 'map the ring', helper_npc: null }], ['roll_check', { approach: 'logos', risk: 'low', intent: 'again', helper_npc: null }], ['roll_check', { approach: 'logos', risk: 'low', intent: 'a third', helper_npc: null }]),
      toolUse(['grant_item', { name: 'tuning glyph', reason: 'found on the ring' }], ['add_canon_claim', { subject: 'The ring', text: 'The ring hums lower near the Void Realm.', visibility: 'party', ref_handle: 'C1' }], ['add_canon_claim', { subject: 'The Engineer', text: 'She once sealed a portal alone.', visibility: 'gm_only', ref_handle: null }]),
      gmPage(),
    );
    const res = await call('POST', `/api/story/${story.id}/act`, { pageId: current.id, custom: 'I study the ring and look for a pattern' });
    expect(res.status).toBe(200);
    const page = res.body.page;
    const results = fake.requests[1].body.messages.at(-1).content;
    expect(results).toHaveLength(3);
    expect(results[2].is_error).toBe(true);
    expect(results[2].content).toMatch(/at most 2 times/);
    expect(page.gm.rolls).toHaveLength(2); // the third roll_check was refused
    expect(page.inventory).toContain('tuning glyph');
    // The gm_only fact is in the stored story but never sent to the browser.
    expect(page.gm.state.facts.map((f: any) => f.text)).toEqual(['The ring hums lower near the Void Realm.']);
    const saved = JSON.parse(fs.readFileSync(path.join(DATA, 'stories', `${story.id}.json`), 'utf8'));
    expect(saved.pages[page.id].gm.state.facts).toHaveLength(2);
    expect(saved.gmSecret.seed).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(res.body.story)).not.toContain('sealed a portal alone');
  });

  it('forces the last round to answer without tools, and repairs a page once', async () => {
    config.saveConfig({ ...config.getConfig(), gm: { ...config.getConfig().gm, maxRounds: 2 } });
    const s = (await call('GET', `/api/story/${story.id}`)).body;
    const current = s.pages[s.currentPageId];
    fake.requests.length = 0;
    fake.enqueue(toolUse(['adjust_meter', { meter: 'harmony', delta: 4, cause: 'kindness' }]), gmPage({ narration: 'Zeus waves.' }), gmPage());
    const res = await call('POST', `/api/story/${story.id}/act`, { pageId: current.id, choiceId: current.choices[1].id });
    expect(res.status).toBe(200);
    expect(fake.requests.map((r) => r.body.tool_choice.type)).toEqual(['auto', 'none', 'none']);
    expect(JSON.stringify(fake.requests[2].body.messages.at(-1))).toMatch(/Zeus/);
    expect(res.body.page.narration).not.toMatch(/Zeus/);
    expect(res.body.page.stats.karma).toBe(current.stats.karma + 4);
    // Earlier messages are never edited between rounds: each request extends the previous one.
    const [a, b] = [fake.requests[1].body.messages, fake.requests[2].body.messages];
    expect(JSON.stringify(b.slice(0, a.length))).toBe(JSON.stringify(a));
    config.saveConfig({ ...config.getConfig(), gm: { ...config.getConfig().gm, maxRounds: 4 } });
  });

  it('removes personal details from the player\'s words before storing or sending them', async () => {
    const s = (await call('GET', `/api/story/${story.id}`)).body;
    const current = s.pages[s.currentPageId];
    fake.requests.length = 0;
    fake.enqueue(gmPage());
    const res = await call('POST', `/api/story/${story.id}/act`, { pageId: current.id, custom: 'my name is Tom and I am 12 years old. I feel so sad, nobody likes me' });
    expect(res.body.page.action.label).not.toMatch(/Tom|12/);
    expect(res.body.page.safety).toEqual({ privacy: true, distress: true });
    const sent = userText(fake.requests[0].body);
    expect(sent).not.toMatch(/Tom|12 years/);
    expect(sent).toContain('DISTRESS');
  });

  it('has a second model review pages written from the player\'s own words, with one repair', async () => {
    config.saveConfig({ ...config.getConfig(), gm: { ...config.getConfig().gm, outputCheck: 'custom' } });
    const s = (await call('GET', `/api/story/${story.id}`)).body;
    const current = s.pages[s.currentPageId];
    fake.requests.length = 0;
    fake.enqueue(gmPage(), { ok: false, issue: 'The aside mocks the reader.' }, gmPage({ narrator_aside: 'A kinder aside.' }), { ok: true, issue: null });
    const res = await call('POST', `/api/story/${story.id}/act`, { pageId: current.id, custom: 'I try to sing to the portal' });
    expect(res.status).toBe(200);
    // The rewritten page is reviewed again; a second failure would refuse the page.
    expect(fake.requests.map((r) => r.body.model)).toEqual(['claude-opus-5-5', 'claude-haiku-5-5', 'claude-opus-5-5', 'claude-haiku-5-5']);
    expect(fake.requests[1].body.fallbacks).toBeUndefined();
    expect(JSON.stringify(fake.requests[2].body.messages.at(-1))).toContain('mocks the reader');
    expect(res.body.page.quip).toBe('A kinder aside.');
    config.saveConfig({ ...config.getConfig(), gm: { ...config.getConfig().gm, outputCheck: 'off' } });
  });

  it('passes the audit: dice follow from the seed, state from the events', async () => {
    const audit = await call('GET', `/api/admin/story/${story.id}/audit`);
    expect(audit.body.problems).toEqual([]);
    expect(audit.body.rolls).toBeGreaterThanOrEqual(4);
    // Tampering with a stored roll is caught.
    const saved = JSON.parse(fs.readFileSync(path.join(DATA, 'stories', `${story.id}.json`), 'utf8'));
    const withRoll = Object.values(saved.pages).find((p: any) => p.gm.rolls.length) as any;
    const { getStory } = await import('../server/story/store');
    const live = getStory(story.id)!.pages[withRoll.id].gm!.rolls[0];
    live.dice = [live.dice[0] === 6 ? 5 : 6, live.dice[1]];
    const tampered = await call('GET', `/api/admin/story/${story.id}/audit`);
    expect(tampered.body.problems.join(' ')).toMatch(/do not follow from the seed/);
  });

  it('keeps stories started without the Game Master as plain narrator stories', async () => {
    config.saveConfig({ ...config.getConfig(), gm: { ...config.getConfig().gm, enabled: false } });
    fake.enqueue(ifairyPage());
    const res = await call('POST', '/api/story', { world: 'ifairy', adventureId: 'saga-1', lang: 'en', heroName: 'Nova' });
    expect(res.body.gm).toBeUndefined();
    expect(lastBody().tools).toBeUndefined();
    config.saveConfig({ ...config.getConfig(), gm: { ...config.getConfig().gm, enabled: true } });
    const root2 = res.body.pages[res.body.currentPageId];
    fake.enqueue(ifairyPage());
    const step = await call('POST', `/api/story/${res.body.id}/act`, { pageId: root2.id, choiceId: root2.choices[0].id });
    expect(step.status).toBe(200);
    expect(lastBody().tools).toBeUndefined();
  });
});
