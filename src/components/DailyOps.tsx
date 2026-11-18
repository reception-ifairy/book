import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Zap } from 'lucide-react';
import { api, loadRuns } from '../api';
import { questProgress, type DailyBoard, type QuestProgress } from '../../shared/daily';
import type { Story } from '../../shared/types';

const DEFAULT_BRIEFING = 'Agent, today’s anomalies are on the board. I have prepared coffee. I cannot drink coffee. It is a symbolic coffee.';

/**
 * Today's board on the home page: IGNIS's briefing, the glitch of the day and the daily quests with progress
 * worked out from this browser's cases (only pages written today count). Hidden when the Bureau has no board.
 */
export function DailyOps() {
  const [board, setBoard] = useState<DailyBoard | null>(null);
  const [progress, setProgress] = useState<Record<string, QuestProgress>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const b = await api.daily().catch(() => null);
      if (!alive || !b) return;
      setBoard(b);
      // Only cases touched today can move today's quests; a handful is plenty.
      const runs = loadRuns().filter((r) => r.updatedAt >= b.startsAt).slice(0, 8);
      const stories = (await Promise.all(runs.map((r) => api.story(r.id).catch(() => null)))).filter((s): s is Story => !!s);
      if (!alive) return;
      setProgress(Object.fromEntries(b.quests.map((q) => [q.slug, questProgress(q, stories, b)])));
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!board || (!board.quests.length && !board.glitch)) return null;
  const earned = board.quests.reduce((n, q) => n + (progress[q.slug]?.done ? q.reward_xp : 0), 0);
  const total = board.quests.reduce((n, q) => n + q.reward_xp, 0);

  return (
    <section className="pb-12">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="toon-title text-3xl sm:text-4xl text-ink">Daily ops</h2>
        <span className="eyebrow">{board.day} · {earned}/{total} XP today</span>
      </div>
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4">
        <div className="card p-5 flex flex-col gap-4">
          <div>
            <span className="eyebrow">IGNIS · morning briefing</span>
            <p className="mt-1.5 font-semibold">“{board.briefing || DEFAULT_BRIEFING}”</p>
          </div>
          {board.glitch && (
            <div className="rounded-xl border-[2.5px] border-outline bg-screen text-pixel p-4 shadow-[0_3px_0_var(--color-outline)]">
              <span className="font-pixel text-[11px] flex items-center gap-1.5"><Zap size={13} /> GLITCH OF THE DAY</span>
              <p className="mt-1.5 text-[15px] font-semibold text-[#d9fbff]">{board.glitch.text}</p>
            </div>
          )}
        </div>
        <ol className="card divide-y-2 divide-line overflow-hidden">
          {board.quests.map((q, i) => {
            const p = progress[q.slug];
            const pct = p ? Math.round((p.value / p.target) * 100) : 0;
            return (
              <motion.li key={q.slug} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="p-4 flex gap-3">
                {p?.done ? <CheckCircle2 size={22} className="text-ok shrink-0 mt-0.5" /> : <Circle size={22} className="text-faint shrink-0 mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-serif font-bold">{q.title}</h3>
                    <span className="font-pixel text-[11px] text-gold shrink-0">+{q.reward_xp} XP</span>
                  </div>
                  <p className="text-sm text-muted mt-0.5">{q.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="h-2 flex-1 rounded-full bg-line overflow-hidden">
                      <span className="block h-full rounded-full bg-gold transition-[width] duration-700" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="text-xs text-faint tabular-nums">{p ? `${p.value}/${p.target}` : '…'}</span>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
