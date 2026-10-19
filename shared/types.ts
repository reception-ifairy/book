export type Lang = 'en' | 'pl';
export type Mood = 'neutral' | 'smug' | 'annoyed' | 'panic' | 'sincere' | 'hyped';
export type ChoiceKind = 'sane' | 'chaos' | 'dumb' | 'sudo';
export type EndingType = 'canon' | 'subverted' | 'cursed' | 'secret' | 'death';

export const SUDO_MANA_COST = 20;

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
  createdAt: number;
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
}

export interface Tale {
  id: string;
  emoji: string;
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
