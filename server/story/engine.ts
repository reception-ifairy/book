import { z } from 'zod';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { getConfig, getKey } from '../config';
import { anthropicClient, describeAnthropicError } from '../providers/anthropic';
import type { ChoiceKind, Page, Story } from '../../shared/types';

/** Helpers every part of the story pipeline shares. The Edu-Verse turn itself lives in worlds/ifairy/. */

/** Off-list values fall back instead of failing the whole page. */
export function pick<T extends readonly string[]>(values: T, value: string, fallback: T[number]): T[number] {
  const norm = value.trim().toLowerCase();
  return (values as readonly string[]).includes(norm) ? (norm as T[number]) : fallback;
}

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

/** The pages from the first one down to `pageId`. */
export function pathTo(story: Story, pageId: string): Page[] {
  const out: Page[] = [];
  for (let p: Page | undefined = story.pages[pageId]; p; p = p.parentId ? story.pages[p.parentId] : undefined) out.unshift(p);
  return out;
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
      messages: [{ role: 'user', content: 'You are IGNIS, the winged cyber-grimoire who guides young explorers through the iFairy Quantum Edu-Verse. Announce in one cheerful sentence that the portals are open.' }],
      output_config: { effort: 'low', format: betaZodOutputFormat(z.object({ line: z.string() })) },
    });
    return { text: res.parsed_output?.line ?? '(empty)', model: res.model, ms: Date.now() - t0 };
  } catch (e) {
    throw new StoryError(describeAnthropicError(e), 502);
  }
}
