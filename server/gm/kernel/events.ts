import type { GmEvent, GmState, Meter, NpcState, WorldClock } from '../../../shared/gm';
import { applyQuest } from './quests';
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

export const freshNpc = (): NpcState => ({ affinity: 0, trust: 0, respect: 0, memories: [], met: false, revealed: [] });
const EMPTY_WORLD: WorldClock = { day: 1, segment: 0, clocks: [], rumours: [] };

function withNpc(gm: GmState, id: string, f: (n: NpcState) => NpcState): GmState {
  const npcs = gm.npcs ?? {};
  return { ...gm, npcs: { ...npcs, [id]: f(npcs[id] ?? freshNpc()) } };
}
const withWorld = (gm: GmState, f: (w: WorldClock) => WorldClock): GmState => ({ ...gm, world: f(gm.world ?? EMPTY_WORLD) });

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
    case 'npc_meet':
      return { ...w, gm: withNpc(w.gm, ev.npc, (n) => ({ ...n, met: true })) };
    case 'npc_memory':
      return {
        ...w,
        gm: withNpc(w.gm, ev.npc, (n) => ({
          ...n,
          // Keep the eight most salient, newest first among equals.
          memories: [...n.memories, { text: ev.text, salience: ev.salience, pageId: ev.pageId }]
            .map((m, i) => ({ m, i }))
            .sort((a, b) => b.m.salience - a.m.salience || b.i - a.i)
            .slice(0, 8)
            .sort((a, b) => a.i - b.i)
            .map(({ m }) => m),
        })),
      };
    case 'relationship':
      return { ...w, gm: withNpc(w.gm, ev.npc, (n) => ({ ...n, [ev.axis]: clamp(n[ev.axis] + ev.delta, -3, 3) })) };
    case 'secret_revealed':
      return { ...w, gm: withNpc(w.gm, ev.npc, (n) => (n.revealed.includes(ev.secretId) ? n : { ...n, revealed: [...n.revealed, ev.secretId] })) };
    case 'quest':
      return { ...w, gm: { ...w.gm, quest: applyQuest(w.gm.quest ?? [], ev.nodeId, ev.status, ev.into) } };
    case 'consequence_add':
      return { ...w, gm: { ...w.gm, consequences: [...(w.gm.consequences ?? []), ev.consequence].slice(-12) } };
    case 'consequence_fire':
      return { ...w, gm: { ...w.gm, consequences: (w.gm.consequences ?? []).map((c) => (c.id === ev.id ? { ...c, fired: true } : c)) } };
    case 'time':
      return {
        ...w,
        gm: withWorld(w.gm, (c) => {
          const total = c.segment + ev.segments;
          return { ...c, day: c.day + Math.floor(total / 4), segment: total % 4 };
        }),
      };
    case 'clock':
      return { ...w, gm: withWorld(w.gm, (c) => ({ ...c, clocks: c.clocks.map((k) => (k.id === ev.clockId ? { ...k, value: clamp(k.value + ev.delta, 0, k.max) } : k)) })) };
    case 'rumour':
      return { ...w, gm: withWorld(w.gm, (c) => ({ ...c, rumours: [...c.rumours, ev.rumour].slice(-10) })) };
  }
}

export const fold = (w: World, events: GmEvent[]) => events.reduce(applyEvent, w);
