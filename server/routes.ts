import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getConfig, getKey } from './config';
import { pathTo, StoryError } from './story/engine';
import { getStory, readMedia, saveMedia, saveStory } from './story/store';
import { extFor, mimeFromUrl, generateImage, generateSpeech, IMAGE_STYLE, ModalityUnavailable } from './media';
import { FORCES, type PublicConfig, type Story } from '../shared/types';
import { isEduverse } from '../shared/universe';
import { ProviderError, type Media } from './providers/types';
import { publicStory } from './story/public';
import { ifairyAct, nextChapter, startAdventure } from './story/worlds/ifairy/turn';
import { getCatalogue, getSnapshot, listCards } from './universe/store';
import { looksPersonal } from './universe/pii';
import { showsIFairy, withLock } from './universe/image-lock';

export const api = Router();

const actionLimiter = rateLimit({
  windowMs: 60_000,
  limit: () => getConfig().limits.actionsPerMinute,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many branches of reality per minute. Even IGNIS needs to cool its CPU.' },
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

/**
 * Stories from the retired worlds (Grimm Protocol and the old canon adventures) stay on disk but
 * are no longer served: the game is the Quantum Edu-Verse now.
 */
const archived = (story: Story) => story.world !== 'ifairy' || !isEduverse(story.adventure);

const loadStory = (req: Request) => {
  const story = getStory(String(req.params.id));
  if (!story) throw new StoryError('Timeline not found.', 404);
  if (archived(story)) throw new StoryError('This journey belongs to a retired world and has been archived. Open a new portal from the home screen.', 410);
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

const ifairyOn = () => getConfig().universe.enabled;

/** Whether the Edu-Verse can be played right now: it opens once the owner has enabled and synced it. */
api.get('/worlds', (_req, res) => {
  const adventures = ifairyOn() ? listCards().length : 0;
  res.json([
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
    .min(1, 'Choose an explorer name.')
    .max(24)
    .refine((n) => !looksPersonal(n), 'Use a made-up explorer name, not personal details.'),
  /** How the explorer likes to learn; with the Game Master on, also the force they roll best with. */
  strongest: z.enum(FORCES).optional(),
});

api.post('/story', actionLimiter, async (req, res) => {
  try {
    const { adventureId, lang, heroName, strongest } = AdventureStart.parse(req.body);
    const snap = ifairyOn() ? getSnapshot(adventureId) : null;
    if (!snap) throw new StoryError('World not found. The Edu-Verse may need a sync in the admin panel.', 404);
    const story = await startAdventure(snap, lang, heroName, strongest);
    saveStory(story);
    res.json(publicStory(story));
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
    if (writing.has(story.id)) throw new StoryError('IGNIS is still writing the last page. One moment, explorer.', 409);
    writing.add((locked = story.id));
    const page = await ifairyAct(story, pageId, input);
    saveStory(story);
    const pub = publicStory(story);
    res.json({ page: pub.pages[page.id], story: pub });
  } catch (e) {
    fail(res, e);
  } finally {
    if (locked) writing.delete(locked);
  }
});

/** The Seven Worlds: start the next stage as a new story, carrying bonds, facts and items over. */
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

    // A picture with an iFairy in it gets the canon visual lock, or none at all.
    const snap = story.adventure!;
    const locked = showsIFairy(`${snap.art}\n${page.imagePrompt}`, snap);
    if (locked && !snap.imageLock) throw new StoryError('The canon visual lock for iFairies is not in this world, so this scene cannot be illustrated. Re-sync the Edu-Verse.', 503);
    const guard = locked ? { guard: 'ifairy_visual_lock', ref: snap.imageLock!.ref, canonVersion: snap.canonVersion } : { guard: 'not_applicable' };

    let job = inflight.get(page.id);
    if (!job) {
      takeImageBudget();
      const setting = snap.art;
      // The earliest illustrated page on this path anchors how the hero and cast look.
      const anchor = pathTo(story, page.id).find((p) => p.imageUrl && p.id !== page.id);
      const anchorData = anchor?.imageUrl ? readMedia(anchor.imageUrl) : null;
      const refs: Media[] = anchorData ? [{ mime: mimeFromUrl(anchor!.imageUrl!), data: anchorData }] : [];
      const base = `${IMAGE_STYLE}\nSetting: ${setting}.\nScene: ${page.imagePrompt}${refs.length ? '\nKeep the characters looking exactly as in the reference image.' : ''}`;
      const prompt = locked ? withLock(snap.imageLock!.text, base) : base;
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
    res.json({ url: await job, guard });
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
