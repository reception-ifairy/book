import type { GmEvent, GmState, Meter } from '../../../shared/gm';
import type { Stats } from '../../../shared/types';

/** Everything a page's mechanics consist of: the meters, the inventory and the GM state. */
export interface World {
  stats: Stats;
  inventory: string[];
  gm: GmState;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
const METER_FIELD: Record<Meter, { field: keyof Stats; lo: number; hi: number }> = {
  harmony: { field: 'karma', lo: -100, hi: 100 },
  dissonance: { field: 'chaos', lo: 0, hi: 100 },
  etherium: { field: 'mana', lo: 0, hi: 100 },
};

export const meterValue = (stats: Stats, m: Meter) => stats[METER_FIELD[m].field];

/** Pure reducer: never mutates `w`. Outcome effects arrive as their own meter/condition events. */
export function applyEvent(w: World, ev: GmEvent): World {
  switch (ev.type) {
    case 'roll':
      return { ...w, gm: { ...w.gm, rollCount: w.gm.rollCount + 1 } };
    case 'meter': {
      const { field, lo, hi } = METER_FIELD[ev.meter];
      return { ...w, stats: { ...w.stats, [field]: clamp(w.stats[field] + ev.delta, lo, hi) } };
    }
    case 'item_add':
      return w.inventory.includes(ev.name) ? w : { ...w, inventory: [...w.inventory, ev.name].slice(-12) };
    case 'item_drop':
      return { ...w, inventory: w.inventory.filter((i) => i !== ev.name) };
    case 'condition_add':
      return w.gm.conditions.includes(ev.name) ? w : { ...w, gm: { ...w.gm, conditions: [...w.gm.conditions, ev.name].slice(-3) } };
    case 'condition_remove':
      return { ...w, gm: { ...w.gm, conditions: w.gm.conditions.filter((c) => c !== ev.name) } };
    case 'fact':
      return { ...w, gm: { ...w.gm, facts: [...w.gm.facts, ev.fact].slice(-60) } };
    case 'outcome':
      return w;
  }
}

export const fold = (w: World, events: GmEvent[]) => events.reduce(applyEvent, w);
