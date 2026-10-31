import fs from 'fs';
import path from 'path';
import { z } from 'zod';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

/** AI vendors: each has a model lister in the admin panel. */
export const ProviderId = z.enum(['anthropic', 'gemini', 'openai']);
export type ProviderId = z.infer<typeof ProviderId>;

/** Every secret the server holds: the AI vendors plus the iFairy Universe lore API. */
export const SecretId = z.enum([...ProviderId.options, 'universe']);
export type SecretId = z.infer<typeof SecretId>;

const ENV_KEYS: Record<SecretId, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  universe: 'UNIVERSE_API_KEY',
};

export const AppConfigSchema = z.object({
  keys: z.object({
    anthropic: z.string().optional(),
    gemini: z.string().optional(),
    openai: z.string().optional(),
    universe: z.string().optional(),
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
  /** iFairy Universe lore API: the second world's adventures and live canon retrieval. */
  universe: z.object({
    enabled: z.boolean(),
    url: z.string().url(),
    grant: z.string().min(1),
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
  universe: { enabled: false, url: process.env.UNIVERSE_API_URL || 'http://127.0.0.1:8793', grant: 'if-ai' },
};

let current: AppConfig = load();

/**
 * Each section is validated on its own and filled from the defaults, so a new field or one bad
 * value resets only that section and never the API keys saved in the admin panel.
 */
function load(): AppConfig {
  let raw: Record<string, any>;
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return structuredClone(DEFAULTS);
  }
  const out: Record<string, unknown> = {};
  for (const [section, schema] of Object.entries(AppConfigSchema.shape)) {
    const fallback = DEFAULTS[section as keyof AppConfig];
    const parsed = schema.safeParse({ ...fallback, ...raw[section] });
    if (!parsed.success) console.warn(`config.json: section "${section}" is invalid, using its defaults.`);
    out[section] = parsed.success ? parsed.data : structuredClone(fallback);
  }
  return out as AppConfig;
}

export const getConfig = () => current;

export function saveConfig(next: AppConfig) {
  current = AppConfigSchema.parse(next);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(current, null, 2), { mode: 0o600 });
}

/** Key saved in the admin panel wins; the environment variable is the fallback. */
export function getKey(provider: SecretId): string | undefined {
  return current.keys[provider] || process.env[ENV_KEYS[provider]] || undefined;
}

export function keySource(provider: SecretId): 'admin' | 'env' | 'none' {
  if (current.keys[provider]) return 'admin';
  return process.env[ENV_KEYS[provider]] ? 'env' : 'none';
}

export const maskKey = (key?: string) => (key ? `${key.slice(0, 6)}…${key.slice(-4)}` : null);
