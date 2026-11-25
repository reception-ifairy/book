import type { EndingType, Lang, TaleFormat } from './types';
import type { QuestProgress } from './daily';
import type { RankInfo, XpSource } from './xp';

/** An agent of the Bureau: a codename, a secret key, and their progress. No email, no password. */
export interface Agent {
  id: string;
  codename: string;
  /** Four characters that tell two agents with the same codename apart, shown as #TAG. */
  tag: string;
  lang: Lang;
  xp: number;
  streak: number;
  lastActiveDay: string | null;
  createdAt: number;
}

export interface AgentCase {
  storyId: string;
  taleId: string;
  format: TaleFormat;
  pages: number;
  endingType: EndingType | null;
  endingTitle: string | null;
  updatedAt: number;
}

export interface XpEntry {
  source: XpSource;
  label: string;
  amount: number;
  createdAt: number;
}

export type DailyKind = 'quiz' | 'incident' | 'interrogation';

export interface DailyStatus {
  kind: DailyKind;
  /** 'new' = not started, 'started' = in progress, 'done' = finished today. */
  state: 'new' | 'started' | 'done';
  xp: number;
}

/** Everything the dashboard needs in one request. */
export interface AgentDashboard {
  agent: Agent;
  rank: RankInfo;
  day: string;
  todayXp: number;
  feed: XpEntry[];
  cases: AgentCase[];
  /** taleId → ending types found in that tale. */
  endings: Record<string, EndingType[]>;
  daily: DailyStatus[];
  /** Today's Daily ops quests, worked out on the server from the agent's own cases. */
  quests: Record<string, QuestProgress & { claimed: boolean }>;
}

export const CODENAME = /^[\p{L}\p{N} _.\-']{2,24}$/u;
