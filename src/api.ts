import type { Page, PublicConfig, Story, Tale } from '../shared/types';

export type TaleCard = Pick<Tale, 'id' | 'emoji' | 'tech' | 'hue' | 'title' | 'tagline'>;

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
  start: (taleId: string, lang: string, heroName: string) => call<Story>('POST', '/api/story', { taleId, lang, heroName }),
  story: (id: string) => call<Story>('GET', `/api/story/${id}`),
  act: (id: string, body: { pageId: string; choiceId?: string; custom?: string; image?: { mime: string; data: string } }) =>
    call<{ page: Page; story: Story }>('POST', `/api/story/${id}/act`, body),
  goto: (id: string, pageId: string) => call<Story>('POST', `/api/story/${id}/goto`, { pageId }),
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
}
const RUNS_KEY = 'ignis.runs';
export function loadRuns(): SavedRun[] {
  try {
    return JSON.parse(localStorage.getItem(RUNS_KEY) || '[]');
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
