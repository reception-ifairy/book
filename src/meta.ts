import type { ChoiceKind } from '../shared/arb';
import type { CatMood, RollOutcome } from '../shared/types';

export const KIND_COLOR: Record<ChoiceKind | 'custom', string> = {
  procedura: 'var(--color-sane)',
  improwizacja: 'var(--color-chaos)',
  dyplomacja: 'var(--color-mana)',
  pieczatka: 'var(--color-candy)',
  custom: 'var(--color-ember)',
};

export const CAT_MOOD: Record<CatMood, { label: string; emoji: string }> = {
  mruczy: { label: 'mruczy', emoji: '😺' },
  drzemie: { label: 'drzemie', emoji: '😴' },
  zaciekawiony: { label: 'zaciekawiony', emoji: '🙀' },
  syczy: { label: 'syczy', emoji: '😾' },
  zniesmaczony: { label: 'zniesmaczony', emoji: '😼' },
  dumny: { label: 'dumny', emoji: '😸' },
};

export const OUTCOME: Record<RollOutcome, { label: string; tone: 'ok' | 'warn' | 'danger' | 'ember'; sfx: string }> = {
  'krytyczny-sukces': { label: 'Krytyczny sukces', tone: 'ok', sfx: 'BRAWO!' },
  sukces: { label: 'Sukces', tone: 'ok', sfx: 'OK!' },
  czesciowy: { label: 'Częściowy sukces', tone: 'warn', sfx: 'PRAWIE!' },
  porazka: { label: 'Porażka', tone: 'danger', sfx: 'BONK!' },
  'krytyczna-porazka': { label: 'Krytyczna porażka', tone: 'danger', sfx: 'KATASTROFA!' },
};

export function ago(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'przed chwilą';
  if (s < 3600) return `${Math.round(s / 60)} min temu`;
  if (s < 86400) return `${Math.round(s / 3600)} godz. temu`;
  return `${Math.round(s / 86400)} dni temu`;
}

export const coverStyle = (hue: number) => ({
  background: `radial-gradient(120% 90% at 20% 0%, hsl(${hue} 75% 32% / 0.9), transparent 60%), linear-gradient(160deg, hsl(${hue} 45% 16%), hsl(${(hue + 40) % 360} 35% 7%))`,
});
