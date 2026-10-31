import { cardOf } from '../../shared/universe';
import type { PublicStory, Story } from '../../shared/types';

/**
 * What the browser gets: the pinned adventure (canon text, prompt material) is reduced to its card,
 * the dice seed is removed, and facts only the Game Master may know are left out.
 */
export function publicStory(story: Story): PublicStory {
  if (!story.adventure) return story;
  const { adventure, gmSecret: _secret, ...rest } = story;
  if (!story.gm) return { ...rest, adventure: cardOf(adventure) };
  const pages = Object.fromEntries(Object.entries(story.pages).map(([id, p]) => [id, p.gm ? {
    ...p,
    gm: {
      ...p.gm,
      events: p.gm.events.filter((e) => e.type !== 'fact' || e.fact.visibility !== 'gm_only'),
      state: { ...p.gm.state, facts: p.gm.state.facts.filter((f) => f.visibility !== 'gm_only') },
    },
  } : p]));
  return { ...rest, pages, adventure: cardOf(adventure) };
}
