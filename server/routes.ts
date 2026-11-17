import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getConfig, getKey } from './config';
import { act, pathTo, settle, startMission, StoryError } from './story/engine';
import { getStory, readMedia, saveMedia, saveStory } from './story/store';
import { extFor, mimeFromUrl, generateImage, generateSpeech, IMAGE_STYLE, ModalityUnavailable } from './media';
import { MINI_GAME_IDS, missionOf, rankOf, SPECIALIZATION_IDS, trainingXp } from '../shared/arb';
import type { Agent, PublicConfig } from '../shared/types';
import { ProviderError, type Media } from './providers/types';
import { brew, createAgent, getAgent, refresh, saveAgent } from './arb/agents';
import { assignMission } from './arb/narratomat';
import { addComment, commentsFor, entryOf, listFor } from './arb/archive';
import { randomUUID } from 'crypto';

export const api = Router();

const actionLimiter = rateLimit({
  windowMs: 60_000,
  limit: () => getConfig().limits.actionsPerMinute,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Za dużo wniosków na minutę. Nawet Narratoriusz musi ostudzić pieczątkę.' },
});

/** Cheap, frequent calls (dashboard, coffee, notes, training, comments) get a looser limit. */
const deskLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Zwolnij. Biurko się przegrzewa.' } });

let imageDay = '';
let imagesToday = 0;
function takeImageBudget() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== imageDay) [imageDay, imagesToday] = [today, 0];
  if (imagesToday >= getConfig().limits.imagesPerDay) throw new ModalityUnavailable('Dzienny budżet ilustracji wyczerpany.');
  imagesToday++;
}

function fail(res: Response, e: unknown) {
  if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message ?? 'Niepoprawny wniosek.' });
  if (e instanceof StoryError) return res.status(e.status).json({ error: e.message });
  if (e instanceof ModalityUnavailable) return res.status(503).json({ error: e.message });
  if (e instanceof ProviderError) return res.status(502).json({ error: e.message });
  console.error(e);
  return res.status(500).json({ error: e instanceof Error ? e.message : 'Nieznana awaria.' });
}

const loadStory = (req: Request) => {
  const story = getStory(String(req.params.id));
  if (!story) throw new StoryError('Nie znaleziono akt sprawy.', 404);
  return story;
};

const loadAgent = (id: string): Agent => {
  const agent = getAgent(id);
  if (!agent) throw new StoryError('Nie znaleziono agenta. Przepustka mogła wygasnąć.', 404);
  return refresh(agent);
};

api.get('/config', (_req, res) => {
  const cfg = getConfig();
  const body: PublicConfig = {
    storyReady: !!getKey('anthropic'),
    image: cfg.image.provider !== 'off' && !!cfg.image.model && !!getKey(cfg.image.provider),
    tts: cfg.tts.provider !== 'browser' && cfg.tts.model && getKey(cfg.tts.provider) ? cfg.tts.provider : 'browser',
  };
  res.json(body);
});

/* ------------------------------------------------------------- Agents */

const Register = z.object({
  codename: z.string().trim().min(2, 'Kryptonim musi mieć co najmniej 2 znaki.').max(24, 'Kryptonim: maksymalnie 24 znaki.'),
  specialization: z.enum(SPECIALIZATION_IDS),
  lang: z.enum(['pl', 'en']).default('pl'),
});

api.post('/agent', deskLimiter, (req, res) => {
  try {
    const { codename, specialization, lang } = Register.parse(req.body);
    const agent = createAgent(codename, specialization, lang);
    saveAgent(agent);
    res.json(agent);
  } catch (e) {
    fail(res, e);
  }
});

api.get('/agent/:id', (req, res) => {
  try {
    res.json(loadAgent(String(req.params.id)));
  } catch (e) {
    fail(res, e);
  }
});

api.post('/agent/:id/coffee', deskLimiter, (req, res) => {
  try {
    const agent = loadAgent(String(req.params.id));
    const result = brew(agent);
    saveAgent(agent);
    res.json({ agent, result });
  } catch (e) {
    fail(res, e);
  }
});

/** NarratoMat 5000: the current offer stays until it expires; a reroll costs one of today's two. */
api.post('/agent/:id/narratomat', deskLimiter, (req, res) => {
  try {
    const agent = loadAgent(String(req.params.id));
    const { reroll } = z.object({ reroll: z.boolean().default(false) }).parse(req.body ?? {});
    if (agent.offer && reroll) {
      if (agent.rerolls.left < 1) throw new StoryError('Limit „Zaproponuj innego Agenta” na dziś wyczerpany. Wróć jutro albo wypełnij formularz R-2 (w budowie).', 409);
      agent.rerolls.left--;
      agent.offer = assignMission(agent);
    } else if (!agent.offer) {
      agent.offer = assignMission(agent);
    }
    saveAgent(agent);
    res.json(agent);
  } catch (e) {
    fail(res, e);
  }
});

api.post('/agent/:id/mission', actionLimiter, async (req, res) => {
  try {
    const agent = loadAgent(String(req.params.id));
    const { missionId } = z.object({ missionId: z.string() }).parse(req.body);
    const offer = agent.offer;
    if (!offer || (offer.missionId !== missionId && !offer.alternatives.includes(missionId))) {
      throw new StoryError('Tej misji nie ma na Twoim biurku. Poproś NarratoMat o przydział.', 409);
    }
    const mission = missionOf(missionId);
    if (!mission) throw new StoryError('Nieznana misja.', 404);
    const story = await startMission(agent, mission, agent.lang, offer.paradox);
    saveStory(story);
    agent.offer = null;
    agent.activeStoryId = story.id;
    agent.history.push({ storyId: story.id, missionId, type: mission.type, title: mission.title, ending: null, xp: 0, startedAt: story.createdAt, endedAt: null });
    agent.history = agent.history.slice(-50);
    saveAgent(agent);
    res.json(story);
  } catch (e) {
    fail(res, e);
  }
});

const Training = z.object({ game: z.enum(MINI_GAME_IDS), score: z.number().min(0).max(100) });

api.post('/agent/:id/training', deskLimiter, (req, res) => {
  try {
    const agent = loadAgent(String(req.params.id));
    const { game, score } = Training.parse(req.body);
    const prev = agent.training[game];
    const rounded = Math.round(score);
    const newBest = !prev || rounded > prev.best;
    const xp = trainingXp(rounded, newBest);
    agent.training[game] = { best: Math.max(prev?.best ?? 0, rounded), plays: (prev?.plays ?? 0) + 1, lastAt: Date.now() };
    agent.xp += xp;
    agent.stress = Math.max(0, agent.stress - 3);
    saveAgent(agent);
    res.json({ agent, xp, newBest });
  } catch (e) {
    fail(res, e);
  }
});

const Note = z.object({
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(640),
  text: z.string().trim().min(1, 'Notatka jest pusta.').max(200, 'Notatka: maksymalnie 200 znaków.'),
});

api.post('/agent/:id/notes', deskLimiter, (req, res) => {
  try {
    const agent = loadAgent(String(req.params.id));
    const note = Note.parse(req.body);
    if (agent.notes.length >= 30) throw new StoryError('Na mapie zmieści się 30 notatek. Usuń którąś.', 409);
    agent.notes.push({ id: randomUUID().slice(0, 8), ...note, createdAt: Date.now() });
    saveAgent(agent);
    res.json(agent);
  } catch (e) {
    fail(res, e);
  }
});

api.delete('/agent/:id/notes/:noteId', deskLimiter, (req, res) => {
  try {
    const agent = loadAgent(String(req.params.id));
    agent.notes = agent.notes.filter((n) => n.id !== req.params.noteId);
    saveAgent(agent);
    res.json(agent);
  } catch (e) {
    fail(res, e);
  }
});

/* ------------------------------------------------------------ Archive */

const clearanceOf = (agentId: unknown) => {
  const agent = typeof agentId === 'string' ? getAgent(agentId) : undefined;
  if (!agent) throw new StoryError('Archiwum wymaga przepustki agenta.', 401);
  return { agent, clearance: rankOf(agent.xp).rank.clearance };
};

api.get('/archive', (req, res) => {
  try {
    res.json(listFor(clearanceOf(req.query.agent).clearance));
  } catch (e) {
    fail(res, e);
  }
});

api.get('/archive/:entryId', (req, res) => {
  try {
    const { clearance } = clearanceOf(req.query.agent);
    const entry = entryOf(String(req.params.entryId));
    if (!entry) throw new StoryError('Nie ma takiego wpisu. Może trafił do Biblioteki Zapomnianych Opowieści.', 404);
    if (entry.clearance > clearance) throw new StoryError(`[UTAJNIONE] Ten wpis wymaga poziomu dostępu ${entry.clearance}.`, 403);
    res.json({ entry, comments: commentsFor(entry.id) });
  } catch (e) {
    fail(res, e);
  }
});

const Comment = z.object({
  agentId: z.string(),
  text: z.string().trim().min(3, 'Komentarz jest za krótki.').max(400, 'Komentarz: maksymalnie 400 znaków.'),
  rating: z.number().int().min(1).max(5),
  warning: z.boolean().default(false),
});

api.post('/archive/:entryId/comments', deskLimiter, (req, res) => {
  try {
    const { agentId, text, rating, warning } = Comment.parse(req.body);
    const { agent, clearance } = clearanceOf(agentId);
    const entry = entryOf(String(req.params.entryId));
    if (!entry) throw new StoryError('Nie ma takiego wpisu.', 404);
    if (entry.clearance > clearance) throw new StoryError('Nie możesz komentować wpisu, którego nie wolno Ci czytać.', 403);
    res.json(addComment(entry.id, agent.codename, text, rating, warning));
  } catch (e) {
    fail(res, e);
  }
});

/* ------------------------------------------------------------ Missions */

api.get('/story/:id', (req, res) => {
  try {
    res.json(loadStory(req));
  } catch (e) {
    fail(res, e);
  }
});

const ActBody = z.object({
  pageId: z.string(),
  choiceId: z.string().optional(),
  custom: z.string().max(280, 'Maksymalnie 280 znaków. To akta, nie powieść.').optional(),
});

/** Cases with a page being written right now; a second move waits instead of double-rolling. */
const writing = new Set<string>();

api.post('/story/:id/act', actionLimiter, async (req, res) => {
  let locked = '';
  try {
    const story = loadStory(req);
    const { pageId, ...input } = ActBody.parse(req.body);
    if (writing.has(story.id)) throw new StoryError('Narratoriusz jeszcze pisze poprzednią stronę.', 409);
    writing.add((locked = story.id));
    const agent = loadAgent(story.agentId);
    const page = await act(story, agent, pageId, input);
    settle(story, agent, page);
    saveStory(story);
    saveAgent(agent);
    res.json({ page, story, agent });
  } catch (e) {
    fail(res, e);
  } finally {
    if (locked) writing.delete(locked);
  }
});

const inflight = new Map<string, Promise<string>>();

api.post('/story/:id/page/:pageId/image', actionLimiter, async (req, res) => {
  try {
    const story = loadStory(req);
    const page = story.pages[String(req.params.pageId)];
    if (!page) throw new StoryError('Nie ma takiej strony.', 404);
    if (page.imageUrl) return res.json({ url: page.imageUrl });
    let job = inflight.get(page.id);
    if (!job) {
      takeImageBudget();
      const setting = missionOf(story.missionId)?.art ?? '';
      // The earliest illustrated page on this path anchors how the agent and cast look.
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
    if (!page) throw new StoryError('Nie ma takiej strony.', 404);
    if (page.audioUrl) return res.json({ url: page.audioUrl });
    const audio = await generateSpeech(`${page.narration.replace(/[*_#`]/g, '')}\n\n${page.catNote}`);
    if (!audio) return res.json({ url: null });
    page.audioUrl = saveMedia(story.id, `${page.id}.${extFor(audio.mime)}`, audio.data);
    saveStory(story);
    res.json({ url: page.audioUrl });
  } catch (e) {
    fail(res, e);
  }
});
