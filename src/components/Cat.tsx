import { motion } from 'motion/react';
import type { CatMood } from '../../shared/types';

/**
 * The Deputy Director: a grey cat in a red tie. Eyes and ears follow the mood that Mrucz-Term
 * reports; the tail swishes while it is "talking".
 */
export function Cat({ mood = 'mruczy', size = 96, talking = false }: { mood?: CatMood; size?: number; talking?: boolean }) {
  const sleepy = mood === 'drzemie';
  const angry = mood === 'syczy' || mood === 'zniesmaczony';
  const wide = mood === 'zaciekawiony';
  const eyeH = sleepy ? 1 : wide ? 9 : 6;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`Kot, Zastępca Dyrektora (${mood})`}>
      {/* tail */}
      <motion.path
        d="M88 98 C112 96 112 70 100 62"
        fill="none"
        stroke="#241913"
        strokeWidth="11"
        strokeLinecap="round"
        animate={talking ? { rotate: [0, 8, -4, 0] } : { rotate: 0 }}
        transition={{ duration: 1.2, repeat: talking ? Infinity : 0 }}
        style={{ originX: '88px', originY: '98px' }}
      />
      <motion.path d="M88 98 C112 96 112 70 100 62" fill="none" stroke="#8d8a93" strokeWidth="6" strokeLinecap="round" animate={talking ? { rotate: [0, 8, -4, 0] } : { rotate: 0 }} transition={{ duration: 1.2, repeat: talking ? Infinity : 0 }} style={{ originX: '88px', originY: '98px' }} />
      {/* body */}
      <ellipse cx="60" cy="96" rx="32" ry="20" fill="#8d8a93" stroke="#241913" strokeWidth="3.5" />
      {/* ears */}
      <motion.g animate={{ rotate: angry ? -12 : 0 }} style={{ originX: '36px', originY: '40px' }}>
        <path d="M28 46 L34 16 L52 36 Z" fill="#8d8a93" stroke="#241913" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M33 38 L36 24 L45 35 Z" fill="#f2a9a0" />
      </motion.g>
      <motion.g animate={{ rotate: angry ? 12 : 0 }} style={{ originX: '84px', originY: '40px' }}>
        <path d="M92 46 L86 16 L68 36 Z" fill="#8d8a93" stroke="#241913" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M87 38 L84 24 L75 35 Z" fill="#f2a9a0" />
      </motion.g>
      {/* head */}
      <ellipse cx="60" cy="54" rx="34" ry="28" fill="#a29fa8" stroke="#241913" strokeWidth="3.5" />
      {/* eyes */}
      {[45, 75].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="52" rx="6.5" ry={eyeH} fill={sleepy ? '#241913' : '#f4c84a'} stroke="#241913" strokeWidth={sleepy ? 1.5 : 2} />
          {!sleepy && <ellipse cx={x} cy="52" rx={angry ? 1.2 : 2.2} ry={eyeH - 1} fill="#241913" />}
          {angry && <path d={`M${x - 8} ${x < 60 ? 42 : 46} L${x + 8} ${x < 60 ? 46 : 42}`} stroke="#241913" strokeWidth="3" strokeLinecap="round" />}
        </g>
      ))}
      {/* nose & mouth */}
      <path d="M56 62 L64 62 L60 66 Z" fill="#d8423b" stroke="#241913" strokeWidth="1.5" strokeLinejoin="round" />
      <motion.path
        d={mood === 'dumny' || mood === 'mruczy' ? 'M52 69 Q56 73 60 68 Q64 73 68 69' : angry ? 'M52 72 Q60 66 68 72' : 'M54 70 Q60 72 66 70'}
        fill="none"
        stroke="#241913"
        strokeWidth="2.5"
        strokeLinecap="round"
        animate={talking ? { scaleY: [1, 1.6, 1] } : { scaleY: 1 }}
        transition={{ duration: 0.4, repeat: talking ? Infinity : 0 }}
        style={{ originX: '60px', originY: '68px' }}
      />
      {/* whiskers */}
      <g stroke="#241913" strokeWidth="1.8" strokeLinecap="round">
        <path d="M30 62 L12 58 M30 66 L12 68 M90 62 L108 58 M90 66 L108 68" />
      </g>
      {/* tie */}
      <path d="M54 80 L66 80 L62 86 L68 108 L60 114 L52 108 L58 86 Z" fill="#d8423b" stroke="#241913" strokeWidth="3" strokeLinejoin="round" />
      {sleepy && (
        <motion.text x="92" y="28" className="font-comic" fontSize="16" fill="#9ad7e3" animate={{ y: [28, 18, 28], opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.4, repeat: Infinity }}>
          z
        </motion.text>
      )}
    </svg>
  );
}
