import type { Force } from './types';

/**
 * The iFairy Game Master's mechanics, shared by server and browser. Everything here is decided by
 * code (server/gm/kernel); the model only chooses which rule applies and narrates the result.
 */

export type Risk = 'low' | 'standard' | 'high';
/** 2d6 + approach: 10+ bright success, 7–9 success with a cost, 6− a twist (never a defeat). */
export type Band = 'bright' | 'but' | 'twist';
export type Meter = 'harmony' | 'dissonance' | 'etherium';

export interface Effect {
  meters?: Partial<Record<Meter, number>>;
  condition?: string;
}

export interface OutcomeOption {
  id: string;
  kind: 'benefit' | 'cost' | 'move';
  label: string;
  effect: Effect;
}

export interface RollRecord {
  id: string;
  approach: Force;
  risk: Risk;
  intent: string;
  dice: [number, number];
  mods: { label: string; value: number }[];
  total: number;
  band: Band;
  /** Double six: one extra benefit. */
  surge: boolean;
  options: OutcomeOption[];
  chosen: string[];
  /** Outcome picked by the kernel because the narrator did not call choose_outcome. */
  auto?: boolean;
  /** Rolled by code before the model was called (a risky option was picked). */
  pre?: boolean;
  /** What the dice were derived from, so the audit can recompute them from the story seed. */
  streamKey: string;
}

export interface CanonClaim {
  id: string;
  subject: string;
  text: string;
  visibility: 'public' | 'party' | 'gm_only';
  source: 'narration' | 'npc' | 'canon';
  ref?: string;
  pageId: string;
}

/** The only way GM state changes; each page stores the events of its turn. */
export type GmEvent =
  | { type: 'roll'; roll: RollRecord }
  | { type: 'outcome'; rollId: string; optionIds: string[]; auto?: boolean }
  | { type: 'meter'; meter: Meter; delta: number; cause: string }
  | { type: 'item_add'; name: string; cause: string }
  | { type: 'item_drop'; name: string; cause: string }
  | { type: 'condition_add'; name: string }
  | { type: 'condition_remove'; name: string }
  | { type: 'fact'; fact: CanonClaim };

export interface GmState {
  v: 1;
  approaches: Record<Force, number>;
  conditions: string[];
  /** Append-only along a path; a retcon would be a new claim that supersedes, never an edit. */
  facts: CanonClaim[];
  rollCount: number;
}

export interface PageGm {
  v: 1;
  rolls: RollRecord[];
  events: GmEvent[];
  state: GmState;
  trace: { tool: string; ok: boolean; ms: number; error?: string }[];
  usage?: { rounds: number; input: number; output: number; cacheRead: number; cacheWrite: number; ms: number };
}

export const BAND_LABEL: Record<Band, string> = { bright: 'Bright success', but: 'Success, but…', twist: 'Twist' };
