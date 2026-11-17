import { MISSIONS, MISSION_TYPES, rankOf, specialization, type Mission } from '../../shared/arb';
import type { Agent, MissionOffer } from '../../shared/types';
import { realDie, type Die } from './k20';

/** An offer stays on the desk this long before NarratoMat reassigns it. */
export const OFFER_TTL_MS = 8 * 3_600_000;
export const REROLLS_PER_DAY = 2;

interface Scored {
  mission: Mission;
  score: number;
  why: string[];
}

/**
 * NarratoMat 5000 scores every mission the agent's rank allows: specialization (+3 region,
 * +2 theme), difficulty close to the rank (+2), a mission type the agent has not done lately (+1),
 * minus 4 for each recent run of the same mission. The K20 then decides:
 * natural 20 offers the top three to choose from, natural 1 opens a paradox (a random mission
 * from the whole catalogue, with a harder DC), anything else adds the roll as "kaprys systemu"
 * to a random candidate's score before picking the best.
 */
export function assignMission(agent: Agent, die: Die = realDie, now = Date.now()): MissionOffer {
  const { index } = rankOf(agent.xp);
  const recent = agent.history.slice(-5);
  const recentTypes = new Set(agent.history.slice(-3).map((h) => h.type));
  const eligible = MISSIONS.filter((m) => m.minRank <= index && m.id !== agent.offer?.missionId);
  const pool = eligible.length ? eligible : MISSIONS.filter((m) => m.minRank <= index);

  const scored: Scored[] = pool.map((m) => {
    const why: string[] = [];
    let score = 0;
    if (m.region === agent.specialization) (score += 3), why.push('region sekcji +3');
    if (m.theme === agent.specialization) (score += 2), why.push('temat sekcji +2');
    if (Math.abs(m.difficulty - (index + 1)) <= 1) (score += 2), why.push('trudność na miarę rangi +2');
    if (!recentTypes.has(m.type)) (score += 1), why.push('świeży typ misji +1');
    const repeats = recent.filter((h) => h.missionId === m.id).length;
    if (repeats) (score -= 4 * repeats), why.push(`powtórka −${4 * repeats}`);
    return { mission: m, score, why };
  });

  const roll = die(20);
  let paradox = false;
  let picked: Scored;
  let alternatives: string[] = [];

  if (roll === 1) {
    paradox = true;
    picked = { mission: MISSIONS[die(MISSIONS.length) - 1], score: 0, why: ['paradoks: przydział spoza rangi'] };
  } else {
    // "Kaprys systemu": the roll favours one candidate, at random.
    const favoured = scored[die(scored.length) - 1];
    const whim = Math.floor(roll / 5);
    if (whim) (favoured.score += whim), favoured.why.push(`kaprys systemu +${whim}`);
    const ranked = [...scored].sort((a, b) => b.score - a.score);
    picked = ranked[0];
    if (roll === 20) alternatives = ranked.slice(1, 3).map((s) => s.mission.id);
  }

  const spec = specialization(agent.specialization);
  const reasons = [
    `K20 = ${roll}${roll === 20 ? ' (naturalna dwudziestka: wybór z trzech teczek)' : roll === 1 ? ' (naturalna jedynka: PARADOKS PRZYDZIAŁU)' : ''}`,
    `Ranga: ${rankOf(agent.xp).rank.name}; sekcja: ${spec?.name ?? agent.specialization}`,
    ...[...scored]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => `${MISSION_TYPES[s.mission.type].emoji} ${s.mission.title}: ${s.score} pkt${s.why.length ? ` (${s.why.join(', ')})` : ''}`),
  ];
  if (paradox) reasons.push(`Przydział: ${picked.mission.title}. DKSF podnosi poziom trudności o 2.`);

  return { missionId: picked.mission.id, alternatives, roll, reasons, paradox, createdAt: now, expiresAt: now + OFFER_TTL_MS };
}

export const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
