import { randomUUID } from 'crypto';
import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import { FORCES } from '../../shared/types';
import type { CanonPassage, NpcCard } from '../../shared/universe';
import type { Axis, GmEvent, Meter, RollRecord } from '../../shared/gm';
import { freshNpc } from './kernel/events';
import { validateQuest } from './kernel/quests';
import { applyEvent, type World } from './kernel/events';
import { defaultChoice, pickRule, rollCheck, validateChoice } from './kernel/rules';
import { searchCanonSafe } from '../universe/client';
import { matchTerms } from '../universe/terms';

/**
 * The Game Master's tools. The model proposes; this code checks every call against the rules
 * and per-turn limits and turns it into events. A rejected call comes back as an error result
 * and changes nothing.
 */

const s = z.strictObject;
const SCHEMAS = {
  roll_check: s({
    approach: z.enum(FORCES).describe('The force the Young Architect calls on.'),
    risk: z.enum(['low', 'standard', 'high']).describe('How dangerous failure would be.'),
    intent: z.string().describe('What the Young Architect is trying to do, in a few words.'),
    helper_npc: z.string().nullable().describe('npc_id of an NPC who helps; +1 if they trust the player (trust 2+), otherwise null.'),
  }),
  choose_outcome: s({
    roll_id: z.string(),
    option_ids: z.array(z.string()).describe('Exactly as many options of each kind as the roll asks for.'),
  }),
  grant_item: s({ name: z.string().describe('Short canon-flavoured item name, max 60 characters.'), reason: z.string() }),
  drop_item: s({ name: z.string().describe('Exact name of an item in the inventory.'), reason: z.string() }),
  adjust_meter: s({
    meter: z.enum(['harmony', 'dissonance', 'etherium']),
    delta: z.number().int().describe('Between -5 and 5.'),
    cause: z.string(),
  }),
  search_canon: s({
    terms: z.array(z.string()).describe('Canon names and terms only (places, beings, concepts), never the player\'s words.'),
    purpose: z.string(),
  }),
  add_canon_claim: s({
    subject: z.string().describe('Who or what the fact is about.'),
    text: z.string().describe('One short sentence, consistent with the canon passages.'),
    visibility: z.enum(['public', 'party', 'gm_only']).describe('public and party facts appear in the player\'s journal; gm_only stay hidden.'),
    ref_handle: z.string().nullable().describe('C… or L… handle of the canon passage it rests on, or null for a new local fact.'),
  }),
  get_npc: s({ npc_id: z.string() }),
  npc_remember: s({
    npc_id: z.string(),
    memory: z.string().describe('What this NPC will remember about the Young Architect, one short sentence.'),
    salience: z.enum(['1', '2', '3']).describe('3 for something they will never forget, 1 for a passing moment.'),
  }),
  update_relationship: s({
    npc_id: z.string(),
    axis: z.enum(['affinity', 'trust', 'respect']),
    delta: z.number().int().describe('Exactly -1 or 1.'),
    cause: z.string(),
  }),
  reveal_secret: s({ npc_id: z.string() }),
  update_quest: s({
    node_id: z.string(),
    status: z.enum(['done', 'failed', 'transformed']),
    into: z.string().nullable().describe('For transformed: what the goal has become. Otherwise null.'),
  }),
  schedule_consequence: s({
    after_pages: z.number().int().describe('1 to 4 pages from now.'),
    text: z.string().describe('What will happen, as a short instruction to your future self.'),
    visibility: z.enum(['obvious', 'hidden']),
  }),
  advance_time: s({ segments: z.number().int().describe('1 to 4 parts of a day (morning, afternoon, evening, night).') }),
  tick_clock: s({ clock_id: z.string(), delta: z.number().int().describe('-1 or 1 (2 after a twist this page).') }),
  spread_rumour: s({ text: z.string(), is_true: z.boolean() }),
};
type ToolName = keyof typeof SCHEMAS;

const DESCRIPTIONS: Record<ToolName, string> = {
  roll_check: 'Roll 2d6 + approach for an uncertain, risky action. Only when failure would be interesting. Returns the dice, the band and the outcome options to choose from. If a check was already rolled for the chosen option, this returns that roll.',
  choose_outcome: 'Pick the outcome options for a roll (bright: benefits; success-but: one cost and one benefit; twist: one GM move). Their effects are applied by the rules.',
  grant_item: 'Give the Young Architect an item the story actually hands them.',
  drop_item: 'Remove an item the Young Architect used up, gave away or lost.',
  adjust_meter: 'Nudge a meter by a small amount when the story earns it without a roll (kindness, rest, disruption).',
  search_canon: 'Look up canon passages about named places, beings or concepts. Returns L-handles you may cite.',
  add_canon_claim: 'Record a new fact this page establishes, so later pages stay consistent. Facts are append-only.',
  get_npc: "An NPC's card: role, voice, what they know, how they regard the Young Architect, what they remember, and whether they hold a secret.",
  npc_remember: 'Store something an NPC will remember about the Young Architect.',
  update_relationship: "Shift how an NPC regards the Young Architect by one step on one axis, for something that happened on this page.",
  reveal_secret: "Let an NPC share their secret, once they trust the Young Architect enough. Returns the secret to weave into the scene.",
  update_quest: 'Close the active quest goal as done or failed, or transform it into a new goal when the story turns.',
  schedule_consequence: 'Plant a consequence that comes back on a later page.',
  advance_time: 'Move the clock forward for travel, rest or a long task.',
  tick_clock: 'Advance or wind back a threat clock.',
  spread_rumour: 'Start a rumour in the Golden City; whether it is true stays hidden from the player.',
};

const LIMITS: Record<ToolName, number> = {
  roll_check: 2, choose_outcome: 2, grant_item: 2, drop_item: 2, adjust_meter: 2, search_canon: 1, add_canon_claim: 3,
  get_npc: 3, npc_remember: 3, update_relationship: 3, reveal_secret: 1, update_quest: 3, schedule_consequence: 1, advance_time: 1, tick_clock: 2, spread_rumour: 1,
};

/** Strict tool schemas reject numeric bounds (zod adds safe-integer limits to every int); the ledger checks ranges itself. */
function stripBounds(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripBounds);
  if (!node || typeof node !== 'object') return node;
  return Object.fromEntries(
    Object.entries(node)
      .filter(([k]) => !['$schema', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum'].includes(k))
      .map(([k, v]) => [k, stripBounds(v)]),
  );
}

function jsonSchema(schema: z.ZodType) {
  return stripBounds(z.toJSONSchema(schema)) as Anthropic.Beta.BetaTool.InputSchema;
}

/**
 * Strict (grammar-constrained) only for the mechanics: the API rejects too many strict tools at once
 * ("compiled grammar is too large"), and the ledger validates every input with zod anyway.
 */
const STRICT = new Set<ToolName>(['roll_check', 'choose_outcome', 'update_relationship', 'reveal_secret', 'update_quest']);

/** Fixed order and fixed text, built once: the tool list is the start of the cached prefix. */
export const GM_TOOLS: Anthropic.Beta.BetaTool[] = (Object.keys(SCHEMAS) as ToolName[]).map((name) => ({
  name,
  description: DESCRIPTIONS[name],
  input_schema: jsonSchema(SCHEMAS[name]),
  ...(STRICT.has(name) ? { strict: true } : {}),
}));

export interface LedgerContext {
  seed: string;
  /** storyId|parentPageId|actionDigest: each roll appends its index. */
  streamBase: string;
  pageId: string;
  world: World;
  whitelist: string[];
  /** Passages the model may cite: the adventure's C-handles and this turn's L-handles. */
  passages: CanonPassage[];
  preRoll?: RollRecord;
  npcs: NpcCard[];
  /** Depth of the page being written, for scheduling consequences. */
  depth: number;
}

/** Runs one turn's tool calls and keeps the resulting events, rolls and working state. */
export class Ledger {
  events: GmEvent[] = [];
  rolls: RollRecord[] = [];
  trace: { tool: string; ok: boolean; ms: number; error?: string }[] = [];
  world: World;
  passages: CanonPassage[];
  private counts: Partial<Record<ToolName, number>> = {};
  private preClaimed = false;
  private grantsWithoutRoll = 0;
  private remembered = new Set<string>();
  private shifted = new Set<string>();
  /** Consequences that came due on this page, for the GM CONTEXT. */
  due: string[] = [];

  constructor(private ctx: LedgerContext) {
    this.world = ctx.world;
    this.passages = [...ctx.passages];
    // The director's own events: time moves on with every page, and planted consequences come due.
    if (ctx.depth > 0 && this.world.gm.world) this.record({ type: 'time', segments: 1 });
    for (const c of this.world.gm.consequences ?? []) {
      if (!c.fired && c.dueDepth <= ctx.depth) {
        this.record({ type: 'consequence_fire', id: c.id });
        this.due.push(c.text);
      }
    }
    if (ctx.preRoll) this.record({ type: 'roll', roll: ctx.preRoll }, ctx.preRoll);
  }

  private card(id: string): NpcCard {
    const card = this.ctx.npcs.find((n) => n.id === id);
    if (!card) throw new Error(`Unknown npc_id. Known: ${this.ctx.npcs.map((n) => n.id).join(', ')}.`);
    return card;
  }

  private meet(id: string) {
    if (!this.world.gm.npcs?.[id]?.met) this.record({ type: 'npc_meet', npc: id });
  }

  /** NPCs named in the page's scene count as met. */
  meetPresent(present: string[]) {
    for (const p of present.map((x) => x.toLowerCase().replace(/^(?:an?|the)\s+/, '').trim()).filter((x) => x.length >= 3)) {
      const card = this.ctx.npcs.find((n) => p.includes(n.name.toLowerCase()) || n.name.toLowerCase().includes(p));
      if (card) this.meet(card.id);
    }
  }

  private record(ev: GmEvent, roll?: RollRecord) {
    this.events.push(ev);
    this.world = applyEvent(this.world, ev);
    if (roll) this.rolls.push(roll);
  }

  async run(block: Anthropic.Beta.BetaToolUseBlock): Promise<Anthropic.Beta.BetaToolResultBlockParam> {
    const t0 = Date.now();
    const name = block.name as ToolName;
    const finish = (content: string, error?: string): Anthropic.Beta.BetaToolResultBlockParam => {
      this.trace.push({ tool: block.name, ok: !error, ms: Date.now() - t0, ...(error ? { error } : {}) });
      return { type: 'tool_result', tool_use_id: block.id, content: error ?? content, ...(error ? { is_error: true } : {}) };
    };
    if (!(name in SCHEMAS)) return finish('', `Unknown tool ${block.name}.`);
    if ((this.counts[name] ?? 0) >= LIMITS[name]) return finish('', `${name} can be used at most ${LIMITS[name]} times per page.`);
    const parsed = SCHEMAS[name].safeParse(block.input);
    if (!parsed.success) return finish('', `Invalid input: ${parsed.error.issues[0]?.message}`);
    this.counts[name] = (this.counts[name] ?? 0) + 1;
    try {
      return finish(await this.exec(name, parsed.data as never));
    } catch (e) {
      this.counts[name]!--;
      return finish('', (e as Error).message);
    }
  }

  private async exec(name: ToolName, input: any): Promise<string> {
    switch (name) {
      case 'roll_check': {
        const pre = this.ctx.preRoll;
        if (pre && !this.preClaimed) {
          this.preClaimed = true;
          return JSON.stringify(this.describe(pre));
        }
        const index = this.world.gm.rollCount;
        const helper = input.helper_npc ? this.card(input.helper_npc) : null;
        const helps = helper && (this.world.gm.npcs?.[helper.id]?.trust ?? 0) >= 2;
        const roll = rollCheck({ seed: this.ctx.seed, streamKey: `${this.ctx.streamBase}|${index}`, id: `r${index + 1}`, approach: input.approach, risk: input.risk, intent: input.intent, state: this.world.gm, extraMods: helps ? [{ label: `help from ${helper!.name}`, value: 1 }] : [] });
        this.record({ type: 'roll', roll }, roll);
        return JSON.stringify(this.describe(roll));
      }
      case 'choose_outcome': {
        const roll = this.rolls.find((r) => r.id === input.roll_id);
        if (!roll) throw new Error(`No roll ${input.roll_id} this page.`);
        if (roll.chosen.length) throw new Error(`${roll.id} already has its outcome.`);
        const problem = validateChoice(roll, input.option_ids);
        if (problem) throw new Error(problem);
        this.applyOutcome(roll, input.option_ids, false);
        return `Applied: ${roll.options.filter((o) => roll.chosen.includes(o.id)).map((o) => o.label).join('; ')}. Narrate it.`;
      }
      case 'grant_item': {
        const item = String(input.name).trim().slice(0, 60);
        if (!item) throw new Error('Name the item.');
        const earned = this.rolls.some((r) => r.band === 'bright');
        if (!earned && this.grantsWithoutRoll >= 1) throw new Error('Only one item per page without a bright success.');
        if (!earned) this.grantsWithoutRoll++;
        this.record({ type: 'item_add', name: item, cause: String(input.reason).slice(0, 120) });
        return `Added "${item}".`;
      }
      case 'drop_item': {
        if (!this.world.inventory.includes(input.name)) throw new Error(`Not in the inventory. Items: ${this.world.inventory.join(', ') || 'none'}.`);
        this.record({ type: 'item_drop', name: input.name, cause: String(input.reason).slice(0, 120) });
        return `Removed "${input.name}".`;
      }
      case 'adjust_meter': {
        if (input.delta < -5 || input.delta > 5 || input.delta === 0) throw new Error('delta must be between -5 and 5, not 0.');
        this.record({ type: 'meter', meter: input.meter as Meter, delta: input.delta, cause: String(input.cause).slice(0, 120) });
        return `${input.meter} ${input.delta > 0 ? '+' : ''}${input.delta}.`;
      }
      case 'search_canon': {
        const terms = [...new Set((input.terms as string[]).flatMap((t) => matchTerms(t, this.ctx.whitelist)))].slice(0, 6);
        if (!terms.length) return 'No canon terms recognised. Use names of canon places, beings or concepts.';
        const found = await searchCanonSafe(terms, 3);
        const start = this.passages.filter((p) => p.handle.startsWith('L')).length;
        const fresh = found.map((e, i) => ({ handle: `L${start + i + 1}`, ref: e.ref, title: e.title, text: e.text }));
        this.passages.push(...fresh);
        return fresh.length ? fresh.map((p) => `[${p.handle}] ${p.ref} — ${p.title}\n${p.text}`).join('\n\n') : 'Nothing found in the canon.';
      }
      case 'add_canon_claim': {
        const handle = input.ref_handle ? String(input.ref_handle).replace(/^\[|\]$/g, '').toUpperCase() : null;
        const passage = handle ? this.passages.find((p) => p.handle.toUpperCase() === handle) : undefined;
        if (handle && !passage) throw new Error(`Unknown handle ${input.ref_handle}.`);
        this.record({
          type: 'fact',
          fact: { id: randomUUID().slice(0, 8), subject: String(input.subject).slice(0, 60), text: String(input.text).slice(0, 200), visibility: input.visibility, source: passage ? 'canon' : 'narration', ...(passage ? { ref: passage.ref } : {}), pageId: this.ctx.pageId },
        });
        return 'Recorded.';
      }
      case 'get_npc': {
        const card = this.card(input.npc_id);
        this.meet(card.id);
        const st = this.world.gm.npcs?.[card.id] ?? freshNpc();
        const memories = [...st.memories].sort((a, b) => b.salience - a.salience).slice(0, 3).map((m) => m.text);
        return JSON.stringify({
          npc_id: card.id, name: card.name, role: card.role, voice: card.voice, knows: card.knows,
          regard: { affinity: st.affinity, trust: st.trust, respect: st.respect }, remembers: memories,
          secret: card.secret ? (st.revealed.includes(card.secret.id) ? 'already shared' : `holds secret ${card.secret.id} (shares it at trust ${card.secret.trust})`) : 'none',
          rule: 'Voice them only within what they know.',
        });
      }
      case 'npc_remember': {
        const card = this.card(input.npc_id);
        if (this.remembered.has(card.id)) throw new Error(`${card.name} already stored a memory this page.`);
        this.remembered.add(card.id);
        this.meet(card.id);
        this.record({ type: 'npc_memory', npc: card.id, text: String(input.memory).slice(0, 160), salience: Number(input.salience) as 1 | 2 | 3, pageId: this.ctx.pageId });
        return `${card.name} will remember that.`;
      }
      case 'update_relationship': {
        const card = this.card(input.npc_id);
        if (input.delta !== 1 && input.delta !== -1) throw new Error('delta must be exactly -1 or 1.');
        const key = `${card.id}:${input.axis}`;
        if (this.shifted.has(key)) throw new Error(`${card.name}'s ${input.axis} already changed this page.`);
        this.shifted.add(key);
        this.meet(card.id);
        this.record({ type: 'relationship', npc: card.id, axis: input.axis as Axis, delta: input.delta, cause: String(input.cause).slice(0, 120) });
        const st = this.world.gm.npcs![card.id];
        return `${card.name}: affinity ${st.affinity}, trust ${st.trust}, respect ${st.respect}.`;
      }
      case 'reveal_secret': {
        const card = this.card(input.npc_id);
        if (!card.secret) throw new Error(`${card.name} holds no secret.`);
        const st = this.world.gm.npcs?.[card.id] ?? freshNpc();
        if (st.revealed.includes(card.secret.id)) throw new Error('Already shared.');
        const bright = this.rolls.some((r) => r.band === 'bright');
        if (st.trust < card.secret.trust && !bright) throw new Error(`Not yet: ${card.name}'s trust is ${st.trust}, they share it at ${card.secret.trust} (or after a bright success).`);
        this.meet(card.id);
        this.record({ type: 'secret_revealed', npc: card.id, secretId: card.secret.id });
        return `${card.name} shares, in their own voice: ${card.secret.text}`;
      }
      case 'update_quest': {
        const problem = validateQuest(this.world.gm.quest ?? [], input.node_id, input.status, input.into);
        if (problem) throw new Error(problem);
        this.record({ type: 'quest', nodeId: input.node_id, status: input.status, ...(input.status === 'transformed' ? { into: String(input.into).slice(0, 120) } : {}) });
        const active = (this.world.gm.quest ?? []).find((n) => n.status === 'active');
        return `Quest updated. Active goal now: ${active ? `${active.id}: ${active.title}` : 'none, the quest is complete'}.`;
      }
      case 'schedule_consequence': {
        if (input.after_pages < 1 || input.after_pages > 4) throw new Error('after_pages must be 1 to 4.');
        if ((this.world.gm.consequences ?? []).filter((c) => !c.fired).length >= 6) throw new Error('Six consequences are already pending.');
        this.record({ type: 'consequence_add', consequence: { id: randomUUID().slice(0, 8), text: String(input.text).slice(0, 200), visibility: input.visibility, dueDepth: this.ctx.depth + input.after_pages, fired: false, fromPageId: this.ctx.pageId } });
        return `Planted; it comes due in ${input.after_pages} page(s).`;
      }
      case 'advance_time': {
        if (input.segments < 1 || input.segments > 4) throw new Error('segments must be 1 to 4.');
        this.record({ type: 'time', segments: input.segments });
        return 'Time moves on.';
      }
      case 'tick_clock': {
        const clock = this.world.gm.world?.clocks.find((c) => c.id === input.clock_id);
        if (!clock) throw new Error(`Unknown clock. Clocks: ${(this.world.gm.world?.clocks ?? []).map((c) => c.id).join(', ') || 'none'}.`);
        const max = this.rolls.some((r) => r.band === 'twist') ? 2 : 1;
        if (!input.delta || Math.abs(input.delta) > max) throw new Error(`delta must be between -${max} and ${max}, not 0.`);
        this.record({ type: 'clock', clockId: clock.id, delta: input.delta });
        const now = this.world.gm.world!.clocks.find((c) => c.id === clock.id)!;
        return `${now.label}: ${now.value}/${now.max}${now.value >= now.max ? ' (full: bring it to a head)' : ''}.`;
      }
      case 'spread_rumour': {
        this.record({ type: 'rumour', rumour: { id: randomUUID().slice(0, 8), text: String(input.text).slice(0, 160), truth: !!input.is_true } });
        return 'The rumour spreads.';
      }
    }
  }

  private describe(roll: RollRecord) {
    const need = pickRule(roll);
    return {
      roll_id: roll.id, approach: roll.approach, dice: roll.dice, modifiers: roll.mods, total: roll.total, band: roll.band, surge: roll.surge,
      pick: need, options: roll.options.map(({ id, kind, label }) => ({ id, kind, label })),
      next: 'Call choose_outcome with your pick, then narrate the result.',
    };
  }

  private applyOutcome(roll: RollRecord, ids: string[], auto: boolean) {
    roll.chosen = ids;
    if (auto) roll.auto = true;
    this.record({ type: 'outcome', rollId: roll.id, optionIds: ids, ...(auto ? { auto: true } : {}) });
    for (const o of roll.options.filter((o) => ids.includes(o.id))) {
      for (const [meter, delta] of Object.entries(o.effect.meters ?? {})) this.record({ type: 'meter', meter: meter as Meter, delta: delta!, cause: `${roll.id}:${o.id}` });
      if (o.effect.condition) this.record({ type: 'condition_add', name: o.effect.condition });
    }
  }

  /** Rolls the narrator never resolved get the kernel's gentlest legal outcome. */
  settle() {
    for (const roll of this.rolls) if (!roll.chosen.length) this.applyOutcome(roll, defaultChoice(roll), true);
  }

  /** The player's own artefact image becomes an item without a tool call. */
  addArtefact(description: string) {
    this.record({ type: 'item_add', name: `🖼 ${description.slice(0, 60)}`, cause: 'artefact attached by the player' });
  }
}
