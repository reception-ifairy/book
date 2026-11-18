import { z } from 'zod';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { getConfig, getKey } from '../config';
import { anthropicClient, describeAnthropicError } from '../providers/anthropic';
import { StoryError } from '../story/engine';
import { ART_SLOTS, type ArtPlan, type ArtSlot } from '../../shared/artkit';

const PlanSchema = z.object({
  style_name: z.string(),
  summary: z.string(),
  palette: z.array(z.object({ name: z.string(), hex: z.string(), role: z.string() })),
  line_and_shading: z.string(),
  lighting: z.string(),
  motifs: z.array(z.string()),
  ignis_model_sheet: z.string(),
  avoid: z.array(z.string()),
  assets: z.array(z.object({ slot: z.string(), prompt: z.string(), alt: z.string() })),
});

const SYSTEM = `You are the art director of "ARB · The Arcane Rescue Bureau", a choose-your-own-story web game. Old fairy tales from the Public Domain run on enchanted code and something has gone hilariously wrong; the player is a Bureau agent who steps into the tale, investigates and decides what happens next, with IGNIS, a cheeky cyber-magic robot, as their field assistant. Audience: players aged 12 and up; the look is playful, warm and funny like a good animated family film, never scary, gory or edgy, and never uses names or characters from any existing franchise.

The visual identity is "cyber-magic in a cozy detective workshop": a modern animated-series look with bold clean dark ink outlines, flat cel shading with soft gradients, warm wooden interiors at night, a stone fireplace, fairy-light garlands, snow outside, case boards with red string, holographic case files and glowing rune locks, and slapstick energy (impact stars, dizzy spirals, motion lines). Magic is technological: brass lanterns of swirling magic, gold filigree like circuit traces, pixel sparkles, glowing runes on gadgets.

The UI is already built in this style. Its palette, which the artwork must sit comfortably on:
- wood wall #2a1c15 / #3a281f, ink outline #241913
- cream paper #fdf5e4, parchment #f3e4c4
- ember orange #ff7a2f (IGNIS's flame, primary accent), gold #f4c84a, candy red #d8423b, pine green #3f9f5f
- chaos violet #8b63e6, mana blue #2f9fd8, ice #9ad7e3, pixel-screen cyan #5ef0ff on screen navy #1b2632

IGNIS's established design (keep it identical everywhere; it is NOT a book; a reference image of IGNIS is supplied to the renderer for every image that shows it): a palm-sized flying robot. Head: a rounded CRT monitor with a dark slate-blue shell and a light silver-grey front bezel with small rivets, a dark navy screen showing a simple cyan pixel face (rectangular pixel eyes, one raised pixel eyebrow, a wide pixel smile), round brass-ringed lenses glowing cyan on both sides of the head, a small brass dome cap with a cyan gem on top, and a living ember flame rising from it as its antenna. Body: an ornate cylindrical brass-and-glass lantern with gold filigree bands and diamond-shaped cyan gems; behind the glass panes swirls a small galaxy of orange, violet and blue magic with gold sparkles; a translucent ring of glowing cyan glyphs orbits the lantern at waist height. Arms: short dark-grey jointed robot arms with brass elbows and round dark hands with cyan-glowing palms; it often raises one finger as if explaining, and holds a glowing holographic clipboard (the agent's case file). Instead of legs it floats on a brass hover base with a glowing cyan ring underneath. Wings: four translucent pale blue-to-lilac dragonfly wings with a code-lattice vein pattern and small square pixel sparkles.

Your job: write the style bible and one image prompt per asset slot. The prompts go to an OpenAI GPT image model one by one, with your style bible prepended, so:
- Each prompt describes only that image: subject, pose, composition, framing, key colours, mood. Do not repeat the style bible inside it.
- Respect each slot's brief, size and where it is used. Small icons and badges need a single bold silhouette that reads at 44 px. Covers must keep the focal action in the centre band because they get cropped to a wide strip.
- Transparent slots: one isolated subject, no background scenery, no ground shadow, generous padding.
- No text or letters in any image except where a brief explicitly asks for words.
- Keep characters consistent across slots; describe IGNIS the same way whenever it appears.
- alt: a short, plain description of the final image for screen readers.
Return every slot exactly once, using the slot ids given.`;

const describeSlot = (s: ArtSlot) =>
  `- ${s.id} [${s.group}, ${s.size}${s.transparent ? ', transparent background' : ''}]\n  brief: ${s.brief}\n  used in: ${s.usedIn}`;

/** Asks Claude for the style bible and every prompt. Slots it skips get a prompt built from their brief. */
export async function planArtKit(notes: string): Promise<{ plan: ArtPlan; model: string }> {
  const apiKey = getKey('anthropic');
  if (!apiKey) throw new StoryError('No Anthropic API key configured. Add one in the admin panel.', 503);

  let message;
  try {
    // Streaming: a full plan with thinking can run long, and streaming avoids HTTP timeouts.
    const stream = anthropicClient(apiKey).beta.messages.stream({
      model: getConfig().story.model,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Asset slots:\n${ART_SLOTS.map(describeSlot).join('\n')}\n\n${notes.trim() ? `Notes from the owner:\n${notes.trim()}` : 'No extra notes from the owner.'}`,
        },
      ],
      output_config: { effort: 'high', format: betaZodOutputFormat(PlanSchema) },
    });
    message = await stream.finalMessage();
  } catch (e) {
    throw new StoryError(describeAnthropicError(e), 502);
  }
  if (message.stop_reason === 'refusal') throw new StoryError('Claude declined to plan this art kit. Try different notes.', 422);
  if (!message.parsed_output) throw new StoryError('The art plan came back incomplete. Try again.', 502);

  // The stream helper loses the parsed type, so validate again; it is cheap and keeps the types honest.
  const raw = PlanSchema.parse(message.parsed_output);
  const bySlot = new Map(raw.assets.map((a) => [a.slot, a]));
  const plan: ArtPlan = {
    ...raw,
    palette: raw.palette.filter((p) => /^#[0-9a-f]{6}$/i.test(p.hex)).slice(0, 12),
    assets: ART_SLOTS.map((s) => {
      const a = bySlot.get(s.id);
      return { slot: s.id, prompt: (a?.prompt || s.brief).slice(0, 3000), alt: (a?.alt || s.label).slice(0, 200) };
    }),
  };
  return { plan, model: message.model };
}

/** The full prompt sent to the image model: style bible, then the slot prompt, then technical constraints. */
/** Whether a slot's picture includes IGNIS (its brief or its planned prompt mentions it). */
export function showsIgnis(plan: ArtPlan | null, slot: ArtSlot): boolean {
  const asset = plan?.assets.find((a) => a.slot === slot.id);
  return /ignis/i.test(`${slot.brief} ${asset?.prompt ?? ''}`);
}

export function composePrompt(plan: ArtPlan, slot: ArtSlot, withReference = false): string {
  const asset = plan.assets.find((a) => a.slot === slot.id);
  const technical = slot.transparent
    ? 'Single isolated subject on a fully transparent background, centred with generous padding, no ground shadow, no scenery.'
    : 'Full-bleed illustration that fills the whole frame.';
  // Only a brief that explicitly asks for words may contain lettering (cover briefs merely quote their tale's title).
  const text = /\b(words|lettering)\b/i.test(slot.brief) ? '' : ' No text, letters or watermarks.';
  const style = [
    `Style "${plan.style_name}": ${plan.summary}`,
    `Line and shading: ${plan.line_and_shading}`,
    `Lighting: ${plan.lighting}`,
    `Palette: ${plan.palette.map((p) => `${p.name} ${p.hex} (${p.role})`).join(', ')}.`,
    `Recurring motifs: ${plan.motifs.join(', ')}.`,
    // Only images that show IGNIS carry its model sheet, so other subjects don't sprout CRT heads.
    /ignis/i.test(`${slot.brief} ${asset?.prompt}`) ? `IGNIS model sheet: ${plan.ignis_model_sheet}` : '',
    `Avoid: ${plan.avoid.join(', ')}.`,
  ].filter(Boolean);
  const reference = withReference
    ? '\n\nReference: the attached picture is IGNIS. Keep his design exactly (head, lantern body, colours, wings, hover ring, proportions) and redraw him in the pose and scene described, in the style above. Do not copy the attached background.'
    : '';
  return `${style.join('\n')}\n\nImage: ${asset?.prompt ?? slot.brief}${reference}\n\n${technical}${text}`;
}
