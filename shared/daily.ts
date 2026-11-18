import type { ChoiceKind, EndingType, Story } from './types';

/**
 * Daily ops: a few quests and one "glitch of the day" for every agent. Quests are defined in the admin panel
 * (t1000.ignis_quests); progress is worked out from the agent's own cases, so no player account is needed.
 */

export const QUEST_KINDS = ['close_case', 'ending', 'choice_kind', 'custom_moves', 'pages', 'stat', 'canon_finish', 'open_case'] as const;
export type QuestKind = (typeof QUEST_KINDS)[number];

export interface QuestParams {
  /** Only this tale counts (close_case, ending, open_case, canon_finish). */
  tale_id?: string;
  /** How many times (default 1). */
  count?: number;
  ending?: EndingType;
  choice?: ChoiceKind;
  stat?: 'chaos' | 'karma' | 'mana';
  op?: 'gte' | 'lte';
  value?: number;
  /** canon_finish: the case must close with at least this canon integrity. */
  min_canon?: number;
}

export interface Quest {
  slug: string;
  title: string;
  description: string;
  kind: QuestKind;
  params: QuestParams;
  reward_xp: number;
}

export interface Glitch {
  slug: string;
  text: string;
}

/** What every agent sees today. */
export interface DailyBoard {
  /** Bureau day, Europe/Warsaw, YYYY-MM-DD. */
  day: string;
  /** The day's window in epoch ms; only pages written inside it count. */
  startsAt: number;
  endsAt: number;
  briefing: string | null;
  glitch: Glitch | null;
  quests: Quest[];
  /** 'schedule' when the admin planned this day, 'rotation' when it was drawn from the pool. */
  source: 'schedule' | 'rotation' | 'none';
}

export interface QuestProgress {
  value: number;
  target: number;
  done: boolean;
}

export const BUREAU_TZ = 'Europe/Warsaw';

/** YYYY-MM-DD of an instant in the Bureau's timezone. */
export function bureauDay(at = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUREAU_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/** Start and end (epoch ms) of a Bureau day. Found by search, so it is right across DST changes. */
export function dayWindow(day: string): { startsAt: number; endsAt: number } {
  const [y, m, d] = day.split('-').map(Number);
  const startOf = (yy: number, mm: number, dd: number) => {
    // Midnight Warsaw is between 21:00 and 23:00 UTC of the previous day.
    let t = Date.UTC(yy, mm - 1, dd) - 3 * 3600_000;
    while (bureauDay(t) !== new Date(Date.UTC(yy, mm - 1, dd)).toISOString().slice(0, 10)) t += 15 * 60_000;
    return t;
  };
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return { startsAt: startOf(y, m, d), endsAt: startOf(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()) };
}

/** Progress on one quest from the agent's cases, counting only pages written inside the window. */
export function questProgress(quest: Quest, stories: Story[], window: { startsAt: number; endsAt: number }): QuestProgress {
  const p = quest.params ?? {};
  const target = Math.max(1, Math.round(p.count ?? (quest.kind === 'pages' ? 5 : 1)));
  const inWindow = (t: number) => t >= window.startsAt && t < window.endsAt;
  const tales = stories.filter((s) => !p.tale_id || s.taleId === p.tale_id);
  const pages = tales.flatMap((s) => Object.values(s.pages)).filter((pg) => inWindow(pg.createdAt));
  const endings = pages.filter((pg) => pg.ending);

  let value = 0;
  switch (quest.kind) {
    case 'close_case':
      value = endings.length;
      break;
    case 'ending':
      value = endings.filter((pg) => !p.ending || pg.ending!.type === p.ending).length;
      break;
    case 'choice_kind':
      value = pages.filter((pg) => pg.action && pg.action.kind === (p.choice ?? 'sane')).length;
      break;
    case 'custom_moves':
      value = pages.filter((pg) => pg.action?.kind === 'custom').length;
      break;
    case 'pages':
      value = pages.filter((pg) => pg.action && pg.action.kind !== 'boot').length;
      break;
    case 'stat': {
      const stat = p.stat ?? 'chaos';
      const v = p.value ?? 50;
      value = pages.some((pg) => (p.op === 'lte' ? pg.stats[stat] <= v : pg.stats[stat] >= v)) ? 1 : 0;
      return { value, target: 1, done: value >= 1 };
    }
    case 'canon_finish':
      value = endings.filter((pg) => pg.canon >= (p.min_canon ?? 80)).length;
      break;
    case 'open_case':
      value = tales.filter((s) => inWindow(s.createdAt)).length;
      break;
  }
  return { value: Math.min(value, target), target, done: value >= target };
}
