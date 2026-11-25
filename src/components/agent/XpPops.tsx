import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Award } from 'lucide-react';
import { onXp } from '../../agent';
import { ComicBurst } from '../Effects';
import { SVGCharacter } from '../SVGCharacter';
import { useArt } from '../../artkit';
import { Button } from '../../ui';
import type { RankInfo, XpGain } from '../../../shared/xp';

/**
 * Global "+XP" pops (bottom right, comic tags that float up) and the promotion card.
 * Mounted once in App; any screen triggers it through celebrate() in src/agent.ts.
 */
export function XpPops() {
  const [pops, setPops] = useState<(XpGain & { id: number })[]>([]);
  const [promotion, setPromotion] = useState<RankInfo | null>(null);
  const art = useArt();
  const heroArt = art.src('ignis-hero');

  useEffect(
    () =>
      onXp((u) => {
        const now = Date.now();
        const fresh = u.gained.map((g, i) => ({ ...g, id: now + i + Math.random() }));
        setPops((p) => [...p, ...fresh].slice(-6));
        for (const f of fresh) setTimeout(() => setPops((p) => p.filter((x) => x.id !== f.id)), 3200 + fresh.indexOf(f) * 250);
        if (u.rankUp) setTimeout(() => setPromotion(u.rank), 900);
      }),
    [],
  );

  return (
    <>
      <div className="fixed z-[55] bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-none" aria-live="polite">
        <AnimatePresence>
          {pops.map((p, i) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.3, rotate: -12, y: 20 }}
              animate={{ opacity: 1, scale: 1, rotate: i % 2 ? 2 : -3, y: 0, transition: { type: 'spring', stiffness: 420, damping: 15, delay: i * 0.08 } }}
              exit={{ opacity: 0, y: -24, scale: 0.8 }}
              className="card flex items-center gap-2.5 pl-2.5 pr-4 py-2"
            >
              <span className="comic text-2xl text-gold leading-none">+{p.amount}</span>
              <span className="text-sm font-semibold max-w-[16rem] truncate">{p.label}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {promotion && (
          <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-[#0a0612cc] backdrop-blur-sm p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPromotion(null)}>
            <motion.div
              role="dialog"
              aria-label="Promotion"
              className="card relative w-full max-w-sm p-6 text-center overflow-visible"
              initial={{ scale: 0.5, rotate: -6, y: 40 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ComicBurst x="50%" y="18%" color="var(--color-gold)" word="PROMOTED!" size={200} delay={0.2} />
              <div className="relative grid place-items-center mt-2">
                {heroArt ? <img src={heroArt} alt="" className="w-28 h-28 object-contain floating" /> : <SVGCharacter isTalking mood="hyped" size={110} />}
              </div>
              <span className="eyebrow mt-3 inline-flex items-center gap-1.5"><Award size={14} className="text-gold" /> New rank · level {promotion.level}</span>
              <h2 className="toon-title text-3xl text-gold mt-1">{promotion.title}</h2>
              <p className="text-sm text-muted mt-2">
                IGNIS has printed you a new badge. It is slightly crooked. That is called “character”.
                {promotion.nextTitle && <> Next up: <b className="text-ink">{promotion.nextTitle}</b> at {promotion.next} XP.</>}
              </p>
              <Button variant="primary" className="mt-5" onClick={() => setPromotion(null)}>Carry on, {promotion.title}</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
