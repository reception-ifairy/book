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

/** IGNIS: a palm-sized cyber-magic robot with a CRT face, a brass-and-glass lantern body full of swirling magic, code-lattice wings, a hover ring and an ember antenna. */
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
            <linearGradient id={uid("ig-brass")} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#a8742a" />
              <stop offset="45%" stopColor="#f4c84a" />
              <stop offset="100%" stopColor="#9a6520" />
            </linearGradient>
            <radialGradient id={uid("ig-magic")} cx="50%" cy="55%" r="60%">
              <stop offset="0%" stopColor="#fff3c4" />
              <stop offset="35%" stopColor="#ff9a4a" />
              <stop offset="70%" stopColor="#b47cf0" />
              <stop offset="100%" stopColor="#3b4f8f" />
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

          {/* Hover base with a glowing ring instead of legs */}
          <ellipse cx="100" cy="186" rx="26" ry="7" fill="none" stroke="#5ef0ff" strokeWidth="3" filter={`url(#${uid("pix-glow")})`}>
            <animate attributeName="rx" values="24;28;24" dur={isTalking ? '0.5s' : '1.6s'} repeatCount="indefinite" />
          </ellipse>
          <path d="M 80 172 L 120 172 L 114 184 Q 100 190 86 184 Z" fill={`url(#${uid("ig-brass")})`} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M 94 178 L 100 172 L 106 178 L 100 184 Z" fill="#5ef0ff" stroke={INK} strokeWidth="1.5" />

          {/* Arms: dark joints, brass elbows, dark hands with a cyan glow; the right one holds the case file */}
          <path d="M 74 112 Q 56 118 50 104" stroke={INK} strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M 74 112 Q 56 118 50 104" stroke="#4d5763" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="60" cy="115" r="4.5" fill="#f4c84a" stroke={INK} strokeWidth="2" />
          <circle cx="50" cy="99" r="6.5" fill="#3a4350" stroke={INK} strokeWidth="3" />
          <path d="M 50 94 L 50 84" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          <path d="M 50 94 L 50 85" stroke="#3a4350" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="100" r="2.2" fill="#5ef0ff" filter={`url(#${uid("pix-glow")})`} />
          <g>
            <path d="M 126 112 Q 146 120 150 134" stroke={INK} strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M 126 112 Q 146 120 150 134" stroke="#4d5763" strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="140" cy="119" r="4.5" fill="#f4c84a" stroke={INK} strokeWidth="2" />
            {/* Holographic case file */}
            <g transform="rotate(8 160 136)">
              <rect x="146" y="114" width="30" height="40" rx="4" fill="#5ef0ff" fillOpacity="0.28" stroke="#5ef0ff" strokeWidth="2" filter={`url(#${uid("pix-glow")})`} />
              <rect x="155" y="111" width="12" height="6" rx="2" fill="#5ef0ff" fillOpacity="0.6" />
              {[124, 132, 140].map((y) => (
                <g key={y}>
                  <rect x="151" y={y - 3} width="5" height="5" fill="none" stroke="#d9fbff" strokeWidth="1.2" />
                  <path d={`M 159 ${y} L 171 ${y}`} stroke="#d9fbff" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              ))}
            </g>
            <circle cx="150" cy="137" r="6.5" fill="#3a4350" stroke={INK} strokeWidth="3" />
            {isTalking && <animateTransform attributeName="transform" type="rotate" values="0 126 112; -10 126 112; 4 126 112; 0 126 112" dur="0.7s" repeatCount="indefinite" />}
          </g>

          {/* Lantern body: brass frame, glass panes with swirling magic inside */}
          <rect x="72" y="104" width="56" height="66" rx="10" fill={`url(#${uid("ig-magic")})`} stroke={INK} strokeWidth="3.5" />
          <path d="M 100 120 C 112 122, 114 138, 102 142 C 92 145, 88 134, 96 131 C 102 129, 105 135, 100 137" stroke="#fff3c4" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" values="0 100 134; 360 100 134" dur={isTalking ? '1.2s' : '4s'} repeatCount="indefinite" />
          </path>
          {[
            [84, 118],
            [116, 126],
            [88, 156],
            [113, 152],
          ].map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M ${x} ${y - 4} L ${x + 3} ${y} L ${x} ${y + 4} L ${x - 3} ${y} Z`} fill="#ffe58a" />
          ))}
          <path d="M 86 104 L 86 170 M 114 104 L 114 170" stroke={`url(#${uid("ig-brass")})`} strokeWidth="5" />
          <path d="M 86 104 L 86 170 M 114 104 L 114 170" stroke={INK} strokeWidth="1.2" strokeOpacity="0.6" />
          <path d="M 76 110 Q 79 108 82 110" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Brass collar and base bands with cyan gems */}
          <rect x="66" y="98" width="68" height="12" rx="5" fill={`url(#${uid("ig-brass")})`} stroke={INK} strokeWidth="3" />
          <rect x="66" y="164" width="68" height="12" rx="5" fill={`url(#${uid("ig-brass")})`} stroke={INK} strokeWidth="3" />
          {[100, 80, 120].map((x) => (
            <path key={x} d={`M ${x} 100 L ${x + 4} 104 L ${x} 108 L ${x - 4} 104 Z`} fill="#5ef0ff" stroke={INK} strokeWidth="1.2" />
          ))}
          <path d="M 100 166 L 104 170 L 100 174 L 96 170 Z" fill="#5ef0ff" stroke={INK} strokeWidth="1.2" />
          {/* Orbiting ring of glyphs */}
          <ellipse cx="100" cy="150" rx="46" ry="9" fill="none" stroke="#5ef0ff" strokeWidth="2" strokeOpacity="0.85" strokeDasharray="6 5" filter={`url(#${uid("pix-glow")})`}>
            <animate attributeName="stroke-dashoffset" values="0;-44" dur={isTalking ? '1s' : '3s'} repeatCount="indefinite" />
          </ellipse>

          {/* Ember antenna on a brass cap with a gem */}
          <path d="M 100 30 L 100 16" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path d="M 86 30 Q 100 16 114 30 Z" fill={`url(#${uid("ig-brass")})`} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="100" cy="25" r="3.5" fill="#5ef0ff" stroke={INK} strokeWidth="1.5" />
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
