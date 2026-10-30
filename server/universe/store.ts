import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { cardOf, type AdventureCard, type AdventureSnapshot } from '../../shared/universe';

const DIR = path.join(DATA_DIR, 'universe');
const SNAP_DIR = path.join(DIR, 'snapshots');
const CATALOGUE_FILE = path.join(DIR, 'catalogue.json');
const KEEP_PER_ADVENTURE = 3;

export type SyncStatus = 'new' | 'changed' | 'unchanged' | 'seed-only' | 'failed';
export interface SyncRow {
  id: string;
  status: SyncStatus;
  version?: string;
  detail?: string;
}

/** What the last successful sync produced: which snapshot file is current for each adventure. */
export interface Catalogue {
  canonVersion: string;
  builtAt: string | null;
  syncedAt: number;
  adventures: Record<string, { file: string; hash: string; version: string; status: AdventureSnapshot['status'] }>;
  report: SyncRow[];
}

let catalogue: Catalogue | null | undefined;
const snapshots = new Map<string, AdventureSnapshot>();

export function getCatalogue(): Catalogue | null {
  if (catalogue === undefined) {
    try {
      catalogue = JSON.parse(fs.readFileSync(CATALOGUE_FILE, 'utf8')) as Catalogue;
    } catch {
      catalogue = null;
    }
  }
  return catalogue;
}

export function getSnapshot(id: string): AdventureSnapshot | null {
  const entry = getCatalogue()?.adventures[id];
  if (!entry) return null;
  const hit = snapshots.get(entry.file);
  if (hit) return hit;
  try {
    const snap = JSON.parse(fs.readFileSync(path.join(SNAP_DIR, entry.file), 'utf8')) as AdventureSnapshot;
    snapshots.set(entry.file, snap);
    return snap;
  } catch {
    return null;
  }
}

/** Cards in catalogue order: portal hooks, then the saga in act order, then the districts. */
export function listCards(): AdventureCard[] {
  const KIND_ORDER = { hook: 0, saga: 1, district: 2 };
  return Object.keys(getCatalogue()?.adventures ?? {})
    .map(getSnapshot)
    .filter((s): s is AdventureSnapshot => !!s)
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.order - b.order)
    .map(cardOf);
}

/** Snapshots are immutable: a new file per content hash, the oldest pruned beyond a few. */
export function writeSnapshot(snap: AdventureSnapshot): string {
  fs.mkdirSync(SNAP_DIR, { recursive: true });
  const file = `${snap.id}@${snap.hash.slice(0, 8)}.json`;
  const full = path.join(SNAP_DIR, file);
  if (!fs.existsSync(full)) fs.writeFileSync(full, JSON.stringify(snap));
  snapshots.set(file, snap);
  const older = fs.readdirSync(SNAP_DIR)
    .filter((f) => f.startsWith(`${snap.id}@`) && f !== file)
    .map((f) => ({ f, t: fs.statSync(path.join(SNAP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of older.slice(KEEP_PER_ADVENTURE - 1)) fs.rmSync(path.join(SNAP_DIR, f), { force: true });
  return file;
}

export function writeCatalogue(next: Catalogue) {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = `${CATALOGUE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, CATALOGUE_FILE);
  catalogue = next;
}
