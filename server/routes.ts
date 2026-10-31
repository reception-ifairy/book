import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getConfig, getKey } from './config';
import { act, pathTo, startStory, StoryError } from './story/engine';
import { getStory, readMedia, saveMedia, saveStory } from './story/store';
import { extFor, mimeFromUrl, generateImage, generateSpeech, IMAGE_STYLE, ModalityUnavailable } from './media';
import { getTale, TALES } from '../shared/tales';
import { FORCES, worldOf, type PublicConfig } from '../shared/types';
import { ProviderError, type Media } from './providers/types';
import { publicStory } from './story/public';
import { ifairyAct, nextChapter, startAdventure } from './story/worlds/ifairy/turn';
import { getCatalogue, getSnapshot, listCards } from './universe/store';
import { looksPersonal } from './universe/pii';

/** iFairy illustrations follow the canon's visual identity rule. */
const IFAIRY_ART = 'iFairies are genderless robotic beings with wings of glowing cybermagic circuitry; no wands, petals or folkloric fairy wings.';

export const api = Router();

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

api.get('/tales', (_req, res) => res.json(TALES.map(({ id, emoji, tech, hue, title, tagline }) => ({ id, emoji, tech, hue, title, tagline }))));

const ifairyOn = () => getConfig().universe.enabled;

/** Which worlds can be played right now. */
api.get('/worlds', (_req, res) => {
  const adventures = ifairyOn() ? listCards().length : 0;
  res.json([
    { id: 'grimm', ready: !!getKey('anthropic') },
    { id: 'ifairy', ready: !!getKey('anthropic') && adventures > 0, adventures, canonVersion: getCatalogue()?.canonVersion ?? null, gm: getConfig().gm.enabled },
  ]);
});

api.get('/adventures', (_req, res) => res.json(ifairyOn() ? listCards() : []));

const AdventureStart = z.object({
  world: z.literal('ifairy'),
  adventureId: z.string(),
  lang: z.enum(['en', 'pl']),
  heroName: z
    .string()
    .trim()
    .min(1, 'Choose an Architect name.')
    .max(24)
    .refine((n) => !looksPersonal(n), 'Use a made-up Architect name, not personal details.'),
  /** Game Master: the force the player rolls best with. */
  strongest: z.enum(FORCES).optional(),
});

const StartBody = z.object({
  taleId: z.string(),
  lang: z.enum(['en', 'pl']),
  heroName: z.string().trim().min(1, 'Name your debugger.').max(24),
});

api.post('/story', actionLimiter, async (req, res) => {
  try {
    if (req.body?.world === 'ifairy') {
      const { adventureId, lang, heroName, strongest } = AdventureStart.parse(req.body);
      const snap = ifairyOn() ? getSnapshot(adventureId) : null;
      if (!snap) throw new StoryError('Adventure not found. The Archive may need a sync in the admin panel.', 404);
      const story = await startAdventure(snap, lang, heroName, strongest);
      saveStory(story);
      return res.json(publicStory(story));
    }
    const { taleId, lang, heroName } = StartBody.parse(req.body);
    const story = await startStory(taleId, lang, heroName);
    saveStory(story);
    res.json(story);
  } catch (e) {
    fail(res, e);
  }
});

api.get('/story/:id', (req, res) => {
  try {
    res.json(publicStory(loadStory(req)));
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
    const story = loadStory(req);
    const { pageId, ...input } = ActBody.parse(req.body);
    if (writing.has(story.id)) throw new StoryError('IGNIS is still writing the last page. Patience, meatbag.', 409);
    writing.add((locked = story.id));
    const page = worldOf(story) === 'ifairy' ? await ifairyAct(story, pageId, input) : await act(story, pageId, input);
    saveStory(story);
    const pub = publicStory(story);
    res.json({ page: pub.pages[page.id], story: pub });
  } catch (e) {
    fail(res, e);
  } finally {
    if (locked) writing.delete(locked);
  }
});

/** If-AI Saga: start the next act as a new story, carrying bonds, facts and items over. */
api.post('/story/:id/next-chapter', actionLimiter, async (req, res) => {
  try {
    const story = await nextChapter(loadStory(req));
    saveStory(story);
    res.json(publicStory(story));
  } catch (e) {
    fail(res, e);
  }
});

/** Rolling back just moves the cursor; the next action from that page forks a new branch. */
api.post('/story/:id/goto', (req, res) => {
  try {
    const story = loadStory(req);
    const { pageId } = z.object({ pageId: z.string() }).parse(req.body);
    if (!story.pages[pageId]) throw new StoryError('Page not found.', 404);
    story.currentPageId = pageId;
    saveStory(story);
    res.json(publicStory(story));
  } catch (e) {
    fail(res, e);
  }
});

const inflight = new Map<string, Promise<string>>();

api.post('/story/:id/page/:pageId/image', actionLimiter, async (req, res) => {
  try {
    const story = loadStory(req);
    const page = story.pages[String(req.params.pageId)];
    if (!page) throw new StoryError('Page not found.', 404);
    if (page.imageUrl) return res.json({ url: page.imageUrl });

    let job = inflight.get(page.id);
    if (!job) {
      takeImageBudget();
      const setting = worldOf(story) === 'ifairy' ? `${story.adventure!.art}. ${IFAIRY_ART}` : getTale(story.taleId)!.art;
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
    const story = loadStory(req);
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
