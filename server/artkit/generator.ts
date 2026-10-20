import { getConfig, getKey } from '../config';
import { openaiArt } from '../providers/openai';
import { cleanProviderMessage } from '../providers/types';
import { ModalityUnavailable } from '../media';
import { StoryError } from '../story/engine';
import { composePrompt } from './planner';
import { getKit, removeArtFile, saveKit, updateAsset, writeArtFile } from './store';
import { ART_SLOTS, getSlot } from '../../shared/artkit';

/** Images rendered at once. OpenAI image calls are slow, so a little parallelism helps without hammering limits. */
const CONCURRENCY = 3;

/**
 * Queues the given slots (all of them by default) and renders them in the background.
 * Returns as soon as the queue is set up; progress is visible through getKit().
 */
export function startGeneration(slotIds?: string[]) {
  const kit = getKit();
  if (!kit.plan) throw new StoryError('Plan the art kit with Claude first.', 400);
  if (kit.running) throw new StoryError('A render is already running.', 409);
  const apiKey = getKey('openai');
  if (!apiKey) throw new ModalityUnavailable('No OpenAI API key configured. Add one in the admin panel.');

  const slots = (slotIds?.length ? slotIds : ART_SLOTS.map((s) => s.id)).map((id) => getSlot(id)).filter((s) => !!s);
  if (!slots.length) throw new StoryError('No known slots to render.', 400);

  const assets = { ...kit.assets };
  for (const s of slots) assets[s.id] = { ...assets[s.id], status: 'queued', error: null, updatedAt: Date.now() };
  saveKit({ assets, running: true });

  const { model, quality } = getConfig().artkit;
  const plan = kit.plan;
  const queue = [...slots];

  const worker = async () => {
    for (let slot = queue.shift(); slot; slot = queue.shift()) {
      updateAsset(slot.id, { status: 'rendering' });
      try {
        const img = await openaiArt(apiKey, model, composePrompt(plan, slot), { size: slot.size, transparent: slot.transparent, quality });
        const previous = getKit().assets[slot.id].url;
        updateAsset(slot.id, { status: 'done', url: writeArtFile(slot.id, img.data), error: null });
        removeArtFile(previous);
      } catch (e) {
        updateAsset(slot.id, { status: 'failed', error: `OpenAI: ${cleanProviderMessage(e)}` });
      }
    }
  };

  void Promise.all(Array.from({ length: Math.min(CONCURRENCY, slots.length) }, worker)).finally(() => saveKit({ running: false }));
  return getKit();
}

/** Makes every finished image live for players. Slots without an image keep the built-in look. */
export function publishKit() {
  const kit = getKit();
  const assets: Record<string, string> = {};
  const alt: Record<string, string> = {};
  for (const s of ART_SLOTS) {
    const a = kit.assets[s.id];
    if (a?.status === 'done' && a.url) {
      assets[s.id] = a.url;
      alt[s.id] = kit.plan?.assets.find((p) => p.slot === s.id)?.alt ?? s.label;
    }
  }
  if (!Object.keys(assets).length) throw new StoryError('Nothing rendered yet to publish.', 400);
  const previous = Object.values(kit.published?.assets ?? {});
  saveKit({ published: { version: (kit.published?.version ?? 0) + 1, assets, alt }, publishedAt: Date.now() });
  // Files only the old published kit used are now orphans.
  const working = new Set(Object.values(getKit().assets).map((a) => a.url));
  for (const url of previous) if (!working.has(url)) removeArtFile(url);
  return getKit();
}

/** Back to the built-in CSS/SVG look. The working kit stays, ready to publish again. */
export function unpublishKit() {
  const previous = Object.values(getKit().published?.assets ?? {});
  saveKit({ published: null, publishedAt: null });
  const working = new Set(Object.values(getKit().assets).map((a) => a.url));
  for (const url of previous) if (!working.has(url)) removeArtFile(url);
  return getKit();
}
