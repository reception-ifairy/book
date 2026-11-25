import { agentStore } from './store';
import { todayBoard } from '../daily';
import { getStory } from '../story/store';
import { formatOf, getTale } from '../../shared/tales';
import { bureauDay, dayWindow, questProgress } from '../../shared/daily';
import { XP, rankFor, streakXp, type XpGain, type XpSource, type XpUpdate } from '../../shared/xp';
import type { Agent, AgentCase } from '../../shared/agent';
import type { EndingType, Page, Story } from '../../shared/types';

/**
 * Awards XP. Every award has a ref that can only ever pay once (ending:<story>:<page>, quest:<day>:<slug>, ...),
 * so retries, refreshes and double clicks never pay twice. Callers collect the gains to show "+XP" pops.
 */
export class Gains {
  readonly list: XpGain[] = [];
  constructor(readonly agent: Agent) {}

  async add(ref: string, source: XpSource, amount: number, label: string) {
    if (amount <= 0) return false;
    const paid = await agentStore().award(this.agent.id, { ref, source, amount, label });
    if (paid) this.list.push({ label, amount, source });
    return paid;
  }

  /** The agent after these gains, with the rank and whether it went up. */
  async update(): Promise<XpUpdate> {
    const fresh = (await agentStore().byId(this.agent.id)) ?? this.agent;
    const before = rankFor(this.agent.xp);
    const rank = rankFor(fresh.xp);
    return { gained: this.list, total: fresh.xp, rank, rankUp: rank.level > before.level };
  }
}

/** First activity of a Bureau day: extends (or restarts) the streak and pays the streak bonus once. */
export async function touchStreak(g: Gains) {
  const today = bureauDay();
  const a = g.agent;
  if (a.lastActiveDay === today) return;
  const yesterday = bureauDay(dayWindow(today).startsAt - 1);
  const streak = a.lastActiveDay === yesterday ? a.streak + 1 : 1;
  await agentStore().setStreak(a.id, today, streak);
  a.lastActiveDay = today;
  a.streak = streak;
  await g.add(`streak:${today}`, 'streak', streakXp(streak), streak > 1 ? `Day ${streak} streak` : 'First case of the day');
}

export const caseOf = (story: Story): AgentCase => {
  const current = story.pages[story.currentPageId];
  const tale = getTale(story.taleId);
  return {
    storyId: story.id,
    taleId: story.taleId,
    format: tale ? formatOf(tale) : 'case',
    pages: Object.keys(story.pages).length,
    endingType: current?.ending?.type ?? null,
    endingTitle: current?.ending?.title ?? null,
    updatedAt: story.updatedAt,
  };
};

/** Endings an agent has found per tale, from their cases. */
export async function endingsArchive(agentId: string): Promise<Record<string, EndingType[]>> {
  const out: Record<string, EndingType[]> = {};
  for (const c of await agentStore().cases(agentId)) {
    if (!c.endingType) continue;
    (out[c.taleId] ??= []).includes(c.endingType) || out[c.taleId].push(c.endingType);
  }
  return out;
}

/** Today's quests, worked out from the agent's own cases touched today. Pays finished ones. */
export async function checkQuests(g: Gains) {
  const board = await todayBoard();
  if (!board.quests.length) return {};
  const cases = (await agentStore().cases(g.agent.id)).filter((c) => c.updatedAt >= board.startsAt);
  const stories = cases.map((c) => getStory(c.storyId)).filter((s): s is Story => !!s);
  const claimed = new Set(await agentStore().refsLike(g.agent.id, `quest:${board.day}:`));
  const out: Record<string, ReturnType<typeof questProgress> & { claimed: boolean }> = {};
  for (const q of board.quests) {
    const p = questProgress(q, stories, board);
    const ref = `quest:${board.day}:${q.slug}`;
    if (p.done && !claimed.has(ref) && (await g.add(ref, 'quest', q.reward_xp, `Daily ops: ${q.title}`))) claimed.add(ref);
    out[q.slug] = { ...p, claimed: claimed.has(ref) };
  }
  return out;
}

/** Everything a new page is worth: the page itself, a typed move, an ending, a new ending type, quests, the streak. */
export async function afterPage(agent: Agent, story: Story, page: Page): Promise<XpUpdate> {
  const g = new Gains(agent);
  const store = agentStore();
  await touchStreak(g);

  if (page.action) {
    const pageXpToday = await store.xpSince(agent.id, dayWindow(bureauDay()).startsAt, 'page');
    if (pageXpToday + XP.page <= XP.pageDailyCap) await g.add(`page:${story.id}:${page.id}`, 'page', XP.page, 'Page played');
    if (page.action.kind === 'custom') await g.add(`move:${story.id}:${page.id}`, 'move', XP.customMove, 'Your own move');
  }

  const archiveBefore = await endingsArchive(agent.id);
  await store.upsertCase(agent.id, caseOf(story));

  if (page.ending) {
    const tale = getTale(story.taleId);
    const quick = tale ? formatOf(tale) === 'quick' : false;
    const name = tale?.title[story.lang] ?? story.taleId;
    const amount = (quick ? XP.endingQuick : XP.endingCase) + XP.endingBonus[page.ending.type];
    await g.add(`ending:${story.id}:${page.id}`, 'ending', amount, `Case closed: ${name} (“${page.ending.title}”)`);
    if (!(archiveBefore[story.taleId] ?? []).includes(page.ending.type)) {
      await g.add(`discovery:${story.taleId}:${page.ending.type}`, 'discovery', XP.newEnding, `New ending found in ${name}`);
    }
  }

  await checkQuests(g);
  return g.update();
}
