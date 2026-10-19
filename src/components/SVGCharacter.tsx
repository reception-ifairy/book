import { memo } from 'react';
import type { Mood } from '../../shared/types';

/** Resting mouth and brows per mood; the talking animation takes over while IGNIS speaks. */
const FACES: Record<Mood, { mouth: string; leftBrow: string; rightBrow: string }> = {
  // A perfectly flat path has a zero-height box, which makes the glow filter render nothing.
  neutral: { mouth: 'M 80 118 Q 100 122 120 118', leftBrow: 'M 56 66 Q 68 60 82 66', rightBrow: 'M 144 66 Q 132 60 118 66' },
  smug: { mouth: 'M 80 116 Q 104 128 124 110', leftBrow: 'M 56 68 Q 68 66 82 68', rightBrow: 'M 144 58 Q 132 50 118 62' },
  annoyed: { mouth: 'M 82 122 Q 100 114 118 122', leftBrow: 'M 56 62 Q 70 64 84 72', rightBrow: 'M 144 62 Q 130 64 116 72' },
  panic: { mouth: 'M 88 118 Q 100 144 112 118 Q 100 110 88 118', leftBrow: 'M 56 58 Q 68 48 82 58', rightBrow: 'M 144 58 Q 132 48 118 58' },
  sincere: { mouth: 'M 84 117 Q 100 126 116 117', leftBrow: 'M 56 64 Q 68 62 82 66', rightBrow: 'M 144 64 Q 132 62 118 66' },
  hyped: { mouth: 'M 78 112 Q 100 140 122 112', leftBrow: 'M 56 56 Q 68 46 82 56', rightBrow: 'M 144 56 Q 132 46 118 56' },
};

const EMBER = 'var(--color-ember)';
const PAGE = 'var(--color-raised)';
const INK = 'var(--color-ink)';

/** IGNIS: a living grimoire with an ember flame for a bookmark. */
export const SVGCharacter = memo(({ isTalking, mood = 'neutral', size = 160 }: { isTalking: boolean; mood?: Mood; size?: number }) => {
  const face = FACES[mood];
  return (
    <div className="floating" style={{ width: size, height: size }} role="img" aria-label={`IGNIS looks ${mood}`}>
      <svg viewBox="0 0 200 200" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="ember-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="halo">
            <stop offset="0%" stopColor="#ff6b3d" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#ff6b3d" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="105" r="92" fill="url(#halo)">
          {isTalking && <animate attributeName="r" values="88;96;88" dur="1.2s" repeatCount="indefinite" />}
        </circle>

        {/* Flame bookmark */}
        <path d="M 100 14 C 112 30, 114 40, 100 52 C 86 40, 90 28, 100 14 Z" style={{ fill: EMBER }} filter="url(#ember-glow)">
          <animate attributeName="d" dur={isTalking ? '0.35s' : '1.6s'} repeatCount="indefinite" values="M 100 14 C 112 30, 114 40, 100 52 C 86 40, 90 28, 100 14 Z; M 102 10 C 116 28, 112 42, 100 52 C 88 42, 86 30, 102 10 Z; M 100 14 C 112 30, 114 40, 100 52 C 86 40, 90 28, 100 14 Z" />
        </path>

        {/* Covers */}
        <path d="M 100 52 C 80 44, 52 44, 34 52 L 34 160 C 52 152, 80 152, 100 160 Z" style={{ fill: PAGE, stroke: EMBER }} strokeWidth="3" strokeLinejoin="round" />
        <path d="M 100 52 C 120 44, 148 44, 166 52 L 166 160 C 148 152, 120 152, 100 160 Z" style={{ fill: PAGE, stroke: EMBER }} strokeWidth="3" strokeLinejoin="round" />
        <path d="M 100 52 L 100 160" style={{ stroke: EMBER }} strokeWidth="2" opacity="0.6" />
        {[136, 144].map((y) => (
          <g key={y} opacity="0.25" style={{ stroke: INK }} strokeWidth="1.5" strokeLinecap="round">
            <path d={`M 46 ${y} Q 70 ${y - 5} 90 ${y}`} fill="none" />
            <path d={`M 110 ${y} Q 130 ${y - 5} 154 ${y}`} fill="none" />
          </g>
        ))}

        {/* Eyes */}
        <g>
          <ellipse cx="70" cy="88" rx="15" ry="16" style={{ fill: INK }} />
          <ellipse cx="130" cy="88" rx="15" ry="16" style={{ fill: INK }} />
          <g>
            <circle cx="72" cy="90" r="7" fill="#0c0b0a" />
            <circle cx="128" cy="90" r="7" fill="#0c0b0a" />
            <circle cx="74.5" cy="87" r="2.2" style={{ fill: EMBER }} />
            <circle cx="130.5" cy="87" r="2.2" style={{ fill: EMBER }} />
            {isTalking && <animateTransform attributeName="transform" type="translate" values="0,0; -3,-1; 3,1; 0,0" dur="0.5s" repeatCount="indefinite" />}
          </g>
          {/* Blink */}
          <g style={{ fill: PAGE }}>
            <rect x="54" y="70" width="32" height="0" >
              <animate attributeName="height" values="0;0;34;0" keyTimes="0;0.94;0.97;1" dur="5s" repeatCount="indefinite" />
            </rect>
            <rect x="114" y="70" width="32" height="0">
              <animate attributeName="height" values="0;0;34;0" keyTimes="0;0.94;0.97;1" dur="5s" repeatCount="indefinite" />
            </rect>
          </g>
        </g>

        {/* Brows */}
        <path d={face.leftBrow} fill="none" style={{ stroke: INK }} strokeWidth="4" strokeLinecap="round" />
        <path d={face.rightBrow} fill="none" style={{ stroke: INK }} strokeWidth="4" strokeLinecap="round" />

        {/* Mouth */}
        {isTalking ? (
          <path style={{ fill: EMBER }} filter="url(#ember-glow)" d="M 84 116 Q 100 138 116 116 Z">
            <animate attributeName="d" values="M 84 116 Q 100 138 116 116 Z; M 86 117 Q 100 122 114 117 Z; M 84 116 Q 100 138 116 116 Z" dur="0.22s" repeatCount="indefinite" />
          </path>
        ) : (
          <path d={face.mouth} fill="none" style={{ stroke: EMBER }} strokeWidth="5" strokeLinecap="round" filter="url(#ember-glow)" />
        )}
      </svg>
    </div>
  );
});
