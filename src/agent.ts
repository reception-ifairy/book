import { useSyncExternalStore } from 'react';
import { agentApi, loadRuns, setAgentKey } from './api';
import type { Agent, AgentDashboard } from '../shared/agent';
import type { Lang } from '../shared/types';
import type { XpUpdate } from '../shared/xp';

/**
 * The logged-in agent on this device: their secret key (localStorage), their profile, and the dashboard
 * once loaded. Also a tiny event bus for "+XP" pops and promotions, so any screen can celebrate.
 */

const KEY = 'arb.agentKey';
const PROFILE = 'arb.agent';

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* storage blocked: the agent stays logged in for this visit only */
  }
};

interface State {
  key: string | null;
  agent: Agent | null;
  dash: AgentDashboard | null;
}

let state: State = (() => {
  const key = read(KEY);
  let agent: Agent | null = null;
  try {
    agent = key ? JSON.parse(read(PROFILE) || 'null') : null;
  } catch {
    agent = null;
  }
  return { key, agent, dash: null };
})();
setAgentKey(state.key);

const listeners = new Set<() => void>();
function set(next: Partial<State>) {
  state = { ...state, ...next };
  if ('key' in next) {
    write(KEY, state.key);
    setAgentKey(state.key);
  }
  if ('agent' in next) write(PROFILE, state.agent ? JSON.stringify(state.agent) : null);
  listeners.forEach((l) => l());
}

export const useAgent = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );

export const getAgentKey = () => state.key;

/** Joins the Bureau, logs in, and files this browser's earlier runs under the new agent. */
export async function enlist(codename: string, lang: Lang) {
  const { agent, key } = await agentApi.enlist(codename, lang);
  set({ key, agent, dash: null });
  const ids = loadRuns().map((r) => r.id);
  if (ids.length) await agentApi.claim(ids.slice(0, 20)).catch(() => {});
  return { agent, key };
}

export async function login(key: string) {
  setAgentKey(key.trim());
  try {
    const { agent } = await agentApi.login(key.trim());
    set({ key: key.trim().toUpperCase(), agent, dash: null });
    return agent;
  } catch (e) {
    setAgentKey(state.key);
    throw e;
  }
}

export function logout() {
  set({ key: null, agent: null, dash: null });
}

/** Loads the dashboard; an unknown key (deleted agent, typo) logs out instead of looping on errors. */
export async function refreshDashboard() {
  if (!state.key) return null;
  try {
    const dash = await agentApi.me();
    set({ dash, agent: dash.agent });
    return dash;
  } catch (e) {
    if (/Agent key required/i.test((e as Error).message)) logout();
    throw e;
  }
}

// ---------- XP celebrations ----------

type XpListener = (u: XpUpdate) => void;
const xpListeners = new Set<XpListener>();
export const onXp = (l: XpListener) => {
  xpListeners.add(l);
  return () => void xpListeners.delete(l);
};

/** Call with the `xp` field of any action response: updates the profile and pops the gains on screen. */
export function celebrate(u: XpUpdate | undefined) {
  if (!u) return;
  if (state.agent) set({ agent: { ...state.agent, xp: u.total } });
  if (u.gained.length || u.rankUp) xpListeners.forEach((l) => l(u));
}
