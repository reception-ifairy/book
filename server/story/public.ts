import { cardOf } from '../../shared/universe';
import type { PublicStory, Story } from '../../shared/types';

/** What the browser gets: the pinned adventure (canon text, prompt material) is reduced to its card. */
export function publicStory(story: Story): PublicStory {
  if (!story.adventure) return story;
  const { adventure, ...rest } = story;
  return { ...rest, adventure: cardOf(adventure) };
}
