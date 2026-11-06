import type { Lang } from './types';

/**
 * Where a world sits in the Quantum Edu-Verse: one of the Seven Worlds (a path, stage by stage),
 * a single-portal Cyber-Magical Lab, or the Homework Portal.
 */
export type AdventureKind = 'world' | 'lab' | 'homework';
export const ADVENTURE_KINDS: readonly AdventureKind[] = ['world', 'lab', 'homework'];
/** The learning arc the narrator follows: the 3-phase model, or the homework scaffold. */
export type AdventureStructure = 'three-phase' | 'homework';

/** What the home screen shows for a world. */
export interface AdventureCard {
  id: string;
  kind: AdventureKind;
  /** Position inside its kind: the stage number of a world, the lab's place on the shelf. */
  order: number;
  emoji: string;
  hue: number;
  title: Record<Lang, string>;
  tagline: Record<Lang, string>;
  structure: AdventureStructure;
  /** Canon build plus content hash, e.g. "2.2.0-EN#1a2b3c4d". */
  version: string;
}

/** A passage the narrator may cite by its handle (C1, C2, …): the world's own page or the canon. */
export interface CanonPassage {
  handle: string;
  ref: string;
  title: string;
  text: string;
}

/** An NPC the Game Master can voice, from the canon or the world's cast. */
export interface NpcCard {
  id: string;
  name: string;
  tier: 'ifairy' | 'role';
  role: string;
  voice: string;
  /** What this NPC can plausibly know; they never voice facts beyond it. */
  knows: string[];
  /** Authored per world; revealed only through reveal_secret once trust is high enough. */
  secret?: { id: string; text: string; trust: number };
  ref?: string;
}

/** Everything the narrator needs for one world, frozen at sync time. */
export interface AdventureSnapshot extends AdventureCard {
  /** The world as written in docs/QUANTUM_EDUVERSE.md: its law, the experience, the translation home and what it teaches. */
  premise: string;
  setting: string;
  cast: string[];
  /** Canon terms that seed the live lore lookups. */
  loreTerms: string[];
  /** Visual anchor added to every illustration prompt. */
  art: string;
  /** Passages quoted in the system prompt: the world's own page, then the canon rules. */
  sources: CanonPassage[];
  /** The portal consistency checklist from PORTALS_AND_GUARDIANS. */
  checklist: string[];
  canonVersion: string;
  hash: string;
  /** Game Master NPCs: the world's cast plus the canon iFairies. Secrets stay on the server with the snapshot. */
  npcs?: NpcCard[];
  /** The canon's iFairy visual lock, prepended to illustrations that show an iFairy. */
  imageLock?: { text: string; ref: string };
}

export const cardOf = ({ id, kind, order, emoji, hue, title, tagline, structure, version }: AdventureCard): AdventureCard => ({
  id, kind, order, emoji, hue, title, tagline, structure, version,
});

/** Whether a story's pinned world belongs to the Edu-Verse; stories from retired worlds are archived. */
export const isEduverse = (adventure: Pick<AdventureCard, 'kind'> | undefined | null): boolean =>
  !!adventure && (ADVENTURE_KINDS as readonly string[]).includes(adventure.kind);
