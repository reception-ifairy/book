import { randomUUID } from 'crypto';
import { z } from 'zod';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type Anthropic from '@anthropic-ai/sdk';
import { getConfig, getKey } from '../config';
import { anthropicClient, describeAnthropicError } from '../providers/anthropic';
import { CAT_MOODS, systemPrompt } from './prompt';
import { CHOICE_KINDS, ENDING_TYPES, missionOf, missionXp, rankOf, specialization, type ChoiceKind, type Mission } from '../../shared/arb';
import type { Agent, Lang, Page, RollResult, Stats, Story } from '../../shared/types';
import { OUTCOME_TEXT, realDie, rollTest, type Die } from '../arb/k20';

const oneOf = (values: readonly string[]) => z.string().describe(`One of: ${values.join(', ')}`);

/** Off-list values fall back instead of failing the whole page. */
export function pick<T extends readonly string[]>(values: T, value: string, fallback: T[number]): T[number] {
  const norm = value.trim().toLowerCase();
  return (values as readonly string[]).includes(norm) ? (norm as T[number]) : fallback;
}

/**
 * What Claude returns for every page. The SDK sends enum constraints as descriptions,
 * so enum-like fields are normalized here and numbers are clamped after parsing.
 */
const PageOutput = z.object({
  narration: z.string(),
  cat_note: z.string(),
  cat_mood: oneOf(CAT_MOODS),
  choices: z.array(z.object({ label: z.string(), kind: oneOf(CHOICE_KINDS), risky: z.boolean() })),
  stat_changes: z.object({ coherence: z.number().int(), stress: z.number().int(), coffee: z.number().int() }),
  evidence_add: z.array(z.string()),
  evidence_remove: z.array(z.string()),
  form_filed: z.string().nullable(),
  ending: z.object({ type: oneOf(ENDING_TYPES), title: z.string() }).nullable(),
  image_prompt: z.string(),
  story_summary: z.string(),
});
export type PageOutput = z.infer<typeof PageOutput>;

/** How many earlier pages are replayed verbatim; older ones survive only through the running summary. */
const HISTORY_PAGES = 6;
export const START_STAMPS = 2;

export class StoryError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
  }
}

/** What the player did, already resolved: the dice are rolled before the narrator writes. */
export interface Turn {
  kind: ChoiceKind | 'custom' | 'start';
  label: string;
  roll: RollResult | null;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

export function pathTo(story: Story, pageId: string): Page[] {
  const out: Page[] = [];
  for (let p: Page | undefined = story.pages[pageId]; p; p = p.parentId ? story.pages[p.parentId] : undefined) out.unshift(p);
  return out;
}

function pageAsAssistantTurn(p: Page): string {
  return JSON.stringify({
    narration: p.narration,
    cat_note: p.catNote,
    choices: p.choices.map(({ label, kind, risky }) => ({ label, kind, risky })),
    ending: p.ending,
  });
}

function turnText(turn: Turn | Page['action'], roll: RollResult | null): string {
  if (!turn || ('kind' in turn && turn.kind === 'start')) return 'OPEN THE CASE FILE. Page 1: the agent receives the case at their desk or arrives on site. Set up the problem and the first clue.';
  const lines = [turn.kind === 'custom' ? `AGENT'S OWN ACTION (in-story only): """${turn.label}"""` : `AGENT CHOSE [${turn.kind}]: ${turn.label}`];
  if (turn.kind === 'pieczatka') lines.push('STAMP: approved by DKSF, succeeds without a roll. One stamp spent.');
  if (roll) lines.push(`K20 TEST: rolled ${roll.die} ${roll.modifier >= 0 ? '+' : '−'} ${Math.abs(roll.modifier)} = ${roll.total} vs DC ${roll.dc} → ${OUTCOME_TEXT[roll.outcome]}`);
  return lines.join('\n');
}

function agentLine(story: Story, agent: Pick<Agent, 'xp' | 'specialization'>) {
  return `AGENT: codename "${story.codename}", rank ${rankOf(agent.xp).rank.name}, DIT section ${specialization(agent.specialization)?.name ?? agent.specialization}. Case no. ${story.caseNo}${story.paradox ? '. WARNING: this case was assigned through a NarratoMat paradox; things are stranger and harder than the file says.' : ''}`;
}

function stateBlock(parent: Page | null, start: Stats, depth: number, maxDepth: number) {
  const s = parent?.stats ?? start;
  const ev = parent?.evidence ?? [];
  return `STATE before this page: page ${depth + 1}/${maxDepth}, coherence ${s.coherence}, stress ${s.stress}, coffee ${s.coffee}, stamps ${s.stamps}, evidence: ${ev.length ? ev.join(', ') : 'none'}.`;
}

/** The conversation sent to Claude: the last few pages verbatim, older ones folded into a summary. Exported for tests. */
export function buildMessages(story: Story, agent: Pick<Agent, 'xp' | 'specialization'>, parent: Page | null, turn: Turn, start: Stats, maxDepth: number): Anthropic.Beta.BetaMessageParam[] {
  const path = parent ? pathTo(story, parent.id) : [];
  const recent = path.slice(-HISTORY_PAGES);
  const dropped = path.length - recent.length;
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  recent.forEach((p, i) => {
    const prefix = i === 0 ? `${agentLine(story, agent)}\n${dropped > 0 ? `EARLIER IN THIS CASE (summary of ${dropped} pages): ${story.pages[p.parentId!]?.summary}\n` : ''}\n` : '';
    messages.push({ role: 'user', content: prefix + turnText(p.action, p.roll) });
    messages.push({ role: 'assistant', content: pageAsAssistantTurn(p) });
  });
  const depth = (parent?.depth ?? -1) + 1;
  const head = recent.length ? '' : `${agentLine(story, agent)}\n`;
  messages.push({ role: 'user', content: `${head}${stateBlock(parent, start, depth, maxDepth)}\n${turnText(turn, turn.roll)}` });
  return messages;
}

async function callClaude(story: Story, agent: Agent, mission: Mission, parent: Page | null, turn: Turn, start: Stats): Promise<PageOutput> {
  const apiKey = getKey('anthropic');
  if (!apiKey) throw new StoryError('Brak klucza Anthropic. Dodaj go w panelu administratora.', 503);
  const cfg = getConfig().story;
  let response;
  try {
    response = await anthropicClient(apiKey).beta.messages.parse({
      model: cfg.model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: systemPrompt(mission, story.lang, cfg.maxDepth), cache_control: { type: 'ephemeral' } }],
      messages: buildMessages(story, agent, parent, turn, start, cfg.maxDepth),
      output_config: { effort: cfg.effort, format: betaZodOutputFormat(PageOutput) },
    });
  } catch (e) {
    // A refusal arrives with no JSON at all, and the SDK fails to parse it before we see stop_reason.
    if (e instanceof Error && e.message.startsWith('Failed to parse structured output')) {
      throw new StoryError('Narratoriusz odmówił zaprotokołowania tego ruchu albo pogniótł stronę. Spróbuj inaczej.', 422);
    }
    throw new StoryError(describeAnthropicError(e), 502);
  }
  if (response.stop_reason === 'refusal') throw new StoryError('Narratoriusz odmówił zaprotokołowania tego ruchu. Spróbuj inaczej.', 422);
  if (response.stop_reason === 'max_tokens' || !response.parsed_output) throw new StoryError('Strona akt wróciła pognieciona. Spróbuj jeszcze raz.', 502);
  return response.parsed_output;
}

/** Stats the first page starts from: the tale is already damaged, the agent brings their own stress and coffee. */
export function startStats(agent: Pick<Agent, 'stress' | 'coffee'>, mission: Mission, paradox: boolean): Stats {
  return { coherence: 70 - mission.difficulty * 6 - (paradox ? 10 : 0), stress: agent.stress, coffee: agent.coffee, stamps: START_STAMPS };
}

/** Turns Claude's raw page into a stored Page: clamps stats, caps lists, assigns ids. Exported for tests. */
export function toPage(parent: Page | null, start: Stats, turn: Turn, out: PageOutput, maxDepth: number): Page {
  const base = parent?.stats ?? start;
  const d = out.stat_changes;
  const depth = (parent?.depth ?? -1) + 1;
  let evidence = [...(parent?.evidence ?? [])].filter((i) => !out.evidence_remove.includes(i));
  evidence = [...new Set([...evidence, ...out.evidence_add.map((i) => i.slice(0, 60))])].slice(-12);
  const stats: Stats = {
    coherence: clamp(base.coherence + clamp(d.coherence, -20, 20), 0, 100),
    stress: clamp(base.stress + clamp(d.stress, -20, 20), 0, 100),
    coffee: clamp(base.coffee + clamp(d.coffee, -20, 20), 0, 100),
    stamps: base.stamps - (turn.kind === 'pieczatka' ? 1 : 0),
  };

  let ending = out.ending ? { type: pick(ENDING_TYPES, out.ending.type, 'z-przypisami'), title: out.ending.title.slice(0, 80) } : null;
  // Code backs the rules the prompt states: no coherence means a paradox, and the file has a last page.
  if (!ending && stats.coherence === 0) ending = { type: 'paradoks', title: 'Spójność: zero. Akta zamknięte.' };
  let choices = ending
    ? []
    : out.choices.slice(0, 4).map((c) => ({ id: randomUUID().slice(0, 8), label: c.label.slice(0, 120), kind: pick(CHOICE_KINDS, c.kind, 'procedura'), risky: !!c.risky }));
  // At most one stamped option per page.
  choices = choices.filter((c, i) => c.kind !== 'pieczatka' || choices.findIndex((x) => x.kind === 'pieczatka') === i);
  if (!ending && (depth + 1 >= maxDepth || !choices.length)) {
    ending = { type: stats.coherence >= 50 ? 'z-przypisami' : 'przekazana-dkw', title: 'Termin minął. Akta zamyka DKSF.' };
    choices = [];
  }

  return {
    id: randomUUID(),
    parentId: parent?.id ?? null,
    depth,
    action: turn.kind === 'start' ? null : { kind: turn.kind, label: turn.label },
    roll: turn.roll,
    narration: out.narration,
    catNote: out.cat_note.slice(0, 200),
    catMood: pick(CAT_MOODS, out.cat_mood, 'mruczy'),
    choices,
    ending,
    evidence,
    formFiled: out.form_filed?.slice(0, 80) || null,
    stats,
    imagePrompt: out.image_prompt,
    imageUrl: null,
    audioUrl: null,
    summary: out.story_summary,
    createdAt: Date.now(),
  };
}

const caseNo = (mission: Mission) => `ARB/${new Date().getFullYear()}/${mission.forms[0] ?? 'B-7'}/${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

export async function startMission(agent: Agent, mission: Mission, lang: Lang, paradox: boolean): Promise<Story> {
  const story: Story = {
    id: randomUUID(),
    agentId: agent.id,
    missionId: mission.id,
    lang,
    codename: agent.codename,
    caseNo: caseNo(mission),
    paradox,
    rootPageId: '',
    currentPageId: '',
    pages: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const start = startStats(agent, mission, paradox);
  const turn: Turn = { kind: 'start', label: '', roll: null };
  const page = toPage(null, start, turn, await callClaude(story, agent, mission, null, turn, start), getConfig().story.maxDepth);
  story.pages[page.id] = page;
  story.rootPageId = story.currentPageId = page.id;
  return story;
}

/** Resolves the agent's move (rolling K20 where the rules say so) and writes the next page. */
export async function act(story: Story, agent: Agent, parentId: string, input: { choiceId?: string; custom?: string }, die: Die = realDie): Promise<Page> {
  const mission = missionOf(story.missionId);
  if (!mission) throw new StoryError('Nieznana misja.', 400);
  const parent = story.pages[parentId];
  if (!parent) throw new StoryError('Tej strony nie ma w aktach sprawy.', 404);
  if (parent.ending) throw new StoryError('Akta tej sprawy są zamknięte.', 409);
  if (parentId !== story.currentPageId) throw new StoryError('Ta strona akt jest już nieaktualna. Odśwież sprawę.', 409);

  let kind: ChoiceKind | 'custom';
  let label: string;
  let risky: boolean;
  if (input.choiceId) {
    const choice = parent.choices.find((c) => c.id === input.choiceId);
    if (!choice) throw new StoryError('Nieznana opcja.', 400);
    if (choice.kind === 'pieczatka' && parent.stats.stamps < 1) throw new StoryError('Brak pieczątek. DKSF nie przyjmuje podpisów długopisem.', 409);
    [kind, label, risky] = [choice.kind, choice.label, choice.risky && choice.kind !== 'pieczatka'];
  } else if (input.custom?.trim()) {
    [kind, label, risky] = ['custom', input.custom.trim(), true];
  } else {
    throw new StoryError('Wybierz opcję albo wpisz własny ruch.', 400);
  }

  const roll = risky
    ? rollTest({ kind, mission, rankIndex: rankOf(agent.xp).index, specializationMatch: [mission.region, mission.theme].includes(agent.specialization), stats: parent.stats, paradox: !!story.paradox }, die)
    : null;
  const turn: Turn = { kind, label, roll };
  const start = startStats(agent, mission, !!story.paradox);
  const page = toPage(parent, start, turn, await callClaude(story, agent, mission, parent, turn, start), getConfig().story.maxDepth);
  story.pages[page.id] = page;
  story.currentPageId = page.id;
  return page;
}

/**
 * Books the page's outcome on the agent: stress and coffee follow the mission, and an ending
 * adds XP and closes the mission record. Idempotent per story.
 */
export function settle(story: Story, agent: Agent, page: Page, now = Date.now()) {
  agent.stress = page.stats.stress;
  agent.coffee = page.stats.coffee;
  agent.coffeeAt = agent.stressAt = now;
  if (!page.ending || story.settled) return;
  const mission = missionOf(story.missionId)!;
  const xp = missionXp(mission.difficulty, page.ending.type);
  story.settled = { xp, at: now };
  agent.xp += xp;
  const record = agent.history.find((h) => h.storyId === story.id);
  if (record) Object.assign(record, { ending: page.ending.type, xp, endedAt: now });
  if (agent.activeStoryId === story.id) agent.activeStoryId = null;
}

/** Tiny round trip used by the admin panel to prove the story model works end to end. */
export async function probeStoryModel(): Promise<{ text: string; model: string; ms: number }> {
  const apiKey = getKey('anthropic');
  if (!apiKey) throw new StoryError('Brak klucza Anthropic.', 503);
  const t0 = Date.now();
  try {
    const res = await anthropicClient(apiKey).beta.messages.parse({
      model: getConfig().story.model,
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{ role: 'user', content: 'You are Narratoriusz, the case-file narrator of the Fairy Tale Rescue Agency. Announce in one Polish sentence, in dry bureaucratic style, that the narrative engine is online.' }],
      output_config: { effort: 'low', format: betaZodOutputFormat(z.object({ line: z.string() })) },
    });
    return { text: res.parsed_output?.line ?? '(pusto)', model: res.model, ms: Date.now() - t0 };
  } catch (e) {
    throw new StoryError(describeAnthropicError(e), 502);
  }
}
