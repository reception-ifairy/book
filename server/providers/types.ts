export type ModelTag = 'text' | 'image' | 'tts';

export interface ModelInfo {
  id: string;
  label?: string;
  tags: ModelTag[];
}

export interface Media {
  mime: string;
  data: Buffer;
}

/** A provider call failed; the message is already cleaned for display. */
export class ProviderError extends Error {}

/** Gemini and OpenAI errors often embed a raw JSON body; keep just its human message. */
export function cleanProviderMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const msg = /"message"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(raw)?.[1];
  return (msg ?? raw).slice(0, 300);
}
