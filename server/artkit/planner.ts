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

const SYSTEM = `You are the art director of "IGNIS // OS: Grimm Protocol", a choose-your-own-story web game. Classic fairy tales are retold as buggy legacy code; the narrator IGNIS is a sarcastic cyber-grimoire. Audience: teens and adults who like Rick and Morty style humour (dark, absurd, meta), never any names or characters from that show.

The visual identity is "cyber-magic in a cozy workshop", taken from the reference cartoons the owner loves: a modern animated-series look with bold clean dark ink outlines, flat cel shading with soft gradients, warm wooden workshop interiors at night, a stone fireplace, fairy-light garlands, snow outside, gingerbread and candy canes, and slapstick energy (impact stars, dizzy spirals, motion lines). Magic is technological: little robots with pixel-screen faces and fairy wings, glowing runes on gadgets.

The UI is already built in this style. Its palette, which the artwork must sit comfortably on:
- wood wall #2a1c15 / #3a281f, ink outline #241913
- cream paper #fdf5e4, parchment #f3e4c4
- ember orange #ff7a2f (IGNIS's flame, primary accent), gold #f4c84a, candy red #d8423b, pine green #3f9f5f
- chaos violet #8b63e6, mana blue #2f9fd8, ice #9ad7e3, pixel-screen cyan #5ef0ff on screen navy #1b2632

IGNIS's established design (keep it identical everywhere): a small flying robot whose body is a thick red-brown leather grimoire with gold corner caps and a gold rune circle on the cover and cream page edges; its head is a rounded slate-blue CRT monitor with a dark navy screen showing a cyan pixel face; yellow translucent fairy wings with darker veins; a little flame (ember) as its antenna; short grey robot arms with round hands; two little legs with grey boots.

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
export function composePrompt(plan: ArtPlan, slot: ArtSlot): string {
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
  return `${style.join('\n')}\n\nImage: ${asset?.prompt ?? slot.brief}\n\n${technical}${text}`;
}
