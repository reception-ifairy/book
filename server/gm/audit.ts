import { createHash } from 'crypto';
import { pathTo } from '../story/engine';
import { fold, type World } from './kernel/events';
import { rollD6 } from './kernel/rng';
import { startingApproaches } from './kernel/rules';
import { IFAIRY_START_STATS } from '../story/worlds/ifairy/page';
import type { Story } from '../../shared/types';

/**
 * Recomputes every roll from the seed and refolds every page's events from its parent, so the
 * dice and the state can be shown to follow from the rules alone.
 */
export function auditStory(story: Story) {
  const problems: string[] = [];
  if (!story.gm || !story.gmSecret) return { gm: false, pages: 0, rolls: 0, problems };
  const seed = story.gmSecret.seed;
  if (createHash('sha256').update(seed).digest('hex') !== story.gmCommit) problems.push('The seed does not match the published commitment.');
  let rolls = 0;
  for (const page of Object.values(story.pages)) {
    if (!page.gm) {
      problems.push(`${page.id}: no Game Master record.`);
      continue;
    }
    for (const r of page.gm.rolls) {
      rolls++;
      const dice = rollD6(seed, r.streamKey, 2);
      if (dice[0] !== r.dice[0] || dice[1] !== r.dice[1]) problems.push(`${page.id} ${r.id}: dice ${r.dice} do not follow from the seed (${dice}).`);
    }
    const parent = page.parentId ? story.pages[page.parentId] : null;
    const firstRoll = page.gm.rolls[0];
    const start: World = parent?.gm
      ? { stats: parent.stats, inventory: parent.inventory, gm: parent.gm.state }
      : {
        stats: IFAIRY_START_STATS,
        // A chapter's first page starts with the items carried over; they arrive without events.
        inventory: story.campaign ? page.inventory.filter((i) => !page.gm!.events.some((e) => e.type === 'item_add' && e.name === i)) : [],
        gm: story.gmStart ?? { v: 1, approaches: page.gm.state.approaches ?? startingApproaches(firstRoll?.approach ?? 'mythos'), conditions: [], facts: [], rollCount: 0 },
      };
    const end = fold(start, page.gm.events);
    const same = JSON.stringify([end.stats, end.inventory, end.gm]) === JSON.stringify([page.stats, page.inventory, page.gm.state]);
    if (!same) problems.push(`${page.id}: stored state does not equal its parent's state plus this page's events.`);
  }
  return { gm: true, pages: Object.keys(story.pages).length, rolls, longestPath: Math.max(...Object.keys(story.pages).map((id) => pathTo(story, id).length)), problems };
}
