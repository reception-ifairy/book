import type { ReactNode } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { TaleCard } from '../api';
import { Badge } from '../ui';
import { coverStyle } from '../meta';
import { useArt } from '../artkit';
import type { Lang } from '../../shared/types';

/** A tale card that tilts toward the cursor, with a glowing rim and a floating emblem. */
export function TaleCover({ tale: t, badge, caseNo, cta = 'Open case', busyText = 'IGNIS is briefing you…', lang, index, booting, onStart, compact = false, extra }: { tale: TaleCard; badge: string; caseNo: string; cta?: string; busyText?: string; lang: Lang; index: number; booting: string | null; onStart: () => void; compact?: boolean; extra?: ReactNode }) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), { stiffness: 200, damping: 20 });
  const emblemX = useSpring(useTransform(px, [0, 1], [-10, 10]), { stiffness: 150, damping: 15 });
  const emblemY = useSpring(useTransform(py, [0, 1], [-8, 8]), { stiffness: 150, damping: 15 });
  const color = `hsl(${t.hue} 85% 62%)`;
  const art = useArt();
  const cover = art.src(`cover-${t.id}`);
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + index * 0.07, ease: [0.22, 1, 0.36, 1], duration: 0.6 }} style={{ perspective: 900 }}>
      <motion.button
        disabled={!!booting}
        onClick={onStart}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
        whileTap={{ scale: 0.98 }}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d', ['--spot' as string]: color }}
        className="spotlight group card snowcap w-full h-full text-left flex flex-col transition-shadow hover:shadow-[6px_9px_0_var(--color-outline),0_0_40px_-6px_var(--spot)] disabled:opacity-50"
      >
        <div className={`relative ${compact ? 'h-28' : 'h-40'} flex items-center justify-center overflow-hidden rounded-t-[17px] border-b-[3px] border-outline`} style={coverStyle(t.hue)}>
          {cover && (
            // Painted cover drifts against the tilt for a little depth.
            <motion.img src={cover} alt={art.alt(`cover-${t.id}`)} className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] max-w-none object-cover transition-transform duration-500 group-hover:scale-105" style={{ x: emblemX, y: emblemY }} />
          )}
          {!cover && <motion.span className="inline-block" style={{ x: emblemX, y: emblemY }}>
            <motion.span
              className={`inline-block ${compact ? 'text-6xl' : 'text-7xl'} drop-shadow-[3px_4px_0_#241913] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_24px_var(--spot)]`}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4 + index * 0.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {t.emoji}
            </motion.span>
          </motion.span>}
          <span className="absolute top-3 left-3">
            <Badge>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              {badge}
            </Badge>
          </span>
          <AnimatePresence>
            {booting === t.id && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm text-sm">
                <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin text-ember" /> {busyText}</span>
                <motion.span className="absolute bottom-0 left-0 h-0.5 bg-ember shadow-[0_0_10px_var(--color-ember)]" initial={{ width: '0%' }} animate={{ width: '92%' }} transition={{ duration: 12, ease: 'easeOut' }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="p-5 flex-1 flex flex-col">
          <span className="font-pixel text-[11px] text-faint">CASE FILE {caseNo}</span>
          <h3 className="font-serif font-bold text-xl leading-tight mt-1">{t.title[lang]}</h3>
          <p className={`mt-2 text-muted flex-1 ${compact ? 'text-sm' : 'text-[15px]'}`}>{t.tagline[lang]}</p>
          {extra}
          <span className="mt-4 self-start inline-flex items-center gap-1.5 rounded-xl border-[2.5px] border-outline bg-gold px-3 h-9 text-sm font-serif font-semibold text-outline shadow-[0_3px_0_var(--color-outline)] transition-transform group-hover:-rotate-2 group-hover:scale-105">
            {cta} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </motion.button>
    </motion.div>
  );
}
