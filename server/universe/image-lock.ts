import type { AdventureSnapshot } from '../../shared/universe';

/**
 * Whether an illustration shows an iFairy, so the canon visual lock applies. Precise on purpose:
 * Krasnoludki, the Grimm district's fairy godmothers and Pinocchio's Blue Fairy are other beings,
 * and the iFairy rule would draw them coherent and wrong (canon R6 §7).
 */
export function showsIFairy(text: string, snap: Pick<AdventureSnapshot, 'npcs'>): boolean {
  if (/\bi-?fair(?:y|ies)\b|\btinkermasters?\b|\barchivist\b|\bif-ai\b|\betherobots?\b/i.test(text)) return true;
  // Canon iFairies by name (the Tinkermasters and voice guides).
  return (snap.npcs ?? []).some((n) => n.tier === 'ifairy' && new RegExp(`\\b${n.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
}

/** The lock text prepended to an illustration prompt, never merged into it. */
export const withLock = (lock: string, prompt: string) => `${lock}\n\nSUBJECT:\n${prompt}`;
