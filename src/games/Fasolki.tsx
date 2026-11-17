import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, Badge, cx } from '../ui';

type Color = 'czerwona' | 'zielona' | 'zlota';
type Pattern = 'kropki' | 'paski' | 'gladka';
interface Bean { id: number; color: Color; pattern: Pattern }

const COLORS: Record<Color, { fill: string; name: string }> = {
  czerwona: { fill: '#d8423b', name: 'czerwone' },
  zielona: { fill: '#3f9f5f', name: 'zielone' },
  zlota: { fill: '#f4c84a', name: 'złote' },
};
const PATTERN_NAME: Record<Pattern, string> = { kropki: 'w kropki', paski: 'w paski', gladka: 'gładkie' };

const DURATION = 45;
/** A target of ~35 net correct sorts in 45 s is a perfect run. */
const PERFECT = 35;

interface Phase {
  banner: string;
  jars: [string, string, string];
  sort: (b: Bean) => 0 | 1 | 2;
}

const PHASES: Phase[] = [
  {
    banner: 'Rozporządzenie DKSF nr 1: sortujemy według koloru.',
    jars: ['Czerwone', 'Zielone', 'Złote'],
    sort: (b) => (b.color === 'czerwona' ? 0 : b.color === 'zielona' ? 1 : 2),
  },
  {
    banner: 'Nowe rozporządzenie DKSF: od teraz liczy się wzór, nie kolor!',
    jars: ['W kropki', 'W paski', 'Gładkie'],
    sort: (b) => (b.pattern === 'kropki' ? 0 : b.pattern === 'paski' ? 1 : 2),
  },
  {
    banner: 'Nowe rozporządzenie DKSF: złote zawsze do słoika 3, reszta: kropki do 1, pozostałe do 2.',
    jars: ['Kropki (nie złote)', 'Reszta (nie złote)', 'Wszystkie złote'],
    sort: (b) => (b.color === 'zlota' ? 2 : b.pattern === 'kropki' ? 0 : 1),
  },
];

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
let seq = 0;
const newBean = (): Bean => ({ id: ++seq, color: pick(['czerwona', 'zielona', 'zlota'] as const), pattern: pick(['kropki', 'paski', 'gladka'] as const) });

function BeanSvg({ bean, size = 96 }: { bean: Bean; size?: number }) {
  const fill = COLORS[bean.color].fill;
  const id = `clip-${bean.id}`;
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 120 90" role="img" aria-label={`Fasolka ${COLORS[bean.color].name.replace(/e$/, 'a')}, ${PATTERN_NAME[bean.pattern]}`}>
      <defs>
        <clipPath id={id}>
          <path d="M20 45 C10 10 60 0 70 20 C78 35 100 20 108 40 C116 70 70 90 45 80 C25 74 26 60 20 45 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="120" height="90" fill={fill} />
        {bean.pattern === 'kropki' &&
          [[35, 35], [60, 55], [85, 45], [50, 30], [75, 70], [40, 62], [95, 60]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="5" fill="#fff6e2" />)}
        {bean.pattern === 'paski' && [20, 40, 60, 80, 100].map((x) => <rect key={x} x={x} y="0" width="8" height="90" fill="#fff6e2" opacity="0.85" transform="rotate(20 60 45)" />)}
        <ellipse cx="50" cy="30" rx="18" ry="6" fill="#ffffff" opacity="0.35" />
      </g>
      <path d="M20 45 C10 10 60 0 70 20 C78 35 100 20 108 40 C116 70 70 90 45 80 C25 74 26 60 20 45 Z" fill="none" stroke="#241913" strokeWidth="5" />
    </svg>
  );
}

export function Fasolki({ onFinish }: { onFinish: (score: number) => void }) {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [bean, setBean] = useState<Bean>(newBean);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<{ jar: number; ok: boolean; key: number } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const finished = useRef(false);

  const phaseIndex = timeLeft > 30 ? 0 : timeLeft > 15 ? 1 : 2;
  const phase = PHASES[phaseIndex];

  useEffect(() => {
    if (!started) return;
    setBanner(phase.banner);
    const t = setTimeout(() => setBanner(null), 2600);
    return () => clearTimeout(t);
  }, [phaseIndex, started, phase.banner]);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [started]);

  useEffect(() => {
    if (started && timeLeft <= 0 && !finished.current) {
      finished.current = true;
      onFinish(((correct - wrong) / PERFECT) * 100);
    }
  }, [timeLeft, started, correct, wrong, onFinish]);

  const sortInto = useCallback(
    (jar: number) => {
      if (!started || timeLeft <= 0) return;
      const ok = phase.sort(bean) === jar;
      if (ok) setCorrect((c) => c + 1);
      else setWrong((w) => w + 1);
      setFlash({ jar, ok, key: bean.id });
      setBean(newBean());
    },
    [started, timeLeft, phase, bean],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        sortInto(Number(e.key) - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sortInto]);

  if (!started) {
    return (
      <div className="card p-6 max-w-xl mx-auto">
        <h2 className="font-serif font-bold text-xl mb-2">Instrukcja stanowiskowa</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm mb-4">
          <li>Masz {DURATION} sekund. Fasolki pojawiają się po jednej.</li>
          <li>Wrzucaj je do słoików klawiszami <b>1</b>, <b>2</b>, <b>3</b> albo stuknięciem w słoik.</li>
          <li>Reguły są napisane na słoikach. DKSF zmieni je dwa razy w trakcie. Czytaj komunikaty!</li>
          <li>Pomyłka odejmuje punkt. Biurokracja nie wybacza.</li>
        </ul>
        <Button variant="primary" onClick={() => setStarted(true)} autoFocus>Rozpocznij sortowanie</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <Badge tone={timeLeft <= 10 ? 'danger' : 'neutral'}>⏱ {Math.max(0, timeLeft)} s</Badge>
        <Badge tone="ok">Poprawne: {correct}</Badge>
        <Badge tone="danger">Pomyłki: {wrong}</Badge>
        <Badge tone="warn">Rozporządzenie {phaseIndex + 1}/3</Badge>
      </div>
      <div className="relative card p-4 sm:p-6">
        <AnimatePresence>
          {banner && (
            <motion.div
              className="absolute inset-x-3 top-3 z-10 rounded-xl border-[2.5px] border-outline bg-candy text-[#fff6e2] font-bold text-sm px-3 py-2 shadow-[0_3px_0_var(--color-outline)]"
              initial={{ y: -20, opacity: 0, rotate: -2 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: -20, opacity: 0 }}
              role="status"
            >
              📜 {banner}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="h-36 grid place-items-center mt-8">
          <AnimatePresence mode="popLayout">
            <motion.div key={bean.id} initial={{ y: -40, opacity: 0, rotate: -30 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.4 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
              <BeanSvg bean={bean} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4">
          {phase.jars.map((label, i) => (
            <button
              key={i}
              onClick={() => sortInto(i)}
              className={cx(
                'relative rounded-b-3xl rounded-t-lg border-[3px] border-outline bg-[#e9f6f8] px-2 pt-3 pb-5 min-h-28 flex flex-col items-center justify-end shadow-[0_4px_0_var(--color-outline)] active:translate-y-1 active:shadow-[0_1px_0_var(--color-outline)] transition-all',
                flash?.jar === i && (flash.ok ? 'ring-4 ring-ok' : 'ring-4 ring-candy'),
              )}
              aria-label={`Słoik ${i + 1}: ${label}`}
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 kbd">{i + 1}</span>
              <span className="text-xs sm:text-sm font-extrabold text-center leading-tight text-[#2b211c]">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
