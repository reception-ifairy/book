import { Router, type Response } from 'express';
import { z } from 'zod';
import { t1000Configured, t1000Pool } from './db';
import { bureauDay, dayWindow, QUEST_KINDS, type DailyBoard, type Glitch, type Quest } from '../shared/daily';
import { TALES } from '../shared/tales';

/**
 * Daily ops: the quest pool, the glitch pool and hand-planned days live in t1000 (db/t1000/003_ignis_daily.sql).
 * A planned day wins; otherwise three quests and one glitch rotate from the active pools, chosen by the date,
 * so every agent sees the same board all day. The board is cached for five minutes.
 */

export interface DailyStore {
  quests(): Promise<(Quest & { status: string })[]>;
  glitches(): Promise<(Glitch & { status: string })[]>;
  plannedDay(day: string): Promise<{ briefing: string | null; glitch_slug: string | null; quest_slugs: string[] } | null>;
  plannedDays(fromDay: string): Promise<{ day: string; briefing: string | null; glitch_slug: string | null; quest_slugs: string[] }[]>;
  saveQuest(q: Quest & { status: string }): Promise<void>;
  saveGlitch(g: Glitch & { status: string }): Promise<void>;
  planDay(day: string, plan: { briefing: string | null; glitch_slug: string | null; quest_slugs: string[] }): Promise<void>;
  unplanDay(day: string): Promise<void>;
}

const json = (v: unknown, fallback: any) => {
  if (v == null) return fallback;
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};
const dayString = (v: unknown) => (v instanceof Date ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}` : String(v).slice(0, 10));

function mariaStore(): DailyStore {
  const q = async (sql: string, params: unknown[] = []) => {
    const [rows] = await (await t1000Pool()).query({ sql, values: params, dateStrings: true } as any);
    return rows as any[];
  };
  return {
    quests: async () =>
      (await q('SELECT slug, title, description, kind, params, reward_xp, status FROM ignis_quests ORDER BY id')).map((r) => ({
        ...r,
        params: json(r.params, {}),
        reward_xp: Number(r.reward_xp),
      })),
    glitches: async () => q('SELECT slug, text, status FROM ignis_glitches ORDER BY id'),
    async plannedDay(day) {
      const [r] = await q('SELECT briefing, glitch_slug, quest_slugs FROM ignis_daily WHERE day = ?', [day]);
      return r ? { briefing: r.briefing ?? null, glitch_slug: r.glitch_slug ?? null, quest_slugs: json(r.quest_slugs, []) } : null;
    },
    plannedDays: async (fromDay) =>
      (await q('SELECT day, briefing, glitch_slug, quest_slugs FROM ignis_daily WHERE day >= ? ORDER BY day LIMIT 60', [fromDay])).map((r) => ({
        day: dayString(r.day),
        briefing: r.briefing ?? null,
        glitch_slug: r.glitch_slug ?? null,
        quest_slugs: json(r.quest_slugs, []),
      })),
    async saveQuest(x) {
      await q(
        `INSERT INTO ignis_quests (slug, title, description, kind, params, reward_xp, status) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), kind = VALUES(kind), params = VALUES(params), reward_xp = VALUES(reward_xp), status = VALUES(status)`,
        [x.slug, x.title, x.description, x.kind, JSON.stringify(x.params ?? {}), x.reward_xp, x.status],
      );
    },
    async saveGlitch(x) {
      await q(`INSERT INTO ignis_glitches (slug, text, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE text = VALUES(text), status = VALUES(status)`, [x.slug, x.text, x.status]);
    },
    async planDay(day, p) {
      await q(
        `INSERT INTO ignis_daily (day, briefing, glitch_slug, quest_slugs) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE briefing = VALUES(briefing), glitch_slug = VALUES(glitch_slug), quest_slugs = VALUES(quest_slugs)`,
        [day, p.briefing, p.glitch_slug, JSON.stringify(p.quest_slugs)],
      );
    },
    async unplanDay(day) {
      await q('DELETE FROM ignis_daily WHERE day = ?', [day]);
    },
  };
}

let store: DailyStore | null = t1000Configured() ? mariaStore() : null;
let cache: { board: DailyBoard; at: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

/** Tests swap in an in-memory store; null turns daily ops off. */
export function setDailyStore(next: DailyStore | null) {
  store = next;
  cache = null;
}

/** Stable pseudo-random order for a day, so rotation is the same for everyone and changes daily. */
function seededPick<T>(items: T[], day: string, n: number): T[] {
  let h = 2166136261;
  for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1_000_000) / 1_000_000;
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

const strip = <T extends { status: string }>({ status: _s, ...rest }: T) => rest;

export async function boardFor(day: string): Promise<DailyBoard> {
  const window = dayWindow(day);
  const empty: DailyBoard = { day, ...window, briefing: null, glitch: null, quests: [], source: 'none' };
  if (!store) return empty;
  const [quests, glitches, planned] = await Promise.all([store.quests(), store.glitches(), store.plannedDay(day)]);
  if (planned) {
    const bySlug = new Map(quests.map((x) => [x.slug, x]));
    return {
      day,
      ...window,
      briefing: planned.briefing,
      glitch: planned.glitch_slug ? (glitches.find((g) => g.slug === planned.glitch_slug) ?? null) : null,
      quests: planned.quest_slugs.map((s) => bySlug.get(s)).filter((x): x is NonNullable<typeof x> => !!x).map(strip),
      source: 'schedule',
    };
  }
  const active = quests.filter((x) => x.status === 'active');
  const glitch = seededPick(glitches.filter((g) => g.status === 'active'), `${day}#glitch`, 1)[0];
  return { day, ...window, briefing: null, glitch: glitch ? strip(glitch) : null, quests: seededPick(active, day, 3).map(strip), source: 'rotation' };
}

/** Today's board, cached. Never throws: a database hiccup only means no board. */
export async function todayBoard(): Promise<DailyBoard> {
  const day = bureauDay();
  if (cache && cache.board.day === day && Date.now() - cache.at < CACHE_MS) return cache.board;
  try {
    const board = await boardFor(day);
    cache = { board, at: Date.now() };
    return board;
  } catch (e) {
    console.error('[daily] could not build the board:', (e as Error).message);
    return { day, ...dayWindow(day), briefing: null, glitch: null, quests: [], source: 'none' };
  }
}

/** The glitch of the day for the story prompt, from the cache only so a page never waits on the database. */
export const cachedGlitch = (): string | null => (cache && cache.board.day === bureauDay() ? (cache.board.glitch?.text ?? null) : null);

// ---------- routes ----------

export const dailyPublic = Router();
dailyPublic.get('/daily', async (_req, res) => res.json(await todayBoard()));

export const dailyAdmin = Router();

const Slug = z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Slug: lowercase letters, digits and dashes.');
const Status = z.enum(['active', 'draft', 'retired']);
const QuestBody = z.object({
  slug: Slug,
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(400),
  kind: z.enum(QUEST_KINDS),
  params: z
    .object({
      tale_id: z.enum(TALES.map((t) => t.id) as [string, ...string[]]).optional(),
      count: z.number().int().min(1).max(50).optional(),
      ending: z.enum(['canon', 'subverted', 'cursed', 'secret', 'death']).optional(),
      choice: z.enum(['sane', 'chaos', 'dumb', 'sudo']).optional(),
      stat: z.enum(['chaos', 'karma', 'mana']).optional(),
      op: z.enum(['gte', 'lte']).optional(),
      value: z.number().int().min(-100).max(100).optional(),
      min_canon: z.number().int().min(0).max(100).optional(),
    })
    .strict(),
  reward_xp: z.number().int().min(0).max(1000),
  status: Status,
});
const GlitchBody = z.object({ slug: Slug, text: z.string().trim().min(5).max(300), status: Status });
const DayParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Day must be YYYY-MM-DD.');
const PlanBody = z.object({
  briefing: z.string().trim().max(300).nullable(),
  glitch_slug: Slug.nullable(),
  quest_slugs: z.array(Slug).max(5),
});

function fail(res: Response, e: unknown) {
  if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message ?? 'Invalid request.' });
  console.error('[daily]', e);
  return res.status(503).json({ error: 'The daily-ops database is not reachable right now.' });
}

const adminView = async () => {
  const today = bureauDay();
  return {
    enabled: !!store,
    today: store ? await boardFor(today) : null,
    quests: store ? await store.quests() : [],
    glitches: store ? await store.glitches() : [],
    planned: store ? await store.plannedDays(today) : [],
    kinds: QUEST_KINDS,
    tales: TALES.map((t) => ({ id: t.id, title: t.title.en })),
  };
};

dailyAdmin.use((_req, res, next) => (store ? next() : res.status(503).json({ error: 'Daily ops need the t1000 database (T1000_DATABASE_URL).' })));
dailyAdmin.get('/', async (_req, res) => {
  try {
    res.json(await adminView());
  } catch (e) {
    fail(res, e);
  }
});
dailyAdmin.put('/quests/:slug', async (req, res) => {
  try {
    const body = QuestBody.parse({ ...req.body, slug: req.params.slug });
    await store!.saveQuest(body);
    cache = null;
    res.json(await adminView());
  } catch (e) {
    fail(res, e);
  }
});
dailyAdmin.put('/glitches/:slug', async (req, res) => {
  try {
    await store!.saveGlitch(GlitchBody.parse({ ...req.body, slug: req.params.slug }));
    cache = null;
    res.json(await adminView());
  } catch (e) {
    fail(res, e);
  }
});
dailyAdmin.put('/days/:day', async (req, res) => {
  try {
    const day = DayParam.parse(req.params.day);
    const plan = PlanBody.parse(req.body);
    await store!.planDay(day, { briefing: plan.briefing ?? null, glitch_slug: plan.glitch_slug ?? null, quest_slugs: plan.quest_slugs });
    cache = null;
    res.json(await adminView());
  } catch (e) {
    fail(res, e);
  }
});
dailyAdmin.delete('/days/:day', async (req, res) => {
  try {
    await store!.unplanDay(DayParam.parse(req.params.day));
    cache = null;
    res.json(await adminView());
  } catch (e) {
    fail(res, e);
  }
});
