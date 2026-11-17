import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { api } from './api';
import type { Agent } from '../shared/types';

/**
 * The signed-in agent. The agent id is the only credential and lives in this browser;
 * the profile itself is on the server. Every screen reads it through useAgent().
 */
const KEY = 'arb.agentId';
const listeners = new Set<() => void>();
let agent: Agent | null = null;
let loading = false;
let failed = false;

export function storedAgentId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const emit = () => listeners.forEach((l) => l());

export function setAgent(next: Agent | null) {
  agent = next;
  try {
    if (next) localStorage.setItem(KEY, next.id);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the agent lasts for this visit only */
  }
  emit();
}

async function load() {
  const id = storedAgentId();
  if (!id || loading) return;
  loading = true;
  emit();
  try {
    agent = await api.agent(id);
    failed = false;
  } catch {
    failed = true;
  } finally {
    loading = false;
    emit();
  }
}

let snapshot = { agent, loading, failed };
const read = () => {
  if (snapshot.agent !== agent || snapshot.loading !== loading || snapshot.failed !== failed) snapshot = { agent, loading, failed };
  return snapshot;
};

/** `agent` is null while loading or when no agent is registered in this browser (`registered` tells which). */
export function useAgent() {
  const state = useSyncExternalStore((l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }, read);
  useEffect(() => {
    if (!agent && !loading && !failed && storedAgentId()) void load();
  }, []);
  const refresh = useCallback(() => load(), []);
  return { ...state, registered: !!storedAgentId(), refresh, setAgent };
}

/** Leaves the agency in this browser (the profile stays on the server). */
export function signOut() {
  failed = false;
  setAgent(null);
}
