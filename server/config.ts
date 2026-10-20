import fs from 'fs';
import path from 'path';
import { z } from 'zod';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

export const ProviderId = z.enum(['anthropic', 'gemini', 'openai']);
export type ProviderId = z.infer<typeof ProviderId>;

const ENV_KEYS: Record<ProviderId, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
};

export const AppConfigSchema = z.object({
  keys: z.object({
    anthropic: z.string().optional(),
    gemini: z.string().optional(),
    openai: z.string().optional(),
  }),
  story: z.object({
    model: z.string().min(1),
    effort: z.enum(['low', 'medium', 'high']),
    maxDepth: z.number().int().min(4).max(30),
  }),
  image: z.object({
    provider: z.enum(['gemini', 'openai', 'off']),
    model: z.string(),
  }),
  tts: z.object({
    provider: z.enum(['browser', 'openai', 'gemini']),
    model: z.string(),
    voice: z.string(),
  }),
  limits: z.object({
    actionsPerMinute: z.number().int().min(1).max(600),
    imagesPerDay: z.number().int().min(0).max(100000),
  }),
  /** Art Kit: Claude plans the artwork, this OpenAI image model renders it. */
  artkit: z.object({
    model: z.string().min(1),
    quality: z.enum(['low', 'medium', 'high']),
  }),
});
export type AppConfig = z.infer<typeof AppConfigSchema>;

const DEFAULTS: AppConfig = {
  keys: {},
  story: { model: 'claude-opus-5-5', effort: 'medium', maxDepth: 12 },
  image: { provider: 'gemini', model: 'gemini-3.1-flash-image-preview' },
  tts: { provider: 'browser', model: '', voice: '' },
  limits: { actionsPerMinute: 12, imagesPerDay: 300 },
  artkit: { model: 'gpt-image-1', quality: 'medium' },
};

let current: AppConfig = load();

function load(): AppConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return AppConfigSchema.parse({ ...DEFAULTS, ...raw, keys: { ...raw.keys } });
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export const getConfig = () => current;

export function saveConfig(next: AppConfig) {
  current = AppConfigSchema.parse(next);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(current, null, 2), { mode: 0o600 });
}

/** Key saved in the admin panel wins; the environment variable is the fallback. */
export function getKey(provider: ProviderId): string | undefined {
  return current.keys[provider] || process.env[ENV_KEYS[provider]] || undefined;
}

export function keySource(provider: ProviderId): 'admin' | 'env' | 'none' {
  if (current.keys[provider]) return 'admin';
  return process.env[ENV_KEYS[provider]] ? 'env' : 'none';
}

export const maskKey = (key?: string) => (key ? `${key.slice(0, 6)}…${key.slice(-4)}` : null);
