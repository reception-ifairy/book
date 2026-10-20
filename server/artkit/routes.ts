import express, { Router, type Response } from 'express';
import { z } from 'zod';
import { getConfig, getKey } from '../config';
import { ModalityUnavailable } from '../media';
import { StoryError } from '../story/engine';
import { planArtKit } from './planner';
import { publishKit, startGeneration, unpublishKit } from './generator';
import { ART_FILES_DIR, getKit, saveKit } from './store';
import { ART_SLOTS, getSlot, type PublicArtKit } from '../../shared/artkit';

const EMPTY: PublicArtKit = { version: 0, assets: {}, alt: {} };

/** Player-facing: the published kit, plus its images and the favicon / share-card shortcuts. */
export const artkitPublic = Router();
artkitPublic.get('/api/artkit', (_req, res) => res.json(getKit().published ?? EMPTY));
artkitPublic.use('/artkit', express.static(ART_FILES_DIR, { maxAge: '365d', immutable: true, fallthrough: false }));
for (const [route, slot] of [
  ['/favicon.png', 'brand-mark'],
  ['/og.png', 'brand-share'],
] as const) {
  artkitPublic.get(route, (_req, res) => {
    const url = getKit().published?.assets[slot];
    if (url) res.redirect(302, url);
    else res.status(404).end();
  });
}

function fail(res: Response, e: unknown) {
  if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message ?? 'Invalid request.' });
  if (e instanceof StoryError) return res.status(e.status).json({ error: e.message });
  if (e instanceof ModalityUnavailable) return res.status(503).json({ error: e.message });
  console.error(e);
  return res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown failure.' });
}

/** Admin view: slots, working kit, render settings and what a full render will cost in images. */
const view = () => ({
  slots: ART_SLOTS,
  kit: getKit(),
  settings: getConfig().artkit,
  ready: { anthropic: !!getKey('anthropic'), openai: !!getKey('openai') },
});

/** Mounted inside the admin router, behind its password / localhost guard. */
export const artkitAdmin = Router();
let planning = false;

artkitAdmin.get('/', (_req, res) => res.json(view()));

artkitAdmin.post('/plan', async (req, res) => {
  if (planning) return res.status(409).json({ error: 'Claude is already planning.' });
  planning = true;
  try {
    const { notes } = z.object({ notes: z.string().max(2000).default('') }).parse(req.body ?? {});
    const { plan, model } = await planArtKit(notes);
    saveKit({ plan, plannedAt: Date.now(), plannedWith: model, notes });
    res.json(view());
  } catch (e) {
    fail(res, e);
  } finally {
    planning = false;
  }
});

artkitAdmin.put('/plan/:slot', (req, res) => {
  try {
    const kit = getKit();
    if (!kit.plan) throw new StoryError('Plan the art kit first.', 400);
    if (!getSlot(String(req.params.slot))) throw new StoryError('Unknown slot.', 404);
    const edit = z.object({ prompt: z.string().trim().min(10).max(3000), alt: z.string().trim().min(1).max(200) }).parse(req.body);
    saveKit({ plan: { ...kit.plan, assets: kit.plan.assets.map((a) => (a.slot === req.params.slot ? { ...a, ...edit } : a)) } });
    res.json(view());
  } catch (e) {
    fail(res, e);
  }
});

artkitAdmin.post('/generate', (req, res) => {
  try {
    const { slots } = z.object({ slots: z.array(z.string()).max(ART_SLOTS.length).optional() }).parse(req.body ?? {});
    startGeneration(slots);
    res.json(view());
  } catch (e) {
    fail(res, e);
  }
});

artkitAdmin.post('/publish', (_req, res) => {
  try {
    publishKit();
    res.json(view());
  } catch (e) {
    fail(res, e);
  }
});

artkitAdmin.delete('/published', (_req, res) => {
  unpublishKit();
  res.json(view());
});
