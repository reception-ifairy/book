import { useMemo } from 'react';
import { motion } from 'motion/react';

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

/** A one-shot particle burst from a point. Re-key it to fire again. */
export function Burst({ x, y, color, count = 14, distance = 70 }: { x: number | string; y: number | string; color: string; count?: number; distance?: number }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + (i % 2) * 0.3;
        const r = distance * (0.55 + ((i * 7) % 5) / 10);
        return { dx: Math.cos(a) * r, dy: Math.sin(a) * r, size: 3 + (i % 3) * 2 };
      }),
    [count, distance],
  );
  return (
    <span aria-hidden className="pointer-events-none absolute z-20" style={{ left: x, top: y }}>
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, background: color, boxShadow: `0 0 8px 1px ${color}`, marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      <motion.span
        className="absolute rounded-full border-2"
        style={{ borderColor: color, width: 12, height: 12, marginLeft: -6, marginTop: -6 }}
        initial={{ scale: 0.4, opacity: 0.9 }}
        animate={{ scale: distance / 8, opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </span>
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
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="drop-shadow-[0_0_12px_#ff6b3d88]">
      <g className="spin-slow" style={{ transformOrigin: '50px 50px' }}>
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--color-ember)" strokeWidth="1.5" strokeDasharray="2 6 14 6" opacity="0.9" />
      </g>
      <g className="spin-rev" style={{ transformOrigin: '50px 50px' }}>
        <circle cx="50" cy="50" r="32" fill="none" stroke="#ffb08f" strokeWidth="1" strokeDasharray="20 10 4 10" opacity="0.7" />
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
