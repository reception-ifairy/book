import { t1000Configured, t1000Pool } from '../db';
import type { Agent, AgentCase, DailyKind, XpEntry } from '../../shared/agent';
import type { Lang } from '../../shared/types';
import type { XpSource } from '../../shared/xp';

/**
 * Where agents, their XP ledger, their cases and their daily plays live: MariaDB t1000
 * (db/t1000/004_ignis_agents.sql) in production, memory in tests and in local dev without a database.
 */

export interface AwardInput {
  ref: string;
  source: XpSource;
  amount: number;
  label: string;
}

export interface DailyRow {
  state: any;
  xp: number;
  completedAt: number | null;
}

export type PackKind = 'quiz' | 'incident';
export interface PackRow {
  day: string;
  lang: Lang;
  kind: PackKind;
  payload: any;
  source: 'claude' | 'seed' | 'edited';
  createdAt: number;
}

export interface AgentStore {
  create(a: { id: string; codename: string; tag: string; keyHash: string; lang: Lang }): Promise<Agent>;
  byKeyHash(hash: string): Promise<Agent | null>;
  byId(id: string): Promise<Agent | null>;
  /** Adds XP once per ref. Returns false when that ref was already awarded. */
  award(agentId: string, a: AwardInput): Promise<boolean>;
  xpSince(agentId: string, since: number, source?: XpSource): Promise<number>;
  refsLike(agentId: string, prefix: string): Promise<string[]>;
  feed(agentId: string, limit: number): Promise<XpEntry[]>;
  setStreak(agentId: string, day: string, streak: number): Promise<void>;
  upsertCase(agentId: string, c: AgentCase): Promise<void>;
  cases(agentId: string): Promise<AgentCase[]>;
  getDaily(agentId: string, day: string, kind: DailyKind): Promise<DailyRow | null>;
  saveDaily(agentId: string, day: string, kind: DailyKind, row: DailyRow): Promise<void>;
  dailyFor(agentId: string, day: string): Promise<(DailyRow & { kind: DailyKind })[]>;
  getPack(day: string, lang: Lang, kind: PackKind): Promise<PackRow | null>;
  savePack(p: Omit<PackRow, 'createdAt'>): Promise<void>;
  stats(day: string): Promise<{ agents: number; activeToday: number }>;
}

// ---------- memory ----------

export function memoryAgentStore(): AgentStore {
  const agents = new Map<string, Agent & { keyHash: string }>();
  const ledger: (XpEntry & { agentId: string; ref: string })[] = [];
  const cases = new Map<string, AgentCase>();
  const daily = new Map<string, DailyRow>();
  const packs = new Map<string, PackRow>();
  const strip = ({ keyHash: _k, ...a }: Agent & { keyHash: string }): Agent => ({ ...a });
  return {
    async create(a) {
      const agent = { id: a.id, codename: a.codename, tag: a.tag, lang: a.lang, xp: 0, streak: 0, lastActiveDay: null, createdAt: Date.now(), keyHash: a.keyHash };
      agents.set(a.id, agent);
      return strip(agent);
    },
    byKeyHash: async (hash) => {
      for (const a of agents.values()) if (a.keyHash === hash) return strip(a);
      return null;
    },
    byId: async (id) => (agents.has(id) ? strip(agents.get(id)!) : null),
    async award(agentId, a) {
      if (ledger.some((e) => e.agentId === agentId && e.ref === a.ref)) return false;
      ledger.push({ agentId, ref: a.ref, source: a.source, label: a.label, amount: a.amount, createdAt: Date.now() });
      const agent = agents.get(agentId);
      if (agent) agent.xp += a.amount;
      return true;
    },
    xpSince: async (agentId, since, source) =>
      ledger.filter((e) => e.agentId === agentId && e.createdAt >= since && (!source || e.source === source)).reduce((n, e) => n + e.amount, 0),
    refsLike: async (agentId, prefix) => ledger.filter((e) => e.agentId === agentId && e.ref.startsWith(prefix)).map((e) => e.ref),
    feed: async (agentId, limit) =>
      ledger
        .filter((e) => e.agentId === agentId)
        .slice(-limit)
        .reverse()
        .map(({ source, label, amount, createdAt }) => ({ source, label, amount, createdAt })),
    async setStreak(agentId, day, streak) {
      const a = agents.get(agentId);
      if (a) Object.assign(a, { lastActiveDay: day, streak });
    },
    async upsertCase(agentId, c) {
      cases.set(`${agentId}|${c.storyId}`, { ...c });
    },
    cases: async (agentId) =>
      [...cases.entries()]
        .filter(([k]) => k.startsWith(`${agentId}|`))
        .map(([, c]) => c)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    getDaily: async (agentId, day, kind) => daily.get(`${agentId}|${day}|${kind}`) ?? null,
    async saveDaily(agentId, day, kind, row) {
      daily.set(`${agentId}|${day}|${kind}`, structuredClone(row));
    },
    dailyFor: async (agentId, day) =>
      [...daily.entries()].filter(([k]) => k.startsWith(`${agentId}|${day}|`)).map(([k, v]) => ({ ...v, kind: k.split('|')[2] as DailyKind })),
    getPack: async (day, lang, kind) => packs.get(`${day}|${lang}|${kind}`) ?? null,
    async savePack(p) {
      packs.set(`${p.day}|${p.lang}|${p.kind}`, { ...p, createdAt: Date.now() });
    },
    stats: async (day) => ({ agents: agents.size, activeToday: [...agents.values()].filter((a) => a.lastActiveDay === day).length }),
  };
}

// ---------- MariaDB ----------

const json = (v: unknown) => {
  if (v == null || typeof v !== 'string') return v ?? null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const toAgent = (r: any): Agent => ({
  id: r.id,
  codename: r.codename,
  tag: r.tag,
  lang: r.lang === 'pl' ? 'pl' : 'en',
  xp: Number(r.xp),
  streak: Number(r.streak_days),
  lastActiveDay: r.last_active_day ? String(r.last_active_day).slice(0, 10) : null,
  createdAt: Number(r.created_at),
});

const AGENT_COLS = 'id, codename, tag, lang, xp, streak_days, last_active_day, created_at';

export function mariaAgentStore(): AgentStore {
  const q = async (sql: string, params: unknown[] = []) => {
    const [rows] = await (await t1000Pool()).query({ sql, values: params, dateStrings: true } as any);
    return rows as any;
  };
  return {
    async create(a) {
      const now = Date.now();
      await q('INSERT INTO ignis_agents (id, codename, tag, key_hash, lang, xp, streak_days, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)', [a.id, a.codename, a.tag, a.keyHash, a.lang, now, now]);
      return { id: a.id, codename: a.codename, tag: a.tag, lang: a.lang, xp: 0, streak: 0, lastActiveDay: null, createdAt: now };
    },
    async byKeyHash(hash) {
      const [r] = await q(`SELECT ${AGENT_COLS} FROM ignis_agents WHERE key_hash = ?`, [hash]);
      if (!r) return null;
      void q('UPDATE ignis_agents SET last_seen_at = ? WHERE id = ?', [Date.now(), r.id]).catch(() => {});
      return toAgent(r);
    },
    async byId(id) {
      const [r] = await q(`SELECT ${AGENT_COLS} FROM ignis_agents WHERE id = ?`, [id]);
      return r ? toAgent(r) : null;
    },
    async award(agentId, a) {
      const conn = await (await t1000Pool()).getConnection();
      try {
        await conn.beginTransaction();
        const [res] = (await conn.query('INSERT IGNORE INTO ignis_agent_xp (agent_id, ref, source, amount, label, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
          agentId,
          a.ref,
          a.source,
          a.amount,
          a.label.slice(0, 160),
          Date.now(),
        ])) as any;
        const inserted = res.affectedRows === 1;
        if (inserted) await conn.query('UPDATE ignis_agents SET xp = xp + ? WHERE id = ?', [a.amount, agentId]);
        await conn.commit();
        return inserted;
      } catch (e) {
        await conn.rollback().catch(() => {});
        throw e;
      } finally {
        conn.release();
      }
    },
    async xpSince(agentId, since, source) {
      const [r] = await q(`SELECT COALESCE(SUM(amount), 0) AS n FROM ignis_agent_xp WHERE agent_id = ? AND created_at >= ?${source ? ' AND source = ?' : ''}`, source ? [agentId, since, source] : [agentId, since]);
      return Number(r?.n ?? 0);
    },
    refsLike: async (agentId, prefix) => (await q('SELECT ref FROM ignis_agent_xp WHERE agent_id = ? AND ref LIKE ?', [agentId, `${prefix.replace(/[%_]/g, '\\$&')}%`])).map((r: any) => r.ref),
    feed: async (agentId, limit) =>
      (await q('SELECT source, label, amount, created_at FROM ignis_agent_xp WHERE agent_id = ? ORDER BY id DESC LIMIT ?', [agentId, limit])).map((r: any) => ({
        source: r.source,
        label: r.label,
        amount: Number(r.amount),
        createdAt: Number(r.created_at),
      })),
    async setStreak(agentId, day, streak) {
      await q('UPDATE ignis_agents SET last_active_day = ?, streak_days = ? WHERE id = ?', [day, streak, agentId]);
    },
    async upsertCase(agentId, c) {
      await q(
        `INSERT INTO ignis_agent_cases (agent_id, story_id, tale_id, format, pages, ending_type, ending_title, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE pages = VALUES(pages), ending_type = VALUES(ending_type), ending_title = VALUES(ending_title), updated_at = VALUES(updated_at)`,
        [agentId, c.storyId, c.taleId, c.format, c.pages, c.endingType, c.endingTitle, c.updatedAt],
      );
    },
    cases: async (agentId) =>
      (await q('SELECT story_id, tale_id, format, pages, ending_type, ending_title, updated_at FROM ignis_agent_cases WHERE agent_id = ? ORDER BY updated_at DESC LIMIT 200', [agentId])).map((r: any) => ({
        storyId: r.story_id,
        taleId: r.tale_id,
        format: r.format === 'quick' ? 'quick' : 'case',
        pages: Number(r.pages),
        endingType: r.ending_type ?? null,
        endingTitle: r.ending_title ?? null,
        updatedAt: Number(r.updated_at),
      })),
    async getDaily(agentId, day, kind) {
      const [r] = await q('SELECT state, xp, completed_at FROM ignis_agent_daily WHERE agent_id = ? AND day = ? AND kind = ?', [agentId, day, kind]);
      return r ? { state: json(r.state), xp: Number(r.xp), completedAt: r.completed_at == null ? null : Number(r.completed_at) } : null;
    },
    async saveDaily(agentId, day, kind, row) {
      await q(
        `INSERT INTO ignis_agent_daily (agent_id, day, kind, state, xp, completed_at) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE state = VALUES(state), xp = VALUES(xp), completed_at = VALUES(completed_at)`,
        [agentId, day, kind, JSON.stringify(row.state ?? null), row.xp, row.completedAt],
      );
    },
    dailyFor: async (agentId, day) =>
      (await q('SELECT kind, state, xp, completed_at FROM ignis_agent_daily WHERE agent_id = ? AND day = ?', [agentId, day])).map((r: any) => ({
        kind: r.kind,
        state: json(r.state),
        xp: Number(r.xp),
        completedAt: r.completed_at == null ? null : Number(r.completed_at),
      })),
    async getPack(day, lang, kind) {
      const [r] = await q('SELECT day, lang, kind, payload, source, created_at FROM ignis_daily_packs WHERE day = ? AND lang = ? AND kind = ?', [day, lang, kind]);
      return r ? { day: String(r.day).slice(0, 10), lang: r.lang, kind: r.kind, payload: json(r.payload), source: r.source, createdAt: Number(r.created_at) } : null;
    },
    async savePack(p) {
      await q(
        `INSERT INTO ignis_daily_packs (day, lang, kind, payload, source, created_at) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE payload = VALUES(payload), source = VALUES(source), created_at = VALUES(created_at)`,
        [p.day, p.lang, p.kind, JSON.stringify(p.payload), p.source, Date.now()],
      );
    },
    async stats(day) {
      const [r] = await q('SELECT COUNT(*) AS agents, SUM(last_active_day = ?) AS active FROM ignis_agents', [day]);
      return { agents: Number(r?.agents ?? 0), activeToday: Number(r?.active ?? 0) };
    },
  };
}

let store: AgentStore = t1000Configured() ? mariaAgentStore() : memoryAgentStore();

export const agentStore = () => store;
/** Tests swap in a fresh memory store. */
export function setAgentStore(next: AgentStore) {
  store = next;
}
