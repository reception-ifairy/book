import { describe, expect, it } from 'vitest';
import { LOCATIONS, MISSIONS, MINI_GAMES, PEGASUS_ROUTE, coffeeNow, dcFor, locationOf, rankOf, trainingXp, agentStatus } from '../shared/arb';
import { ARCHIVE } from '../shared/archive';
import { outcomeOf, rollTest } from '../server/arb/k20';
import { assignMission } from '../server/arb/narratomat';
import { brew, createAgent, refresh } from '../server/arb/agents';

/** A die that returns the queued faces in order, then the last one forever. */
const dice = (...faces: number[]) => {
  let i = 0;
  return () => faces[Math.min(i++, faces.length - 1)];
};

describe('catalogue', () => {
  it('has consistent ids and references', () => {
    const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id)).size === xs.length;
    expect(ids(MISSIONS) && ids(LOCATIONS) && ids(ARCHIVE)).toBe(true);
    for (const m of MISSIONS) {
      expect(locationOf(m.locationId), m.id).toBeDefined();
      expect(m.id).toMatch(/^[a-z0-9-]+$/);
      expect(m.difficulty).toBeGreaterThanOrEqual(1);
      expect(m.difficulty).toBeLessThanOrEqual(5);
    }
    for (const e of ARCHIVE) {
      for (const r of e.related) expect(ARCHIVE.some((x) => x.id === r), `${e.id} → ${r}`).toBe(true);
      if (e.locationId) expect(locationOf(e.locationId), e.id).toBeDefined();
      for (const m of e.missionIds ?? []) expect(MISSIONS.some((x) => x.id === m), `${e.id} → ${m}`).toBe(true);
    }
    for (const [x, y] of PEGASUS_ROUTE) expect(x <= 1000 && y <= 640).toBe(true);
    expect(MINI_GAMES).toHaveLength(5);
    expect(ARCHIVE.filter((e) => e.category === 'falszywy-trop').every((e) => e.falseLead)).toBe(true);
  });

  it('maps XP to ranks and clearance', () => {
    expect(rankOf(0).rank.id).toBe('stazysta');
    expect(rankOf(119).index).toBe(0);
    expect(rankOf(120).rank.clearance).toBe(1);
    expect(rankOf(5000).next).toBeNull();
    expect(rankOf(235).progress).toBeCloseTo(0.5, 1);
  });

  it('caps training XP and drains coffee in real time', () => {
    expect(trainingXp(100, true)).toBe(15);
    expect(trainingXp(40, false)).toBe(4);
    expect(trainingXp(-5, false)).toBe(0);
    expect(coffeeNow(50, 0, 3_600_000)).toBe(40);
    expect(coffeeNow(5, 0, 36_000_000)).toBe(0);
    expect(agentStatus(90, 50).tone).toBe('danger');
    expect(agentStatus(20, 50).label).toBe('Stabilny Chaos');
  });
});

describe('K20', () => {
  const mission = MISSIONS.find((m) => m.difficulty === 2)!;
  const ctx = { kind: 'procedura' as const, mission, rankIndex: 1, specializationMatch: true, stats: { coherence: 50, stress: 80, coffee: 0, stamps: 2 }, paradox: false };

  it('names every modifier and resolves against the mission DC', () => {
    const r = rollTest(ctx, dice(10));
    expect(r.parts.map((p) => p.label)).toEqual(['Ranga', 'Specjalizacja sekcji', 'Procedura', 'Stres powyżej 70', 'Brak kofeiny']);
    expect(r.modifier).toBe(2);
    expect(r.dc).toBe(dcFor(2));
    expect(r).toMatchObject({ die: 10, total: 12, dc: 12, outcome: 'sukces' });
  });

  it('treats natural 20 and 1 as criticals and near misses as partial', () => {
    expect(outcomeOf(20, 5, 30)).toBe('krytyczny-sukces');
    expect(outcomeOf(1, 40, 10)).toBe('krytyczna-porazka');
    expect(outcomeOf(9, 10, 12)).toBe('czesciowy');
    expect(outcomeOf(5, 6, 12)).toBe('porazka');
    expect(rollTest({ ...ctx, paradox: true }, dice(10)).dc).toBe(dcFor(2) + 2);
  });
});

describe('NarratoMat 5000', () => {
  it('only assigns missions the rank allows and explains the pick', () => {
    const agent = createAgent('Sowa', 'azja', 'pl');
    for (let face = 2; face <= 19; face++) {
      const offer = assignMission(agent, dice(face, 1));
      const m = MISSIONS.find((x) => x.id === offer.missionId)!;
      expect(m.minRank).toBe(0);
      expect(offer.paradox).toBe(false);
      expect(offer.alternatives).toEqual([]);
      expect(offer.reasons[0]).toBe(`K20 = ${face}`);
    }
  });

  it('prefers the agent\'s section and avoids repeating recent missions', () => {
    const agent = createAgent('Sowa', 'europa', 'pl');
    const first = assignMission(agent, dice(2, 1));
    expect(MISSIONS.find((m) => m.id === first.missionId)!.region).toBe('europa');
    agent.history.push({ storyId: 's1', missionId: first.missionId, type: 'eskorta', title: '', ending: 'uratowana', xp: 0, startedAt: 0, endedAt: 0 });
    expect(assignMission(agent, dice(2, 1)).missionId).not.toBe(first.missionId);
  });

  it('offers three files on a natural 20 and a paradox on a natural 1', () => {
    const agent = createAgent('Sowa', 'czas', 'pl');
    const lucky = assignMission(agent, dice(20, 1));
    expect(lucky.alternatives).toHaveLength(2);
    expect(lucky.alternatives).not.toContain(lucky.missionId);
    const cursed = assignMission(agent, dice(1, MISSIONS.length));
    expect(cursed.paradox).toBe(true);
    expect(cursed.missionId).toBe(MISSIONS.at(-1)!.id);
    expect(cursed.reasons.join(' ')).toContain('PARADOKS');
  });
});

describe('agent clock', () => {
  it('drains coffee, eases stress, refills rerolls and expires stale offers', () => {
    const t0 = Date.UTC(2026, 10, 17, 9);
    const agent = createAgent('Sowa', 'moral', 'pl', t0);
    agent.stress = 50;
    agent.rerolls.left = 0;
    agent.offer = assignMission(agent, dice(5, 1), t0);
    refresh(agent, t0 + 3_600_000);
    expect(agent.coffee).toBe(50);
    expect(agent.stress).toBe(46);
    expect(agent.offer).not.toBeNull();
    refresh(agent, t0 + 25 * 3_600_000);
    expect(agent.rerolls.left).toBe(2);
    expect(agent.offer).toBeNull();
    expect(agent.coffee).toBe(0);
  });

  it('brews whatever the machine decides, within bounds', () => {
    const agent = createAgent('Sowa', 'moral', 'pl');
    agent.coffee = 95;
    expect(brew(agent, () => 0).kind).toBe('kawa');
    expect(agent.coffee).toBe(100);
    expect(brew(agent, () => 70).kind).toBe('lawa');
  });
});
