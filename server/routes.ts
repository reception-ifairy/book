import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getConfig, getKey } from './config';
import { act, pathTo, startStory, StoryError } from './story/engine';
import { getStory, readMedia, saveMedia, saveStory } from './story/store';
import { extFor, mimeFromUrl, generateImage, generateSpeech, IMAGE_STYLE, ModalityUnavailable } from './media';
import { getTale, TALES } from '../shared/tales';
import type { PublicConfig } from '../shared/types';
import { ProviderError, type Media } from './providers/types';
import { optionalAgent } from './agents/auth';
import { afterPage } from './agents/xp';
import type { XpUpdate } from '../shared/xp';

export const api = Router();
// Requests that carry an agent key get req.agent; anonymous play keeps working, it just earns no XP.
api.use(optionalAgent);

const actionLimiter = rateLimit({
  windowMs: 60_000,
  limit: () => getConfig().limits.actionsPerMinute,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many reality forks per minute. Even IGNIS needs to cool its CPU.' },
});

let imageDay = '';
let imagesToday = 0;
function takeImageBudget() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== imageDay) [imageDay, imagesToday] = [today, 0];
  if (imagesToday >= getConfig().limits.imagesPerDay) throw new ModalityUnavailable('Daily illustration budget spent.');
  imagesToday++;
}

function fail(res: Response, e: unknown) {
  if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message ?? 'Invalid request.' });
  if (e instanceof StoryError) return res.status(e.status).json({ error: e.message });
  if (e instanceof ModalityUnavailable) return res.status(503).json({ error: e.message });
  if (e instanceof ProviderError) return res.status(502).json({ error: e.message });
  console.error(e);
  return res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown failure.' });
}

const loadStory = (req: Request) => {
  const story = getStory(String(req.params.id));
  if (!story) throw new StoryError('Timeline not found.', 404);
  return story;
};

/** Anyone with the link may read a case; only its agent may play it (cases from before v7 have no owner). */
const ownStory = (req: Request) => {
  const story = loadStory(req);
  if (story.agentId && story.agentId !== req.agent?.id) throw new StoryError('This case belongs to another agent. Open your own copy from the dashboard.', 403);
  return story;
};

/** XP never blocks the story: a ledger hiccup is logged and the page still arrives. */
async function xpFor(req: Request, story: Parameters<typeof afterPage>[1], page: Parameters<typeof afterPage>[2]): Promise<XpUpdate | undefined> {
  if (!req.agent || story.agentId !== req.agent.id) return undefined;
  try {
    return await afterPage(req.agent, story, page);
  } catch (e) {
    console.error('[xp] award failed:', (e as Error).message);
    return undefined;
  }
}

api.get('/config', (_req, res) => {
  const cfg = getConfig();
  const body: PublicConfig = {
    storyReady: !!getKey('anthropic'),
    image: cfg.image.provider !== 'off' && !!cfg.image.model && !!getKey(cfg.image.provider),
    tts: cfg.tts.provider !== 'browser' && cfg.tts.model && getKey(cfg.tts.provider) ? cfg.tts.provider : 'browser',
    vision: true,
  };
  res.json(body);
});

api.get('/tales', (_req, res) => res.json(TALES.map(({ id, emoji, tech, hue, title, tagline, format }) => ({ id, emoji, tech, hue, title, tagline, format: format ?? 'case' }))));

const StartBody = z.object({
  taleId: z.string(),
  lang: z.enum(['en', 'pl']),
  heroName: z.string().trim().min(1, 'Give the Bureau your agent codename.').max(24),
});

api.post('/story', actionLimiter, async (req, res) => {
  try {
    // An agent plays under their codename; anonymous callers still name their hero.
    const { taleId, lang, heroName } = StartBody.parse(req.agent ? { ...req.body, heroName: req.agent.codename } : req.body);
    const story = await startStory(taleId, lang, heroName, req.agent?.id);
    saveStory(story);
    await xpFor(req, story, story.pages[story.rootPageId]);
    res.json(story);
  } catch (e) {
    fail(res, e);
  }
});

api.get('/story/:id', (req, res) => {
  try {
    res.json(loadStory(req));
  } catch (e) {
    fail(res, e);
  }
});

const MAX_IMAGE_B64 = 5 * 1024 * 1024 * (4 / 3);
const ActBody = z.object({
  pageId: z.string(),
  choiceId: z.string().optional(),
  custom: z.string().max(280, 'Keep it under 280 characters, novelist.').optional(),
  image: z
    .object({ mime: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/gif']), data: z.string().max(MAX_IMAGE_B64, 'Artifact image is too large (max 5 MB).') })
    .optional(),
});

/** Stories with a page being written right now; a second action waits its turn instead of double-spending. */
const writing = new Set<string>();

api.post('/story/:id/act', actionLimiter, async (req, res) => {
  let locked = '';
  try {
    const story = ownStory(req);
    const { pageId, ...input } = ActBody.parse(req.body);
    if (writing.has(story.id)) throw new StoryError('IGNIS is still writing the last page. Patience, Agent.', 409);
    writing.add((locked = story.id));
    const page = await act(story, pageId, input);
    saveStory(story);
    res.json({ page, story, xp: await xpFor(req, story, page) });
  } catch (e) {
    fail(res, e);
  } finally {
    if (locked) writing.delete(locked);
  }
});

/** Rolling back just moves the cursor; the next action from that page forks a new branch. */
api.post('/story/:id/goto', async (req, res) => {
  try {
    const story = ownStory(req);
    const { pageId } = z.object({ pageId: z.string() }).parse(req.body);
    if (!story.pages[pageId]) throw new StoryError('Page not found.', 404);
    story.currentPageId = pageId;
    saveStory(story);
    res.json(story);
  } catch (e) {
    fail(res, e);
  }
});

const inflight = new Map<string, Promise<string>>();

api.post('/story/:id/page/:pageId/image', actionLimiter, async (req, res) => {
  try {
    const story = ownStory(req);
    const page = story.pages[String(req.params.pageId)];
    if (!page) throw new StoryError('Page not found.', 404);
    if (page.imageUrl) return res.json({ url: page.imageUrl });

    let job = inflight.get(page.id);
    if (!job) {
      takeImageBudget();
      const setting = getTale(story.taleId)?.art ?? '';
      // The earliest illustrated page on this path anchors how the hero and cast look.
      const anchor = pathTo(story, page.id).find((p) => p.imageUrl && p.id !== page.id);
      const anchorData = anchor?.imageUrl ? readMedia(anchor.imageUrl) : null;
      const refs: Media[] = anchorData ? [{ mime: mimeFromUrl(anchor!.imageUrl!), data: anchorData }] : [];
      const prompt = `${IMAGE_STYLE}\nSetting: ${setting}.\nScene: ${page.imagePrompt}${refs.length ? '\nKeep the characters looking exactly as in the reference image.' : ''}`;
      job = generateImage(prompt, refs).then((img) => {
        const url = saveMedia(story.id, `${page.id}.${extFor(img.mime)}`, img.data);
        page.imageUrl = url;
        saveStory(story);
        return url;
      });
      inflight.set(page.id, job);
      job.finally(() => inflight.delete(page.id)).catch(() => {
        imagesToday = Math.max(0, imagesToday - 1); // failed renders don't spend the budget
      });
    }
    res.json({ url: await job });
  } catch (e) {
    fail(res, e);
  }
});

api.post('/story/:id/page/:pageId/speech', actionLimiter, async (req, res) => {
  try {
    const story = ownStory(req);
    const page = story.pages[String(req.params.pageId)];
    if (!page) throw new StoryError('Page not found.', 404);
    if (page.audioUrl) return res.json({ url: page.audioUrl });
    const audio = await generateSpeech(`${page.narration.replace(/[*_#`]/g, '')}\n\n${page.quip}`);
    if (!audio) return res.json({ url: null });
    page.audioUrl = saveMedia(story.id, `${page.id}.${extFor(audio.mime)}`, audio.data);
    saveStory(story);
    res.json({ url: page.audioUrl });
  } catch (e) {
    fail(res, e);
  }
});
