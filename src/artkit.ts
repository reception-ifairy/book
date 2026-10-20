import { useSyncExternalStore } from 'react';
import type { PublicArtKit } from '../shared/artkit';

/**
 * The published Art Kit, fetched once per page load. Components ask for a slot and get its URL,
 * or undefined so they fall back to the built-in CSS/SVG look.
 */
let kit: PublicArtKit = { version: 0, assets: {}, alt: {} };
const listeners = new Set<() => void>();

export function refreshArtKit() {
  return fetch('/api/artkit')
    .then((r) => (r.ok ? r.json() : null))
    .then((k: PublicArtKit | null) => {
      if (!k) return;
      kit = k;
      listeners.forEach((l) => l());
    })
    .catch(() => {});
}
refreshArtKit();

export function useArt() {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => kit,
  );
  return {
    src: (slot: string): string | undefined => current.assets[slot],
    alt: (slot: string): string => current.alt[slot] ?? '',
    version: current.version,
  };
}
