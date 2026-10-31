import type { ChoiceKind, World } from '../shared/types';

export const KIND: Record<ChoiceKind | 'custom', { label: string; color: string }> = {
  sane: { label: 'Sane', color: 'var(--color-sane)' },
  chaos: { label: 'Chaos', color: 'var(--color-chaos)' },
  dumb: { label: 'Dumb', color: 'var(--color-dumb)' },
  sudo: { label: 'sudo', color: 'var(--color-ember)' },
  logos: { label: 'Logos', color: 'var(--color-logos)' },
  mythos: { label: 'Mythos', color: 'var(--color-mythos)' },
  gnosis: { label: 'Gnosis', color: 'var(--color-gnosis)' },
  phantasia: { label: 'Phantasia', color: 'var(--color-phantasia)' },
  custom: { label: 'Your move', color: 'var(--color-mana)' },
};

/** Words that change with the world: who narrates, what the meters mean, how endings are named. */
export const WORLD_TEXT: Record<World, {
  narrator: string;
  writing: string;
  busy: string;
  customKind: string;
  meters: { chaos: string; karma: string; mana: string };
  emptyInventory: string;
  endings: Partial<Record<string, string>>;
}> = {
  grimm: {
    narrator: 'IGNIS',
    writing: 'IGNIS is writing page',
    busy: 'Compiling your next mistake…',
    customKind: 'Your move',
    meters: { chaos: 'Chaos', karma: 'Karma', mana: 'Mana' },
    emptyInventory: 'Empty. Like your plan.',
    endings: {},
  },
  ifairy: {
    narrator: 'The Archivist',
    writing: 'The Archivist is writing page',
    busy: 'Consulting the Holographic Memory…',
    customKind: 'Your own words',
    meters: { chaos: 'Dissonance', karma: 'Harmony', mana: 'Etherium' },
    emptyInventory: 'Nothing yet. The Archive is patient.',
    endings: { canon: 'Resolution', subverted: 'Your own resolution', secret: 'Secret discovery' },
  },
};

export const ENDING: Record<string, { label: string; tone: 'ok' | 'warn' | 'danger' | 'ember' }> = {
  canon: { label: 'Canon ending', tone: 'ok' },
  subverted: { label: 'Subverted ending', tone: 'ember' },
  cursed: { label: 'Cursed ending', tone: 'danger' },
  secret: { label: 'Secret ending', tone: 'warn' },
  death: { label: 'Garbage collected', tone: 'danger' },
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
