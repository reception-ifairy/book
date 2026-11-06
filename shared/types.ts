import type { AdventureCard, AdventureSnapshot } from './universe';
import type { GmState, PageGm } from './gm';

export type Lang = 'en' | 'pl';
export type Mood = 'neutral' | 'smug' | 'annoyed' | 'panic' | 'sincere' | 'hyped';
/** The one world the game plays: the iFairy Quantum Edu-Verse. Stories from retired worlds are archived. */
export type World = 'ifairy';
/**
 * The four Archetypal forces of the iFairy canon. In the Edu-Verse they are also the four ways of
 * learning: patterns and reason, stories and time, feelings and empathy, imagination and play.
 */
export const FORCES = ['logos', 'mythos', 'gnosis', 'phantasia'] as const;
export type Force = (typeof FORCES)[number];
export type ChoiceKind = Force;
/** canon: the world's law understood and translated; subverted: the explorer's own valid model; secret: a rare discovery. */
export type EndingType = 'canon' | 'subverted' | 'secret';
/** The Edu-Verse learning arc: enter the strange world, translate its law to ours, make it your own. */
export const PHASES = ['entry', 'translation', 'personalisation'] as const;
export type Phase = (typeof PHASES)[number];

export interface Choice {
  id: string;
  label: string;
  kind: ChoiceKind;
  /** Game Master: a risky option is rolled by the rules before the narrator writes the page. */
  risk?: 'safe' | 'risky';
}

export interface Stats {
  /** Dissonance 0..100: the puzzlement a strange law sparks; understanding lowers it. */
  chaos: number;
  /** Harmony -100..100: connecting ideas, kindness and cooperation raise it. */
  karma: number;
  /** Etherium 0..100: cybermagic energy, spent on magic and restored by rest and curiosity. */
  mana: number;
}

export interface Page {
  id: string;
  parentId: string | null;
  depth: number;
  /** What the explorer did to reach this page (null for the first page). */
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
  /** Kept for the stored shape; always 100 in the Edu-Verse. */
  canon: number;
  inventory: string[];
  summary: string;
  createdAt: number;
  /** Canon passages the narrator cited on this page. */
  lore?: LoreRef[];
  /** The narrator's invitation for option C, the explorer's own words. */
  freeForm?: string;
  /** Where the page happens and who is in it, used to pick the next lore lookup. */
  scene?: { location: string; present: string[] };
  /** What the input screen noticed in the explorer's own words. */
  safety?: { privacy?: boolean; distress?: boolean };
  /** Which phase of the learning arc this page belongs to. */
  phase?: Phase;
  /** A Field Guide entry this page earned: the world's law translated into our world's science. */
  fieldNote?: string;
  /** Game Master: this turn's rolls, events and the resulting state. */
  gm?: PageGm;
}

/** A canon passage from the iFairy Universe, cited by its REF. */
export interface LoreRef {
  ref: string;
  title: string;
  excerpt: string;
}

export interface Story {
  id: string;
  /** The Edu-Verse world id (the field name predates the Edu-Verse). */
  taleId: string;
  lang: Lang;
  heroName: string;
  timeline: string;
  rootPageId: string;
  currentPageId: string;
  pages: Record<string, Page>;
  createdAt: number;
  updatedAt: number;
  /** Absent on stories of the retired Grimm Protocol world. */
  world?: World;
  /** The world as synced, pinned at start so a re-sync never changes a running story. */
  adventure?: AdventureSnapshot;
  /** Pinned at start so the system prompt stays the same for the whole story. */
  maxDepth?: number;
  /** How the explorer likes to learn, chosen on the home screen; pinned at start. */
  style?: Force;
  /** Played with the Game Master (dice, events); pinned at start. */
  gm?: boolean;
  /** Server only: the dice seed. Never sent to the browser. */
  gmSecret?: { seed: string };
  /** sha256 of the dice seed, shown to players so the dice can be audited afterwards. */
  gmCommit?: string;
  /** Server only: the Game Master state the first page started from (quest, clocks, carried-over bonds). */
  gmStart?: GmState;
  /** The Seven Worlds as a path: the stage this story continues. */
  campaign?: { fromStoryId: string; chapter: number };
}

/** A story as the browser sees it: the pinned world is reduced to its card, the dice seed removed. */
export type PublicStory = Omit<Story, 'adventure' | 'gmSecret' | 'gmStart'> & { adventure?: AdventureCard };

export interface PublicConfig {
  storyReady: boolean;
  image: boolean;
  tts: 'browser' | 'openai' | 'gemini';
  vision: boolean;
}
