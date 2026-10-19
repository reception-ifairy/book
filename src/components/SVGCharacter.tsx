import { memo, type ReactNode } from 'react';
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

/** IGNIS: a flying grimoire-robot with a CRT face, fairy wings and an ember for an antenna. */
export const SVGCharacter = memo(({ isTalking, mood = 'neutral', size = 160, sparks = size >= 100 }: { isTalking: boolean; mood?: Mood; size?: number; sparks?: boolean }) => {
  const flap = isTalking ? '0.28s' : '0.6s';
  return (
    <div className="relative floating" style={{ width: size, height: size }} role="img" aria-label={`IGNIS looks ${mood}`}>
      {sparks && <EmberSparks key={isTalking ? 'busy' : 'calm'} count={isTalking ? 12 : 6} height={size * 0.75} />}
      <motion.div key={mood} initial={{ scale: 0.86, rotate: -8, y: 6 }} animate={{ scale: 1, rotate: 0, y: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 10 }}>
        <svg viewBox="0 0 200 200" width={size} height={size} xmlns="http://www.w3.org/2000/svg" overflow="visible">
          <defs>
            <filter id="pix-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.8" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="ig-halo">
              <stop offset="0%" stopColor="#ffb347" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="ig-wing" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffe58a" />
              <stop offset="100%" stopColor="#f4b63a" />
            </linearGradient>
            <linearGradient id="ig-cover" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c4513a" />
              <stop offset="100%" stopColor="#933524" />
            </linearGradient>
            <linearGradient id="ig-case" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#9fb3c4" />
              <stop offset="100%" stopColor="#6f8599" />
            </linearGradient>
          </defs>

          <circle cx="100" cy="105" r="95" fill="url(#ig-halo)" />

          {/* Fairy wings, flapping from the shoulders */}
          {[
            { side: -1, ox: 66 },
            { side: 1, ox: 134 },
          ].map(({ side, ox }) => (
            <g key={side} opacity="0.95">
              <g>
                <path
                  d={`M ${ox} 112 C ${ox + side * 30} 70, ${ox + side * 66} 74, ${ox + side * 58} 104 C ${ox + side * 52} 120, ${ox + side * 30} 120, ${ox} 116 Z`}
                  fill="url(#ig-wing)"
                  stroke={INK}
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                <path
                  d={`M ${ox} 120 C ${ox + side * 28} 124, ${ox + side * 48} 140, ${ox + side * 36} 154 C ${ox + side * 24} 160, ${ox + side * 10} 140, ${ox} 124 Z`}
                  fill="url(#ig-wing)"
                  stroke={INK}
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                <path d={`M ${ox + side * 6} 112 Q ${ox + side * 32} 94 ${ox + side * 50} 96`} stroke="#c98a1f" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d={`M ${ox + side * 4} 124 Q ${ox + side * 18} 134 ${ox + side * 30} 148`} stroke="#c98a1f" strokeWidth="2" fill="none" strokeLinecap="round" />
                {/* translate(ox·(1−s)) then scale(s): the wing folds toward its shoulder joint at x = ox. */}
                <animateTransform attributeName="transform" type="translate" additive="sum" values={`0 0; ${ox * 0.45} 0; 0 0`} dur={flap} repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="scale" additive="sum" values="1 1; 0.55 1; 1 1" dur={flap} repeatCount="indefinite" />
              </g>
            </g>
          ))}

          {/* Little legs */}
          <g stroke={INK} strokeWidth="3.5" strokeLinecap="round">
            <path d="M 86 170 L 84 184" />
            <path d="M 114 170 L 116 184" />
          </g>
          <ellipse cx="82" cy="187" rx="9" ry="5" fill="#6f8599" stroke={INK} strokeWidth="3" />
          <ellipse cx="118" cy="187" rx="9" ry="5" fill="#6f8599" stroke={INK} strokeWidth="3" />

          {/* Arms; the right one waves while talking */}
          <path d="M 62 128 Q 46 136 44 150" stroke={INK} strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M 62 128 Q 46 136 44 150" stroke="#8ea3b6" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="44" cy="152" r="6" fill="#8ea3b6" stroke={INK} strokeWidth="3" />
          <g>
            <path d="M 138 128 Q 154 132 158 118" stroke={INK} strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M 138 128 Q 154 132 158 118" stroke="#8ea3b6" strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="158" cy="115" r="6" fill="#8ea3b6" stroke={INK} strokeWidth="3" />
            {isTalking && <animateTransform attributeName="transform" type="rotate" values="0 138 128; -18 138 128; 6 138 128; 0 138 128" dur="0.7s" repeatCount="indefinite" />}
          </g>

          {/* Book body: leather cover, gold corners, cream page edges */}
          <rect x="60" y="96" width="80" height="78" rx="8" fill="#fbefd0" stroke={INK} strokeWidth="3.5" />
          {[104, 110, 116, 122, 128, 134, 140, 146, 152, 158, 164].map((y) => (
            <path key={y} d={`M 128 ${y} L 137 ${y}`} stroke="#d4b98a" strokeWidth="1.5" />
          ))}
          <rect x="58" y="94" width="72" height="82" rx="8" fill="url(#ig-cover)" stroke={INK} strokeWidth="3.5" />
          <rect x="58" y="94" width="13" height="82" rx="6" fill="#7a2a1b" stroke={INK} strokeWidth="3.5" />
          <path d="M 64 104 L 64 166" stroke="#f4c84a" strokeWidth="2" strokeDasharray="4 5" />
          <path d="M 116 94 L 130 94 L 130 108 Z" fill="#f4c84a" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M 116 176 L 130 176 L 130 162 Z" fill="#f4c84a" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          {/* Rune emblem on the cover */}
          <circle cx="100" cy="135" r="13" fill="none" stroke="#f4c84a" strokeWidth="2.5" />
          <path d="M 100 125 L 100 145 M 92 131 L 108 139 M 108 131 L 92 139" stroke="#f4c84a" strokeWidth="2" strokeLinecap="round" />

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
          <rect x="50" y="28" width="100" height="72" rx="16" fill="url(#ig-case)" stroke={INK} strokeWidth="3.5" />
          <rect x="62" y="38" width="76" height="54" rx="10" fill="#1b2632" stroke={INK} strokeWidth="3" />
          {[44, 50, 56, 62, 68, 74, 80, 86].map((y) => (
            <path key={y} d={`M 66 ${y} L 134 ${y}`} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="2" />
          ))}
          <path d="M 68 44 Q 72 41 80 41" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="142" cy="92" r="3" fill="#7fe08f" stroke={INK} strokeWidth="1.5" />

          <g filter="url(#pix-glow)">
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
