import { memo, useId, type ReactNode } from 'react';
import { motion } from 'motion/react';
import type { Mood } from '../../shared/types';
import { EmberSparks } from './Effects';

const INK = '#241913';
const PIX = '#5ef0ff';

/** Pixel-screen faces, drawn in screen space (screen is x 62..138, y 40..92). */
const FACES: Record<Mood, ReactNode> = {
  neutral: (
    <>
      <rect x="78" y="52" width="11" height="17" rx="4" fill={PIX} />
      <rect x="111" y="52" width="11" height="17" rx="4" fill={PIX} />
    </>
  ),
  smug: (
    <>
      <path d="M 76 62 L 91 62" stroke={PIX} strokeWidth="5" strokeLinecap="round" />
      <path d="M 109 64 Q 116 52 123 64" stroke={PIX} strokeWidth="5" strokeLinecap="round" fill="none" />
    </>
  ),
  annoyed: (
    <>
      <path d="M 76 54 L 92 60" stroke={PIX} strokeWidth="4" strokeLinecap="round" />
      <path d="M 124 54 L 108 60" stroke={PIX} strokeWidth="4" strokeLinecap="round" />
      <rect x="79" y="62" width="10" height="7" rx="2" fill={PIX} />
      <rect x="111" y="62" width="10" height="7" rx="2" fill={PIX} />
    </>
  ),
  panic: (
    <>
      {[84, 116].map((cx) => (
        <path
          key={cx}
          d={`M ${cx} 61 m -1 0 a 1 1 0 1 1 2 0 a 3 3 0 1 1 -5 0 a 5 5 0 1 1 9 0 a 7 7 0 1 1 -12 0`}
          stroke={PIX}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        >
          <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} 61`} to={`360 ${cx} 61`} dur="1.2s" repeatCount="indefinite" />
        </path>
      ))}
    </>
  ),
  sincere: (
    <>
      <path d="M 77 63 Q 84 53 91 63" stroke={PIX} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M 109 63 Q 116 53 123 63" stroke={PIX} strokeWidth="5" strokeLinecap="round" fill="none" />
    </>
  ),
  hyped: (
    <>
      {[84, 116].map((cx) => (
        <path key={cx} d={`M ${cx} 51 L ${cx + 3} 58 L ${cx + 10} 60 L ${cx + 3} 63 L ${cx} 70 L ${cx - 3} 63 L ${cx - 10} 60 L ${cx - 3} 58 Z`} fill={PIX} />
      ))}
    </>
  ),
};

const MOUTHS: Record<Mood, string> = {
  neutral: 'M 92 80 Q 100 85 108 80',
  smug: 'M 90 81 Q 102 86 112 77',
  annoyed: 'M 92 82 L 108 82',
  panic: 'M 88 82 Q 92 77 96 82 Q 100 87 104 82 Q 108 77 112 82',
  sincere: 'M 93 79 Q 100 86 107 79',
  hyped: 'M 89 77 Q 100 92 111 77 Z',
};

/** IGNIS: a palm-sized cyber-magic robot with a CRT face, a faceted crystal body with a heart core, light wings and an ember antenna. */
export const SVGCharacter = memo(({ isTalking, mood = 'neutral', size = 160, sparks = size >= 100 }: { isTalking: boolean; mood?: Mood; size?: number; sparks?: boolean }) => {
  const flap = isTalking ? '0.28s' : '0.6s';
  // Several IGNIS can be on one page (one hidden on phones); unique ids keep each one's gradients its own.
  const base = useId().replace(/[^a-zA-Z0-9]/g, '');
  const uid = (name: string) => `${name}-${base}`;
  return (
    <div className="relative floating" style={{ width: size, height: size }} role="img" aria-label={`IGNIS looks ${mood}`}>
      {sparks && <EmberSparks key={isTalking ? 'busy' : 'calm'} count={isTalking ? 12 : 6} height={size * 0.75} />}
      <motion.div key={mood} initial={{ scale: 0.86, rotate: -8, y: 6 }} animate={{ scale: 1, rotate: 0, y: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 10 }}>
        <svg viewBox="0 0 200 200" width={size} height={size} xmlns="http://www.w3.org/2000/svg" overflow="visible">
          <defs>
            <filter id={uid("pix-glow")} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.8" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id={uid("ig-halo")}>
              <stop offset="0%" stopColor="#ffb347" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={uid("ig-wing")} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#e9f6ff" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#b9c8ff" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#c9a8ff" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id={uid("ig-crystal")} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#d6f4ff" />
              <stop offset="45%" stopColor="#9ab8f0" />
              <stop offset="100%" stopColor="#8b63e6" />
            </linearGradient>
            <radialGradient id={uid("ig-heart")}>
              <stop offset="0%" stopColor="#fff2ff" />
              <stop offset="60%" stopColor="#f08bd8" />
              <stop offset="100%" stopColor="#b25cf0" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={uid("ig-case")} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#9fb3c4" />
              <stop offset="100%" stopColor="#6f8599" />
            </linearGradient>
          </defs>

          <circle cx="100" cy="105" r="95" fill={`url(#${uid("ig-halo")})`} />

          {/* Light wings, flapping from the shoulders */}
          {[
            { side: -1, ox: 70 },
            { side: 1, ox: 130 },
          ].map(({ side, ox }) => (
            <g key={side} opacity="0.95">
              <g>
                <path
                  d={`M ${ox} 112 C ${ox + side * 30} 70, ${ox + side * 66} 74, ${ox + side * 58} 104 C ${ox + side * 52} 120, ${ox + side * 30} 120, ${ox} 116 Z`}
                  fill={`url(#${uid("ig-wing")})`}
                  stroke={INK}
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <path
                  d={`M ${ox} 120 C ${ox + side * 28} 124, ${ox + side * 48} 140, ${ox + side * 36} 154 C ${ox + side * 24} 160, ${ox + side * 10} 140, ${ox} 124 Z`}
                  fill={`url(#${uid("ig-wing")})`}
                  stroke={INK}
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <path d={`M ${ox + side * 6} 112 Q ${ox + side * 32} 94 ${ox + side * 50} 96`} stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                {/* Pixel sparkles in the wing membrane */}
                {[
                  [26, 92, '#ffffff'],
                  [40, 100, '#5ef0ff'],
                  [18, 104, '#c9a8ff'],
                  [24, 138, '#ffffff'],
                ].map(([dx, y, c]) => (
                  <rect key={`${dx}-${y}`} x={ox + side * (dx as number) - 2} y={(y as number) - 2} width="4" height="4" fill={c as string} />
                ))}
                {/* translate(ox·(1−s)) then scale(s): the wing folds toward its shoulder joint at x = ox. */}
                <animateTransform attributeName="transform" type="translate" additive="sum" values={`0 0; ${ox * 0.45} 0; 0 0`} dur={flap} repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="scale" additive="sum" values="1 1; 0.55 1; 1 1" dur={flap} repeatCount="indefinite" />
              </g>
            </g>
          ))}

          {/* Little legs with chunky boots and glowing soles */}
          <g stroke={INK} strokeWidth="5" strokeLinecap="round">
            <path d="M 89 166 L 86 180" />
            <path d="M 111 166 L 114 180" />
          </g>
          {[84, 116].map((x) => (
            <g key={x}>
              <rect x={x - 11} y="178" width="22" height="13" rx="6" fill="#efe6d4" stroke={INK} strokeWidth="3" />
              <rect x={x - 11} y="186" width="22" height="5" rx="2.5" fill="#55606c" stroke={INK} strokeWidth="2" />
              <path d={`M ${x - 6} 193 L ${x + 6} 193`} stroke="#5ef0ff" strokeWidth="2.5" strokeLinecap="round" filter={`url(#${uid("pix-glow")})`} />
            </g>
          ))}

          {/* Arms: dark joints, cream cuffs, white hands; the right one waves while talking */}
          <path d="M 70 116 Q 52 126 48 144" stroke={INK} strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M 70 116 Q 52 126 48 144" stroke="#4d5763" strokeWidth="4" strokeLinecap="round" fill="none" />
          <rect x="40" y="138" width="16" height="12" rx="5" fill="#efe6d4" stroke={INK} strokeWidth="2.5" />
          <circle cx="48" cy="155" r="6.5" fill="#ffffff" stroke={INK} strokeWidth="3" />
          <g>
            <path d="M 130 116 Q 150 120 156 104" stroke={INK} strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M 130 116 Q 150 120 156 104" stroke="#4d5763" strokeWidth="4" strokeLinecap="round" fill="none" />
            <rect x="148" y="96" width="16" height="12" rx="5" fill="#efe6d4" stroke={INK} strokeWidth="2.5" />
            <circle cx="156" cy="91" r="6.5" fill="#ffffff" stroke={INK} strokeWidth="3" />
            <circle cx="156" cy="86" r="2" fill="#5ef0ff" filter={`url(#${uid("pix-glow")})`} />
            {isTalking && <animateTransform attributeName="transform" type="rotate" values="0 130 116; -18 130 116; 6 130 116; 0 130 116" dur="0.7s" repeatCount="indefinite" />}
          </g>

          {/* Crystal body: faceted, translucent, gold circuit traces and a pulsing heart core */}
          <path d="M 76 100 L 124 100 L 134 118 L 116 162 L 100 172 L 84 162 L 66 118 Z" fill={`url(#${uid("ig-crystal")})`} fillOpacity="0.92" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M 76 100 L 88 120 L 66 118 M 124 100 L 112 120 L 134 118 M 88 120 L 112 120 M 88 120 L 84 162 M 112 120 L 116 162 M 88 120 L 100 172 L 112 120" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
          <path d="M 100 147 L 100 166 M 100 128 L 100 118 L 92 110 M 94 138 L 78 130 L 74 120 M 106 138 L 122 132 L 128 122" stroke="#f4c84a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="100" cy="137" r="20" fill={`url(#${uid("ig-heart")})`}>
            <animate attributeName="r" values="17;22;17" dur={isTalking ? '0.6s' : '1.8s'} repeatCount="indefinite" />
          </circle>
          <path d="M 100 147 C 86 138, 88 126, 95 127 C 98 127, 100 130, 100 132 C 100 130, 102 127, 105 127 C 112 126, 114 138, 100 147 Z" fill="#ffe0f6" stroke="#b25cf0" strokeWidth="1.5" />
          {/* Gold shoulder caps and collar gem */}
          <path d="M 64 108 Q 70 98 80 100 L 76 112 Z" fill="#f4c84a" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M 136 108 Q 130 98 120 100 L 124 112 Z" fill="#f4c84a" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M 94 100 L 106 100 L 100 108 Z" fill="#5ef0ff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />

          {/* Ember antenna */}
          <path d="M 100 30 L 100 16" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path d="M 100 -6 C 110 6, 112 12, 100 20 C 88 12, 90 6, 100 -6 Z" fill="#ff7a2f" stroke={INK} strokeWidth="3" strokeLinejoin="round">
            <animate
              attributeName="d"
              dur={isTalking ? '0.3s' : '1.4s'}
              repeatCount="indefinite"
              values="M 100 -6 C 110 6, 112 12, 100 20 C 88 12, 90 6, 100 -6 Z; M 103 -9 C 113 4, 110 13, 100 20 C 89 13, 87 4, 103 -9 Z; M 100 -6 C 110 6, 112 12, 100 20 C 88 12, 90 6, 100 -6 Z"
            />
          </path>
          <path d="M 100 4 C 104 9, 104 12, 100 16 C 96 12, 96 9, 100 4 Z" fill="#ffd36b" />

          {/* CRT head */}
          {[46, 154].map((x) => (
            <g key={x}>
              <circle cx={x} cy="62" r="10" fill="#f4c84a" stroke={INK} strokeWidth="3" />
              <circle cx={x} cy="62" r="5" fill="#5ef0ff" stroke={INK} strokeWidth="2" filter={`url(#${uid("pix-glow")})`} />
            </g>
          ))}
          <rect x="50" y="28" width="100" height="72" rx="16" fill={`url(#${uid("ig-case")})`} stroke={INK} strokeWidth="3.5" />
          <rect x="62" y="38" width="76" height="54" rx="10" fill="#1b2632" stroke={INK} strokeWidth="3" />
          {[44, 50, 56, 62, 68, 74, 80, 86].map((y) => (
            <path key={y} d={`M 66 ${y} L 134 ${y}`} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="2" />
          ))}
          <path d="M 68 44 Q 72 41 80 41" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="142" cy="92" r="3" fill="#7fe08f" stroke={INK} strokeWidth="1.5" />

          <g filter={`url(#${uid("pix-glow")})`}>
            {FACES[mood]}
            {isTalking ? (
              <rect x="91" y="78" width="18" height="6" rx="3" fill={PIX}>
                <animate attributeName="height" values="3;10;4;8;3" dur="0.36s" repeatCount="indefinite" />
                <animate attributeName="y" values="80;76;79;77;80" dur="0.36s" repeatCount="indefinite" />
              </rect>
            ) : (
              <path d={MOUTHS[mood]} stroke={PIX} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill={mood === 'hyped' ? PIX : 'none'} />
            )}
          </g>

          {/* Blink: a screen-colored lid sweeps over the eyes now and then */}
          {mood !== 'panic' && (
            <rect x="72" y="48" width="56" height="0" fill="#1b2632">
              <animate attributeName="height" values="0;0;24;0" keyTimes="0;0.93;0.965;1" dur="4.5s" repeatCount="indefinite" />
            </rect>
          )}
        </svg>
      </motion.div>
    </div>
  );
});
