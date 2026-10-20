import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { ART_SLOT_IDS, type ArtAsset, type ArtKitState } from '../../shared/artkit';

const DIR = path.join(DATA_DIR, 'artkit');
export const ART_FILES_DIR = path.join(DIR, 'files');
const STATE_FILE = path.join(DIR, 'kit.json');

const emptyAsset = (slot: string): ArtAsset => ({ slot, status: 'idle', url: null, error: null, updatedAt: 0 });

function load(): ArtKitState {
  let saved: Partial<ArtKitState> = {};
  try {
    saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    /* first run */
  }
  const assets: Record<string, ArtAsset> = {};
  for (const id of ART_SLOT_IDS) {
    const a = saved.assets?.[id];
    // A job interrupted by a restart is not running any more.
    assets[id] = a ? { ...a, status: a.status === 'queued' || a.status === 'rendering' ? (a.url ? 'done' : 'idle') : a.status } : emptyAsset(id);
  }
  return {
    plan: saved.plan ?? null,
    plannedAt: saved.plannedAt ?? null,
    plannedWith: saved.plannedWith ?? null,
    notes: saved.notes ?? '',
    assets,
    published: saved.published ?? null,
    publishedAt: saved.publishedAt ?? null,
    running: false,
  };
}

let state = load();

export const getKit = () => state;

export function saveKit(next: Partial<ArtKitState> = {}) {
  state = { ...state, ...next };
  fs.mkdirSync(DIR, { recursive: true });
  const { running: _running, ...persisted } = state;
  fs.writeFileSync(STATE_FILE, JSON.stringify(persisted, null, 2));
}

export function updateAsset(slot: string, patch: Partial<ArtAsset>) {
  saveKit({ assets: { ...state.assets, [slot]: { ...state.assets[slot], ...patch, updatedAt: Date.now() } } });
}

/** Writes a rendered image under a fresh name (so browsers never show a stale cached copy) and returns its URL. */
export function writeArtFile(slot: string, data: Buffer): string {
  fs.mkdirSync(ART_FILES_DIR, { recursive: true });
  const name = `${slot}-${Date.now().toString(36)}.png`;
  fs.writeFileSync(path.join(ART_FILES_DIR, name), data);
  return `/artkit/${name}`;
}

/** Deletes an image file unless the published kit still points at it. */
export function removeArtFile(url: string | null) {
  if (!url || Object.values(state.published?.assets ?? {}).includes(url)) return;
  const file = path.resolve(ART_FILES_DIR, path.basename(url));
  if (file.startsWith(ART_FILES_DIR + path.sep)) fs.rm(file, { force: true }, () => {});
}
