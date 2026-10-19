import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, CheckCircle2, AlertTriangle } from 'lucide-react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'btn-shine bg-ember text-bg hover:brightness-110 shadow-[0_8px_24px_-12px_var(--color-ember)] hover:shadow-[0_10px_32px_-8px_var(--color-ember)]',
  secondary: 'bg-raised text-ink border border-line hover:border-line-strong',
  ghost: 'text-muted hover:text-ink hover:bg-raised',
  danger: 'text-danger border border-line hover:border-danger',
};

export function Button({ variant = 'secondary', size = 'md', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm',
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
        'group relative inline-flex items-center justify-center h-9 min-w-9 px-2 gap-1.5 rounded-lg text-sm transition-all disabled:opacity-40 active:scale-90',
        active ? 'glow-on bg-ember-soft text-ember shadow-[inset_0_0_0_1px_#ff6b3d55,0_0_18px_-4px_var(--color-ember)]' : 'text-muted hover:text-ember hover:bg-raised',
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
    neutral: 'text-muted bg-raised border-line',
    ok: 'text-ok bg-[#7fd4a914] border-[#7fd4a933]',
    warn: 'text-dumb bg-[#f2c35b14] border-[#f2c35b33]',
    danger: 'text-danger bg-[#ff5c6c14] border-[#ff5c6c33]',
    ember: 'text-ember bg-ember-soft border-[#ff6b3d40]',
  };
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

/** A labelled bar. `center` draws a diverging bar for values like karma. Changes float up as +N / −N. */
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
    setTimeout(() => setDeltas((x) => x.filter((y) => y.id !== id)), 1600);
  }, [value]);
  const flashing = deltas.length > 0;
  return (
    <div className="relative min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <motion.span
          key={value}
          initial={{ scale: flashing ? 1.5 : 1, color: flashing ? color : 'var(--color-ink)' }}
          animate={{ scale: 1, color: 'var(--color-ink)' }}
          transition={{ duration: 0.8 }}
          className="font-mono text-xs tabular-nums"
        >
          {value}
        </motion.span>
      </div>
      <div className="relative h-1 mt-1.5 rounded-full bg-line overflow-hidden">
        {center && <div className="absolute left-1/2 top-0 bottom-0 w-px bg-line-strong" />}
        <motion.div
          className="absolute top-0 bottom-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 ${flashing ? 12 : 6}px ${color}` }}
          initial={false}
          animate={{ left: `${left}%`, width: `${width}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      <AnimatePresence>
        {deltas.map(({ id, d }) => (
          <motion.span
            key={id}
            className="absolute right-8 top-0 font-mono text-xs font-medium pointer-events-none"
            style={{ color, textShadow: `0 0 8px ${color}` }}
            initial={{ opacity: 0, x: 10, scale: 0.7 }}
            animate={{ opacity: 1, x: 0, scale: 1.1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
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
    <div role="radiogroup" aria-label={label} className="inline-flex p-1 rounded-xl bg-bg border border-line">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('relative h-8 px-3.5 text-sm rounded-lg transition-colors', value === o.value ? 'text-ink' : 'text-faint hover:text-muted')}
        >
          {value === o.value && <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-lg bg-raised border border-line-strong" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
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
          <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-label={title}
            className="fixed z-50 top-0 right-0 bottom-0 w-full sm:w-[420px] bg-surface border-l border-line flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
          >
            <header className="flex items-center justify-between px-5 h-14 border-b border-line">
              <h2 className="font-medium">{title}</h2>
              <IconButton label="Close" onClick={onClose}><X size={18} /></IconButton>
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
      <div className="fixed z-[60] top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 flex flex-col gap-2 w-[min(92vw,380px)]" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-3 rounded-xl border border-line bg-raised px-4 py-3 text-sm shadow-2xl"
            >
              {t.tone === 'ok' ? <CheckCircle2 size={18} className="text-ok shrink-0 drop-shadow-[0_0_6px_var(--color-ok)]" /> : <AlertTriangle size={18} className="text-danger shrink-0 drop-shadow-[0_0_6px_var(--color-danger)]" />}
              <span className="min-w-0 break-words">{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <a href="#/" onClick={onClick} className="flex items-center gap-2.5 group">
      <span className="relative grid place-items-center w-8 h-8 rounded-lg bg-ember-soft text-ember font-serif font-bold text-lg transition-all group-hover:bg-ember group-hover:text-bg group-hover:shadow-[0_0_24px_-2px_var(--color-ember)] group-hover:rotate-[-6deg]">I</span>
      <span className="leading-none">
        <span className="block font-serif font-semibold tracking-tight">Grimm Protocol</span>
        <span className="block font-mono text-[10px] text-faint mt-0.5">IGNIS // OS</span>
      </span>
    </a>
  );
}

export { cx };
