import Anthropic from '@anthropic-ai/sdk';
import type { ModelInfo } from './types';

export const anthropicClient = (apiKey: string) => new Anthropic({ apiKey });

export async function listAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  const out: ModelInfo[] = [];
  for await (const m of anthropicClient(apiKey).models.list()) {
    out.push({ id: m.id, label: m.display_name, tags: ['text'] });
  }
  return out;
}

/** Maps SDK errors to a short, human-readable reason for the UI. */
export function describeAnthropicError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'Anthropic rejected the API key.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'This Anthropic key has no access to that model.';
  if (e instanceof Anthropic.NotFoundError) return 'Anthropic model not found. Fetch models in the admin panel.';
  if (e instanceof Anthropic.RateLimitError) return 'Anthropic rate limit hit. Try again in a moment.';
  if (e instanceof Anthropic.BadRequestError) return `Anthropic bad request: ${e.message}`;
  if (e instanceof Anthropic.APIError) return `Anthropic API error ${e.status ?? ''}: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}
