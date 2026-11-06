import type { AdventureStructure } from '../../../shared/universe';
import type { Clock, QuestNode } from '../../../shared/gm';

/** Quest skeletons per learning arc (the 3-phase model, the homework scaffold): nudges, never rails. */
const TEMPLATES: Record<AdventureStructure, { id: string; title: string; climax?: boolean }[]> = {
  'three-phase': [
    { id: 'portal', title: 'Step through the portal and notice what is strange' },
    { id: 'experiment', title: "Test the world's law: poke it, prod it, try it" },
    { id: 'pattern', title: 'Work out how the law works, and why it differs from home' },
    { id: 'translate', title: "Translate the law into our world's science", climax: true },
    { id: 'make', title: 'Make it yours: a field guide entry, a drawing or a song' },
  ],
  homework: [
    { id: 'show', title: 'Bring the task through the portal: a photo or your own words' },
    { id: 'understand', title: 'Find out what the task is really asking' },
    { id: 'step', title: 'Take the next step yourself' },
    { id: 'solve', title: 'Reach the answer with your own reasoning', climax: true },
    { id: 'explain', title: 'Explain it back in your own words' },
  ],
};

const CLOCKS: Record<AdventureStructure, Clock[]> = {
  'three-phase': [{ id: 'wobble', label: "The world's law wobbles out of tune", value: 0, max: 6 }, { id: 'portal', label: 'The portal home flickers', value: 0, max: 6 }],
  homework: [{ id: 'lantern', label: 'The Puzzle-Lantern dims', value: 0, max: 6 }],
};

export const questFor = (s: AdventureStructure): QuestNode[] => TEMPLATES[s].map((n, i) => ({ ...n, status: i === 0 ? 'active' : 'locked' }));
export const clocksFor = (s: AdventureStructure): Clock[] => CLOCKS[s].map((c) => ({ ...c }));

/** Checks a quest update; returns an error message or null. */
export function validateQuest(nodes: QuestNode[], nodeId: string, status: string, into: string | null): string | null {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return `Unknown quest node. Nodes: ${nodes.map((n) => `${n.id} (${n.status})`).join(', ')}.`;
  if (node.status !== 'active') return `${nodeId} is ${node.status}; only the active node can change.`;
  if (!['done', 'failed', 'transformed'].includes(status)) return 'status must be done, failed or transformed.';
  if (status === 'transformed' && !into?.trim()) return 'A transformed node needs `into`: what the goal has become.';
  if (nodes.length >= 20 && status === 'transformed') return 'The quest cannot grow further.';
  return null;
}

/** Pure: closes the active node and opens the next one (a transformed node opens its new form first). */
export function applyQuest(nodes: QuestNode[], nodeId: string, status: 'active' | 'done' | 'failed' | 'transformed', into?: string): QuestNode[] {
  const i = nodes.findIndex((n) => n.id === nodeId);
  if (i < 0) return nodes;
  const next = nodes.map((n) => ({ ...n }));
  next[i] = { ...next[i], status, ...(into ? { into } : {}) };
  if (status === 'transformed' && into) {
    next.splice(i + 1, 0, { id: `${nodeId}-t${next.length}`, title: into.slice(0, 120), status: 'active', ...(next[i].climax ? { climax: true } : {}) });
    return next;
  }
  const open = next.findIndex((n, j) => j > i && n.status === 'locked');
  if (open >= 0) next[open] = { ...next[open], status: 'active' };
  return next;
}
