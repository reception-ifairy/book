import type { DailyKind } from './agent';

/**
 * Everything an agent can do at the Bureau, so the dashboard can list it and later updates can plug in:
 * a new mode is one entry here, a screen, and the routes that award its XP.
 */
export interface Activity {
  id: DailyKind;
  title: string;
  blurb: string;
  emoji: string;
  /** Rough time to play, shown on the tile. */
  minutes: number;
  /** Hash route of its screen. */
  route: string;
  /** Rough XP range for the tile. */
  xp: string;
}

export const DAILY_ACTIVITIES: Activity[] = [
  {
    id: 'quiz',
    title: 'Quiz ABC of the day',
    blurb: 'Three questions, three absurd answers each. Every answer is wrong in its own special way.',
    emoji: '🅰️',
    minutes: 1,
    route: 'agent/quiz',
    xp: 'up to 55 XP',
  },
  {
    id: 'incident',
    title: 'Incident of the day',
    blurb: 'A fresh report from a tale in trouble. One decision, one consequence, one report from IGNIS.',
    emoji: '🚨',
    minutes: 2,
    route: 'agent/incident',
    xp: '15–35 XP',
  },
  {
    id: 'interrogation',
    title: 'Interrogation',
    blurb: 'A suspect from the Public Domain, six questions and a lamp. Get the truth out of them.',
    emoji: '🔦',
    minutes: 5,
    route: 'agent/interrogation',
    xp: '20–70 XP',
  },
];
