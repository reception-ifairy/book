import type { ChoiceKind, EndingType, Phase } from '../shared/types';

/** The four forces, which in the Edu-Verse are also the four ways of learning. */
export const KIND: Record<ChoiceKind | 'custom', { label: string; color: string; learn: string }> = {
  logos: { label: 'Logos', color: 'var(--color-logos)', learn: 'patterns & reasoning' },
  mythos: { label: 'Mythos', color: 'var(--color-mythos)', learn: 'stories & time' },
  gnosis: { label: 'Gnosis', color: 'var(--color-gnosis)', learn: 'feelings & empathy' },
  phantasia: { label: 'Phantasia', color: 'var(--color-phantasia)', learn: 'imagination & play' },
  custom: { label: 'Your own words', color: 'var(--color-mana)', learn: 'your own idea' },
};

/** Words the reader shows: who narrates, what the meters mean, how endings are named. */
export const TEXT = {
  narrator: 'IGNIS',
  writing: 'IGNIS is writing page',
  busy: 'Tuning the portal to your idea…',
  customKind: 'Your own words',
  meters: { chaos: 'Dissonance', karma: 'Harmony', mana: 'Etherium' },
  emptyInventory: 'Nothing yet. Every world hands you something.',
} as const;

export const ENDING: Record<EndingType, { label: string; tone: 'ok' | 'warn' | 'danger' | 'ember' }> = {
  canon: { label: 'World understood', tone: 'ok' },
  subverted: { label: 'Your own world-model', tone: 'ember' },
  secret: { label: 'Secret discovery', tone: 'warn' },
};
/** Pages from stories saved before an ending type existed fall back to this. */
export const endingOf = (type: string) => ENDING[type as EndingType] ?? ENDING.canon;

/** The 3-phase model of learning in the multi-verse. */
export const PHASE: Record<Phase, { n: string; label: string; desc: string }> = {
  entry: { n: 'I', label: 'Enter', desc: 'Step into a world whose laws are different, and test them.' },
  translation: { n: 'II', label: 'Translate', desc: 'Map the strange law onto the science of our world.' },
  personalisation: { n: 'III', label: 'Make it yours', desc: 'IGNIS adapts to how you learn; you build your own model.' },
};

export function ago(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export const coverStyle = (hue: number) => ({
  background: `radial-gradient(120% 90% at 20% 0%, hsl(${hue} 75% 32% / 0.9), transparent 60%), linear-gradient(160deg, hsl(${hue} 45% 16%), hsl(${(hue + 40) % 360} 35% 7%))`,
});
