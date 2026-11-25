import { Router, type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { z } from 'zod';
import { agentStore } from './store';
import { Gains, caseOf, checkQuests, endingsArchive } from './xp';
import { getStory, saveStory } from '../story/store';
import { bureauDay, dayWindow } from '../../shared/daily';
import { rankFor } from '../../shared/xp';
import { CODENAME, type Agent, type AgentDashboard, type DailyKind } from '../../shared/agent';

/**
 * Agent login without personal data: enlisting creates a profile and a secret agent key
 * (ARB-XXXX-XXXX-XXXX-XXXX, 80 random bits). The key is shown once; the server keeps only its sha256.
 * Requests carry it as `Authorization: Agent <key>`.
 */

// Crockford-style base32 without look-alikes (no I, L, O, U).
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const randomChars = (n: number) => [...randomBytes(n)].map((b) => ALPHABET[b & 31]).join('');

export const newAgentKey = () => `ARB-${[0, 1, 2, 3].map(() => randomChars(4)).join('-')}`;
/** Case, spaces and dashes do not matter when typing a key back in. */
export const normalizeKey = (key: string) => key.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^ARB/, '');
export const hashKey = (key: string) => createHash('sha256').update(`arb-agent:${normalizeKey(key)}`).digest('hex');

declare module 'express-serve-static-core' {
  interface Request {
    agent?: Agent;
  }
}

/** Attaches the agent when the request carries a valid key; anonymous requests pass through. */
export async function optionalAgent(req: Request, _res: Response, next: NextFunction) {
  const m = /^Agent\s+(.+)$/i.exec(req.header('authorization') ?? '');
  if (m && normalizeKey(m[1]).length === 16) {
    try {
      req.agent = (await agentStore().byKeyHash(hashKey(m[1]))) ?? undefined;
    } catch (e) {
      console.error('[agents] lookup failed:', (e as Error).message);
    }
  }
  next();
}

export function requireAgent(req: Request, res: Response, next: NextFunction) {
  if (req.agent) return next();
  res.status(401).json({ error: 'Agent key required. Join the Bureau or log in with your key.' });
}

const limiter = (limit: number, message: string) =>
  rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: message } });

/** The whole dashboard in one go. */
export async function dashboardFor(agent: Agent): Promise<AgentDashboard> {
  const store = agentStore();
  const day = bureauDay();
  const g = new Gains(agent);
  const quests = await checkQuests(g);
  const fresh = (await store.byId(agent.id)) ?? agent;
  const [feed, cases, endings, todayXp, daily] = await Promise.all([
    store.feed(agent.id, 15),
    store.cases(agent.id),
    endingsArchive(agent.id),
    store.xpSince(agent.id, dayWindow(day).startsAt),
    store.dailyFor(agent.id, day),
  ]);
  const kinds: DailyKind[] = ['quiz', 'incident', 'interrogation'];
  return {
    agent: fresh,
    rank: rankFor(fresh.xp),
    day,
    todayXp,
    feed,
    cases: cases.slice(0, 30),
    endings,
    daily: kinds.map((kind) => {
      const row = daily.find((d) => d.kind === kind);
      return { kind, state: !row ? 'new' : row.completedAt ? 'done' : 'started', xp: row?.xp ?? 0 };
    }),
    quests,
  };
}

export const agentApi = Router();
agentApi.use(optionalAgent);

const EnlistBody = z.object({
  codename: z.string().trim().regex(CODENAME, 'Codename: 2–24 letters, digits, spaces, dots, dashes or underscores.'),
  lang: z.enum(['en', 'pl']).default('en'),
});

agentApi.post('/enlist', limiter(20, 'Too many new agents from here. The Bureau’s HR spell needs a breather.'), async (req, res) => {
  const parsed = EnlistBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  try {
    const key = newAgentKey();
    const agent = await agentStore().create({ id: randomUUID(), codename: parsed.data.codename, tag: randomChars(4), keyHash: hashKey(key), lang: parsed.data.lang });
    res.json({ agent, key });
  } catch (e) {
    console.error('[agents] enlist failed:', e);
    res.status(500).json({ error: 'The Bureau could not file your papers. Try again.' });
  }
});

agentApi.post('/login', limiter(30, 'Too many key attempts. Wait a few minutes, Agent.'), async (req, res) => {
  const key = String(req.body?.key ?? '');
  if (normalizeKey(key).length !== 16) return res.status(400).json({ error: 'An agent key looks like ARB-XXXX-XXXX-XXXX-XXXX.' });
  const agent = await agentStore().byKeyHash(hashKey(key)).catch(() => null);
  if (!agent) return res.status(401).json({ error: 'No agent with that key. Check it letter by letter.' });
  res.json({ agent });
});

agentApi.get('/me', requireAgent, async (req, res) => {
  try {
    res.json(await dashboardFor(req.agent!));
  } catch (e) {
    console.error('[agents] dashboard failed:', e);
    res.status(500).json({ error: 'The dashboard spell fizzled. Refresh in a moment.' });
  }
});

/** Cases this browser played before enlisting become the agent's (only cases nobody owns yet). */
agentApi.post('/claim', requireAgent, async (req, res) => {
  const parsed = z.object({ storyIds: z.array(z.string().max(64)).max(20) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Send up to 20 story ids.' });
  let claimed = 0;
  for (const id of parsed.data.storyIds) {
    const story = getStory(id);
    if (!story || story.agentId) continue;
    story.agentId = req.agent!.id;
    saveStory(story);
    await agentStore().upsertCase(req.agent!.id, caseOf(story));
    claimed++;
  }
  res.json({ claimed });
});
