import { Router, type NextFunction, type Request, type Response } from 'express';
import { timingSafeEqual, createHash } from 'crypto';
import { z } from 'zod';
import { AppConfigSchema, getConfig, getKey, keySource, maskKey, ProviderId, saveConfig, type AppConfig } from './config';
import { listAnthropicModels, describeAnthropicError } from './providers/anthropic';
import { listGeminiModels } from './providers/gemini';
import { listOpenAIModels } from './providers/openai';
import { generateImage, generateSpeech, IMAGE_STYLE } from './media';
import { probeStoryModel } from './story/engine';
import { artkitAdmin } from './artkit/routes';
import { cleanProviderMessage, type ModelInfo } from './providers/types';
import { adminAuth, dbLoginEnabled, requireAdminSession } from './adminAuth';
import { characterStats } from './story/characters';
import { dailyAdmin } from './daily';
import { brandingAdmin } from './branding';

export const admin = Router();

const sha = (s: string) => createHash('sha256').update(s).digest();
const isLoopback = (ip?: string) => !!ip && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);

/**
 * With the t1000 database configured, every request needs a session from /api/admin/auth/login (adminAuth.ts).
 * Otherwise, with ADMIN_PASSWORD set, every request needs it in `x-admin-password`.
 * Without either, the panel only answers requests from this machine (local dev).
 */
function guard(req: Request, res: Response, next: NextFunction) {
  if (dbLoginEnabled()) return requireAdminSession(req, res, next);
  const expected = process.env.ADMIN_PASSWORD;
  if (expected) {
    const given = String(req.header('x-admin-password') ?? '');
    if (timingSafeEqual(sha(given), sha(expected))) return next();
    return res.status(401).json({ error: 'Wrong admin password.' });
  }
  if (isLoopback(req.socket.remoteAddress)) return next();
  return res.status(403).json({ error: 'Admin panel is local-only. Set ADMIN_PASSWORD on the server to use it remotely.' });
}
admin.use('/auth', adminAuth);
admin.use(guard);
admin.use('/artkit', artkitAdmin);
admin.use('/daily', dailyAdmin);
admin.use('/branding', brandingAdmin);

const PROVIDERS = ProviderId.options;

function publicView() {
  const { keys, ...rest } = getConfig();
  return {
    ...rest,
    providers: Object.fromEntries(PROVIDERS.map((p) => [p, { source: keySource(p), masked: maskKey(getKey(p)) }])),
    passwordProtected: dbLoginEnabled() || !!process.env.ADMIN_PASSWORD,
    loginMode: dbLoginEnabled() ? 'db' : process.env.ADMIN_PASSWORD ? 'password' : 'local',
    characters: characterStats(),
  };
}

admin.get('/config', (_req, res) => res.json(publicView()));

const S = AppConfigSchema.shape;
/** Every section is optional and so is every field in it; what is sent is merged over the saved config. */
const UpdateBody = z.object({
  story: S.story.partial().optional(),
  image: S.image.partial().optional(),
  tts: S.tts.partial().optional(),
  limits: S.limits.partial().optional(),
  artkit: S.artkit.partial().optional(),
  // A string sets the key, null removes the admin-saved key (falls back to env), absent leaves it.
  keys: z.object(Object.fromEntries(ProviderId.options.map((k) => [k, z.string().nullable()])) as Record<ProviderId, z.ZodNullable<z.ZodString>>).partial().optional(),
});

admin.put('/config', (req, res) => {
  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  const { keys, ...sections } = parsed.data;
  const cur = getConfig();
  const next: AppConfig = { ...cur, keys: { ...cur.keys } };
  for (const [name, patch] of Object.entries(sections)) {
    if (patch) Object.assign(next, { [name]: { ...cur[name as keyof AppConfig], ...patch } });
  }
  for (const p of ProviderId.options) {
    const v = keys?.[p];
    if (v === null) delete next.keys[p];
    else if (typeof v === 'string' && v.trim()) next.keys[p] = v.trim();
  }
  try {
    saveConfig(next);
  } catch (e) {
    return res.status(400).json({ error: e instanceof z.ZodError ? e.issues[0]?.message : 'Invalid configuration.' });
  }
  res.json(publicView());
});

const listers: Record<ProviderId, (key: string) => Promise<ModelInfo[]>> = {
  anthropic: listAnthropicModels,
  gemini: listGeminiModels,
  openai: listOpenAIModels,
};

const describe = (p: ProviderId, e: unknown) => (p === 'anthropic' ? describeAnthropicError(e) : cleanProviderMessage(e));

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
        const img = await generateImage(`${IMAGE_STYLE}\nScene: a palm-sized flying robot with a CRT screen face, a brass-and-glass lantern body full of swirling magic, dragonfly wings, a hover ring and a little flame antenna, booting up in a cozy detective office full of glowing case files.`);
        return res.json({ ok: true, ms: Date.now() - t0, dataUrl: `data:${img.mime};base64,${img.data.toString('base64')}` });
      }
      case 'tts': {
        const audio = await generateSpeech('System boot complete. Field assistant online. Greetings, Agent. Your case files are ready to be fixed, or broken.');
        return res.json({ ok: true, ms: Date.now() - t0, dataUrl: audio ? `data:${audio.mime};base64,${audio.data.toString('base64')}` : null });
      }
      default:
        return res.status(404).json({ ok: false, error: 'Unknown role.' });
    }
  } catch (e) {
    const provider = req.params.role === 'story' ? 'anthropic' : (req.params.role === 'image' ? getConfig().image.provider : getConfig().tts.provider);
    res.status(502).json({ ok: false, ms: Date.now() - t0, error: describe(ProviderId.safeParse(provider).data ?? 'openai', e) });
  }
});
