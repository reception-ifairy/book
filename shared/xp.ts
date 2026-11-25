import type { EndingType } from './types';

/**
 * Experience: the single source of how much every activity is worth and of the Bureau ranks.
 * The server awards from these numbers; the dashboard's "How to earn XP" lists them.
 * A new activity adds a row to XP_RULES and calls award() with it.
 */

export const XP = {
  page: 5,
  /** Page XP stops counting after this much per Bureau day (endings, quests and dailies still count). */
  pageDailyCap: 40,
  customMove: 2,
  endingCase: 50,
  endingQuick: 30,
  endingBonus: { secret: 40, subverted: 20, canon: 15, cursed: 10, death: 5 } satisfies Record<EndingType, number>,
  newEnding: 25,
  quizAnswer: 5,
  quizApproved: 10,
  quizFinish: 10,
  incidentMin: 15,
  incidentMax: 35,
  interrogationBase: 20,
  streakStep: 10,
  streakCap: 50,
} as const;

export type XpSource = 'page' | 'move' | 'ending' | 'discovery' | 'quest' | 'quiz' | 'incident' | 'interrogation' | 'streak';

export const XP_RULES: { source: XpSource; label: string; xp: string; note?: string }[] = [
  { source: 'page', label: 'Every page you play', xp: `+${XP.page}`, note: `up to ${XP.pageDailyCap} XP of pages a day` },
  { source: 'move', label: 'Your own typed move', xp: `+${XP.customMove}`, note: 'on top of the page' },
  { source: 'ending', label: 'Closing a main case', xp: `+${XP.endingCase}`, note: 'plus an ending bonus' },
  { source: 'ending', label: 'Closing a quick case', xp: `+${XP.endingQuick}`, note: 'plus an ending bonus' },
  { source: 'ending', label: 'Ending bonus', xp: `+${XP.endingBonus.death}…+${XP.endingBonus.secret}`, note: 'secret > subverted > canon > cursed > game over' },
  { source: 'discovery', label: 'An ending type you never found in that tale', xp: `+${XP.newEnding}`, note: 'fills your endings archive' },
  { source: 'quest', label: 'Daily ops quest', xp: 'its reward', note: 'claimed automatically' },
  { source: 'quiz', label: 'Quiz ABC of the day', xp: `+${XP.quizAnswer}…+${XP.quizAnswer + XP.quizApproved}`, note: `per answer, +${XP.quizFinish} for finishing` },
  { source: 'incident', label: 'Incident of the day', xp: `+${XP.incidentMin}…+${XP.incidentMax}`, note: 'depends on how you handle it' },
  { source: 'interrogation', label: 'Interrogation of the day', xp: `+${XP.interrogationBase}…+${XP.interrogationBase + 50}`, note: 'the more truth you get, the more XP' },
  { source: 'streak', label: 'Daily streak', xp: `+${XP.streakStep}…+${XP.streakCap}`, note: 'first activity of each day in a row' },
];

export const RANKS: { title: string; xp: number }[] = [
  { title: 'Rookie', xp: 0 },
  { title: 'Junior Patcher', xp: 100 },
  { title: 'Field Debugger', xp: 300 },
  { title: 'Spell Auditor', xp: 700 },
  { title: 'Senior Fixer', xp: 1300 },
  { title: 'Chief of Glitches', xp: 2200 },
  { title: 'Archmage of Patches', xp: 3500 },
  { title: 'Legend of the Public Domain', xp: 5500 },
];

export interface RankInfo {
  level: number;
  title: string;
  xp: number;
  /** XP where this rank starts and the next one starts (null at the top). */
  from: number;
  next: number | null;
  nextTitle: string | null;
  /** 0..1 progress towards the next rank. */
  progress: number;
}

export function rankFor(xp: number): RankInfo {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const from = RANKS[i].xp;
  const next = RANKS[i + 1]?.xp ?? null;
  return {
    level: i + 1,
    title: RANKS[i].title,
    xp,
    from,
    next,
    nextTitle: RANKS[i + 1]?.title ?? null,
    progress: next === null ? 1 : Math.min(1, (xp - from) / (next - from)),
  };
}

export const streakXp = (streak: number) => Math.min(XP.streakCap, XP.streakStep * Math.max(1, streak));

/** One award as the client sees it after an action. */
export interface XpGain {
  label: string;
  amount: number;
  source: XpSource;
}

/** What actions return so the UI can pop "+XP" and celebrate a promotion. */
export interface XpUpdate {
  gained: XpGain[];
  total: number;
  rank: RankInfo;
  rankUp: boolean;
}
