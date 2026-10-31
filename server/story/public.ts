import { cardOf } from '../../shared/universe';
import type { PublicStory, Story } from '../../shared/types';
import type { GmEvent, GmState } from '../../shared/gm';

/** What the player may see of the Game Master's state: no gm_only facts, hidden consequences or rumour truth. */
function visibleState(s: GmState): GmState {
  return {
    ...s,
    facts: s.facts.filter((f) => f.visibility !== 'gm_only'),
    ...(s.consequences ? { consequences: s.consequences.filter((c) => c.visibility !== 'hidden') } : {}),
    ...(s.world ? { world: { ...s.world, rumours: s.world.rumours.map(({ truth: _t, ...r }) => r) } } : {}),
  };
}

function visibleEvent(e: GmEvent): GmEvent | null {
  if (e.type === 'fact' && e.fact.visibility === 'gm_only') return null;
  if (e.type === 'consequence_add' && e.consequence.visibility === 'hidden') return null;
  if (e.type === 'rumour') return { ...e, rumour: { id: e.rumour.id, text: e.rumour.text } };
  return e;
}

/**
 * What the browser gets: the pinned adventure (canon text, prompt material) is reduced to its card,
 * the dice seed is removed, and facts only the Game Master may know are left out.
 */
export function publicStory(story: Story): PublicStory {
  if (!story.adventure) return story;
  const { adventure, gmSecret: _secret, gmStart: _start, ...rest } = story;
  if (!story.gm) return { ...rest, adventure: cardOf(adventure) };
  const pages = Object.fromEntries(Object.entries(story.pages).map(([id, p]) => [id, p.gm ? {
    ...p,
    gm: {
      ...p.gm,
      events: p.gm.events.map(visibleEvent).filter((e): e is GmEvent => !!e),
      state: visibleState(p.gm.state),
    },
  } : p]));
  return { ...rest, pages, adventure: cardOf(adventure) };
}
