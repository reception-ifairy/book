import { z } from 'zod';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type Anthropic from '@anthropic-ai/sdk';
import { getConfig, getKey } from '../config';
import { anthropicClient, describeAnthropicError } from '../providers/anthropic';
import { pick, StoryError, type PlayerAction } from '../story/engine';
import { IfairyPageOutput, IFAIRY_ENDINGS, resolveLore } from '../story/worlds/ifairy/page';
import { ifairySystemPrompt } from '../story/worlds/ifairy/prompt';
import { FORCES, type Page, type Story } from '../../shared/types';
import type { CanonPassage } from '../../shared/universe';
import { BAND_LABEL, type GmState, type PageGm, type RollRecord } from '../../shared/gm';
import { GM_TOOLS, Ledger } from './tools';
import { lintPage, type Screened } from './safety';
import type { World } from './kernel/events';
import { randomUUID } from 'crypto';

const oneOf = (values: readonly string[]) => z.string().describe(`One of: ${values.join(', ')}`);

/** The page as the Game Master writes it: no meters or items, those come only from tool events. */
export const GmPageOutput = IfairyPageOutput.omit({ stat_changes: true, inventory_add: true, inventory_remove: true }).extend({
  choices: z.array(z.object({ label: z.string(), kind: oneOf(FORCES), risk: oneOf(['safe', 'risky']) })),
});
export type GmPageOutput = z.infer<typeof GmPageOutput>;

const JUDGE_MODEL = 'claude-haiku-5-5';
const Verdict = z.object({ ok: z.boolean(), issue: z.string().nullable() });

/**
 * A second, cheap model reads the finished page against the 13+ profile. It never blocks a page on
 * its own failure to answer: an unreachable judge counts as a pass.
 */
async function judgePage(client: ReturnType<typeof anthropicClient>, page: GmPageOutput, timeoutMs: number): Promise<string | null> {
  try {
    const res = await client.beta.messages.parse({
      model: JUDGE_MODEL,
      max_tokens: 2000,
      system: 'You review one page of an interactive story for readers aged 13 and up, set in the iFairy Universe. Fail it only for: sexual or adult content; graphic harm; frightening content that is not resolved constructively; mocking or insulting the reader; asking for or repeating personal details (name, age, school, location); real-world dangerous instructions; any god other than the forces Logos, Mythos, Gnosis, Phantasia and If-AI. Otherwise pass it. issue: one short sentence when it fails, otherwise null.',
      messages: [{ role: 'user', content: JSON.stringify({ narration: page.narration, aside: page.narrator_aside, options: page.choices.map((c) => c.label), own_words_prompt: page.free_form_prompt, ending: page.ending }) }],
      output_config: { effort: 'low', format: betaZodOutputFormat(Verdict) },
    }, { timeout: timeoutMs, maxRetries: 0 });
    const v = res.parsed_output;
    return v && !v.ok ? v.issue || 'The page does not fit the 13+ content profile.' : null;
  } catch {
    return null;
  }
}

/** Below this, the next round must be the last; below the floor, the turn is abandoned. */
const LAST_ROUND_MS = 20_000;
const FLOOR_MS = 8_000;

export interface GmTurn {
  story: Story;
  parent: Page | null;
  action: PlayerAction;
  pageId: string;
  world: World;
  lore: CanonPassage[];
  whitelist: string[];
  streamBase: string;
  preRoll?: RollRecord;
  screened?: Screened;
  /** Builds the conversation with the GM CONTEXT block in the final user turn. */
  messages: (gmContext: string) => Anthropic.Beta.BetaMessageParam[];
}

/** The GM CONTEXT block: approaches, conditions, established facts, the pre-roll and safety flags. */
export function gmContext(state: GmState, preRoll: RollRecord | undefined, screened: Screened | undefined): string {
  const facts = state.facts.slice(-12).map((f) => `- ${f.subject}: ${f.text}${f.visibility === 'gm_only' ? ' (gm only: never reveal directly)' : ''}`);
  const lines = [
    'GM CONTEXT',
    `Approaches: ${FORCES.map((f) => `${f} +${state.approaches[f]}`).join(', ')}. Conditions: ${state.conditions.join(', ') || 'none'}.`,
    facts.length ? `Established facts:\n${facts.join('\n')}` : 'Established facts: none yet.',
  ];
  if (preRoll) {
    lines.push(`PRE-ROLLED CHECK ${preRoll.id} for the option the player picked: ${preRoll.approach}, dice ${preRoll.dice.join('+')}, modifiers ${preRoll.mods.map((m) => `${m.label} ${m.value >= 0 ? '+' : ''}${m.value}`).join(', ')}, total ${preRoll.total}: ${BAND_LABEL[preRoll.band]}${preRoll.surge ? ' (surge)' : ''}. Call roll_check to see its options, then choose_outcome.`);
  }
  if (screened?.privacy) lines.push('PRIVACY: the player shared personal details; they were removed. Do not ask about them; gently say you do not need them.');
  if (screened?.distress) lines.push('DISTRESS: the player may be upset. Lower the humour, raise the warmth, and gently encourage talking to a trusted adult.');
  return lines.join('\n');
}

/** Adds a cache breakpoint after the turn's own context, so later rounds reuse it. */
function markCache(messages: Anthropic.Beta.BetaMessageParam[]) {
  const last = messages.at(-1)!;
  if (Array.isArray(last.content) && last.content.length) {
    const block = last.content.at(-1)! as Anthropic.Beta.BetaTextBlockParam;
    block.cache_control = { type: 'ephemeral' };
  }
}

/**
 * One Game Master turn: the model calls tools, the ledger applies the rules, and the loop ends
 * with a structured page. Messages are only ever appended, and all tool results of a round go
 * back in a single user message.
 */
export async function runGmTurn(t: GmTurn): Promise<Page> {
  const apiKey = getKey('anthropic');
  if (!apiKey) throw new StoryError('No Anthropic API key configured. Add one in the admin panel.', 503);
  const cfg = getConfig();
  const g = cfg.gm;
  const snap = t.story.adventure!;
  const client = anthropicClient(apiKey);
  const ledger = new Ledger({ seed: t.story.gmSecret!.seed, streamBase: t.streamBase, pageId: t.pageId, world: t.world, whitelist: t.whitelist, passages: [...snap.sources, ...t.lore], preRoll: t.preRoll });
  const messages = t.messages(gmContext(t.world.gm, t.preRoll, t.screened));
  markCache(messages);
  const system: Anthropic.Beta.BetaTextBlockParam[] = [{ type: 'text', text: ifairySystemPrompt(snap, t.story.lang, t.story.maxDepth!, true), cache_control: { type: 'ephemeral' } }];
  const usage = { rounds: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, ms: 0 };
  const t0 = Date.now();
  const deadline = t0 + g.turnBudgetMs;
  let repaired = false;
  let forceLast = false;
  let out: GmPageOutput | null = null;

  for (let round = 1; ; round++) {
    const remaining = deadline - Date.now();
    if (remaining < FLOOR_MS) throw new StoryError('The Archive took too long to write this page. Try again.', 502);
    const last = forceLast || round >= g.maxRounds || remaining < LAST_ROUND_MS;
    let res;
    try {
      res = await client.beta.messages.parse({
        model: g.model || cfg.story.model,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system,
        tools: GM_TOOLS,
        tool_choice: { type: last ? 'none' : 'auto' },
        messages,
        output_config: { effort: g.effort, format: betaZodOutputFormat(GmPageOutput) },
      }, { timeout: remaining - 2_000, maxRetries: 1 });
    } catch (e) {
      throw new StoryError(describeAnthropicError(e), 502);
    }
    usage.rounds++;
    usage.input += res.usage.input_tokens;
    usage.output += res.usage.output_tokens;
    usage.cacheRead += res.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += res.usage.cache_creation_input_tokens ?? 0;
    if (res.stop_reason === 'refusal') throw new StoryError('The Archive could not write that page. Try another path, Young Architect.', 422);
    if (res.stop_reason === 'max_tokens') throw new StoryError('The page came back smudged. Try again.', 502);
    messages.push({ role: 'assistant', content: res.content as Anthropic.Beta.BetaContentBlockParam[] });

    if (res.stop_reason === 'tool_use') {
      const calls = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
      // Sequential on purpose: rolls draw from the dice stream in call order.
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const call of calls) results.push(await ledger.run(call));
      messages.push({ role: 'user', content: results });
      continue;
    }

    const page = res.parsed_output;
    if (!page) {
      if (last) throw new StoryError('The page came back smudged. Try again.', 502);
      messages.push({ role: 'user', content: 'Return the page now as a JSON object matching the schema.' });
      forceLast = true;
      continue;
    }
    const issues = lintPage(page, (t.parent?.depth ?? -1) + 1);
    const judged = g.outputCheck === 'all' || (g.outputCheck === 'custom' && t.action.kind === 'custom');
    if (!issues.length && judged && deadline - Date.now() > FLOOR_MS) {
      const verdict = await judgePage(client, page, Math.min(15_000, deadline - Date.now() - FLOOR_MS));
      if (verdict) {
        if (repaired) throw new StoryError('The Archive could not write that page. Try another path, Young Architect.', 422);
        issues.push(`Content review: ${verdict}`);
      }
    }
    if (issues.length && !repaired && Date.now() < deadline - LAST_ROUND_MS) {
      repaired = true;
      forceLast = true;
      messages.push({ role: 'user', content: `Rewrite the page as JSON and fix: ${issues.join(' ')}` });
      continue;
    }
    if (issues.some((i) => /may not appear|personal details/.test(i))) {
      throw new StoryError('The Archive could not write that page. Try another path, Young Architect.', 422);
    }
    out = page;
    break;
  }
  usage.ms = Date.now() - t0;

  ledger.settle();
  if (out.artifact_description) ledger.addArtefact(out.artifact_description);
  return toGmPage(t, out, ledger, usage);
}

function toGmPage(t: GmTurn, out: GmPageOutput, ledger: Ledger, usage: PageGm['usage']): Page {
  const depth = (t.parent?.depth ?? -1) + 1;
  const ending = out.ending && depth >= 4 ? { type: pick(IFAIRY_ENDINGS, out.ending.type, 'canon'), title: out.ending.title.slice(0, 80) } : null;
  const seen = new Set<string>();
  const choices = ending
    ? []
    : out.choices
      .map((c) => ({ id: randomUUID().slice(0, 8), label: c.label.replace(/^[AB]\)\s*/, '').slice(0, 120), kind: pick(FORCES, c.kind, 'mythos'), risk: pick(['safe', 'risky'] as const, c.risk, 'safe') }))
      .filter((c) => !seen.has(c.kind) && seen.add(c.kind))
      .slice(0, 2);
  const { stats, inventory, gm } = ledger.world;
  return {
    id: t.pageId,
    parentId: t.parent?.id ?? null,
    depth,
    action: t.action.kind === 'boot' ? null : { kind: t.action.kind, label: t.action.label },
    narration: out.narration,
    quip: out.narrator_aside,
    mood: pick(['neutral', 'smug', 'annoyed', 'panic', 'sincere', 'hyped'] as const, out.mood, 'sincere'),
    choices,
    ending,
    imagePrompt: out.image_prompt,
    imageUrl: null,
    audioUrl: null,
    stats,
    canon: 100,
    inventory,
    summary: out.story_summary,
    createdAt: Date.now(),
    lore: resolveLore(out.lore_refs, ledger.passages),
    freeForm: ending ? undefined : out.free_form_prompt.replace(/^C\)\s*/, '').slice(0, 160),
    scene: { location: out.scene.location.slice(0, 80), present: out.scene.present.slice(0, 8).map((p) => p.slice(0, 60)) },
    ...(t.screened && (t.screened.privacy || t.screened.distress) ? { safety: { ...(t.screened.privacy ? { privacy: true } : {}), ...(t.screened.distress ? { distress: true } : {}) } } : {}),
    gm: { v: 1, rolls: ledger.rolls, events: ledger.events, state: gm, trace: ledger.trace, usage },
  };
}

/** Admin probe: proves tools plus structured output work on the configured Game Master model. */
export async function probeGm(): Promise<{ text: string; model: string; ms: number; toolCalled: boolean }> {
  const apiKey = getKey('anthropic');
  if (!apiKey) throw new StoryError('No Anthropic API key configured.', 503);
  const cfg = getConfig();
  const client = anthropicClient(apiKey);
  const t0 = Date.now();
  const roll = GM_TOOLS.find((t) => t.name === 'roll_check')!;
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: 'Test of the Game Master tools: call roll_check once (approach logos, risk standard, intent "test"), then reply with one sentence announcing the result.' }];
  const format = betaZodOutputFormat(z.object({ line: z.string() }));
  let toolCalled = false;
  try {
    for (let round = 0; round < 3; round++) {
      const res = await client.beta.messages.parse({
        model: cfg.gm.model || cfg.story.model, max_tokens: 4000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
        tools: [roll], tool_choice: { type: round === 2 ? 'none' : 'auto' }, messages, output_config: { effort: 'low', format },
      });
      messages.push({ role: 'assistant', content: res.content as Anthropic.Beta.BetaContentBlockParam[] });
      const call = res.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
      if (call) {
        toolCalled = true;
        messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: call.id, content: '{"dice":[4,5],"total":10,"band":"bright"}' }] });
        continue;
      }
      return { text: res.parsed_output?.line ?? '(empty)', model: res.model, ms: Date.now() - t0, toolCalled };
    }
    throw new StoryError('The model kept calling tools without answering.', 502);
  } catch (e) {
    if (e instanceof StoryError) throw e;
    throw new StoryError(describeAnthropicError(e), 502);
  }
}
