import { describe, expect, it } from 'vitest';
import { buildMessages, pick, settle, startStats, toPage, type PageOutput, type Turn } from '../server/story/engine';
import { systemPrompt } from '../server/story/prompt';
import { TWISTS } from '../server/story/twists';
import { MISSIONS, missionOf, missionXp } from '../shared/arb';
import type { Agent, Story } from '../shared/types';
import { createAgent } from '../server/arb/agents';
import { samplePage } from './fakeAnthropic';

const out = (over: Record<string, unknown> = {}) => samplePage(over) as unknown as PageOutput;
const mission = missionOf('kapturek-ciastka')!;
const start = startStats({ stress: 10, coffee: 60 }, mission, false);
const startTurn: Turn = { kind: 'start', label: '', roll: null };

function makeStory(): Story {
  return { id: 'story-1234', agentId: 'agent-1234', missionId: mission.id, lang: 'pl', codename: 'Sowa', caseNo: 'ARB/2026/B-7/0001', rootPageId: '', currentPageId: '', pages: {}, createdAt: 0, updatedAt: 0 };
}

describe('toPage', () => {
  it('applies clamped deltas to the starting stats and keeps the choices', () => {
    const page = toPage(null, start, startTurn, out({ stat_changes: { coherence: 99, stress: -99, coffee: -3 } }), 12);
    expect(start.coherence).toBe(64);
    expect(page.stats).toEqual({ coherence: 84, stress: 0, coffee: 57, stamps: 2 });
    expect(page.choices).toHaveLength(4);
    expect(page.choices[1]).toMatchObject({ kind: 'improwizacja', risky: true });
    expect(page.action).toBeNull();
    expect(page.evidence).toEqual(['okruszek ciastka']);
  });

  it('normalizes off-list values, keeps one stamped option and spends a stamp', () => {
    const parent = toPage(null, start, startTurn, out(), 12);
    const page = toPage(parent, start, { kind: 'pieczatka', label: 'Pieczątka', roll: null }, out({
      cat_mood: 'ECSTATIC',
      choices: [
        { label: 'A', kind: 'PIECZATKA', risky: false },
        { label: 'B', kind: 'pieczatka', risky: false },
        { label: 'C', kind: 'teleport', risky: true },
      ],
    }), 12);
    expect(page.catMood).toBe('mruczy');
    expect(page.choices.map((c) => c.kind)).toEqual(['pieczatka', 'procedura']);
    expect(page.stats.stamps).toBe(1);
    expect(page.depth).toBe(1);
    expect(pick(['a', 'b'] as const, ' B ', 'a')).toBe('b');
  });

  it('ends the case in code when coherence hits zero or the last page is reached', () => {
    const broken = toPage(null, start, startTurn, out({ stat_changes: { coherence: -20, stress: 0, coffee: 0 } }), 12);
    let p = broken;
    for (let i = 0; i < 3 && !p.ending; i++) p = toPage(p, start, { kind: 'improwizacja', label: 'x', roll: null }, out({ stat_changes: { coherence: -20, stress: 0, coffee: 0 } }), 12);
    expect(p.ending?.type).toBe('paradoks');
    expect(p.choices).toEqual([]);

    const late = toPage({ ...broken, depth: 10, stats: { ...broken.stats, coherence: 80 } }, start, { kind: 'procedura', label: 'x', roll: null }, out(), 12);
    expect(late.ending).toMatchObject({ type: 'z-przypisami' });
  });
});

describe('buildMessages', () => {
  it('names the agent once, replays the path and states the K20 result as final', () => {
    const story = makeStory();
    const agent = { xp: 400, specialization: 'europa' as const };
    const root = toPage(null, start, startTurn, out(), 12);
    story.pages[root.id] = root;
    const roll = { die: 14, modifier: 3, total: 17, dc: 10, outcome: 'sukces' as const, parts: [] };
    const msgs = buildMessages(story, agent, root, { kind: 'improwizacja', label: 'Zaskocz wilka', roll }, start, 12);
    expect(msgs).toHaveLength(3);
    expect(msgs[0].content).toContain('codename "Sowa", rank Agent Terenowy');
    const last = msgs.at(-1)!.content as string;
    expect(last).toContain('AGENT CHOSE [improwizacja]: Zaskocz wilka');
    expect(last).toContain('K20 TEST: rolled 14 + 3 = 17 vs DC 10 → SUKCES');
    expect(last).toContain('page 2/12');
  });

  it('keeps the system prompt identical per mission and language, with the secret inside', () => {
    expect(systemPrompt(mission, 'pl', 12)).toBe(systemPrompt(mission, 'pl', 12));
    expect(systemPrompt(mission, 'pl', 12)).toContain('Polish');
    expect(systemPrompt(mission, 'en', 12)).toContain(TWISTS[mission.id]);
    for (const m of MISSIONS) expect(TWISTS[m.id], m.id).toBeTruthy();
    for (const m of MISSIONS) expect(systemPrompt(m, 'pl', 12)).toContain(m.title);
  });
});

describe('settle', () => {
  it('books XP once when the case ends and moves stress and coffee to the agent', () => {
    const story = makeStory();
    const agent: Agent = { ...createAgent('Sowa', 'europa', 'pl'), id: 'agent-1234', activeStoryId: story.id };
    agent.history.push({ storyId: story.id, missionId: mission.id, type: mission.type, title: mission.title, ending: null, xp: 0, startedAt: 0, endedAt: null });
    const page = toPage(null, start, startTurn, out({ ending: { type: 'uratowana', title: 'Ciastka odzyskane' }, stat_changes: { coherence: 10, stress: 30, coffee: -20 } }), 12);
    settle(story, agent, page);
    settle(story, agent, page);
    expect(agent.xp).toBe(missionXp(mission.difficulty, 'uratowana'));
    expect(agent.xp).toBe(60);
    expect(agent.stress).toBe(30); // +30 is clamped to +20
    expect(agent.coffee).toBe(40);
    expect(agent.activeStoryId).toBeNull();
    expect(agent.history[0]).toMatchObject({ ending: 'uratowana', xp: 60 });
  });
});
