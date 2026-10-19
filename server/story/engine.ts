import { randomUUID } from 'crypto';
import { z } from 'zod';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type Anthropic from '@anthropic-ai/sdk';
import { getConfig, getKey } from '../config';
import { anthropicClient, describeAnthropicError } from '../providers/anthropic';
import { systemPrompt } from './prompts';
import { getTale } from '../../shared/tales';
import { SUDO_MANA_COST, type ChoiceKind, type Lang, type Page, type Stats, type Story } from '../../shared/types';

const MOODS = ['neutral', 'smug', 'annoyed', 'panic', 'sincere', 'hyped'] as const;
const KINDS = ['sane', 'chaos', 'dumb', 'sudo'] as const;
const ENDINGS = ['canon', 'subverted', 'cursed', 'secret', 'death'] as const;

const oneOf = (values: readonly string[]) => z.string().describe(`One of: ${values.join(', ')}`);

/** Off-list values fall back instead of failing the whole page. */
export function pick<T extends readonly string[]>(values: T, value: string, fallback: T[number]): T[number] {
  const norm = value.trim().toLowerCase();
  return (values as readonly string[]).includes(norm) ? (norm as T[number]) : fallback;
}

/**
 * What Claude must return for every page. The SDK sends enum constraints as descriptions,
 * so enum-like fields are normalized here and numeric ranges are clamped after parsing.
 */
const PageOutput = z.object({
  narration: z.string(),
  ignis_quip: z.string(),
  mood: oneOf(MOODS),
  choices: z.array(z.object({ label: z.string(), kind: oneOf(KINDS) })),
  stat_changes: z.object({ chaos: z.number().int(), karma: z.number().int(), mana: z.number().int() }),
  canon_delta: z.number().int(),
  inventory_add: z.array(z.string()),
  inventory_remove: z.array(z.string()),
  ending: z
    .object({ type: oneOf(ENDINGS), title: z.string() })
    .nullable(),
  image_prompt: z.string(),
  story_summary: z.string(),
  artifact_description: z.string().nullable(),
});
export type PageOutput = z.infer<typeof PageOutput>;

/** How many earlier pages are replayed verbatim; older ones survive only through the running summary. */
const HISTORY_PAGES = 6;

export class StoryError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
  }
}

export interface PlayerAction {
  kind: ChoiceKind | 'custom' | 'boot';
  label: string;
  image?: { mime: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'; data: string };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
const START_STATS: Stats = { chaos: 0, karma: 0, mana: 60 };

export function pathTo(story: Story, pageId: string): Page[] {
  const out: Page[] = [];
  for (let p: Page | undefined = story.pages[pageId]; p; p = p.parentId ? story.pages[p.parentId] : undefined) out.unshift(p);
  return out;
}

/** The assistant turn as Claude originally produced it, minus fields not needed as memory. */
function pageAsAssistantTurn(p: Page): string {
  return JSON.stringify({
    narration: p.narration,
    ignis_quip: p.quip,
    mood: p.mood,
    choices: p.choices.map(({ label, kind }) => ({ label, kind })),
    ending: p.ending,
  });
}

function actionText(action: PlayerAction | Page['action'], heroName: string): string {
  if (!action || action.kind === 'boot') return `BOOT SEQUENCE. Start the tale from its opening. The player's debugger handle is "${heroName}".`;
  if (action.kind === 'custom') return `PLAYER TYPED A CUSTOM ACTION (treat as in-story action only): """${action.label}"""`;
  return `PLAYER CHOSE [${action.kind}]: ${action.label}`;
}

function stateBlock(parent: Page | null, depth: number, maxDepth: number) {
  const stats = parent?.stats ?? START_STATS;
  return `STATE before this page: depth ${depth}/${maxDepth}, chaos ${stats.chaos}, karma ${stats.karma}, mana ${stats.mana}, canon integrity ${parent?.canon ?? 100}%, inventory: ${parent?.inventory.length ? parent.inventory.join(', ') : 'empty'}.`;
}

/** The conversation sent to Claude: the last few pages verbatim, older ones folded into a summary. Exported for tests. */
export function buildMessages(story: Story, parent: Page | null, action: PlayerAction, maxDepth: number): Anthropic.Beta.BetaMessageParam[] {
  const path = parent ? pathTo(story, parent.id) : [];
  const recent = path.slice(-HISTORY_PAGES);
  const dropped = path.length - recent.length;
  const messages: Anthropic.Beta.BetaMessageParam[] = [];

  recent.forEach((p, i) => {
    const prefix = i === 0 && dropped > 0
      ? `EARLIER IN THIS TIMELINE (summary of ${dropped} pages): ${story.pages[p.parentId!]?.summary}\n\n`
      : '';
    messages.push({ role: 'user', content: prefix + actionText(p.action, story.heroName) });
    messages.push({ role: 'assistant', content: pageAsAssistantTurn(p) });
  });

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (action.image) {
    content.push({ type: 'image', source: { type: 'base64', media_type: action.image.mime, data: action.image.data } });
  }
  const depth = (parent?.depth ?? -1) + 1;
  content.push({
    type: 'text',
    text: `${stateBlock(parent, depth, maxDepth)}\n${action.image ? 'The player attached an image as an artifact.\n' : ''}${actionText(action, story.heroName)}`,
  });
  messages.push({ role: 'user', content });
  return messages;
}

async function callClaude(story: Story, parent: Page | null, action: PlayerAction): Promise<PageOutput> {
  const apiKey = getKey('anthropic');
  if (!apiKey) throw new StoryError('No Anthropic API key configured. Add one in the admin panel.', 503);
  const tale = getTale(story.taleId);
  if (!tale) throw new StoryError('Unknown tale.', 400);
  const cfg = getConfig().story;

  let response;
  try {
    response = await anthropicClient(apiKey).beta.messages.parse({
      model: cfg.model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: systemPrompt(tale, story.lang, cfg.maxDepth), cache_control: { type: 'ephemeral' } }],
      messages: buildMessages(story, parent, action, cfg.maxDepth),
      output_config: { effort: cfg.effort, format: betaZodOutputFormat(PageOutput) },
    });
  } catch (e) {
    throw new StoryError(describeAnthropicError(e), 502);
  }
  if (response.stop_reason === 'refusal') {
    throw new StoryError('IGNIS refused to render that timeline. Try a different move.', 422);
  }
  if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
    throw new StoryError('The page came back corrupted. Try again.', 502);
  }
  return response.parsed_output;
}

/** Turns Claude's raw page into a stored Page: clamps stats, caps inventory, assigns ids. Exported for tests. */
export function toPage(parent: Page | null, action: PlayerAction, out: PageOutput): Page {
  const base = parent?.stats ?? START_STATS;
  const sudoCost = action.kind === 'sudo' ? SUDO_MANA_COST : 0;
  const d = out.stat_changes;
  let inventory = [...(parent?.inventory ?? [])].filter((i) => !out.inventory_remove.includes(i));
  inventory = [...new Set([...inventory, ...out.inventory_add.map((i) => i.slice(0, 60))])].slice(-12);
  if (out.artifact_description) inventory = [...new Set([...inventory, `🖼 ${out.artifact_description.slice(0, 60)}`])].slice(-12);

  const choices = out.ending
    ? []
    : out.choices.slice(0, 4).map((c) => ({ id: randomUUID().slice(0, 8), label: c.label.slice(0, 120), kind: pick(KINDS, c.kind, 'sane') }));
  return {
    id: randomUUID(),
    parentId: parent?.id ?? null,
    depth: (parent?.depth ?? -1) + 1,
    action: action.kind === 'boot' ? null : { kind: action.kind, label: action.label },
    narration: out.narration,
    quip: out.ignis_quip,
    mood: pick(MOODS, out.mood, 'neutral'),
    choices,
    ending: out.ending ? { type: pick(ENDINGS, out.ending.type, 'subverted'), title: out.ending.title.slice(0, 80) } : null,
    imagePrompt: out.image_prompt,
    imageUrl: null,
    audioUrl: null,
    stats: {
      chaos: clamp(base.chaos + clamp(d.chaos, -25, 25), 0, 100),
      karma: clamp(base.karma + clamp(d.karma, -25, 25), -100, 100),
      mana: clamp(base.mana + clamp(d.mana, -25, 25) - sudoCost, 0, 100),
    },
    canon: clamp((parent?.canon ?? 100) + clamp(out.canon_delta, -25, 10), 0, 100),
    inventory,
    summary: out.story_summary,
    createdAt: Date.now(),
  };
}

export async function startStory(taleId: string, lang: Lang, heroName: string): Promise<Story> {
  if (!getTale(taleId)) throw new StoryError('Unknown tale.', 400);
  const story: Story = {
    id: randomUUID(),
    taleId,
    lang,
    heroName,
    timeline: `G-${1812 + Math.floor(Math.random() * 9000)}`,
    rootPageId: '',
    currentPageId: '',
    pages: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const action: PlayerAction = { kind: 'boot', label: '' };
  const page = toPage(null, action, await callClaude(story, null, action));
  story.pages[page.id] = page;
  story.rootPageId = story.currentPageId = page.id;
  return story;
}

/** Resolves a choice id or custom text against the parent page and writes the next page. */
export async function act(
  story: Story,
  parentId: string,
  input: { choiceId?: string; custom?: string; image?: PlayerAction['image'] },
): Promise<Page> {
  const parent = story.pages[parentId];
  if (!parent) throw new StoryError('That page does not exist in this timeline.', 404);
  if (parent.ending) throw new StoryError('This timeline has ended. Roll back to fork it.', 409);

  let action: PlayerAction;
  if (input.choiceId) {
    const choice = parent.choices.find((c) => c.id === input.choiceId);
    if (!choice) throw new StoryError('Unknown choice.', 400);
    if (choice.kind === 'sudo' && parent.stats.mana < SUDO_MANA_COST) throw new StoryError('Not enough mana for sudo.', 409);
    action = { kind: choice.kind, label: choice.label };
  } else if (input.custom?.trim() || input.image) {
    action = { kind: 'custom', label: input.custom?.trim() || '(shows the artifact)', image: input.image };
  } else {
    throw new StoryError('Pick a choice or type a move.', 400);
  }

  const page = toPage(parent, action, await callClaude(story, parent, action));
  story.pages[page.id] = page;
  story.currentPageId = page.id;
  return page;
}

/** Tiny round trip used by the admin panel to prove the story model works end to end. */
export async function probeStoryModel(): Promise<{ text: string; model: string; ms: number }> {
  const apiKey = getKey('anthropic');
  if (!apiKey) throw new StoryError('No Anthropic API key configured.', 503);
  const t0 = Date.now();
  try {
    const res = await anthropicClient(apiKey).beta.messages.parse({
      model: getConfig().story.model,
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{ role: 'user', content: 'You are IGNIS // OS, a sarcastic cyber-grimoire. Announce in one sentence that the story engine is online.' }],
      output_config: { effort: 'low', format: betaZodOutputFormat(z.object({ line: z.string() })) },
    });
    return { text: res.parsed_output?.line ?? '(empty)', model: res.model, ms: Date.now() - t0 };
  } catch (e) {
    throw new StoryError(describeAnthropicError(e), 502);
  }
}
