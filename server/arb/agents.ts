import fs from 'fs';
import path from 'path';
import { randomInt, randomUUID } from 'crypto';
import { DATA_DIR } from '../config';
import { coffeeNow, type SpecializationId } from '../../shared/arb';
import type { Agent, CoffeeResult, Lang } from '../../shared/types';
import { REROLLS_PER_DAY, today } from './narratomat';

const AGENT_DIR = path.join(DATA_DIR, 'agents');
const cache = new Map<string, Agent>();
const fileFor = (id: string) => path.join(AGENT_DIR, `${id}.json`);
export const isSafeId = (id: string) => /^[a-zA-Z0-9-]{8,64}$/.test(id);

export function getAgent(id: string): Agent | undefined {
  if (!isSafeId(id)) return undefined;
  const hit = cache.get(id);
  if (hit) return hit;
  try {
    const agent = JSON.parse(fs.readFileSync(fileFor(id), 'utf8')) as Agent;
    cache.set(id, agent);
    return agent;
  } catch {
    return undefined;
  }
}

export function saveAgent(agent: Agent) {
  agent.updatedAt = Date.now();
  cache.set(agent.id, agent);
  fs.mkdirSync(AGENT_DIR, { recursive: true });
  fs.writeFileSync(fileFor(agent.id), JSON.stringify(agent));
}

export function createAgent(codename: string, specialization: SpecializationId, lang: Lang, now = Date.now()): Agent {
  return {
    id: randomUUID(),
    codename,
    specialization,
    lang,
    xp: 0,
    coffee: 60,
    coffeeAt: now,
    stress: 10,
    stressAt: now,
    history: [],
    training: {},
    offer: null,
    rerolls: { day: today(now), left: REROLLS_PER_DAY },
    notes: [],
    activeStoryId: null,
    createdAt: now,
    updatedAt: now,
  };
}

const STRESS_EASE_MS = 900_000;

/** Brings time-based fields up to date: coffee drains, stress eases off, rerolls refill each day. */
export function refresh(agent: Agent, now = Date.now()): Agent {
  const coffee = coffeeNow(agent.coffee, agent.coffeeAt, now);
  if (coffee !== agent.coffee) {
    // Keep the fraction of the current point: move the clock by whole drained points only.
    agent.coffeeAt = coffee === 0 ? now : agent.coffeeAt + (agent.coffee - coffee) * 360_000;
    agent.coffee = coffee;
  }
  const eased = Math.floor((now - agent.stressAt) / STRESS_EASE_MS);
  if (eased > 0) {
    agent.stress = Math.max(0, agent.stress - eased);
    agent.stressAt += eased * STRESS_EASE_MS;
  }
  if (agent.rerolls.day !== today(now)) agent.rerolls = { day: today(now), left: REROLLS_PER_DAY };
  if (agent.offer && agent.offer.expiresAt < now) agent.offer = null;
  return agent;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/** The coffee machine in the Dark Corridor. Mostly coffee. */
const MACHINE: { weight: number; result: Omit<CoffeeResult, 'coffee' | 'stress'> & { dc: number; ds: number } }[] = [
  { weight: 50, result: { kind: 'kawa', text: 'Kawa. Zwykła, czarna, gorąca. Podejrzanie normalna.', dc: 30, ds: -5 } },
  { weight: 15, result: { kind: 'espresso', text: 'Podwójne espresso. Słyszysz kolory.', dc: 50, ds: 5 } },
  { weight: 10, result: { kind: 'lawa', text: 'Zamiast kawy wypłynął lawowy żleb. Kubek przetrwał, Twoje brwi niekoniecznie.', dc: 0, ds: 15 } },
  { weight: 10, result: { kind: 'herbata', text: 'Czarna herbata. DAM zaoszczędził dziś 0,3 grosza. Gratulacje.', dc: 15, ds: -10 } },
  { weight: 10, result: { kind: 'telepatia', text: 'Nowy ekspres z funkcją telepatii wie, czego chcesz. Daje Ci co innego.', dc: 20, ds: -15 } },
  { weight: 5, result: { kind: 'pusto', text: 'Automat mruga komunikatem „Wypełnij formularz K-AWA w trzech egzemplarzach”.', dc: 0, ds: 5 } },
];

export function brew(agent: Agent, pick = (n: number) => randomInt(0, n)): CoffeeResult {
  let r = pick(MACHINE.reduce((s, m) => s + m.weight, 0));
  const hit = MACHINE.find((m) => (r -= m.weight) < 0) ?? MACHINE[0];
  const { dc, ds, ...rest } = hit.result;
  agent.coffee = clamp(agent.coffee + dc);
  agent.coffeeAt = Date.now();
  agent.stress = clamp(agent.stress + ds);
  return { ...rest, coffee: dc, stress: ds };
}
