import type { ChoiceKind, EndingType, MiniGameId, MissionTypeId, SpecializationId } from './arb';

export type Lang = 'pl' | 'en';

/** How the Deputy Director (the Cat) feels about the page, as translated by Mrucz-Term. */
export type CatMood = 'mruczy' | 'drzemie' | 'zaciekawiony' | 'syczy' | 'zniesmaczony' | 'dumny';

export interface Choice {
  id: string;
  label: string;
  kind: ChoiceKind;
  /** A risky choice is settled by a K20 test in code before the narrator writes the next page. */
  risky: boolean;
}

/** Mission meters. Coherence is the tale's health; stress and coffee are the agent's. */
export interface Stats {
  /** Wskaźnik Spójności Fabularnej, 0..100. The mission is about getting it back up. */
  coherence: number;
  /** 0..100. Above 70 the agent rolls K20 tests with −2. */
  stress: number;
  /** 0..100. At 0 the agent rolls with −1. */
  coffee: number;
  /** Pieczątki DKSF: each one turns a choice into an approved, unrolled success. */
  stamps: number;
}

export type RollOutcome = 'krytyczny-sukces' | 'sukces' | 'czesciowy' | 'porazka' | 'krytyczna-porazka';

/** A K20 test resolved in code: the narrator only narrates it. */
export interface RollResult {
  die: number;
  modifier: number;
  total: number;
  dc: number;
  outcome: RollOutcome;
  /** Where the modifier came from, shown to the player. */
  parts: { label: string; value: number }[];
}

export interface Page {
  id: string;
  parentId: string | null;
  depth: number;
  action: { kind: ChoiceKind | 'custom'; label: string } | null;
  roll: RollResult | null;
  narration: string;
  /** The Cat's comment, translated by Mrucz-Term. */
  catNote: string;
  catMood: CatMood;
  choices: Choice[];
  ending: { type: EndingType; title: string } | null;
  /** Evidence, forms and artifacts the agent carries. */
  evidence: string[];
  /** A form the narrator says was filed on this page, if any. */
  formFiled: string | null;
  stats: Stats;
  imagePrompt: string;
  imageUrl: string | null;
  audioUrl: string | null;
  summary: string;
  createdAt: number;
}

/** One mission run: a case file the narrator writes page by page. */
export interface Story {
  id: string;
  agentId: string;
  missionId: string;
  lang: Lang;
  codename: string;
  /** Case number shown on the file, e.g. "ARB/2026/B-7/0412". */
  caseNo: string;
  /** Assigned through a NarratoMat paradox (natural 1): harder tests. */
  paradox?: boolean;
  rootPageId: string;
  currentPageId: string;
  pages: Record<string, Page>;
  /** Set once the ending's XP has been booked on the agent. */
  settled?: { xp: number; at: number };
  createdAt: number;
  updatedAt: number;
}

export interface MissionRecord {
  storyId: string;
  missionId: string;
  type: MissionTypeId;
  title: string;
  ending: EndingType | null;
  xp: number;
  startedAt: number;
  endedAt: number | null;
}

/** What NarratoMat 5000 put on the agent's desk. */
export interface MissionOffer {
  missionId: string;
  /** With a natural 20 the agent may pick from these instead. */
  alternatives: string[];
  roll: number;
  /** Scores of the top candidates, so the printout can show the system's reasoning. */
  reasons: string[];
  /** A natural 1 opens a paradox: the mission is harder than the file says. */
  paradox: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface MapNote {
  id: string;
  x: number;
  y: number;
  text: string;
  createdAt: number;
}

export interface TrainingRecord {
  best: number;
  plays: number;
  lastAt: number;
}

export interface Agent {
  id: string;
  codename: string;
  specialization: SpecializationId;
  lang: Lang;
  xp: number;
  /** Coffee is stored with its timestamp and drains in real time; read it through coffeeNow(). */
  coffee: number;
  coffeeAt: number;
  stress: number;
  /** Stress eases off 1 point per 15 minutes away from missions, counted from here. */
  stressAt: number;
  history: MissionRecord[];
  training: Partial<Record<MiniGameId, TrainingRecord>>;
  offer: MissionOffer | null;
  /** "Zaproponuj innego Agenta": rerolls left today. */
  rerolls: { day: string; left: number };
  notes: MapNote[];
  /** The mission in progress, if any. */
  activeStoryId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PublicConfig {
  storyReady: boolean;
  image: boolean;
  tts: 'browser' | 'openai' | 'gemini';
}

/** What the coffee machine in the Dark Corridor did this time. */
export interface CoffeeResult {
  kind: 'kawa' | 'espresso' | 'lawa' | 'herbata' | 'telepatia' | 'pusto';
  text: string;
  coffee: number;
  stress: number;
}
