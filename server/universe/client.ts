import { getConfig, getKey } from '../config';

/**
 * Client for the iFairy Universe lore API (universe.ifairy.co.uk, loopback :8793).
 * The API embeds every search query with an external model, so the game never sends it
 * player text: queries are built only from whitelisted canon terms (see terms.ts).
 */

/** A canon chunk as the Universe returns it. */
export interface Chunk {
  id: string;
  module: string;
  ref: string | null;
  path: string;
  title: string | null;
  text: string;
  tags: string[];
}

export interface CanonExcerpt {
  ref: string;
  chunkId: string;
  title: string;
  text: string;
  score: number;
}

export class UniverseError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Override for testing unsaved settings from the admin form. */
export interface Target {
  url?: string;
  key?: string;
  grant?: string;
}

const SEARCH_TIMEOUT_MS = 1500;
const LOOKUP_TIMEOUT_MS = 8000;
const CACHE_MS = 10 * 60_000;
const MIN_SCORE = 0.35;

/** Counters for the admin status card. */
export const universeStats = { calls: 0, failures: 0, piiRejects: 0, lastError: '' as string, lastErrorAt: 0 };

function resolve(target: Target = {}) {
  const cfg = getConfig().universe;
  return {
    url: (target.url || cfg.url).replace(/\/+$/, ''),
    key: target.key || getKey('universe'),
    grant: target.grant || cfg.grant,
  };
}

const MESSAGES: Record<number, string> = {
  400: 'The Universe rejected the request (its personal-data guard fired).',
  401: 'The Universe did not accept the key (unknown, disabled or pinned to another host).',
  403: 'This key is not allowed to use that grant.',
  404: 'Not found in the canon.',
};

async function call<T>(path: string, init: { method?: string; body?: unknown; timeoutMs?: number } = {}, target?: Target): Promise<T> {
  const { url, key } = resolve(target);
  if (!key) throw new UniverseError('No Universe API key configured.', 503);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? LOOKUP_TIMEOUT_MS);
  universeStats.calls++;
  try {
    const res = await fetch(url + path, {
      method: init.method ?? 'GET',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; data?: T; error?: string };
    if (!res.ok || !body.ok) {
      if (res.status === 400) universeStats.piiRejects++;
      throw new UniverseError(MESSAGES[res.status] ?? `Universe error ${res.status}${body.error ? `: ${body.error}` : ''}.`, res.status === 404 ? 404 : 502);
    }
    return body.data as T;
  } catch (e) {
    universeStats.failures++;
    const err = e instanceof UniverseError ? e : new UniverseError(controller.signal.aborted ? 'The Universe did not answer in time.' : `The Universe is unreachable (${(e as Error).message}).`, 502);
    universeStats.lastError = err.message;
    universeStats.lastErrorAt = Date.now();
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const universe = {
  health: (target?: Target) => call<{ modules: number; chunks: number; version: string; builtAt: string | null }>('/v1/health', {}, target),
  /** Exact REF or the Universe's structural fallback; callers check `id` before trusting it. */
  ref: (ref: string, target?: Target) => call<Chunk>(`/v1/ref/${encodeURIComponent(ref)}`, {}, target),
  search: (query: string, k: number, target?: Target) =>
    call<{ results: { chunk: Chunk; score: number }[] }>('/v1/search', { method: 'POST', body: { query, grant: resolve(target).grant, k }, timeoutMs: SEARCH_TIMEOUT_MS }, target),
};

const cache = new Map<string, { at: number; excerpts: CanonExcerpt[] }>();

/** A citable REF for a chunk: its own REF when it has one, otherwise its module path. */
export const refOf = (chunk: Pick<Chunk, 'ref' | 'module' | 'path'>) =>
  chunk.ref || `REF:${chunk.module}:${chunk.path.replace(/^\//, '') || 'overview'}`;

/**
 * Canon passages for a list of canon terms. Never throws and never blocks a turn for long:
 * with the Universe off, unreachable or slow, the narrator simply gets no excerpts.
 */
export async function searchCanonSafe(terms: string[], k = 4): Promise<CanonExcerpt[]> {
  const cfg = getConfig().universe;
  if (!cfg.enabled || !terms.length || !getKey('universe')) return [];
  const query = terms.join(', ');
  const cacheKey = `${cfg.url}|${cfg.grant}|${k}|${query}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.excerpts;
  try {
    const { results } = await universe.search(query, k);
    const excerpts = results
      .filter((r) => r.score >= MIN_SCORE && r.chunk?.text)
      .map((r) => ({ ref: refOf(r.chunk), chunkId: r.chunk.id, title: r.chunk.title ?? '', text: r.chunk.text.slice(0, 700), score: r.score }));
    cache.set(cacheKey, { at: Date.now(), excerpts });
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
    return excerpts;
  } catch {
    return [];
  }
}
