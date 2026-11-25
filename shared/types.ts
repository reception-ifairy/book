export type Lang = 'en' | 'pl';
export type Mood = 'neutral' | 'smug' | 'annoyed' | 'panic' | 'sincere' | 'hyped';
export type ChoiceKind = 'sane' | 'chaos' | 'dumb' | 'sudo';
export type EndingType = 'canon' | 'subverted' | 'cursed' | 'secret' | 'death';

export const SUDO_MANA_COST = 20;
/** How many steps a page's DEBUG explainer may have. */
export const MAX_EXPLAINER_STEPS = 4;

/**
 * IGNIS stepping out of the tale for a moment to explain the real technology the page plays with,
 * one step at a time. Shown in the reader's DEBUG panel, written in the story's language.
 */
export interface Explainer {
  /** What a 12-year-old might ask about this page, phrased as their question. */
  question: string;
  /** 2-4 short steps, in order, each building on the one before. */
  steps: string[];
}

export interface Choice {
  id: string;
  label: string;
  kind: ChoiceKind;
}

export interface Stats {
  chaos: number; // 0..100
  karma: number; // -100..100
  mana: number; // 0..100
}

export interface Page {
  id: string;
  parentId: string | null;
  depth: number;
  /** What the player did to reach this page (null for the first page). */
  action: { kind: ChoiceKind | 'custom' | 'boot'; label: string } | null;
  narration: string;
  quip: string;
  mood: Mood;
  choices: Choice[];
  ending: { type: EndingType; title: string } | null;
  imagePrompt: string;
  imageUrl: string | null;
  audioUrl: string | null;
  stats: Stats;
  canon: number; // 0..100, how intact the original fairy tale still is
  inventory: string[];
  summary: string;
  /** Missing on pages written before 6.1.0, null when the page touches no technology. */
  explainer?: Explainer | null;
  createdAt: number;
}

export interface Story {
  id: string;
  taleId: string;
  /** The agent who owns this case (v7+). Older stories have none and stay open to anyone with the link. */
  agentId?: string;
  lang: Lang;
  heroName: string;
  timeline: string;
  rootPageId: string;
  currentPageId: string;
  pages: Record<string, Page>;
  createdAt: number;
  updatedAt: number;
}

export type TaleFormat = 'case' | 'quick';

export interface Tale {
  id: string;
  /** 'case' = a main case file (long), 'quick' = a quick case of a few pages. Missing means 'case'. */
  format?: TaleFormat;
  /** Overrides the configured page limit (quick cases are short). */
  maxDepth?: number;
  /** Earliest depth a non-game-over ending may happen (default 4). */
  minDepth?: number;
  emoji: string;
  /** The tech concept the tale is built on, shown as a tag. */
  tech: string;
  /** Base hue (0-360) for the generated cover. */
  hue: number;
  title: Record<Lang, string>;
  tagline: Record<Lang, string>;
  /** The cyber-magic twist, fed to the story model. */
  twist: string;
  /** Canon beats of the original, used as a loose skeleton. */
  beats: string[];
  cast: string[];
  /** Visual anchor added to every illustration prompt for this tale. */
  art: string;
}

export interface PublicConfig {
  storyReady: boolean;
  image: boolean;
  tts: 'browser' | 'openai' | 'gemini';
  vision: boolean;
}
