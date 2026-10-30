import { createHash } from 'crypto';
import { universe, UniverseError, type Chunk } from './client';
import { CORE_REFS, PORTALS_ROOT, SEEDS, type Seed } from './seeds';
import { getCatalogue, writeCatalogue, writeSnapshot, type Catalogue, type SyncRow } from './store';
import type { AdventureSnapshot, CanonPassage } from '../../shared/universe';

const PREMISE_MAX = 4000;

/** JSON with sorted keys, so the content hash does not depend on property order. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

/** Fetches a REF and insists it landed on the expected chunk; the Universe's fallback match is fuzzy. */
async function fetchExact(ref: string, chunkId: string): Promise<Chunk> {
  const chunk = await universe.ref(ref);
  if (chunk.id !== chunkId) throw new UniverseError(`${ref} resolved to ${chunk.id}, expected ${chunkId}.`, 409);
  return chunk;
}

/** The value of a "Name: value" line in a chunk's text. */
function field(text: string, name: string): string | null {
  const line = text.split('\n').find((l) => l.startsWith(`${name}:`));
  return line ? line.slice(name.length + 1).trim() : null;
}

/**
 * The "Story Hooks" line is one string of hooks joined by "; ", and hooks contain "; " themselves,
 * so each hook is cut from where it starts to where the next known hook starts.
 */
export function splitHooks(line: string, starts: string[]): Map<string, string> {
  const at = starts.map((s) => ({ s, i: line.indexOf(s) }));
  const missing = at.find((a) => a.i < 0);
  if (missing) throw new UniverseError(`Story hook "${missing.s}…" is no longer in the canon.`, 409);
  at.sort((a, b) => a.i - b.i);
  return new Map(at.map(({ s, i }, n) => [s, line.slice(i, n + 1 < at.length ? at[n + 1].i : undefined).replace(/[\s;]+$/, '')]));
}

/** Checklist items end with a full stop; a "; " inside an item is not preceded by one. */
export const splitChecklist = (line: string) => line.split(/(?<=\.)\s*;\s+/).map((s) => s.trim()).filter(Boolean);

const passage = (chunk: Chunk, ref: string): Omit<CanonPassage, 'handle'> => ({ ref: chunk.ref || ref, title: chunk.title ?? '', text: chunk.text });

async function hydrate(seed: Seed, hooks: Map<string, string>, portals: Chunk) {
  if (seed.source.hookStart) {
    const premise = hooks.get(seed.source.hookStart)!;
    return { premise, sources: [{ ...passage(portals, seed.source.ref), title: `Story hook: ${seed.title.en}`, text: premise }], status: 'ok' as const };
  }
  let main: Chunk;
  try {
    main = await fetchExact(seed.source.ref, seed.source.chunkId);
  } catch (e) {
    // Not addressable (yet): the seed carries a copy of the canon entry.
    if (seed.fallback && e instanceof UniverseError && (e.status === 409 || e.status === 404)) {
      return { premise: seed.fallback, sources: [{ ref: seed.source.ref, title: seed.title.en, text: seed.fallback }], status: 'seed-only' as const, detail: e.message };
    }
    throw e;
  }
  const children = await Promise.all((seed.source.children ?? []).map((c) => fetchExact(c.ref, c.chunkId)));
  const premise = [main.text, ...children.map((c) => `${c.title}\n${c.text}`)].join('\n\n');
  return {
    premise,
    sources: [passage(main, seed.source.ref), ...children.map((c, i) => passage(c, seed.source.children![i].ref))],
    status: 'ok' as const,
  };
}

function buildSnapshot(seed: Seed, premise: string, own: Omit<CanonPassage, 'handle'>[], core: Omit<CanonPassage, 'handle'>[], checklist: string[], status: AdventureSnapshot['status'], canonVersion: string): AdventureSnapshot {
  const body = {
    id: seed.id, kind: seed.kind, order: seed.order, emoji: seed.emoji, hue: seed.hue, title: seed.title, tagline: seed.tagline,
    structure: seed.structure, premise: premise.slice(0, PREMISE_MAX), setting: seed.setting, cast: seed.cast, loreTerms: seed.loreTerms,
    art: seed.art, sources: [...own, ...core].map((p, i) => ({ handle: `C${i + 1}`, ...p })), checklist, canonVersion, status,
  };
  const hash = createHash('sha256').update(stable(body)).digest('hex');
  return { ...body, hash, version: `${canonVersion}#${hash.slice(0, 8)}` };
}

async function run(): Promise<Catalogue> {
  const health = await universe.health();
  const core = (await Promise.all(CORE_REFS.map((c) => fetchExact(c.ref, c.chunkId)))).map((c, i) => passage(c, CORE_REFS[i].ref));
  const portals = await fetchExact(PORTALS_ROOT.ref, PORTALS_ROOT.chunkId);
  const hooksLine = field(portals.text, 'Story Hooks');
  const checklistLine = field(portals.text, 'Consistency Checklist');
  if (!hooksLine || !checklistLine) throw new UniverseError('The portal story hooks or checklist are missing from the canon.', 409);
  const hooks = splitHooks(hooksLine, SEEDS.flatMap((s) => (s.source.hookStart ? [s.source.hookStart] : [])));
  const checklist = splitChecklist(checklistLine);

  const prev = getCatalogue();
  const next: Catalogue = { canonVersion: health.version, builtAt: health.builtAt, syncedAt: Date.now(), adventures: {}, report: [] };
  for (const seed of SEEDS) {
    const before = prev?.adventures[seed.id];
    try {
      const h = await hydrate(seed, hooks, portals);
      const snap = buildSnapshot(seed, h.premise, h.sources, core, checklist, h.status, health.version);
      next.adventures[seed.id] = { file: writeSnapshot(snap), hash: snap.hash, version: snap.version, status: snap.status };
      const status: SyncRow['status'] = snap.status === 'seed-only' ? 'seed-only' : !before ? 'new' : before.hash === snap.hash ? 'unchanged' : 'changed';
      next.report.push({ id: seed.id, status, version: snap.version, ...('detail' in h ? { detail: h.detail } : {}) });
    } catch (e) {
      // Fail closed per adventure: keep what was synced before, or leave it out.
      if (before) next.adventures[seed.id] = before;
      next.report.push({ id: seed.id, status: 'failed', version: before?.version, detail: (e as Error).message });
    }
  }
  writeCatalogue(next);
  return next;
}

let running: Promise<Catalogue> | null = null;

/** Pulls every seeded adventure from the Universe and freezes it into snapshots. One at a time. */
export async function syncCatalogue(): Promise<Catalogue> {
  if (running) throw new UniverseError('A sync is already running.', 409);
  running = run();
  try {
    return await running;
  } finally {
    running = null;
  }
}
