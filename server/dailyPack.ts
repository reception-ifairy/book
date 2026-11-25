import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { getConfig, getKey } from './config';
import { anthropicClient, describeAnthropicError } from './providers/anthropic';
import { agentStore, type PackKind } from './agents/store';
import { requireAgent } from './agents/auth';
import { Gains, touchStreak } from './agents/xp';
import { boardFor, todayBoard } from './daily';
import { SEED_INCIDENTS, SEED_QUIZZES } from './dailyPackSeeds';
import { TALES } from '../shared/tales';
import { bureauDay } from '../shared/daily';
import { XP } from '../shared/xp';
import { LETTERS, publicIncident, publicQuiz, verdictKey, type Incident, type IncidentState, type Letter, type Quiz, type QuizState } from '../shared/dailyPack';
import type { Lang } from '../shared/types';

/**
 * The daily pack: a Quiz ABC and an Incident, written by Claude once per Bureau day and language,
 * stored in t1000 (ignis_daily_packs) and served to every agent. Without a key, or if Claude fails,
 * a hand-written seed pack fills in so the board is never empty.
 */

const LANG_NAME: Record<Lang, string> = { en: 'English', pl: 'Polish' };

const QuizOut = z.object({
  title: z.string(),
  intro: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      answers: z.array(z.object({ text: z.string(), outcome: z.string() })),
      approved_index: z.number().int().describe('0, 1 or 2: which answer is the Bureau-approved one'),
    }),
  ),
  verdicts: z.object({
    A: z.object({ title: z.string(), text: z.string() }),
    B: z.object({ title: z.string(), text: z.string() }),
    C: z.object({ title: z.string(), text: z.string() }),
    mixed: z.object({ title: z.string(), text: z.string() }),
  }),
});

const IncidentOut = z.object({
  title: z.string(),
  tale_id: z.string().nullable(),
  report: z.string(),
  choices: z.array(z.object({ label: z.string(), outcome: z.string(), ending_title: z.string(), xp: z.number().int() })),
  signoff: z.string(),
});

const cut = (s: string, n: number) => s.trim().slice(0, n);

/** Turns Claude's quiz into the stored shape; throws if it is not exactly 3 questions of 3 answers. */
export function toQuiz(raw: z.infer<typeof QuizOut>): Quiz {
  if (raw.questions.length < 3 || raw.questions.some((x) => x.answers.length < 3)) throw new Error('quiz has too few questions or answers');
  const verdict = (v: { title: string; text: string }) => ({ title: cut(v.title, 80), text: cut(v.text, 400) });
  return {
    title: cut(raw.title, 100),
    intro: cut(raw.intro, 400),
    questions: raw.questions.slice(0, 3).map((x) => {
      const approved = Math.min(2, Math.max(0, x.approved_index));
      return {
        question: cut(x.question, 240),
        answers: x.answers.slice(0, 3).map((a, i) => ({ letter: LETTERS[i], text: cut(a.text, 160), outcome: cut(a.outcome, 400), approved: i === approved })),
      };
    }),
    verdicts: { A: verdict(raw.verdicts.A), B: verdict(raw.verdicts.B), C: verdict(raw.verdicts.C), mixed: verdict(raw.verdicts.mixed) },
  };
}

export function toIncident(raw: z.infer<typeof IncidentOut>): Incident {
  if (raw.choices.length < 3) throw new Error('incident has too few choices');
  return {
    title: cut(raw.title, 100),
    tale_id: raw.tale_id && TALES.some((t) => t.id === raw.tale_id) ? raw.tale_id : null,
    report: cut(raw.report, 1200),
    choices: raw.choices.slice(0, 3).map((c) => ({
      label: cut(c.label, 120),
      outcome: cut(c.outcome, 700),
      ending_title: cut(c.ending_title, 60),
      xp: Math.min(XP.incidentMax, Math.max(XP.incidentMin, Math.round(c.xp))),
    })),
    signoff: cut(raw.signoff, 300),
  };
}

const VOICE = `You write for ARB · Arcane Rescue Bureau, a choose-your-own-story web game for players aged 12 and up. Old fairy tales from the Public Domain run on enchanted code and keep breaking in hilarious ways; the player is a Bureau agent and IGNIS (a cheeky palm-sized cyber-magic robot with a CRT pixel face and a brass lantern body) is their field assistant. Humour of a good animated family film: absurd, silly, puns, slapstick, easy gaming and tech jokes a 12-year-old gets (lag, low battery, passwords, updates, cookies, Wi-Fi). Cartoon peril only, never scary, gory, mean or romantic; no swearing, no real-world brands, franchises or people. Never decide the player's gender. In Polish this is strict: no gendered past tense ("zrobiłeś", "wygrałaś") and no gendered adjectives or participles about the player ("gotów", "gotowa", "sprytny"); use the present tense ("wygrywasz", "klikasz"), "masz", "udało ci się", "czas na…" or the title "Agent" instead.`;

const taleList = () => TALES.map((t) => `${t.id}: ${t.title.en} (${t.tech})`).join('; ');

async function generate<T extends z.ZodTypeAny>(schema: T, system: string, user: string): Promise<z.infer<T>> {
  const apiKey = getKey('anthropic');
  if (!apiKey) throw new Error('no Anthropic key');
  try {
    const res = await anthropicClient(apiKey).beta.messages.parse({
      model: getConfig().story.model,
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort: 'low', format: betaZodOutputFormat(schema) },
    });
    if (res.stop_reason === 'refusal' || !res.parsed_output) throw new Error('empty or refused');
    return res.parsed_output as z.infer<T>;
  } catch (e) {
    throw new Error(describeAnthropicError(e));
  }
}

async function generateQuiz(day: string, lang: Lang): Promise<Quiz> {
  const glitch = (await boardFor(day).catch(() => null))?.glitch?.text;
  const raw = await generate(
    QuizOut,
    `${VOICE}

Write today's "Quiz ABC": a 1-minute comedy quiz.
- title: a short funny name for today's quiz. intro: 1-2 sentences of IGNIS greeting the player, whom IGNIS calls "Agent" (keep the English word "Agent" in Polish too). Do not mention today's date.
- Exactly 3 questions. Each is a silly situation from a fairy tale or from Bureau life with a tech twist ("A wolf asks for your Wi-Fi password. You…").
- Exactly 3 answers per question (A, B, C), each short (max ~70 characters) and each absurd in a different way. Give each letter its own personality and keep it across all three questions (for example A always reckless, B always overly careful, C always gloriously weird; pick fresh personalities every day), so the final verdict makes sense.
- outcome: for EVERY answer, a 1-2 sentence punchline of what happened because the agent picked it. Every outcome is funny; there are no boring answers.
- approved_index: which answer is "Bureau-approved" (the most sensible one, in a ridiculous way; it may be the weirdest). Vary its position across questions.
- verdicts: a funny final "agent profile" for picking mostly A, mostly B, mostly C (each matching that letter's personality), and for a mix: an invented title in the style "The <adjective> <household object or animal>" (never reuse a title from earlier days) and one or two sentences.
Write everything in ${LANG_NAME[lang]}.`,
    `Variety seed: ${day} (never mention it).${glitch ? ` Today's world glitch (you may joke about it): ${glitch}` : ''}\nTales the Bureau knows: ${taleList()}.\nWrite today's quiz.`,
  );
  return toQuiz(raw);
}

async function generateIncident(day: string, lang: Lang): Promise<Incident> {
  const glitch = (await boardFor(day).catch(() => null))?.glitch?.text;
  const raw = await generate(
    IncidentOut,
    `${VOICE}

Write today's "Incident": a 2-minute one-scene mission.
- title: a punchy case title. tale_id: the id of the tale it happens in (from the list), or null for Bureau HQ.
- report: a field report of 80-120 words, second person, present tense, starting with a short time stamp written in the target language (English "Field report, 07:42.", Polish "Raport z terenu, 7:42."). Never mention the date. A fairy tale has broken in a funny, tech-flavoured way and the agent must act now.
- choices: exactly 3 different ways to handle it (short imperative labels, max ~70 characters). For each: outcome (60-110 words, the funny consequence, always ending on a punchline), ending_title (2-4 words, like a badge), xp between ${XP.incidentMin} and ${XP.incidentMax} (cleverer or kinder solutions earn more; even the silliest earns ${XP.incidentMin}).
- signoff: one sentence of IGNIS filing the case. IGNIS calls the player "Agent" (in English, also in Polish).
Write everything in ${LANG_NAME[lang]}.`,
    `Variety seed: ${day} (never mention it).${glitch ? ` Today's world glitch (weave it in): ${glitch}` : ''}\nTales: ${taleList()}.\nWrite today's incident.`,
  );
  return toIncident(raw);
}

/** Deterministic seed for a day, so a fallback is the same for every agent. */
function seedFor<T>(list: T[], day: string): T {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

const inflight = new Map<string, Promise<any>>();

/** Today's (or a given day's) pack, generating it once if missing. Never throws: falls back to a seed. */
export async function ensurePack(day: string, lang: Lang, kind: 'quiz'): Promise<Quiz>;
export async function ensurePack(day: string, lang: Lang, kind: 'incident'): Promise<Incident>;
export async function ensurePack(day: string, lang: Lang, kind: PackKind): Promise<Quiz | Incident> {
  const store = agentStore();
  const saved = await store.getPack(day, lang, kind).catch(() => null);
  if (saved?.payload) return saved.payload;
  const key = `${day}|${lang}|${kind}`;
  let job = inflight.get(key);
  if (!job) {
    job = (async () => {
      try {
        const payload = kind === 'quiz' ? await generateQuiz(day, lang) : await generateIncident(day, lang);
        await store.savePack({ day, lang, kind, payload, source: 'claude' });
        return payload;
      } catch (e) {
        console.warn(`[daily-pack] ${kind} ${day} ${lang}: using a seed (${(e as Error).message})`);
        const payload = kind === 'quiz' ? seedFor(SEED_QUIZZES[lang], day) : seedFor(SEED_INCIDENTS[lang], day);
        await store.savePack({ day, lang, kind, payload, source: 'seed' }).catch(() => {});
        return payload;
      }
    })().finally(() => inflight.delete(key));
    inflight.set(key, job);
  }
  return job;
}

/** Writes a fresh pack with Claude now (admin), replacing what was there. */
export async function regeneratePack(day: string, lang: Lang, kind: PackKind) {
  const payload = kind === 'quiz' ? await generateQuiz(day, lang) : await generateIncident(day, lang);
  await agentStore().savePack({ day, lang, kind, payload, source: 'claude' });
  return payload;
}

/** Generates today's packs ahead of the first agent (only when a key is configured). */
export async function warmPacks() {
  if (!getKey('anthropic')) return;
  const day = bureauDay();
  for (const lang of ['en', 'pl'] as const) for (const kind of ['quiz', 'incident'] as const) await ensurePack(day, lang, kind as any).catch(() => {});
}

// ---------- player routes (mounted on /api/agent) ----------

export const dailyPackRoutes = Router();
const langOf = (req: Request, fallback: Lang): Lang => (req.query.lang === 'pl' || req.body?.lang === 'pl' ? 'pl' : req.query.lang === 'en' || req.body?.lang === 'en' ? 'en' : fallback);
const fail = (res: Response, e: unknown) => {
  console.error('[daily-pack]', e);
  res.status(500).json({ error: 'The daily pack spell fizzled. Try again in a moment.' });
};

async function quizState(agentId: string, day: string, fallbackLang: Lang): Promise<QuizState & { lang: Lang }> {
  const row = await agentStore().getDaily(agentId, day, 'quiz');
  const lang: Lang = row?.state?.lang ?? fallbackLang;
  const quiz = await ensurePack(day, lang, 'quiz');
  const picks: Letter[] = row?.state?.picks ?? [];
  const answers = picks.map((letter, i) => {
    const a = quiz.questions[i].answers.find((x) => x.letter === letter)!;
    return { letter, outcome: a.outcome, approved: a.approved, xp: XP.quizAnswer + (a.approved ? XP.quizApproved : 0) };
  });
  const done = picks.length >= quiz.questions.length;
  return { lang, quiz: publicQuiz(quiz), answers, verdict: done ? quiz.verdicts[verdictKey(picks)] : null, xp: row?.xp ?? 0 };
}

dailyPackRoutes.get('/daily/quiz', requireAgent, async (req, res) => {
  try {
    res.json(await quizState(req.agent!.id, bureauDay(), langOf(req, req.agent!.lang)));
  } catch (e) {
    fail(res, e);
  }
});

dailyPackRoutes.post('/daily/quiz/answer', requireAgent, async (req, res) => {
  const parsed = z.object({ q: z.number().int().min(0).max(2), letter: z.enum(LETTERS) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Pick A, B or C.' });
  try {
    const agent = req.agent!;
    const day = bureauDay();
    const store = agentStore();
    const row = await store.getDaily(agent.id, day, 'quiz');
    const lang: Lang = row?.state?.lang ?? langOf(req, agent.lang);
    const quiz = await ensurePack(day, lang, 'quiz');
    const picks: Letter[] = [...(row?.state?.picks ?? [])];
    if (parsed.data.q !== picks.length) return res.status(409).json({ error: picks.length >= 3 ? 'Today’s quiz is done. A new one arrives tomorrow.' : 'Answer the questions in order, Agent.' });
    picks.push(parsed.data.letter);
    const answer = quiz.questions[parsed.data.q].answers.find((a) => a.letter === parsed.data.letter)!;

    const g = new Gains(agent);
    await touchStreak(g);
    await g.add(`quiz:${day}:${parsed.data.q}`, 'quiz', XP.quizAnswer + (answer.approved ? XP.quizApproved : 0), answer.approved ? 'Quiz: Bureau-approved answer' : 'Quiz answer');
    const done = picks.length >= quiz.questions.length;
    if (done) await g.add(`quiz:${day}:finish`, 'quiz', XP.quizFinish, `Quiz finished: ${quiz.verdicts[verdictKey(picks)].title}`);
    const quizXp = g.list.filter((x) => x.source === 'quiz').reduce((n, x) => n + x.amount, 0);
    await store.saveDaily(agent.id, day, 'quiz', { state: { lang, picks }, xp: (row?.xp ?? 0) + quizXp, completedAt: done ? Date.now() : null });
    res.json({ state: await quizState(agent.id, day, lang), xp: await g.update() });
  } catch (e) {
    fail(res, e);
  }
});

async function incidentState(agentId: string, day: string, fallbackLang: Lang): Promise<IncidentState & { lang: Lang }> {
  const row = await agentStore().getDaily(agentId, day, 'incident');
  const lang: Lang = row?.state?.lang ?? fallbackLang;
  const incident = await ensurePack(day, lang, 'incident');
  const choice: number | undefined = row?.state?.choice;
  const c = choice === undefined ? null : incident.choices[choice];
  return { lang, incident: publicIncident(incident), result: c ? { choice: choice!, outcome: c.outcome, ending_title: c.ending_title, signoff: incident.signoff, xp: c.xp } : null };
}

dailyPackRoutes.get('/daily/incident', requireAgent, async (req, res) => {
  try {
    res.json(await incidentState(req.agent!.id, bureauDay(), langOf(req, req.agent!.lang)));
  } catch (e) {
    fail(res, e);
  }
});

dailyPackRoutes.post('/daily/incident', requireAgent, async (req, res) => {
  const parsed = z.object({ choice: z.number().int().min(0).max(2) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Pick one of the three moves.' });
  try {
    const agent = req.agent!;
    const day = bureauDay();
    const store = agentStore();
    const row = await store.getDaily(agent.id, day, 'incident');
    if (row?.completedAt) return res.status(409).json({ error: 'Today’s incident is already filed. A new one arrives tomorrow.' });
    const lang: Lang = row?.state?.lang ?? langOf(req, agent.lang);
    const incident = await ensurePack(day, lang, 'incident');
    const c = incident.choices[parsed.data.choice];
    const g = new Gains(agent);
    await touchStreak(g);
    await g.add(`incident:${day}`, 'incident', c.xp, `Incident: ${c.ending_title}`);
    await store.saveDaily(agent.id, day, 'incident', { state: { lang, choice: parsed.data.choice }, xp: c.xp, completedAt: Date.now() });
    res.json({ state: await incidentState(agent.id, day, lang), xp: await g.update() });
  } catch (e) {
    fail(res, e);
  }
});

// ---------- admin routes (mounted on /api/admin/packs) ----------

export const packsAdmin = Router();
const DayParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const LangParam = z.enum(['en', 'pl']);
const KindParam = z.enum(['quiz', 'incident']);

const QuizBody: z.ZodType<Quiz> = z.object({
  title: z.string().trim().min(1).max(100),
  intro: z.string().trim().max(400),
  questions: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(240),
        answers: z
          .array(z.object({ letter: z.enum(LETTERS), text: z.string().trim().min(1).max(160), outcome: z.string().trim().min(1).max(400), approved: z.boolean() }))
          .length(3),
      }),
    )
    .length(3),
  verdicts: z.object(Object.fromEntries(['A', 'B', 'C', 'mixed'].map((k) => [k, z.object({ title: z.string().trim().min(1).max(80), text: z.string().trim().min(1).max(400) })])) as any),
}) as any;
const IncidentBody: z.ZodType<Incident> = z.object({
  title: z.string().trim().min(1).max(100),
  tale_id: z.string().nullable(),
  report: z.string().trim().min(1).max(1200),
  choices: z
    .array(z.object({ label: z.string().trim().min(1).max(120), outcome: z.string().trim().min(1).max(700), ending_title: z.string().trim().min(1).max(60), xp: z.number().int().min(XP.incidentMin).max(XP.incidentMax) }))
    .length(3),
  signoff: z.string().trim().max(300),
}) as any;

packsAdmin.get('/', async (req, res) => {
  try {
    const day = DayParam.safeParse(req.query.day).data ?? bureauDay();
    const out: any[] = [];
    for (const lang of ['en', 'pl'] as const)
      for (const kind of ['quiz', 'incident'] as const) {
        const row = await agentStore().getPack(day, lang, kind);
        out.push({ day, lang, kind, source: row?.source ?? null, payload: row?.payload ?? null, createdAt: row?.createdAt ?? null });
      }
    res.json({ day, today: bureauDay(), packs: out, ready: !!getKey('anthropic'), board: (await todayBoard()).day === day });
  } catch (e) {
    fail(res, e);
  }
});

packsAdmin.put('/:day/:lang/:kind', async (req, res) => {
  try {
    const day = DayParam.parse(req.params.day);
    const lang = LangParam.parse(req.params.lang);
    const kind = KindParam.parse(req.params.kind);
    const parsed = (kind === 'quiz' ? QuizBody : IncidentBody).safeParse(req.body?.payload);
    if (!parsed.success) return res.status(400).json({ error: `${parsed.error.issues[0]?.path.join('.')}: ${parsed.error.issues[0]?.message}` });
    if (kind === 'quiz' && (parsed.data as Quiz).questions.some((q) => q.answers.filter((a) => a.approved).length !== 1))
      return res.status(400).json({ error: 'Every question needs exactly one approved answer.' });
    await agentStore().savePack({ day, lang, kind, payload: parsed.data, source: 'edited' });
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Bad day, language or kind.' });
    fail(res, e);
  }
});

packsAdmin.post('/:day/:lang/:kind/regenerate', async (req, res) => {
  try {
    const day = DayParam.parse(req.params.day);
    const lang = LangParam.parse(req.params.lang);
    const kind = KindParam.parse(req.params.kind);
    if (!getKey('anthropic')) return res.status(503).json({ error: 'No Anthropic key configured.' });
    res.json({ ok: true, payload: await regeneratePack(day, lang, kind) });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Bad day, language or kind.' });
    res.status(502).json({ error: (e as Error).message });
  }
});
