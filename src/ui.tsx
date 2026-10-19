import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, CheckCircle2, AlertTriangle, Snowflake } from 'lucide-react';
import { setSnow, useSnow } from './prefs';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/*
 * Cartoon controls: a bold ink outline, a hard drop shadow, and a "press" that sinks the button
 * into its shadow. Shared by every screen.
 */
const PRESS = 'border-[2.5px] border-outline shadow-[0_4px_0_var(--color-outline)] hover:-translate-y-0.5 hover:shadow-[0_6px_0_var(--color-outline)] active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-outline)]';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: `btn-shine bg-ember text-outline ${PRESS}`,
  secondary: `bg-[#fff6e2] text-outline ${PRESS}`,
  ghost: 'text-muted hover:text-ink hover:bg-raised',
  danger: `bg-[#ffe1db] text-candy ${PRESS}`,
};

export function Button({ variant = 'secondary', size = 'md', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-serif font-semibold transition-all duration-150 disabled:opacity-45 disabled:pointer-events-none',
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-10 px-4 text-[15px]',
        size === 'lg' && 'h-12 px-6 text-base',
        VARIANTS[variant],
        className,
      )}
    />
  );
}

export function IconButton({ label, active, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cx(
        'group relative inline-flex items-center justify-center h-9 min-w-9 px-2 gap-1.5 rounded-xl text-sm transition-all disabled:opacity-40 active:scale-90',
        active
          ? 'glow-on bg-gold text-outline border-2 border-outline shadow-[0_3px_0_var(--color-outline),0_0_22px_-2px_var(--color-gold)]'
          : 'text-muted hover:text-gold hover:bg-raised border-2 border-transparent',
        className,
      )}
    >
      <span className="glow-icon inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
}

export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="kbd">{children}</kbd>;

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'ember'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-[#fff6e2] text-[#2b211c]',
    ok: 'bg-[#cdeccf] text-[#1f5a33]',
    warn: 'bg-[#ffe9a8] text-[#6b4a00]',
    danger: 'bg-[#ffd3cc] text-[#8a1f19]',
    ember: 'bg-[#ffd2b3] text-[#7a2f08]',
  };
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border-2 border-outline px-2.5 py-0.5 text-xs font-bold shadow-[0_2px_0_var(--color-outline)]', tones[tone])}>
      {children}
    </span>
  );
}

/** A chunky "battery" bar. `center` draws a diverging bar for values like karma. Changes pop out as comic tags. */
export function Meter({ label, value, min = 0, max = 100, color, center }: { label: string; value: number; min?: number; max?: number; color: string; center?: boolean }) {
  const pct = ((value - min) / (max - min)) * 100;
  const mid = center ? 50 : 0;
  const left = Math.min(pct, mid);
  const width = Math.abs(pct - mid);
  const prev = useRef(value);
  const [deltas, setDeltas] = useState<{ id: number; d: number }[]>([]);
  useEffect(() => {
    const d = value - prev.current;
    prev.current = value;
    if (!d) return;
    const id = Date.now() + Math.random();
    setDeltas((x) => [...x, { id, d }]);
    // Each delta removes itself; not cleared on the next change so rapid changes all float away.
    setTimeout(() => setDeltas((x) => x.filter((y) => y.id !== id)), 1700);
  }, [value]);
  const flashing = deltas.length > 0;
  return (
    <div className="relative min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <motion.span
          key={value}
          initial={{ scale: flashing ? 1.6 : 1 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 12 }}
          className="font-serif font-bold text-sm tabular-nums text-ink"
        >
          {value}
        </motion.span>
      </div>
      <div className="relative h-2.5 mt-1 rounded-full border-2 border-outline bg-[#00000040] overflow-hidden">
        {center && <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-outline" />}
        <motion.div
          className="absolute top-0 bottom-0"
          style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${color} 70%, white), ${color})`, boxShadow: flashing ? `0 0 12px ${color}` : undefined }}
          initial={false}
          animate={{ left: `${left}%`, width: `${width}%` }}
          transition={{ type: 'spring', stiffness: 140, damping: 16 }}
        />
      </div>
      <AnimatePresence>
        {deltas.map(({ id, d }) => (
          <motion.span
            key={id}
            className="comic absolute right-6 -top-2 text-base pointer-events-none z-10"
            style={{ color }}
            initial={{ opacity: 0, scale: 0.3, rotate: -20 }}
            animate={{ opacity: 1, scale: 1.15, rotate: -6 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 14 }}
          >
            {d > 0 ? `+${d}` : `−${Math.abs(d)}`}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function StatusDot({ tone }: { tone: 'ok' | 'danger' | 'idle' }) {
  const bg = tone === 'ok' ? 'bg-ok shadow-[0_0_8px_var(--color-ok)]' : tone === 'danger' ? 'bg-danger shadow-[0_0_8px_var(--color-danger)]' : 'bg-faint';
  return <span className={cx('inline-block w-2 h-2 rounded-full shrink-0', bg, tone !== 'idle' && 'dot-live')} />;
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex p-1 rounded-xl bg-raised border-[2.5px] border-outline">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('relative h-8 px-3.5 text-sm font-serif font-semibold rounded-lg transition-colors', value === o.value ? 'text-outline' : 'text-muted hover:text-ink')}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${label}`}
              className="absolute inset-0 rounded-lg bg-gold border-2 border-outline shadow-[0_2px_0_var(--color-outline)]"
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Right-hand drawer; full-width on phones. Closes on Escape and backdrop click. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-[#1a100bcc] backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-label={title}
            className="paper fixed z-50 top-0 right-0 bottom-0 w-full sm:w-[440px] bg-surface border-l-[3px] border-outline flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <header className="flex items-center justify-between px-5 h-16 border-b-[3px] border-outline bg-raised">
              <h2 className="font-serif text-xl font-semibold">{title}</h2>
              <IconButton label="Close" onClick={onClose}><X size={20} /></IconButton>
            </header>
            <div className="flex-1 overflow-y-auto scroll-thin p-5">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

type Toast = { id: number; tone: 'ok' | 'error'; text: string };
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed z-[60] top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 flex flex-col gap-3 w-[min(92vw,380px)]" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.8, rotate: -3 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, x: 40, rotate: 4 }}
              transition={{ type: 'spring', stiffness: 380, damping: 20 }}
              className="card flex items-start gap-3 px-4 py-3 text-sm font-semibold"
            >
              {t.tone === 'ok' ? <CheckCircle2 size={20} className="text-ok shrink-0" /> : <AlertTriangle size={20} className="text-candy shrink-0" />}
              <span className="min-w-0 break-words">{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/** A tiny pixel-screen face, the same language as IGNIS. */
export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <a href="#/" onClick={onClick} className="flex items-center gap-2.5 group">
      <span className="relative grid place-items-center w-10 h-9 rounded-lg bg-screen border-[2.5px] border-outline shadow-[0_3px_0_var(--color-outline)] transition-transform group-hover:-rotate-6 group-hover:scale-105">
        <span className="font-pixel text-pixel text-sm leading-none [text-shadow:0_0_6px_var(--color-pixel)] group-hover:hidden">^‿^</span>
        <span className="font-pixel text-gold text-sm leading-none [text-shadow:0_0_6px_var(--color-gold)] hidden group-hover:inline">&gt;‿&lt;</span>
      </span>
      <span className="leading-none">
        <span className="block font-serif font-bold text-lg tracking-tight">Grimm Protocol</span>
        <span className="block font-pixel text-[11px] text-faint mt-0.5">IGNIS // OS</span>
      </span>
    </a>
  );
}

export { cx };

export function SnowToggle() {
  const on = useSnow();
  return (
    <IconButton label={on ? 'Stop the snow' : 'Let it snow'} active={on} onClick={() => setSnow(!on)}>
      <Snowflake size={18} className={on ? 'spin-slow' : ''} />
    </IconButton>
  );
}
