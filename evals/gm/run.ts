/**
 * Live Game Master evals (not part of CI; they call Claude and cost real money).
 *
 *   ANTHROPIC_API_KEY=… UNIVERSE_API_KEY=… npm run eval:gm [-- --model claude-haiku-5-5 --only privacy-reminder]
 *
 * Runs every scenario in scenarios.json through the real server code in-process, grades each from
 * the stored trace and page, and writes pass rate, latency and token use to evals/results/.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

interface Step { custom?: string; risky?: boolean }
interface Check { type: string; pattern?: string; where?: 'page' | 'narration'; flag?: 'privacy' | 'distress' }
interface Scenario { id: string; adventure: string; steps: Step[]; checks: Check[] }

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ignis-eval-'));
if (!process.env.ANTHROPIC_API_KEY) throw new Error('Set ANTHROPIC_API_KEY to run the live evals.');

const config = await import('../../server/config');
const { syncCatalogue } = await import('../../server/universe/catalogue');
const { getSnapshot } = await import('../../server/universe/store');
const { startAdventure, ifairyAct } = await import('../../server/story/worlds/ifairy/turn');
const cur = config.getConfig();
config.saveConfig({
  ...cur,
  universe: { ...cur.universe, enabled: true, url: process.env.UNIVERSE_API_URL || cur.universe.url, grant: arg('grant') || 'if-ai' },
  gm: { ...cur.gm, enabled: true, model: arg('model') || '', effort: (arg('effort') as 'low') || 'low', outputCheck: 'custom' },
});
await syncCatalogue();

const scenarios: Scenario[] = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'scenarios.json'), 'utf8')).filter((s: Scenario) => !arg('only') || s.id === arg('only'));
const results: { id: string; pass: boolean; failures: string[]; turnsMs: number[]; usage: Record<string, number> }[] = [];

for (const sc of scenarios) {
  const failures: string[] = [];
  const turnsMs: number[] = [];
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, rounds: 0 };
  try {
    const snap = getSnapshot(sc.adventure);
    if (!snap) throw new Error(`Adventure ${sc.adventure} not synced.`);
    let t0 = Date.now();
    const story = await startAdventure(snap, 'en', 'Eval_Architect', 'logos');
    turnsMs.push(Date.now() - t0);
    let page = story.pages[story.currentPageId];
    for (const step of sc.steps) {
      t0 = Date.now();
      const choice = step.risky ? page.choices.find((c) => c.risk === 'risky') ?? page.choices[0] : undefined;
      page = await ifairyAct(story, page.id, step.custom ? { custom: step.custom } : { choiceId: (choice ?? page.choices[0]).id });
      turnsMs.push(Date.now() - t0);
    }
    for (const p of Object.values(story.pages)) for (const [k, v] of Object.entries(p.gm?.usage ?? {})) if (k in usage) usage[k as keyof typeof usage] += v;
    const text = [page.narration, page.quip, page.freeForm ?? '', ...page.choices.map((c) => c.label)].join('\n');
    for (const c of sc.checks) {
      const where = c.where === 'narration' ? page.narration : text;
      if (c.type === 'rolled' && !page.gm?.rolls.length) failures.push('expected a roll on the last page');
      if (c.type === 'outcome_chosen' && page.gm?.rolls.some((r) => r.auto)) failures.push('the narrator did not choose the outcome (kernel default applied)');
      const hit = c.type === 'no_regex' ? where.match(new RegExp(`.{0,60}(?:${c.pattern}).{0,60}`, 'is')) : null;
      if (hit) failures.push(`matched /${c.pattern}/ in "${hit[0].replace(/\s+/g, ' ')}"`);
      if (c.type === 'regex' && !new RegExp(c.pattern!, 'i').test(where)) failures.push(`did not match /${c.pattern}/`);
      if (c.type === 'safety' && !page.safety?.[c.flag!]) failures.push(`expected safety flag ${c.flag}`);
      if (c.type === 'no_ending' && page.ending) failures.push(`unexpected ending ${page.ending.type}`);
      if (c.type === 'choice_contract' && (page.choices.length !== 2 || page.choices[0].kind === page.choices[1].kind || !page.freeForm)) failures.push('expected two options with different forces and an option C');
    }
  } catch (e) {
    failures.push(`error: ${(e as Error).message}`);
  }
  results.push({ id: sc.id, pass: failures.length === 0, failures, turnsMs, usage });
  console.log(`${failures.length ? '✗' : '✓'} ${sc.id}${failures.length ? `: ${failures.join('; ')}` : ''}`);
}

const all = results.flatMap((r) => r.turnsMs).sort((a, b) => a - b);
const pct = (p: number) => all[Math.min(all.length - 1, Math.floor(p * all.length))] ?? 0;
const summary = {
  model: config.getConfig().gm.model || config.getConfig().story.model,
  passRate: results.filter((r) => r.pass).length / Math.max(1, results.length),
  p50Ms: pct(0.5),
  p95Ms: pct(0.95),
  tokens: results.reduce((s, r) => ({ input: s.input + r.usage.input, output: s.output + r.usage.output, cacheRead: s.cacheRead + r.usage.cacheRead }), { input: 0, output: 0, cacheRead: 0 }),
  results,
};
const outDir = path.join(import.meta.dirname, '..', 'results');
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, `gm-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify(summary, null, 2));
console.log(`\npass ${Math.round(summary.passRate * 100)}% · p50 ${summary.p50Ms} ms · p95 ${summary.p95Ms} ms · ${file}`);
