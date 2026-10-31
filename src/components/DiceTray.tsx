import { motion } from 'motion/react';
import { BAND_LABEL, type RollRecord } from '../../shared/gm';
import { KIND } from '../meta';
import { Badge, cx } from '../ui';

const BAND_TONE = { bright: 'ok', but: 'warn', twist: 'ember' } as const;
/** Pip positions on a 3×3 grid for each face. */
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function Die({ value, color, delay }: { value: number; color: string; delay: number }) {
  return (
    <motion.span
      className="grid grid-cols-3 grid-rows-3 gap-[3px] w-10 h-10 p-[6px] rounded-lg border-[2.5px] border-outline bg-[#fffaf0] shadow-[0_3px_0_var(--color-outline)]"
      initial={{ rotate: -200, scale: 0.4, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 14, delay }}
      aria-label={`die showing ${value}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={cx('rounded-full', PIPS[value]?.includes(i) && 'shadow-[inset_0_-1px_0_#0003]')} style={PIPS[value]?.includes(i) ? { background: color } : undefined} />
      ))}
    </motion.span>
  );
}

/** This page's rolls: the dice, what modified them, the band, and the outcome the rules applied. */
export function DiceTray({ rolls, commit }: { rolls: RollRecord[]; commit?: string }) {
  if (!rolls.length) return null;
  return (
    <div className="card p-4 space-y-4">
      <div className="eyebrow">🎲 Dice</div>
      {rolls.map((r, n) => {
        const color = KIND[r.approach].color;
        return (
          <div key={r.id} className="space-y-2">
            <div className="flex items-center gap-3">
              <Die value={r.dice[0]} color={color} delay={n * 0.2} />
              <Die value={r.dice[1]} color={color} delay={n * 0.2 + 0.08} />
              <div className="min-w-0 flex-1">
                <div className="font-serif font-bold leading-tight">
                  {r.total} <span className="text-xs font-sans font-semibold text-muted">= {r.dice[0]} + {r.dice[1]} {r.mods.map((m) => `${m.value >= 0 ? '+' : '−'} ${Math.abs(m.value)}`).join(' ')}</span>
                </div>
                <div className="text-xs text-faint truncate" title={r.mods.map((m) => `${m.label} ${m.value >= 0 ? '+' : ''}${m.value}`).join(', ')}>
                  <span style={{ color }} className="font-bold uppercase">{r.approach}</span> · {r.intent}
                </div>
              </div>
              <Badge tone={BAND_TONE[r.band]}>{r.surge ? 'Surge!' : BAND_LABEL[r.band]}</Badge>
            </div>
            {r.chosen.length > 0 && (
              <ul className="text-xs text-muted space-y-0.5 pl-1">
                {r.options.filter((o) => r.chosen.includes(o.id)).map((o) => (
                  <li key={o.id}>{o.kind === 'cost' ? '−' : o.kind === 'move' ? '↯' : '+'} {o.label}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {commit && (
        <p className="text-[11px] text-faint" title="The dice come from a secret seed fixed when the story began. Its fingerprint is shown here, so the rolls can be checked afterwards.">
          Fair dice · seed fingerprint <span className="font-mono">{commit.slice(0, 12)}…</span>
        </p>
      )}
    </div>
  );
}
