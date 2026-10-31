import { FORCES, type Force } from '../../../shared/types';
import type { Band, GmState, OutcomeOption, Risk, RollRecord } from '../../../shared/gm';
import { rollD6 } from './rng';

/** The player's strongest force rolls at +2, the other three at +1. */
export function startingApproaches(strongest: Force): Record<Force, number> {
  return Object.fromEntries(FORCES.map((f) => [f, f === strongest ? 2 : 1])) as Record<Force, number>;
}

const RISK_MOD: Record<Risk, number> = { low: 1, standard: 0, high: -1 };

export const bandOf = (total: number): Band => (total >= 10 ? 'bright' : total >= 7 ? 'but' : 'twist');

const BENEFITS: OutcomeOption[] = [
  { id: 'insight', kind: 'benefit', label: 'Insight: learn something true and useful', effect: {} },
  { id: 'resonance', kind: 'benefit', label: 'Resonance: harmony +5', effect: { meters: { harmony: 5 } } },
  { id: 'restore', kind: 'benefit', label: 'Restore: etherium +8', effect: { meters: { etherium: 8 } } },
  { id: 'calm', kind: 'benefit', label: 'Calm: dissonance −8', effect: { meters: { dissonance: -8 } } },
];
const COSTS: OutcomeOption[] = [
  { id: 'drain', kind: 'cost', label: 'Drain: etherium −8', effect: { meters: { etherium: -8 } } },
  { id: 'ripple', kind: 'cost', label: 'Ripple: dissonance +6', effect: { meters: { dissonance: 6 } } },
  { id: 'strain', kind: 'cost', label: 'Strain: take the Strained condition', effect: { condition: 'Strained' } },
  { id: 'complication', kind: 'cost', label: 'Complication: something new gets in the way', effect: {} },
];
/** Teen-friendly GM moves on a twist: complications, never defeat or harm. */
const MOVES: OutcomeOption[] = [
  { id: 'unwelcome_truth', kind: 'move', label: 'An unwelcome truth comes to light', effect: {} },
  { id: 'separated', kind: 'move', label: 'Separated: take the Separated condition', effect: { condition: 'Separated' } },
  { id: 'dissonance_rises', kind: 'move', label: 'Dissonance rises: +10', effect: { meters: { dissonance: 10 } } },
  { id: 'hard_choice', kind: 'move', label: 'A hard choice: two good things, only one can be kept', effect: {} },
  { id: 'drained', kind: 'move', label: 'Drained: etherium −10', effect: { meters: { etherium: -10 } } },
];

/** How many options of each kind the narrator must pick for a band. */
export function pickRule(roll: Pick<RollRecord, 'band' | 'surge'>): { benefit: number; cost: number; move: number } {
  if (roll.band === 'bright') return { benefit: roll.surge ? 2 : 1, cost: 0, move: 0 };
  if (roll.band === 'but') return { benefit: 1, cost: 1, move: 0 };
  return { benefit: 0, cost: 0, move: 1 };
}

/** The kernel's own pick when the narrator does not choose: the gentlest legal outcome. */
export const defaultChoice = (roll: RollRecord): string[] =>
  roll.band === 'bright' ? (roll.surge ? ['insight', 'resonance'] : ['insight']) : roll.band === 'but' ? ['complication', 'insight'] : ['hard_choice'];

export function rollCheck(args: { seed: string; streamKey: string; id: string; approach: Force; risk: Risk; intent: string; state: GmState; pre?: boolean; extraMods?: { label: string; value: number }[] }): RollRecord {
  const [a, b] = rollD6(args.seed, args.streamKey, 2);
  const mods = [
    { label: `${args.approach} approach`, value: args.state.approaches[args.approach] ?? 1 },
    ...(RISK_MOD[args.risk] ? [{ label: `${args.risk} risk`, value: RISK_MOD[args.risk] }] : []),
    ...(args.state.conditions.length ? [{ label: args.state.conditions.join(', '), value: -1 }] : []),
    ...(args.extraMods ?? []),
  ];
  const mod = Math.max(-2, Math.min(3, mods.reduce((s, m) => s + m.value, 0)));
  const total = a + b + mod;
  const band = bandOf(total);
  const options = band === 'bright' ? BENEFITS : band === 'but' ? [...COSTS, ...BENEFITS] : MOVES;
  return {
    id: args.id, approach: args.approach, risk: args.risk, intent: args.intent.slice(0, 160), dice: [a, b], mods, total, band,
    surge: a === 6 && b === 6, options, chosen: [], streamKey: args.streamKey, ...(args.pre ? { pre: true } : {}),
  };
}

/** Checks a pick against the band's rule; returns an error message or null. */
export function validateChoice(roll: RollRecord, optionIds: string[]): string | null {
  const need = pickRule(roll);
  const picked = optionIds.map((id) => roll.options.find((o) => o.id === id));
  if (picked.some((o) => !o)) return `Unknown option for ${roll.id}. Valid: ${roll.options.map((o) => o.id).join(', ')}.`;
  if (new Set(optionIds).size !== optionIds.length) return 'Each option can be picked once.';
  const count = (k: OutcomeOption['kind']) => picked.filter((o) => o!.kind === k).length;
  if (count('benefit') !== need.benefit || count('cost') !== need.cost || count('move') !== need.move) {
    return `${roll.id} (${roll.band}) needs exactly ${need.benefit} benefit, ${need.cost} cost and ${need.move} move.`;
  }
  return null;
}
