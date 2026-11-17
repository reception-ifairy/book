import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cx } from '../ui';

/**
 * A K20 as a cartoon icosahedron. With `rolling` it tumbles through random faces; when `value`
 * arrives it settles on it. 20 glows gold, 1 glows red.
 */
export function D20({ value, rolling = false, size = 72, className }: { value: number | null; rolling?: boolean; size?: number; className?: string }) {
  const [face, setFace] = useState<number>(value ?? 20);
  useEffect(() => {
    if (!rolling) {
      if (value !== null) setFace(value);
      return;
    }
    const t = setInterval(() => setFace(1 + Math.floor(Math.random() * 20)), 70);
    return () => clearInterval(t);
  }, [rolling, value]);
  const crit = !rolling && value === 20;
  const fumble = !rolling && value === 1;
  const fill = crit ? '#f4c84a' : fumble ? '#d8423b' : '#fdf5e4';
  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cx('shrink-0', className)}
      role="img"
      aria-label={rolling ? 'Rzut K20…' : `K20: ${face}`}
      animate={rolling ? { rotate: [0, 120, 240, 360] } : { rotate: 0, scale: [1.25, 1] }}
      transition={rolling ? { duration: 0.6, repeat: Infinity, ease: 'linear' } : { type: 'spring', stiffness: 300, damping: 12 }}
      style={{ filter: crit ? 'drop-shadow(0 0 10px #f4c84a)' : fumble ? 'drop-shadow(0 0 10px #d8423b)' : undefined }}
    >
      <polygon points="50,4 92,28 92,72 50,96 8,72 8,28" fill={fill} stroke="#241913" strokeWidth="4" strokeLinejoin="round" />
      <polygon points="50,22 76,64 24,64" fill="none" stroke="#241913" strokeWidth="2.5" strokeLinejoin="round" opacity="0.55" />
      <path d="M50 4 L50 22 M92 28 L76 64 M8 28 L24 64 M50 96 L24 64 M50 96 L76 64 M92 72 L76 64 M8 72 L24 64 M8 28 L50 22 M92 28 L50 22" stroke="#241913" strokeWidth="2" opacity="0.4" />
      <text x="50" y="56" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-comic)" fontSize={face >= 10 ? 26 : 30} fill="#241913">
        {face}
      </text>
    </motion.svg>
  );
}
