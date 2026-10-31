import type { AdventureCard, AdventureSnapshot } from './universe';
import type { PageGm } from './gm';

export type Lang = 'en' | 'pl';
export type Mood = 'neutral' | 'smug' | 'annoyed' | 'panic' | 'sincere' | 'hyped';
/** Grimm Protocol (IGNIS, 16+) or the iFairy Universe (canon narrator, 13+). */
export type World = 'grimm' | 'ifairy';
/** The four Archetypal forces of the iFairy canon; iFairy choices are tied to one each. */
export const FORCES = ['logos', 'mythos', 'gnosis', 'phantasia'] as const;
export type Force = (typeof FORCES)[number];
export type ChoiceKind = 'sane' | 'chaos' | 'dumb' | 'sudo' | Force;
export type EndingType = 'canon' | 'subverted' | 'cursed' | 'secret' | 'death';

export const SUDO_MANA_COST = 20;

export interface Choice {
  id: string;
  label: string;
  kind: ChoiceKind;
  /** iFairy Game Master: a risky option is rolled by the rules before the narrator writes the page. */
  risk?: 'safe' | 'risky';
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
  createdAt: number;
  /** iFairy world: canon passages the narrator cited on this page. */
  lore?: LoreRef[];
  /** iFairy world: the narrator's invitation for option C, the player's own words. */
  freeForm?: string;
  /** iFairy world: where the page happens and who is in it, used to pick the next lore lookup. */
  scene?: { location: string; present: string[] };
  /** iFairy world: what the input screen noticed in the player's own words. */
  safety?: { privacy?: boolean; distress?: boolean };
  /** iFairy Game Master: this turn's rolls, events and the resulting state. */
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
  taleId: string;
  lang: Lang;
  heroName: string;
  timeline: string;
  rootPageId: string;
  currentPageId: string;
  pages: Record<string, Page>;
  createdAt: number;
  updatedAt: number;
  /** Absent on stories from before v4.3, which are all Grimm Protocol. */
  world?: World;
  /** iFairy world: the adventure as synced from the Universe, pinned at start so a re-sync never changes a running story. */
  adventure?: AdventureSnapshot;
  /** iFairy world: pinned at start so the system prompt stays the same for the whole story. */
  maxDepth?: number;
  /** iFairy world: played with the Game Master (dice, events); pinned at start. */
  gm?: boolean;
  /** Server only: the dice seed. Never sent to the browser. */
  gmSecret?: { seed: string };
  /** sha256 of the dice seed, shown to players so the dice can be audited afterwards. */
  gmCommit?: string;
}

/** A story as the browser sees it: the pinned adventure is reduced to its card, the dice seed removed. */
export type PublicStory = Omit<Story, 'adventure' | 'gmSecret'> & { adventure?: AdventureCard };

export const worldOf = (story: Pick<Story, 'world'>): World => story.world ?? 'grimm';

export interface Tale {
  id: string;
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
