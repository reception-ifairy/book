import type { Agent, CoffeeResult, MapNote, Page, PublicConfig, Story } from '../shared/types';
import type { MiniGameId, SpecializationId } from '../shared/arb';
import type { ArchiveComment, ArchiveEntryView, ArchiveListItem } from '../shared/archive';

async function call<T>(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Żądanie nie powiodło się (${res.status}).`);
  return data as T;
}

export interface TrainingResult {
  agent: Agent;
  xp: number;
  newBest: boolean;
}

export const api = {
  config: () => call<PublicConfig>('GET', '/api/config'),

  /* Agent */
  register: (codename: string, specialization: SpecializationId, lang: 'pl' | 'en') => call<Agent>('POST', '/api/agent', { codename, specialization, lang }),
  agent: (id: string) => call<Agent>('GET', `/api/agent/${id}`),
  coffee: (id: string) => call<{ agent: Agent; result: CoffeeResult }>('POST', `/api/agent/${id}/coffee`, {}),
  /** NarratoMat 5000: returns the current offer, or rolls a new one. `reroll` = "Zaproponuj innego Agenta". */
  narratomat: (id: string, reroll = false) => call<Agent>('POST', `/api/agent/${id}/narratomat`, { reroll }),
  accept: (id: string, missionId: string) => call<Story>('POST', `/api/agent/${id}/mission`, { missionId }),
  training: (id: string, game: MiniGameId, score: number) => call<TrainingResult>('POST', `/api/agent/${id}/training`, { game, score }),
  addNote: (id: string, note: { x: number; y: number; text: string }) => call<Agent>('POST', `/api/agent/${id}/notes`, note),
  removeNote: (id: string, noteId: string) => call<Agent>('DELETE', `/api/agent/${id}/notes/${noteId}`),

  /* Missions */
  story: (id: string) => call<Story>('GET', `/api/story/${id}`),
  act: (id: string, body: { pageId: string; choiceId?: string; custom?: string }) => call<{ page: Page; story: Story; agent: Agent }>('POST', `/api/story/${id}/act`, body),
  image: (id: string, pageId: string) => call<{ url: string }>('POST', `/api/story/${id}/page/${pageId}/image`, {}),
  speech: (id: string, pageId: string) => call<{ url: string | null }>('POST', `/api/story/${id}/page/${pageId}/speech`, {}),

  /* Archive (clearance comes from the agent's rank on the server) */
  archive: (agentId: string) => call<ArchiveListItem[]>('GET', `/api/archive?agent=${encodeURIComponent(agentId)}`),
  entry: (agentId: string, entryId: string) => call<ArchiveEntryView>('GET', `/api/archive/${entryId}?agent=${encodeURIComponent(agentId)}`),
  comment: (agentId: string, entryId: string, body: { text: string; rating: number; warning: boolean }) =>
    call<ArchiveComment>('POST', `/api/archive/${entryId}/comments`, { agentId, ...body }),
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

export type { MapNote };
