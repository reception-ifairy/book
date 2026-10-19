import { Router, type NextFunction, type Request, type Response } from 'express';
import { timingSafeEqual, createHash } from 'crypto';
import { z } from 'zod';
import { AppConfigSchema, getConfig, getKey, keySource, maskKey, ProviderId, saveConfig } from './config';
import { listAnthropicModels, describeAnthropicError } from './providers/anthropic';
import { listGeminiModels } from './providers/gemini';
import { listOpenAIModels } from './providers/openai';
import { generateImage, generateSpeech, IMAGE_STYLE } from './media';
import { probeStoryModel } from './story/engine';
import type { ModelInfo } from './providers/types';

export const admin = Router();

const sha = (s: string) => createHash('sha256').update(s).digest();
const isLoopback = (ip?: string) => !!ip && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);

/**
 * With ADMIN_PASSWORD set, every request needs it in `x-admin-password`.
 * Without it, the panel only answers requests from this machine (local dev).
 */
function guard(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_PASSWORD;
  if (expected) {
    const given = String(req.header('x-admin-password') ?? '');
    if (timingSafeEqual(sha(given), sha(expected))) return next();
    return res.status(401).json({ error: 'Wrong admin password.' });
  }
  if (isLoopback(req.socket.remoteAddress)) return next();
  return res.status(403).json({ error: 'Admin panel is local-only. Set ADMIN_PASSWORD on the server to use it remotely.' });
}
admin.use(guard);

const PROVIDERS = ProviderId.options;

function publicView() {
  const { keys, ...rest } = getConfig();
  return {
    ...rest,
    providers: Object.fromEntries(PROVIDERS.map((p) => [p, { source: keySource(p), masked: maskKey(getKey(p)) }])),
    passwordProtected: !!process.env.ADMIN_PASSWORD,
  };
}

admin.get('/config', (_req, res) => res.json(publicView()));

const UpdateBody = AppConfigSchema.omit({ keys: true }).partial().extend({
  // A string sets the key, null removes the admin-saved key (falls back to env), absent leaves it.
  keys: z.object({ anthropic: z.string().nullable(), gemini: z.string().nullable(), openai: z.string().nullable() }).partial().optional(),
});

admin.put('/config', (req, res) => {
  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  const { keys, ...rest } = parsed.data;
  const cur = getConfig();
  const nextKeys = { ...cur.keys };
  for (const p of PROVIDERS) {
    const v = keys?.[p];
    if (v === null) delete nextKeys[p];
    else if (typeof v === 'string' && v.trim()) nextKeys[p] = v.trim();
  }
  saveConfig({ ...cur, ...rest, keys: nextKeys });
  res.json(publicView());
});

const listers: Record<ProviderId, (key: string) => Promise<ModelInfo[]>> = {
  anthropic: listAnthropicModels,
  gemini: listGeminiModels,
  openai: listOpenAIModels,
};

const describe = (p: ProviderId, e: unknown) =>
  p === 'anthropic' ? describeAnthropicError(e) : e instanceof Error ? e.message : String(e);

/** Tests a key (the unsaved one from the form, or the saved one) by listing models. */
admin.post('/providers/:provider/models', async (req, res) => {
  const p = ProviderId.safeParse(req.params.provider);
  if (!p.success) return res.status(404).json({ error: 'Unknown provider.' });
  const key = (typeof req.body?.key === 'string' && req.body.key.trim()) || getKey(p.data);
  if (!key) return res.status(400).json({ ok: false, error: 'No key to test.' });
  const t0 = Date.now();
  try {
    const models = await listers[p.data](key);
    res.json({ ok: true, ms: Date.now() - t0, models });
  } catch (e) {
    res.status(502).json({ ok: false, ms: Date.now() - t0, error: describe(p.data, e) });
  }
});

/** Runs each modality for real with the saved config, so the admin can hear and see the result. */
admin.post('/probe/:role', async (req, res) => {
  const t0 = Date.now();
  try {
    switch (req.params.role) {
      case 'story':
        return res.json({ ok: true, ...(await probeStoryModel()) });
      case 'image': {
        const img = await generateImage(`${IMAGE_STYLE}\nScene: a sarcastic floating spellbook with cartoon eyes and a glowing antenna, booting up in a dark server room.`);
        return res.json({ ok: true, ms: Date.now() - t0, dataUrl: `data:${img.mime};base64,${img.data.toString('base64')}` });
      }
      case 'tts': {
        const audio = await generateSpeech('System boot complete. Greetings, meatbag. Your fairy tales are ready to be broken.');
        return res.json({ ok: true, ms: Date.now() - t0, dataUrl: audio ? `data:${audio.mime};base64,${audio.data.toString('base64')}` : null });
      }
      default:
        return res.status(404).json({ ok: false, error: 'Unknown role.' });
    }
  } catch (e) {
    res.status(502).json({ ok: false, ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) });
  }
});
