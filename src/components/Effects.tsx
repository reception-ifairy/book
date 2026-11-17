import { useMemo } from 'react';

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
