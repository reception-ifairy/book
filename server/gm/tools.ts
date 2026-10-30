import { randomUUID } from 'crypto';
import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import { FORCES } from '../../shared/types';
import type { CanonPassage } from '../../shared/universe';
import type { GmEvent, Meter, RollRecord } from '../../shared/gm';
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
};

const LIMITS: Record<ToolName, number> = { roll_check: 2, choose_outcome: 2, grant_item: 2, drop_item: 2, adjust_meter: 2, search_canon: 1, add_canon_claim: 3 };

function jsonSchema(schema: z.ZodType) {
  const { $schema: _drop, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest as Anthropic.Beta.BetaTool.InputSchema;
}

/** Fixed order and fixed text, built once: the tool list is the start of the cached prefix. */
export const GM_TOOLS: Anthropic.Beta.BetaTool[] = (Object.keys(SCHEMAS) as ToolName[]).map((name) => ({
  name,
  description: DESCRIPTIONS[name],
  input_schema: jsonSchema(SCHEMAS[name]),
  strict: true,
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

  constructor(private ctx: LedgerContext) {
    this.world = ctx.world;
    this.passages = [...ctx.passages];
    if (ctx.preRoll) this.record({ type: 'roll', roll: ctx.preRoll }, ctx.preRoll);
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
        const roll = rollCheck({ seed: this.ctx.seed, streamKey: `${this.ctx.streamBase}|${index}`, id: `r${index + 1}`, approach: input.approach, risk: input.risk, intent: input.intent, state: this.world.gm });
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
