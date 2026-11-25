import type { ReactNode, SVGProps } from 'react';

/**
 * The Bureau's own icon set: every icon crosses a fairy-tale object with a piece of tech
 * (a castle with a Wi-Fi tower, a spellbook with a floppy-disk clasp, an XP potion…).
 * Drawn in the house style (thick ink outline, flat fills, pixel sparkles) from theme tokens,
 * so they follow every theme and card style. 48×48 grid.
 */

export type DeskIconName =
  | 'hq'
  | 'cases'
  | 'quick'
  | 'daily'
  | 'quiz'
  | 'incident'
  | 'interrogation'
  | 'archive'
  | 'xp'
  | 'key'
  | 'streak'
  | 'logout'
  | 'glitch'
  | 'continue';

const INK = 'var(--color-outline)';
const S = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** Little four-point pixel sparkle. */
const Spark = ({ x, y, c = 'var(--color-pixel)', s = 1 }: { x: number; y: number; c?: string; s?: number }) => (
  <path d={`M${x} ${y - 3 * s}v${6 * s}M${x - 3 * s} ${y}h${6 * s}`} stroke={c} strokeWidth={1.6 * s} strokeLinecap="round" />
);

const ICONS: Record<DeskIconName, ReactNode> = {
  // Castle HQ with a Wi-Fi tower on the keep.
  hq: (
    <>
      <path d="M24 11V5" {...S} />
      <path d="M19.5 6.5a6.5 6.5 0 0 1 9 0M17 3.5a10 10 0 0 1 14 0" stroke="var(--color-pixel)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M5 42V18h3v3h3v-3h3v24zM34 42V18h3v3h3v-3h3v24z" fill="var(--color-gold)" {...S} />
      <path d="M14 42V24h20v18z" fill="var(--color-raised)" {...S} />
      <path d="M18 24V11h12v13" fill="var(--color-gold)" {...S} />
      <path d="M20 42v-7a4 4 0 0 1 8 0v7z" fill="var(--color-screen)" {...S} />
      <rect x="22" y="15" width="4" height="4" rx="1" fill="var(--color-pixel)" />
      <rect x="22.5" y="37" width="3" height="2" fill="var(--color-pixel)" />
    </>
  ),
  // Case folder sealed with wax, the seal is a little lightning "bug".
  cases: (
    <>
      <path d="M5 14a3 3 0 0 1 3-3h10l4 4h18a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="var(--color-gold)" {...S} />
      <path d="M5 20h38" {...S} />
      <path d="M11 27h14M11 32h10" stroke="#8a5a1c" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="34" cy="31" r="6.5" fill="var(--color-candy)" {...S} />
      <path d="M35 26.5l-3 5h3.5l-2 4.5" stroke="#ffe08a" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Brass hourglass whose sand is pixels, with a lightning bolt: a quick case.
  quick: (
    <>
      <path d="M12 6h24M12 42h24" {...S} />
      <path d="M14 6c0 10 8 12 8 18s-8 8-8 18h20c0-10-8-12-8-18s8-8 8-18z" fill="var(--color-screen)" {...S} />
      <rect x="21" y="33" width="3" height="3" fill="var(--color-pixel)" />
      <rect x="24" y="33" width="3" height="3" fill="var(--color-gold)" />
      <rect x="18" y="36" width="12" height="3" fill="var(--color-pixel)" />
      <rect x="20" y="12" width="8" height="3" fill="var(--color-gold)" />
      <path d="M38 14l-5 9h5l-4 9" stroke="var(--color-ember)" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // A torn-off calendar page with a tiny dragon flame: today's fresh glitches.
  daily: (
    <>
      <rect x="7" y="9" width="34" height="33" rx="4" fill="#fdf5e4" {...S} />
      <path d="M7 13a4 4 0 0 1 4-4h26a4 4 0 0 1 4 4v5H7z" fill="var(--color-candy)" {...S} />
      <path d="M15 5v7M33 5v7" {...S} />
      <path d="M24 37c-5 0-7-3.5-5-7.5 1 1.6 2.2 2 2.6 1.2.8-2.6-.4-4.8 2.4-7.7.3 3 3.2 3.8 4.2 6.4 1.5 3.7-.8 7.6-4.2 7.6z" fill="var(--color-ember)" {...S} strokeWidth={2} />
      <path d="M24 35c-1.8 0-2.6-1.4-1.8-3 .9.7 1.8.2 1.9-1 1.7 1.2 2 4 -.1 4z" fill="var(--color-gold)" />
      <Spark x={35} y={28} c="var(--color-chaos)" s={0.8} />
    </>
  ),
  // A crystal ball that only knows multiple choice.
  quiz: (
    <>
      <path d="M13 40h22l-3-6H16z" fill="var(--color-gold)" {...S} />
      <circle cx="24" cy="20" r="14" fill="var(--color-chaos)" {...S} />
      <path d="M15 15a10 10 0 0 1 7-5" stroke="#ffffff99" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M21 17.5a3.2 3.2 0 1 1 4.5 3c-1 .5-1.5 1.2-1.5 2.5" stroke="var(--color-pixel)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <rect x="22.7" y="25.5" width="2.6" height="2.6" fill="var(--color-pixel)" />
      <Spark x={36} y={8} />
    </>
  ),
  // A siren lamp on a pumpkin: something in a tale just broke.
  incident: (
    <>
      <path d="M8 42c0-6 6-9 16-9s16 3 16 9z" fill="var(--color-ember)" {...S} />
      <path d="M24 33v9M16 34.5c-1 2.5-1 5 0 7.5M32 34.5c1 2.5 1 5 0 7.5" stroke={INK} strokeWidth="2" fill="none" />
      <path d="M15 33V22a9 9 0 0 1 18 0v11z" fill="var(--color-candy)" {...S} />
      <path d="M19 22a5 5 0 0 1 5-5" stroke="#ffffffaa" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M24 4v5M8 12l4 3M40 12l-4 3M4 24h5M44 24h-5" stroke="var(--color-gold)" strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  // Magnifying glass with a pixel eye looking back at you.
  interrogation: (
    <>
      <path d="M29 29l11 11" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M29 29l11 11" stroke="var(--color-gold)" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="20" cy="20" r="13" fill="var(--color-screen)" {...S} />
      <path d="M11 20s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z" fill="var(--color-pixel)" stroke={INK} strokeWidth="2" />
      <rect x="18" y="18" width="4" height="4" fill="var(--color-screen)" />
      <path d="M13 11a10 10 0 0 1 4-2" stroke="#ffffff88" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  // A spellbook locked with a floppy disk.
  archive: (
    <>
      <path d="M9 8h26a4 4 0 0 1 4 4v28H13a4 4 0 0 1-4-4z" fill="var(--color-chaos)" {...S} />
      <path d="M9 36a4 4 0 0 1 4-4h26" {...S} fill="none" />
      <path d="M13 36h26v4H13a2 2 0 0 1 0-4z" fill="#fdf5e4" {...S} strokeWidth={2} />
      <rect x="17" y="12" width="15" height="15" rx="2" fill="var(--color-mana)" {...S} strokeWidth={2.2} />
      <rect x="20" y="12" width="9" height="5" fill="#d8e6f2" stroke={INK} strokeWidth="1.6" />
      <rect x="20" y="21" width="9" height="6" fill="#fdf5e4" stroke={INK} strokeWidth="1.6" />
      <Spark x={36} y={18} c="var(--color-gold)" s={0.8} />
    </>
  ),
  // An XP potion: liquid progress bar, extra fizzy.
  xp: (
    <>
      <path d="M20 5h8v4h-8z" fill="#b97a3c" {...S} strokeWidth={2.2} />
      <path d="M20 9v8L11 28a11 11 0 0 0 9 17h8a11 11 0 0 0 9-17l-9-11V9" fill="#fdf5e4" {...S} />
      <path d="M12.5 30h23a9 9 0 0 1-7.5 13h-8a9 9 0 0 1-7.5-13z" fill="var(--color-gold)" stroke="none" />
      <path d="M12.5 30h23" stroke={INK} strokeWidth="2" />
      <path d="M20 9v8L11 28a11 11 0 0 0 9 17h8a11 11 0 0 0 9-17l-9-11V9" fill="none" {...S} />
      <circle cx="21" cy="36" r="1.8" fill="#fff8" />
      <circle cx="27" cy="33" r="1.2" fill="#fff8" />
      <Spark x={38} y={10} c="var(--color-ember)" />
    </>
  ),
  // Skeleton key whose teeth are circuit traces.
  key: (
    <>
      <circle cx="14" cy="24" r="9" fill="var(--color-gold)" {...S} />
      <circle cx="14" cy="24" r="3.5" fill="var(--color-pixel)" stroke={INK} strokeWidth="2" />
      <path d="M23 24h20" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M23 24h20" stroke="var(--color-gold)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M35 24v6h3v-3h3v5" stroke={INK} strokeWidth="2.4" fill="none" strokeLinejoin="round" />
      <circle cx="41" cy="33" r="1.6" fill="var(--color-pixel)" />
    </>
  ),
  // A candle that is secretly a battery: your daily streak.
  streak: (
    <>
      <rect x="15" y="20" width="18" height="23" rx="3" fill="#fdf5e4" {...S} />
      <path d="M19 15h10v5H19z" fill="#9aa7b4" {...S} strokeWidth={2} />
      <rect x="18" y="31" width="12" height="9" rx="1.5" fill="var(--color-ok)" />
      <path d="M22 27h4M24 25v4" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M24 3c3 3.5 4.5 6 3 8.5a3.6 3.6 0 0 1-6 0c-1-2 .4-3.5 1.2-4.8.5 1.3 1.3 1.6 1.8 1.1.3-1.6 0-3.1 0-4.8z" fill="var(--color-ember)" {...S} strokeWidth={2} />
    </>
  ),
  // A door with a portal swirl: back to the real world.
  logout: (
    <>
      <path d="M10 43V9a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v34z" fill="#a8693f" {...S} />
      <path d="M14 43V12h14v31" fill="var(--color-screen)" {...S} strokeWidth={2} />
      <path d="M21 31a5 5 0 1 1 5-5 3 3 0 1 1-3-3" stroke="var(--color-pixel)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M34 26h9m-4-4 4 4-4 4" stroke={INK} strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 43h28" {...S} />
    </>
  ),
  // A frog prince with a crown, glitching between two colour channels.
  glitch: (
    <>
      <path d="M8 34c0-9 7-14 16-14s16 5 16 14c0 5-7 8-16 8S8 39 8 34z" fill="var(--color-ok)" {...S} />
      <circle cx="15" cy="20" r="6" fill="var(--color-ok)" {...S} />
      <circle cx="33" cy="20" r="6" fill="var(--color-ok)" {...S} />
      <rect x="12.5" y="18" width="5" height="5" fill={INK} />
      <rect x="30.5" y="18" width="5" height="5" fill={INK} />
      <path d="M15 34c5 3 13 3 18 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M17 13l2-7 5 5 5-5 2 7z" fill="var(--color-gold)" {...S} strokeWidth={2} />
      <rect x="4" y="27" width="11" height="3" fill="var(--color-pixel)" opacity=".85" />
      <rect x="33" y="37" width="11" height="3" fill="var(--color-chaos)" opacity=".85" />
    </>
  ),
  // A bookmark ribbon with a play arrow: pick up where you left off.
  continue: (
    <>
      <path d="M11 6h26v36l-13-8-13 8z" fill="var(--color-ember)" {...S} />
      <path d="M20 15v12l10-6z" fill="#fdf5e4" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <Spark x={41} y={10} c="var(--color-gold)" />
    </>
  ),
};

export function DeskIcon({ name, size = 32, className, ...rest }: { name: DeskIconName; size?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" aria-hidden className={className} {...rest}>
      {ICONS[name]}
    </svg>
  );
}
