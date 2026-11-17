import { randomInt } from 'crypto';
import { CHOICE_META, dcFor, type ChoiceKind, type Mission } from '../../shared/arb';
import type { RollOutcome, RollResult, Stats } from '../../shared/types';

/** A die: returns 1..sides. Injected in tests. */
export type Die = (sides: number) => number;
export const realDie: Die = (sides) => randomInt(1, sides + 1);

/**
 * Natural 20 and natural 1 are always critical. Otherwise: total ≥ DC succeeds,
 * up to 3 below the DC is a partial success, anything lower fails.
 */
export function outcomeOf(die: number, total: number, dc: number): RollOutcome {
  if (die === 20) return 'krytyczny-sukces';
  if (die === 1) return 'krytyczna-porazka';
  if (total >= dc) return 'sukces';
  if (total >= dc - 3) return 'czesciowy';
  return 'porazka';
}

export interface TestContext {
  kind: ChoiceKind | 'custom';
  mission: Mission;
  rankIndex: number;
  specializationMatch: boolean;
  stats: Stats;
  paradox: boolean;
}

/** Everything that adds to or takes from the die, each part named for the player. */
export function modifierParts(ctx: TestContext): RollResult['parts'] {
  const parts: RollResult['parts'] = [];
  if (ctx.rankIndex) parts.push({ label: 'Ranga', value: ctx.rankIndex });
  if (ctx.specializationMatch) parts.push({ label: 'Specjalizacja sekcji', value: 2 });
  const bonus = CHOICE_META[ctx.kind].bonus;
  if (bonus) parts.push({ label: CHOICE_META[ctx.kind].label, value: bonus });
  if (ctx.stats.stress > 70) parts.push({ label: 'Stres powyżej 70', value: -2 });
  if (ctx.stats.coffee === 0) parts.push({ label: 'Brak kofeiny', value: -1 });
  return parts;
}

export function rollTest(ctx: TestContext, die: Die = realDie): RollResult {
  const parts = modifierParts(ctx);
  const modifier = parts.reduce((s, p) => s + p.value, 0);
  const d = die(20);
  const dc = dcFor(ctx.mission.difficulty, ctx.paradox);
  const total = d + modifier;
  return { die: d, modifier, total, dc, outcome: outcomeOf(d, total, dc), parts };
}

export const OUTCOME_TEXT: Record<RollOutcome, string> = {
  'krytyczny-sukces': 'KRYTYCZNY SUKCES: it works brilliantly, with an unexpected bonus for the agent.',
  sukces: 'SUKCES: the action works as intended.',
  czesciowy: 'CZĘŚCIOWY SUKCES: it works, but at a cost or with a complication (more stress, a lost item, a new form to file).',
  porazka: 'PORAŻKA: it does not work and the situation gets worse; the story continues, the agent is not out.',
  'krytyczna-porazka': 'KRYTYCZNA PORAŻKA: it backfires spectacularly and comically; coherence drops and a new problem appears.',
};
