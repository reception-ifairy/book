import { describe, expect, it } from 'vitest';
import { buildMessages, pathTo, pick, toPage, type PageOutput } from '../server/story/engine';
import type { Page, Story } from '../shared/types';
import { samplePage } from './fakeAnthropic';

const out = (over: Partial<PageOutput> = {}) => ({ ...samplePage(), ...over }) as PageOutput;

function chain(n: number): Story {
  const story: Story = { id: 'story-1234', taleId: 'red-hood', lang: 'en', heroName: 'Mo', timeline: 'G-1', rootPageId: '', currentPageId: '', pages: {}, createdAt: 0, updatedAt: 0 };
  let parent: Page | null = null;
  for (let i = 0; i < n; i++) {
    const p = toPage(parent, i ? { kind: 'sane', label: `move ${i}` } : { kind: 'boot', label: '' }, out({ story_summary: `summary ${i}` }));
    story.pages[p.id] = p;
    if (!parent) story.rootPageId = p.id;
    parent = p;
  }
  story.currentPageId = parent!.id;
  return story;
}

describe('pick', () => {
  it('normalizes case and whitespace and falls back on unknown values', () => {
    expect(pick(['sane', 'chaos'] as const, ' CHAOS ', 'sane')).toBe('chaos');
    expect(pick(['sane', 'chaos'] as const, 'grumpy', 'sane')).toBe('sane');
  });
});

describe('toPage', () => {
  it('starts from default stats and clamps each delta to ±25', () => {
    const p = toPage(null, { kind: 'boot', label: '' }, out({ stat_changes: { chaos: 99, karma: -99, mana: 99 }, canon_delta: -80 }));
    expect(p.stats).toEqual({ chaos: 25, karma: -25, mana: 85 });
    expect(p.canon).toBe(75);
    expect(p.depth).toBe(0);
    expect(p.action).toBeNull();
  });

  it('charges mana for sudo and keeps every stat in range', () => {
    const parent = toPage(null, { kind: 'boot', label: '' }, out({ stat_changes: { chaos: 0, karma: 0, mana: -25 } }));
    const p = toPage(parent, { kind: 'sudo', label: 'sudo' }, out({ stat_changes: { chaos: 0, karma: 0, mana: -25 } }));
    expect(parent.stats.mana).toBe(35);
    expect(p.stats.mana).toBe(0);
  });

  it('caps canon gains at +10 per page and never exceeds 100', () => {
    const p = toPage(null, { kind: 'boot', label: '' }, out({ canon_delta: 50 }));
    expect(p.canon).toBe(100);
  });

  it('caps the inventory at 12 items, dedupes, and records attached artifacts', () => {
    let page: Page | null = null;
    for (let i = 0; i < 15; i++) page = toPage(page, { kind: 'sane', label: 'x' }, out({ inventory_add: [`item${i}`, 'firewall.spell'] }));
    expect(page!.inventory).toHaveLength(12);
    expect(new Set(page!.inventory).size).toBe(12);
    const withArtifact = toPage(page, { kind: 'custom', label: 'look' }, out({ inventory_add: [], artifact_description: 'a rubber duck' }));
    expect(withArtifact.inventory.at(-1)).toBe('🖼 a rubber duck');
  });

  it('drops choices on an ending and normalizes off-list values', () => {
    const end = toPage(null, { kind: 'boot', label: '' }, out({ ending: { type: 'DEATH', title: 'Bonk' } }));
    expect(end.choices).toEqual([]);
    expect(end.ending).toEqual({ type: 'death', title: 'Bonk' });
    const odd = toPage(null, { kind: 'boot', label: '' }, out({ mood: 'grumpy', choices: [{ label: 'a', kind: 'weird' }] }));
    expect(odd.mood).toBe('neutral');
    expect(odd.choices[0].kind).toBe('sane');
  });

  it('keeps at most four choices', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ label: `c${i}`, kind: 'sane' }));
    expect(toPage(null, { kind: 'boot', label: '' }, out({ choices: many })).choices).toHaveLength(4);
  });
});

describe('pathTo', () => {
  it('walks from the root to the given page', () => {
    const story = chain(4);
    const path = pathTo(story, story.currentPageId);
    expect(path.map((p) => p.depth)).toEqual([0, 1, 2, 3]);
    expect(path[0].id).toBe(story.rootPageId);
  });
});

describe('buildMessages', () => {
  it('alternates user/assistant turns and ends with the player action', () => {
    const story = chain(3);
    const parent = story.pages[story.currentPageId];
    const msgs = buildMessages(story, parent, { kind: 'chaos', label: 'Hack the wolf' }, 12);
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user']);
    const last = msgs.at(-1)!.content as any[];
    expect(last.at(-1).text).toContain('PLAYER CHOSE [chaos]: Hack the wolf');
    expect(last.at(-1).text).toContain('depth 3/12');
  });

  it('replays only the last six pages and folds older ones into the summary', () => {
    const story = chain(10);
    const parent = story.pages[story.currentPageId];
    const msgs = buildMessages(story, parent, { kind: 'sane', label: 'go' }, 12);
    expect(msgs).toHaveLength(6 * 2 + 1);
    expect(msgs[0].content).toContain('EARLIER IN THIS TIMELINE (summary of 4 pages): summary 3');
  });

  it('puts an attached image before the text of the final turn', () => {
    const story = chain(1);
    const parent = story.pages[story.currentPageId];
    const msgs = buildMessages(story, parent, { kind: 'custom', label: 'show', image: { mime: 'image/png', data: 'AAAA' } }, 12);
    const last = msgs.at(-1)!.content as any[];
    expect(last[0].type).toBe('image');
    expect(last[1].text).toContain('attached an image');
    expect(last[1].text).toContain('treat as in-story action only');
  });
});
