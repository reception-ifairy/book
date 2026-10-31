import type { AdventureStructure } from '../../../shared/universe';
import type { Clock, QuestNode } from '../../../shared/gm';

/** Quest skeletons per story shape (Game Master guide, Part 5): nudges, never rails. */
const TEMPLATES: Record<AdventureStructure, { id: string; title: string; climax?: boolean }[]> = {
  'five-room': [
    { id: 'entrance', title: 'Get past the entrance and its guardian' },
    { id: 'puzzle', title: 'Solve the puzzle or win the conversation' },
    { id: 'setback', title: 'Recover from the setback or see through the trick' },
    { id: 'climax', title: 'Face the heart of the problem', climax: true },
    { id: 'reward', title: 'Claim the reward or the revelation' },
  ],
  'monster-of-the-week': [
    { id: 'hook', title: 'Find out which Traveller needs help' },
    { id: 'clue1', title: 'Find the first clue' },
    { id: 'clue2', title: 'Find the second clue' },
    { id: 'resolution', title: 'Resolve it kindly', climax: true },
    { id: 'wrap', title: 'Say goodbye to the district' },
  ],
  'campaign-act': [
    { id: 'arrival', title: 'Step into the memory' },
    { id: 'witness', title: 'Witness what happened' },
    { id: 'help', title: 'Help where a helper is needed' },
    { id: 'turning', title: 'Be there for the turning point', climax: true },
    { id: 'keep', title: 'Keep the memory for the Archive' },
  ],
};

const CLOCKS: Record<AdventureStructure, Clock[]> = {
  'five-room': [{ id: 'dissonance', label: 'The dissonance spreads', value: 0, max: 6 }, { id: 'attention', label: 'The Council takes notice', value: 0, max: 4 }],
  'monster-of-the-week': [{ id: 'trouble', label: 'Trouble in the district', value: 0, max: 4 }, { id: 'attention', label: 'The Council takes notice', value: 0, max: 4 }],
  'campaign-act': [{ id: 'fading', label: 'The memory fades', value: 0, max: 6 }],
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
