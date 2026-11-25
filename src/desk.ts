import { useEffect, useSyncExternalStore } from 'react';
import { api, type TaleCard } from './api';
import type { DailyBoard } from '../shared/daily';

/**
 * What every tab of the agent's desk shares besides the dashboard itself: the tale catalogue and today's
 * Daily ops board. Fetched once per visit and kept, so switching tabs is instant.
 */
let state: { tales: TaleCard[]; board: DailyBoard | null } = { tales: [], board: null };
let loading = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load() {
  if (loading || state.tales.length) return;
  loading = true;
  api
    .tales()
    .then((tales) => {
      state = { ...state, tales };
      emit();
    })
    .catch(() => {})
    .finally(() => (loading = false));
  api
    .daily()
    .then((board) => {
      state = { ...state, board };
      emit();
    })
    .catch(() => {});
}

export function useDesk() {
  useEffect(load, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
