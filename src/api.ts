import type { Page, PublicConfig, PublicStory, Tale, World } from '../shared/types';
import type { ArtKitState, ArtSlot } from '../shared/artkit';
import type { AdventureCard } from '../shared/universe';

export interface ArtKitView {
  slots: ArtSlot[];
  kit: ArtKitState;
  settings: { model: string; quality: 'low' | 'medium' | 'high' };
  ready: { anthropic: boolean; openai: boolean };
}

export type TaleCard = Pick<Tale, 'id' | 'emoji' | 'tech' | 'hue' | 'title' | 'tagline'>;
export type WorldInfo = { id: World; ready: boolean; adventures?: number; canonVersion?: string | null };

async function call<T>(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
  return data as T;
}

export const api = {
  config: () => call<PublicConfig>('GET', '/api/config'),
  tales: () => call<TaleCard[]>('GET', '/api/tales'),
  worlds: () => call<WorldInfo[]>('GET', '/api/worlds'),
  adventures: () => call<AdventureCard[]>('GET', '/api/adventures'),
  start: (taleId: string, lang: string, heroName: string) => call<PublicStory>('POST', '/api/story', { taleId, lang, heroName }),
  startAdventure: (adventureId: string, lang: string, heroName: string) =>
    call<PublicStory>('POST', '/api/story', { world: 'ifairy', adventureId, lang, heroName }),
  story: (id: string) => call<PublicStory>('GET', `/api/story/${id}`),
  act: (id: string, body: { pageId: string; choiceId?: string; custom?: string; image?: { mime: string; data: string } }) =>
    call<{ page: Page; story: PublicStory }>('POST', `/api/story/${id}/act`, body),
  goto: (id: string, pageId: string) => call<PublicStory>('POST', `/api/story/${id}/goto`, { pageId }),
  image: (id: string, pageId: string) => call<{ url: string }>('POST', `/api/story/${id}/page/${pageId}/image`, {}),
  speech: (id: string, pageId: string) => call<{ url: string | null }>('POST', `/api/story/${id}/page/${pageId}/speech`, {}),
};

export const adminApi = (password: string) => {
  const h = password ? { 'x-admin-password': password } : {};
  return {
    get: () => call<any>('GET', '/api/admin/config', undefined, h),
    save: (body: unknown) => call<any>('PUT', '/api/admin/config', body, h),
    models: (provider: string, key?: string) => call<any>('POST', `/api/admin/providers/${provider}/models`, { key }, h),
    probe: (role: string) => call<any>('POST', `/api/admin/probe/${role}`, {}, h),
    artkit: {
      get: () => call<ArtKitView>('GET', '/api/admin/artkit', undefined, h),
      plan: (notes: string) => call<ArtKitView>('POST', '/api/admin/artkit/plan', { notes }, h),
      edit: (slot: string, prompt: string, alt: string) => call<ArtKitView>('PUT', `/api/admin/artkit/plan/${slot}`, { prompt, alt }, h),
      generate: (slots?: string[]) => call<ArtKitView>('POST', '/api/admin/artkit/generate', { slots }, h),
      publish: () => call<ArtKitView>('POST', '/api/admin/artkit/publish', {}, h),
      unpublish: () => call<ArtKitView>('DELETE', '/api/admin/artkit/published', undefined, h),
    },
    universe: {
      status: () => call<any>('GET', '/api/admin/universe/status', undefined, h),
      test: (target: { url?: string; key?: string; grant?: string }) => call<any>('POST', '/api/admin/universe/test', target, h),
      sync: () => call<any>('POST', '/api/admin/universe/sync', {}, h),
      prompt: (id: string, lang: string) => call<{ prompt: string; version: string; status: string }>('GET', `/api/admin/universe/adventures/${id}/prompt?lang=${lang}`, undefined, h),
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
  /** iFairy runs carry their own card, since the adventure list depends on the last sync. */
  world?: World;
  title?: Record<string, string>;
  emoji?: string;
  hue?: number;
}
const RUNS_KEY = 'ignis.runs';
export function loadRuns(): SavedRun[] {
  try {
    return JSON.parse(localStorage.getItem(RUNS_KEY) || '[]');
  } catch {
    return [];
  }
}
export function rememberRun(story: PublicStory) {
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
      ...(story.adventure ? { world: story.world, title: story.adventure.title, emoji: story.adventure.emoji, hue: story.adventure.hue } : {}),
    });
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs.slice(0, 20)));
  } catch {
    /* storage unavailable: resuming is a convenience only */
  }
}
