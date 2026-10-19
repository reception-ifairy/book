import { useMemo } from 'react';

/** Embers drifting upward. Pseudo-random but stable per mount so they don't jump on re-render. */
export function EmberSparks({ count = 8, height = 110, className = '' }: { count?: number; height?: number; className?: string }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: `${10 + ((i * 37) % 80)}%`,
        drift: `${((i * 53) % 40) - 20}px`,
        delay: `${(i * 0.47) % 3}s`,
        d: `${2.4 + ((i * 0.31) % 1.6)}s`,
        s: `${2 + (i % 3)}px`,
      })),
    [count],
  );
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-visible ${className}`}>
      {sparks.map((s, i) => (
        <span
          key={i}
          className="ember-spark"
          style={{ ['--x' as string]: s.x, ['--drift' as string]: s.drift, ['--delay' as string]: s.delay, ['--d' as string]: s.d, ['--s' as string]: s.s, ['--h' as string]: `${height}px` }}
        />
      ))}
    </div>
  );
}

export const Equalizer = () => (
  <span className="eq" aria-hidden>
    <span />
    <span />
    <span />
  </span>
);

/** Two counter-rotating rune rings: the "rendering" state for illustrations. */
export function RuneLoader({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="drop-shadow-[0_0_12px_#ff7a2f88]">
      <g className="spin-slow" style={{ transformOrigin: '50px 50px' }}>
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--color-ember)" strokeWidth="1.5" strokeDasharray="2 6 14 6" opacity="0.9" />
      </g>
      <g className="spin-rev" style={{ transformOrigin: '50px 50px' }}>
        <circle cx="50" cy="50" r="32" fill="none" stroke="#ffc27a" strokeWidth="1" strokeDasharray="20 10 4 10" opacity="0.7" />
        {[0, 72, 144, 216, 288].map((a) => (
          <rect key={a} x="48.5" y="14" width="3" height="7" rx="1" fill="var(--color-ember)" transform={`rotate(${a} 50 50)`} />
        ))}
      </g>
      <circle cx="50" cy="50" r="5" fill="var(--color-ember)">
        <animate attributeName="r" values="4;7;4" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/** A slapstick impact: an inked starburst with a word on it, plus flying stars and candy bits. Pure CSS animation. */
export function ComicBurst({ x, y, word, color, size = 120, debris = true, delay = 0 }: { x: number | string; y: number | string; word: string; color: string; size?: number; debris?: boolean; delay?: number }) {
  const points = useMemo(() => {
    const n = 14;
    return Array.from({ length: n * 2 }, (_, i) => {
      const r = i % 2 ? 30 : 48 - ((i * 7) % 3) * 3;
      const a = (i / (n * 2)) * Math.PI * 2;
      return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`;
    }).join(' ');
  }, []);
  const bits = useMemo(
    () =>
      Array.from({ length: debris ? 10 : 0 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        const d = size * (0.7 + (i % 3) * 0.25);
        return { dx: Math.cos(a) * d, dy: Math.sin(a) * d - 20, rot: (i % 2 ? 1 : -1) * (180 + i * 30), kind: i % 3 };
      }),
    [debris, size],
  );
  return (
    <span aria-hidden className="pointer-events-none absolute z-30" style={{ left: x, top: y }}>
      <span className="comic-pop absolute" style={{ left: -size / 2, top: -size / 2, width: size, height: size, animationDelay: `${delay}s` }}>
        <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible' }}>
          <polygon points={points} style={{ fill: color }} stroke="#241913" strokeWidth="4" strokeLinejoin="round" />
          <polygon points={points} fill="#fff7c9" transform="translate(50 50) scale(0.62) translate(-50 -50)" />
          <text x="50" y="58" textAnchor="middle" fontFamily="Bangers, sans-serif" fontSize="22" style={{ fill: color }} stroke="#241913" strokeWidth="3" paintOrder="stroke" transform="rotate(-8 50 50)">
            {word}
          </text>
        </svg>
      </span>
      {bits.map((b, i) => (
        <span
          key={i}
          className="comic-bit absolute text-lg"
          style={{ left: -9, top: -12, animationDelay: `${delay}s`, ['--dx' as string]: `${b.dx}px`, ['--dy' as string]: `${b.dy}px`, ['--rot' as string]: `${b.rot}deg` }}
        >
          {b.kind === 0 ? '⭐' : b.kind === 1 ? '✨' : '🍬'}
        </span>
      ))}
    </span>
  );
}

const BULB_COLORS = ['#ff4d4d', '#f4c84a', '#4cd47a', '#4fb4ff', '#ff8ad8'];

/** A sagging garland of fairy lights that twinkle out of step. */
export function StringLights({ count = 18, className = '' }: { count?: number; className?: string }) {
  const bulbs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const t = (i + 0.5) / count;
        // Two shallow swags across the width.
        const sag = Math.sin(t * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
        return { x: t * 100, y: 4 + sag * 16, color: BULB_COLORS[i % BULB_COLORS.length], delay: (i * 0.37) % 2.4 };
      }),
    [count],
  );
  const wire = bulbs.map((b, i) => `${i ? 'L' : 'M'} ${b.x} ${b.y - 3}`).join(' ');
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-8 ${className}`}>
      <svg viewBox="0 0 100 26" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <path d={`M 0 2 ${wire} L 100 2`} fill="none" stroke="#1a120d" strokeWidth="0.5" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2 }} />
      </svg>
      {bulbs.map((b, i) => (
        <span
          key={i}
          className="bulb absolute"
          style={{ left: `${b.x}%`, top: `${(b.y / 26) * 100}%`, ['--c' as string]: b.color, animationDelay: `${b.delay}s` }}
        />
      ))}
    </div>
  );
}

/** Gentle snowfall over the whole window. Pure CSS; positions are stable per mount. */
export function Snow({ count = 40 }: { count?: number }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (i * 61) % 100,
        size: 2 + (i % 4),
        dur: 9 + ((i * 7) % 9),
        delay: -((i * 1.7) % 18),
        drift: ((i * 13) % 60) - 30,
        o: 0.35 + ((i * 3) % 5) / 10,
      })),
    [count],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[2] overflow-hidden">
      {flakes.map((f, i) => (
        <span
          key={i}
          className="flake"
          style={{
            left: `${f.x}%`,
            width: f.size,
            height: f.size,
            opacity: f.o,
            animationDuration: `${f.dur}s`,
            animationDelay: `${f.delay}s`,
            ['--drift' as string]: `${f.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
