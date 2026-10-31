import type { Lang } from './types';

/** Where an adventure comes from in the canon. */
export type AdventureKind = 'hook' | 'saga' | 'district';
/** The story shape the narrator follows (Game Master guide, Part 1.1). */
export type AdventureStructure = 'five-room' | 'campaign-act' | 'monster-of-the-week';

/** What the home screen shows for an adventure. */
export interface AdventureCard {
  id: string;
  kind: AdventureKind;
  /** Position inside its kind: saga act number, roster index, hook number. */
  order: number;
  emoji: string;
  hue: number;
  title: Record<Lang, string>;
  tagline: Record<Lang, string>;
  structure: AdventureStructure;
  /** Canon build plus content hash, e.g. "2.2.0-EN#1a2b3c4d". */
  version: string;
}

/** A canon passage the narrator may cite by its handle (C1, C2, …). */
export interface CanonPassage {
  handle: string;
  ref: string;
  title: string;
  text: string;
}

/** An NPC the Game Master can voice, from the canon or the adventure's cast. */
export interface NpcCard {
  id: string;
  name: string;
  tier: 'ifairy' | 'traveller' | 'role';
  role: string;
  voice: string;
  /** What this NPC can plausibly know; they never voice facts beyond it. */
  knows: string[];
  /** Authored for portal hooks; revealed only through reveal_secret once trust is high enough. */
  secret?: { id: string; text: string; trust: number };
  ref?: string;
}

/** Everything the narrator needs for one adventure, frozen at sync time. */
export interface AdventureSnapshot extends AdventureCard {
  /** Canon text of the hook, saga act or district, as fetched from the Universe. */
  premise: string;
  setting: string;
  cast: string[];
  /** Canon terms that seed the live lore lookups. */
  loreTerms: string[];
  /** Visual anchor added to every illustration prompt. */
  art: string;
  /** Canon passages quoted in the system prompt: the premise sources and the narrator's rules. */
  sources: CanonPassage[];
  /** The portal consistency checklist from PORTALS_AND_GUARDIANS. */
  checklist: string[];
  canonVersion: string;
  /** "seed-only": the canon chunk was not addressable, so the premise comes from the seed's copy. */
  status: 'ok' | 'seed-only';
  hash: string;
  /** Game Master NPCs (5.0 snapshots). Secrets stay on the server with the snapshot. */
  npcs?: NpcCard[];
}

export const cardOf = ({ id, kind, order, emoji, hue, title, tagline, structure, version }: AdventureCard): AdventureCard => ({
  id, kind, order, emoji, hue, title, tagline, structure, version,
});
