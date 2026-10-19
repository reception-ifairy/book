import { useSyncExternalStore } from 'react';

/** Tiny persisted toggle store for per-viewer conveniences (snow on/off). */
const KEY = 'ignis.snow';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

let snow = read();

export function setSnow(on: boolean) {
  snow = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable: the toggle still works for this visit */
  }
  listeners.forEach((l) => l());
}

export const useSnow = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snow,
  );
