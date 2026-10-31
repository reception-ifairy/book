import { randomUUID } from 'crypto';
import { z } from 'zod';
import { pick, type PlayerAction } from '../../engine';
import { FORCES, type LoreRef, type Page, type Stats } from '../../../../shared/types';
import type { CanonPassage } from '../../../../shared/universe';

const MOODS = ['neutral', 'smug', 'annoyed', 'panic', 'sincere', 'hyped'] as const;
/** No deaths or curses in the iFairy world: setbacks are complications. */
export const IFAIRY_ENDINGS = ['canon', 'subverted', 'secret'] as const;

const oneOf = (values: readonly string[]) => z.string().describe(`One of: ${values.join(', ')}`);

/** What Claude returns for every iFairy page. Stats are stored in the shared Stats shape (see toIfairyPage). */
export const IfairyPageOutput = z.object({
  narration: z.string(),
  narrator_aside: z.string(),
  mood: oneOf(MOODS),
  choices: z.array(z.object({ label: z.string(), kind: oneOf(FORCES) })),
  free_form_prompt: z.string(),
  stat_changes: z.object({ harmony: z.number().int(), dissonance: z.number().int(), etherium: z.number().int() }),
  inventory_add: z.array(z.string()),
  inventory_remove: z.array(z.string()),
  ending: z.object({ type: oneOf(IFAIRY_ENDINGS), title: z.string() }).nullable(),
  image_prompt: z.string(),
  story_summary: z.string(),
  lore_refs: z.array(z.string()),
  scene: z.object({ location: z.string(), present: z.array(z.string()) }),
  artifact_description: z.string().nullable(),
});
export type IfairyPageOutput = z.infer<typeof IfairyPageOutput>;

/** Harmony is kept in `karma`, dissonance in `chaos`, Etherium in `mana`. */
export const IFAIRY_START_STATS: Stats = { chaos: 0, karma: 0, mana: 60 };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/** Maps cited handles back to canon passages; unknown handles are dropped, never invented. */
export function resolveLore(handles: string[], passages: CanonPassage[]): LoreRef[] {
  const byHandle = new Map(passages.map((p) => [p.handle.toUpperCase(), p]));
  const out = new Map<string, LoreRef>();
  for (const h of handles) {
    const p = byHandle.get(h.trim().replace(/^\[|\]$/g, '').toUpperCase());
    if (p && !out.has(p.ref)) out.set(p.ref, { ref: p.ref, title: p.title, excerpt: p.text.slice(0, 400) });
  }
  return [...out.values()].slice(0, 3);
}

/** Turns Claude's raw iFairy page into a stored Page with the same clamps as Grimm. */
export function toIfairyPage(parent: Page | null, action: PlayerAction, out: IfairyPageOutput, passages: CanonPassage[]): Page {
  const base = parent?.stats ?? IFAIRY_START_STATS;
  const d = out.stat_changes;
  let inventory = [...(parent?.inventory ?? [])].filter((i) => !out.inventory_remove.includes(i));
  inventory = [...new Set([...inventory, ...out.inventory_add.map((i) => i.slice(0, 60))])].slice(-12);
  if (out.artifact_description) inventory = [...new Set([...inventory, `🖼 ${out.artifact_description.slice(0, 60)}`])].slice(-12);
  const choices = out.ending
    ? []
    : out.choices.slice(0, 3).map((c) => ({ id: randomUUID().slice(0, 8), label: c.label.replace(/^[AB]\)\s*/, '').slice(0, 120), kind: pick(FORCES, c.kind, 'mythos') }));
  return {
    id: randomUUID(),
    parentId: parent?.id ?? null,
    depth: (parent?.depth ?? -1) + 1,
    action: action.kind === 'boot' ? null : { kind: action.kind, label: action.label },
    narration: out.narration,
    quip: out.narrator_aside,
    mood: pick(MOODS, out.mood, 'sincere'),
    choices,
    ending: out.ending ? { type: pick(IFAIRY_ENDINGS, out.ending.type, 'canon'), title: out.ending.title.slice(0, 80) } : null,
    imagePrompt: out.image_prompt,
    imageUrl: null,
    audioUrl: null,
    stats: {
      chaos: clamp(base.chaos + clamp(d.dissonance, -25, 25), 0, 100),
      karma: clamp(base.karma + clamp(d.harmony, -25, 25), -100, 100),
      mana: clamp(base.mana + clamp(d.etherium, -25, 25), 0, 100),
    },
    canon: 100,
    inventory,
    summary: out.story_summary,
    createdAt: Date.now(),
    lore: resolveLore(out.lore_refs, passages),
    freeForm: out.ending ? undefined : out.free_form_prompt.replace(/^C\)\s*/, '').slice(0, 160),
    scene: { location: out.scene.location.slice(0, 80), present: out.scene.present.slice(0, 8).map((p) => p.slice(0, 60)) },
  };
}
