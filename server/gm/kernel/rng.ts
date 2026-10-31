import { createHash, createHmac, randomBytes } from 'crypto';

/** A fresh secret seed for a story, and the public commitment to it shown to players. */
export function newSeed(): { seed: string; commit: string } {
  const seed = randomBytes(32).toString('hex');
  return { seed, commit: createHash('sha256').update(seed).digest('hex') };
}

/** Same seed and stream key, same dice: rewinding and repeating a move cannot re-roll it. */
export function rollD6(seed: string, streamKey: string, count: number): number[] {
  const dice: number[] = [];
  for (let block = 0; dice.length < count; block++) {
    const bytes = createHmac('sha256', Buffer.from(seed, 'hex')).update(`${streamKey}#${block}`).digest();
    // Rejection sampling: 252 is the largest multiple of 6 under 256, so every face is equally likely.
    for (const b of bytes) {
      if (b < 252) dice.push((b % 6) + 1);
      if (dice.length === count) break;
    }
  }
  return dice;
}

/** What a move is, for the dice stream: a choice by id, own words by a hash of the normalised text. */
export function actionDigest(action: { choiceId?: string; custom?: string } | 'boot'): string {
  if (action === 'boot') return 'boot';
  if (action.choiceId) return `c:${action.choiceId}`;
  const norm = (action.custom ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `t:${createHash('sha256').update(norm).digest('hex').slice(0, 16)}`;
}
