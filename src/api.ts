import type { Page, PublicConfig, Story, Tale } from '../shared/types';
import type { ArtKitState, ArtSlot } from '../shared/artkit';
import type { DailyBoard, Glitch, Quest } from '../shared/daily';
import type { BrandImageKind, Branding } from '../shared/branding';
import type { Agent, AgentDashboard } from '../shared/agent';
import type { IncidentState, Letter, QuizState } from '../shared/dailyPack';
import type { XpUpdate } from '../shared/xp';
import type { Lang } from '../shared/types';

export interface ArtKitView {
  slots: ArtSlot[];
  kit: ArtKitState;
  settings: { model: string; quality: 'low' | 'medium' | 'high' };
  ready: { anthropic: boolean; openai: boolean };
}

export interface DailyAdminView {
  enabled: boolean;
  today: DailyBoard | null;
  quests: (Quest & { status: string })[];
  glitches: (Glitch & { status: string })[];
  planned: { day: string; briefing: string | null; glitch_slug: string | null; quest_slugs: string[] }[];
  kinds: string[];
  tales: { id: string; title: string }[];
}

export interface PacksView {
  day: string;
  today: string;
  ready: boolean;
  packs: { day: string; lang: 'en' | 'pl'; kind: 'quiz' | 'incident'; source: 'claude' | 'seed' | 'edited' | null; payload: any; createdAt: number | null }[];
}

export type TaleCard = Pick<Tale, 'id' | 'emoji' | 'tech' | 'hue' | 'title' | 'tagline'> & { format: 'case' | 'quick' };

/** The logged-in agent's key, sent with every game request (set by src/agent.ts). */
let agentKey: string | null = null;
export const setAgentKey = (key: string | null) => {
  agentKey = key;
};

async function call<T>(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(agentKey && !url.startsWith('/api/admin') ? { Authorization: `Agent ${agentKey}` } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
  return data as T;
}

export const api = {
  config: () => call<PublicConfig>('GET', '/api/config'),
  daily: () => call<DailyBoard>('GET', '/api/daily'),
  tales: () => call<TaleCard[]>('GET', '/api/tales'),
  start: (taleId: string, lang: string, heroName: string) => call<Story>('POST', '/api/story', { taleId, lang, heroName }),
  story: (id: string) => call<Story>('GET', `/api/story/${id}`),
  act: (id: string, body: { pageId: string; choiceId?: string; custom?: string; image?: { mime: string; data: string } }) =>
    call<{ page: Page; story: Story; xp?: XpUpdate }>('POST', `/api/story/${id}/act`, body),
  goto: (id: string, pageId: string) => call<Story>('POST', `/api/story/${id}/goto`, { pageId }),
  image: (id: string, pageId: string) => call<{ url: string }>('POST', `/api/story/${id}/page/${pageId}/image`, {}),
  speech: (id: string, pageId: string) => call<{ url: string | null }>('POST', `/api/story/${id}/page/${pageId}/speech`, {}),
};

export type InterrogationView = {
  lang: Lang;
  suspect: { id: string; name: string; emoji: string; charge: string; taleId: string };
  turns: { question: string; reply: string; note: string; delta: number; mood: string }[];
  truth: number;
  questionsLeft: number;
  done: boolean;
  verdict: { title: string; report: string } | null;
  xp: number;
};

/** Agent endpoints; the key travels in the Authorization header set above. */
export const agentApi = {
  enlist: (codename: string, lang: Lang) => call<{ agent: Agent; key: string }>('POST', '/api/agent/enlist', { codename, lang }),
  login: (key: string) => call<{ agent: Agent }>('POST', '/api/agent/login', { key }),
  me: () => call<AgentDashboard>('GET', '/api/agent/me'),
  claim: (storyIds: string[]) => call<{ claimed: number }>('POST', '/api/agent/claim', { storyIds }),
  quiz: (lang: Lang) => call<QuizState & { lang: Lang }>('GET', `/api/agent/daily/quiz?lang=${lang}`),
  answer: (q: number, letter: Letter, lang: Lang) => call<{ state: QuizState & { lang: Lang }; xp: XpUpdate }>('POST', '/api/agent/daily/quiz/answer', { q, letter, lang }),
  incident: (lang: Lang) => call<IncidentState & { lang: Lang }>('GET', `/api/agent/daily/incident?lang=${lang}`),
  decide: (choice: number, lang: Lang) => call<{ state: IncidentState & { lang: Lang }; xp: XpUpdate }>('POST', '/api/agent/daily/incident', { choice, lang }),
  interrogation: (lang: Lang) => call<InterrogationView>('GET', `/api/agent/interrogation?lang=${lang}`),
  ask: (question: string, lang: Lang) => call<{ state: InterrogationView; xp: XpUpdate }>('POST', '/api/agent/interrogation/ask', { question, lang }),
};

/** How the admin panel proves who it is: a session token from the t1000 login, or the legacy ADMIN_PASSWORD. */
export type AdminCredentials = { token?: string; password?: string };
const authHeaders = ({ token, password }: AdminCredentials): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : password ? { 'x-admin-password': password } : {};

export type AdminAuthStatus = { mode: 'db' | 'password' | 'local'; needsSetup: boolean; loggedIn: boolean; login?: string | null };
type AdminSession = { token: string; login: string; expiresIn: number };

export const adminAuthApi = {
  status: (token?: string) => call<AdminAuthStatus>('GET', '/api/admin/auth/status', undefined, authHeaders({ token })),
  login: (login: string, password: string) => call<AdminSession>('POST', '/api/admin/auth/login', { login, password }),
  setup: (code: string, login: string, password: string) => call<AdminSession>('POST', '/api/admin/auth/setup', { code, login, password }),
  logout: (token: string) => call<{ ok: true }>('POST', '/api/admin/auth/logout', {}, authHeaders({ token })),
};

export const adminApi = (creds: AdminCredentials) => {
  const h = authHeaders(creds);
  return {
    get: () => call<any>('GET', '/api/admin/config', undefined, h),
    save: (body: unknown) => call<any>('PUT', '/api/admin/config', body, h),
    models: (provider: string, key?: string) => call<any>('POST', `/api/admin/providers/${provider}/models`, { key }, h),
    probe: (role: string) => call<any>('POST', `/api/admin/probe/${role}`, {}, h),
    daily: {
      get: () => call<DailyAdminView>('GET', '/api/admin/daily', undefined, h),
      saveQuest: (q: Quest & { status: string }) => call<DailyAdminView>('PUT', `/api/admin/daily/quests/${q.slug}`, q, h),
      saveGlitch: (g: Glitch & { status: string }) => call<DailyAdminView>('PUT', `/api/admin/daily/glitches/${g.slug}`, g, h),
      planDay: (day: string, plan: { briefing: string | null; glitch_slug: string | null; quest_slugs: string[] }) =>
        call<DailyAdminView>('PUT', `/api/admin/daily/days/${day}`, plan, h),
      unplanDay: (day: string) => call<DailyAdminView>('DELETE', `/api/admin/daily/days/${day}`, undefined, h),
    },
    branding: {
      get: () => call<Branding>('GET', '/api/admin/branding', undefined, h),
      save: (patch: Partial<Branding>) => call<Branding>('PUT', '/api/admin/branding', patch, h),
      upload: (kind: BrandImageKind, dataUrl: string) => call<Branding>('PUT', `/api/admin/branding/images/${kind}`, { dataUrl }, h),
      removeImage: (kind: BrandImageKind) => call<Branding>('DELETE', `/api/admin/branding/images/${kind}`, undefined, h),
    },
    agents: () => call<{ agents: number; activeToday: number; persistent: boolean; day: string; suspect: { id: string; name: string; emoji: string; charge: string } }>('GET', '/api/admin/agents/stats', undefined, h),
    packs: {
      get: (day?: string) => call<PacksView>('GET', `/api/admin/packs${day ? `?day=${day}` : ''}`, undefined, h),
      save: (day: string, lang: string, kind: string, payload: unknown) => call<{ ok: true }>('PUT', `/api/admin/packs/${day}/${lang}/${kind}`, { payload }, h),
      regenerate: (day: string, lang: string, kind: string) => call<{ ok: true; payload: unknown }>('POST', `/api/admin/packs/${day}/${lang}/${kind}/regenerate`, {}, h),
    },
    artkit: {
      get: () => call<ArtKitView>('GET', '/api/admin/artkit', undefined, h),
      plan: (notes: string) => call<ArtKitView>('POST', '/api/admin/artkit/plan', { notes }, h),
      edit: (slot: string, prompt: string, alt: string) => call<ArtKitView>('PUT', `/api/admin/artkit/plan/${slot}`, { prompt, alt }, h),
      generate: (slots?: string[]) => call<ArtKitView>('POST', '/api/admin/artkit/generate', { slots }, h),
      publish: () => call<ArtKitView>('POST', '/api/admin/artkit/publish', {}, h),
      unpublish: () => call<ArtKitView>('DELETE', '/api/admin/artkit/published', undefined, h),
    },
  };
};

/** Runs this browser has started, so the home screen can offer to resume them. */
export interface SavedRun {
  id: string;
  taleId: string;
  heroName: string;
  updatedAt: number;
  pages: number;
  ending: string | null;
  /** Set on runs saved before v6, when a second world existed; those are hidden. */
  world?: string;
}
const RUNS_KEY = 'ignis.runs';
export function loadRuns(): SavedRun[] {
  try {
    return (JSON.parse(localStorage.getItem(RUNS_KEY) || '[]') as SavedRun[]).filter((r) => !r.world || r.world === 'grimm');
  } catch {
    return [];
  }
}
export function rememberRun(story: Story) {
  try {
    const runs = loadRuns().filter((r) => r.id !== story.id);
    const current = story.pages[story.currentPageId];
    runs.unshift({
      id: story.id,
      taleId: story.taleId,
      heroName: story.heroName,
      updatedAt: story.updatedAt,
      pages: Object.keys(story.pages).length,
      ending: current?.ending?.title ?? null,
    });
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs.slice(0, 20)));
  } catch {
    /* storage unavailable: resuming is a convenience only */
  }
}
