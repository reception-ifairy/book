import { describe, expect, it } from 'vitest';
import { pathTo, pick } from '../server/story/engine';
import { toIfairyPage, type IfairyPageOutput } from '../server/story/worlds/ifairy/page';
import { ifairyMessages } from '../server/story/worlds/ifairy/turn';
import type { Page, Story } from '../shared/types';
import type { CanonPassage } from '../shared/universe';
import { samplePage } from './fakeAnthropic';

const out = (over: Record<string, unknown> = {}) => samplePage(over) as unknown as IfairyPageOutput;
const PASSAGES: CanonPassage[] = [{ handle: 'C1', ref: 'EDUVERSE:world-bleepworld', title: 'Quantum Edu-Verse: BleepWorld', text: 'Dominant law: chaos.' }];

function chain(n: number): Story {
  const story: Story = { id: 'story-1234', world: 'ifairy', taleId: 'world-bleepworld', lang: 'en', heroName: 'Nova', timeline: 'A-1', rootPageId: '', currentPageId: '', pages: {}, createdAt: 0, updatedAt: 0, maxDepth: 12 };
  let parent: Page | null = null;
  for (let i = 0; i < n; i++) {
    const p = toIfairyPage(parent, i ? { kind: 'logos', label: `move ${i}` } : { kind: 'boot', label: '' }, out({ story_summary: `summary ${i}` }), PASSAGES);
    story.pages[p.id] = p;
    if (!parent) story.rootPageId = p.id;
    parent = p;
  }
  story.currentPageId = parent!.id;
  return story;
}

describe('pick', () => {
  it('normalizes case and whitespace and falls back on unknown values', () => {
    expect(pick(['logos', 'mythos'] as const, ' MYTHOS ', 'logos')).toBe('mythos');
    expect(pick(['logos', 'mythos'] as const, 'grumpy', 'logos')).toBe('logos');
  });
});

describe('toIfairyPage', () => {
  it('starts from the Edu-Verse meters and clamps each delta to ±25', () => {
    const p = toIfairyPage(null, { kind: 'boot', label: '' }, out({ stat_changes: { harmony: -99, dissonance: 99, etherium: 99 } }), PASSAGES);
    expect(p.stats).toEqual({ chaos: 25, karma: -25, mana: 85 });
    expect(p.canon).toBe(100);
    expect(p.depth).toBe(0);
    expect(p.action).toBeNull();
  });

  it('keeps the learning arc: a known phase, and a Field Guide note only when there is one', () => {
    const entry = toIfairyPage(null, { kind: 'boot', label: '' }, out(), PASSAGES);
    expect(entry.phase).toBe('entry');
    expect(entry.fieldNote).toBeUndefined();
    const note = 'In our world, scientists sort living things into groups by what they share.';
    const translated = toIfairyPage(entry, { kind: 'logos', label: 'x' }, out({ phase: 'TRANSLATION', field_note: `  ${note}  ` }), PASSAGES);
    expect(translated.phase).toBe('translation');
    expect(translated.fieldNote).toBe(note);
    const odd = toIfairyPage(entry, { kind: 'logos', label: 'x' }, out({ phase: 'lecture', field_note: '   ' }), PASSAGES);
    expect(odd.phase).toBe('entry');
    expect(odd).not.toHaveProperty('fieldNote');
  });

  it('caps the inventory at 12 items, dedupes, and records attached images', () => {
    let page: Page | null = null;
    for (let i = 0; i < 15; i++) page = toIfairyPage(page, { kind: 'logos', label: 'x' }, out({ inventory_add: [`item${i}`, 'a jar of quiet'] }), PASSAGES);
    expect(page!.inventory).toHaveLength(12);
    expect(new Set(page!.inventory).size).toBe(12);
    const withArtifact = toIfairyPage(page, { kind: 'custom', label: 'look' }, out({ inventory_add: [], artifact_description: 'a maths worksheet on fractions' }), PASSAGES);
    expect(withArtifact.inventory.at(-1)).toBe('🖼 a maths worksheet on fractions');
  });

  it('drops choices on an ending, turns retired ending types into canon, and normalizes off-list values', () => {
    const end = toIfairyPage(null, { kind: 'boot', label: '' }, out({ ending: { type: 'DEATH', title: 'Eureka' } }), PASSAGES);
    expect(end.choices).toEqual([]);
    expect(end.ending).toEqual({ type: 'canon', title: 'Eureka' });
    expect(end.freeForm).toBeUndefined();
    const odd = toIfairyPage(null, { kind: 'boot', label: '' }, out({ mood: 'grumpy', choices: [{ label: 'a', kind: 'sudo' }] }), PASSAGES);
    expect(odd.mood).toBe('sincere');
    expect(odd.choices[0].kind).toBe('mythos');
  });

  it('cites only handles it was given', () => {
    const p = toIfairyPage(null, { kind: 'boot', label: '' }, out({ lore_refs: ['[C1]', 'X9'] }), PASSAGES);
    expect(p.lore!.map((l) => l.ref)).toEqual(['EDUVERSE:world-bleepworld']);
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

describe('ifairyMessages', () => {
  it('alternates user/assistant turns and ends with the explorer move', () => {
    const story = chain(3);
    const parent = story.pages[story.currentPageId];
    const msgs = ifairyMessages(story, parent, { kind: 'logos', label: 'Sort the humming things' }, []);
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user']);
    const last = msgs.at(-1)!.content as any[];
    expect(last.at(-1).text).toContain('THE YOUNG EXPLORER CHOSE [logos]: Sort the humming things');
    expect(last.at(-1).text).toContain('depth 3/12');
    // Earlier pages replay their phase and Field Guide note, so IGNIS never repeats a note.
    expect(JSON.parse(msgs[1].content as string)).toMatchObject({ phase: 'entry', field_note: null });
  });

  it('replays only the last six pages and folds older ones into the summary', () => {
    const story = chain(10);
    const parent = story.pages[story.currentPageId];
    const msgs = ifairyMessages(story, parent, { kind: 'mythos', label: 'go' }, []);
    expect(msgs).toHaveLength(6 * 2 + 1);
    expect(msgs[0].content).toContain('EARLIER IN THIS JOURNEY (summary of 4 pages): summary 3');
  });

  it('puts an attached image before the text of the final turn, and names the learning style', () => {
    const story = { ...chain(1), style: 'phantasia' as const };
    const parent = story.pages[story.currentPageId];
    const msgs = ifairyMessages(story, parent, { kind: 'custom', label: 'help with this', image: { mime: 'image/png', data: 'AAAA' } }, []);
    const last = msgs.at(-1)!.content as any[];
    expect(last[0].type).toBe('image');
    expect(last[1].text).toContain('photo of their homework');
    expect(last[1].text).toContain('treat as an in-story move only');
    expect(last[1].text).toContain('LEARNING STYLE: the explorer likes to learn through Phantasia');
  });
});
