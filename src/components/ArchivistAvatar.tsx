import { memo } from 'react';
import { motion } from 'motion/react';

const INK = '#241913';
/** The four forces orbit the Archive's crystal, in their canon order. */
const FORCES = ['var(--color-logos)', 'var(--color-mythos)', 'var(--color-gnosis)', 'var(--color-phantasia)'];

/**
 * The Narrator-Archivist of the iFairy world: an open book of light with a memory crystal
 * above it and the four forces circling. Talking makes the pages glow and the orbit quicken.
 */
export const ArchivistAvatar = memo(function ArchivistAvatar({ isTalking = false, size = 120 }: { isTalking?: boolean; size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="The Narrator-Archivist"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      className="overflow-visible drop-shadow-[0_10px_18px_rgba(0,0,0,0.35)]"
    >
      <defs>
        <radialGradient id="archivist-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#fff6dc" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff6dc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <motion.circle cx="100" cy="92" r="78" fill="url(#archivist-glow)" animate={{ opacity: isTalking ? [0.5, 1, 0.5] : 0.45 }} transition={{ duration: 1.2, repeat: Infinity }} />

      {/* The four forces on their orbit; they pulse in turn while the Archivist speaks. */}
      <ellipse cx="100" cy="92" rx="74" ry="26" fill="none" stroke="#fbefd955" strokeWidth="2" strokeDasharray="4 6" />
      {FORCES.map((c, i) => {
        const a = (i / FORCES.length) * Math.PI * 2 + Math.PI / 4;
        return (
          <motion.circle
            key={c}
            cx={100 + Math.cos(a) * 74}
            cy={92 + Math.sin(a) * 26}
            r="8"
            fill={c}
            stroke={INK}
            strokeWidth="3"
            animate={{ scale: isTalking ? [1, 1.35, 1] : [1, 1.1, 1] }}
            transition={{ duration: isTalking ? 0.8 : 3, repeat: Infinity, delay: i * (isTalking ? 0.2 : 0.75) }}
          />
        );
      })}

      {/* Memory crystal */}
      <motion.path
        d="M100 30 L118 56 L100 84 L82 56 Z"
        fill="#9ad7e3"
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
        animate={{ y: [0, -4, 0], filter: isTalking ? ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] : 'brightness(1)' }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
      <path d="M100 30 L100 84 M82 56 L118 56" stroke="#ffffffaa" strokeWidth="2" />

      {/* Open book */}
      <path d="M30 118 Q65 102 100 120 Q135 102 170 118 L170 166 Q135 150 100 168 Q65 150 30 166 Z" fill="#fdf5e4" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M100 120 L100 168" stroke={INK} strokeWidth="4" />
      {[0, 1, 2].map((i) => (
        <motion.g key={i} animate={{ opacity: isTalking ? [0.35, 1, 0.35] : 0.6 }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}>
          <path d={`M44 ${130 + i * 10} Q65 ${122 + i * 10} 88 ${132 + i * 10}`} stroke="#d99a12" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={`M112 ${132 + i * 10} Q135 ${122 + i * 10} 156 ${130 + i * 10}`} stroke="#3f8fd8" strokeWidth="3" fill="none" strokeLinecap="round" />
        </motion.g>
      ))}
    </motion.svg>
  );
});
