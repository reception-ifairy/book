import { Router, type Response } from 'express';
import { z } from 'zod';
import { getConfig, getKey, keySource, maskKey } from '../config';
import { universe, universeStats, UniverseError, type Target } from './client';
import { syncCatalogue } from './catalogue';
import { getCatalogue, getSnapshot } from './store';
import { ifairySystemPrompt } from '../story/worlds/ifairy/prompt';

/** Admin endpoints for the Universe connection; mounted behind the admin guard. */
export const universeAdmin = Router();

const fail = (res: Response, e: unknown) =>
  res.status(e instanceof UniverseError ? e.status : 500).json({ ok: false, error: e instanceof Error ? e.message : 'Unknown failure.' });

function summary() {
  const c = getCatalogue();
  const counts = { hook: 0, saga: 0, district: 0 };
  for (const id of Object.keys(c?.adventures ?? {})) counts[id.split('-')[0] as keyof typeof counts]++;
  return c ? { canonVersion: c.canonVersion, builtAt: c.builtAt, syncedAt: c.syncedAt, counts, report: c.report } : null;
}

universeAdmin.get('/status', (_req, res) => {
  res.json({
    settings: getConfig().universe,
    key: { source: keySource('universe'), masked: maskKey(getKey('universe')) },
    stats: universeStats,
    catalogue: summary(),
  });
});

const TestBody = z.object({ url: z.string().url().optional(), key: z.string().optional(), grant: z.string().optional() });

/** Health plus one real search, so a key without the grant is caught here and not mid-story. */
universeAdmin.post('/test', async (req, res) => {
  const t0 = Date.now();
  try {
    const body = TestBody.parse(req.body ?? {});
    const target: Target = { url: body.url, key: body.key?.trim() || undefined, grant: body.grant?.trim() || undefined };
    const health = await universe.health(target);
    const { results } = await universe.search('Golden City, Narrative Portals', 2, target);
    res.json({ ok: true, ms: Date.now() - t0, version: health.version, chunks: health.chunks, modules: health.modules, sample: results.map((r) => r.chunk.title) });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ ok: false, error: e.issues[0]?.message });
    res.status(e instanceof UniverseError ? e.status : 500).json({ ok: false, ms: Date.now() - t0, error: (e as Error).message });
  }
});

universeAdmin.post('/sync', async (_req, res) => {
  try {
    await syncCatalogue();
    res.json({ ok: true, catalogue: summary() });
  } catch (e) {
    fail(res, e);
  }
});

/** The composed narrator prompt, so the owner can check it against the canon. */
universeAdmin.get('/adventures/:id/prompt', (req, res) => {
  const snap = getSnapshot(req.params.id);
  if (!snap) return res.status(404).json({ ok: false, error: 'Adventure not synced.' });
  const lang = req.query.lang === 'pl' ? 'pl' : 'en';
  res.json({ ok: true, version: snap.version, status: snap.status, prompt: ifairySystemPrompt(snap, lang, getConfig().story.maxDepth) });
});
