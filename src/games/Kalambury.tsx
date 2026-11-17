import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lightbulb } from 'lucide-react';
import { Badge, Button, Kbd, cx } from '../ui';

interface Puzzle { answer: string; clues: string[] }

/** Each clue line is revealed one emoji at a time; the first two are free. */
const PUZZLES: Puzzle[] = [
  { answer: 'Kopciuszek', clues: ['👠', '🕛', '🎃', '👑', '🧹', '💃'] },
  { answer: 'Czerwony Kapturek', clues: ['🔴', '🧺', '🌲', '🐺', '👵', '🪓'] },
  { answer: 'Smok Wawelski', clues: ['🐉', '🏰', '🐑', '🔥', '🧵', '💧'] },
  { answer: 'Pinokio', clues: ['🪵', '👃', '📏', '🤥', '🐋', '👴'] },
  { answer: 'Królewna Śnieżka', clues: ['🍎', '🪞', '7️⃣', '⛏️', '😴', '👸'] },
  { answer: 'Złote Runo', clues: ['🐏', '✨', '⛵', '🐲', '🏺', '🧙‍♀️'] },
  { answer: 'Sun Wukong', clues: ['🐒', '👑', '🦯', '☁️', '🍑', '🧘'] },
  { answer: 'Urashima Tarō', clues: ['🐢', '🌊', '🏯', '🎁', '⏳', '👴'] },
  { answer: 'Alladyn', clues: ['🪔', '🧞', '🪄', '🕌', '🐒', '🏜️'] },
  { answer: 'Rumpelsztyk', clues: ['🧶', '🥇', '👶', '❓', '📛', '💢'] },
  { answer: 'Jaś i Małgosia', clues: ['🍬', '🏠', '🧙‍♀️', '🔥', '🍞', '👫'] },
  { answer: 'Kot w Butach', clues: ['🐈', '👢', '🎩', '🗡️', '🐇', '🏰'] },
  { answer: 'Śpiąca Królewna', clues: ['🌹', '🪡', '😴', '💯', '🏰', '💋'] },
  { answer: 'Calineczka', clues: ['🌷', '🤏', '🐸', '🐭', '🐦', '🧚'] },
  { answer: 'Brzydkie Kaczątko', clues: ['🦆', '😢', '❄️', '🪞', '🦢', '🌸'] },
  { answer: 'Szewczyk Dratewka', clues: ['👞', '🧵', '🐜', '🦆', '🐝', '👸'] },
];

const ROUNDS = 8;
const FREE = 2;
const ROUND_POINTS = 100 / ROUNDS;
const HINT_COST = 3;

const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);

function Mime({ talking }: { talking: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="w-20 h-20 shrink-0" role="img" aria-label="Mim Zaczarowany">
      <path d="M22 30 Q50 -2 78 30 Z" fill="#241913" />
      <rect x="44" y="4" width="12" height="14" rx="3" fill="#d8423b" stroke="#241913" strokeWidth="3" />
      <ellipse cx="50" cy="55" rx="30" ry="34" fill="#fffaf0" stroke="#241913" strokeWidth="4" />
      <path d="M33 42 l8 6 M41 42 l-8 6 M59 42 l8 6 M67 42 l-8 6" stroke="#241913" strokeWidth="3" strokeLinecap="round" />
      <path d="M38 58 L36 50 M62 58 L64 50" stroke="#3f8fd8" strokeWidth="3" strokeLinecap="round" />
      <motion.ellipse cx="50" cy="72" rx="7" ry="2" initial={{ ry: 2 }} fill="#d8423b" stroke="#241913" strokeWidth="3" animate={{ ry: talking ? [2, 6, 2] : 2 }} transition={{ repeat: talking ? Infinity : 0, duration: 0.5 }} />
    </svg>
  );
}

export function Kalambury({ onFinish }: { onFinish: (score: number) => void }) {
  const rounds = useMemo(() => shuffle(PUZZLES).slice(0, ROUNDS), []);
  const [round, setRound] = useState(0);
  const [shown, setShown] = useState(FREE);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<{ picked: string; ok: boolean } | null>(null);
  const puzzle = rounds[round];
  const options = useMemo(() => {
    const others = shuffle(PUZZLES.filter((p) => p.answer !== puzzle.answer)).slice(0, 3).map((p) => p.answer);
    return shuffle([puzzle.answer, ...others]);
  }, [puzzle]);
  const hintsUsed = shown - FREE;
  const worth = Math.max(ROUND_POINTS - hintsUsed * HINT_COST, 3.5);

  const hint = () => {
    if (!answered && shown < puzzle.clues.length) setShown((s) => s + 1);
  };
  const guess = (opt: string) => {
    if (answered) return;
    const ok = opt === puzzle.answer;
    setAnswered({ picked: opt, ok });
    if (ok) setScore((s) => s + worth);
  };
  const next = () => {
    if (round + 1 >= ROUNDS) {
      onFinish(score);
      return;
    }
    setRound((r) => r + 1);
    setShown(FREE);
    setAnswered(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) guess(options[Number(e.key) - 1]);
      else if (e.key.toLowerCase() === 'h') hint();
      else if (e.key === 'Enter' && answered) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="max-w-2xl mx-auto card p-5 sm:p-6">
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge tone="warn">Runda {round + 1}/{ROUNDS}</Badge>
        <Badge tone="ok">Punkty: {Math.round(score)}</Badge>
        <Badge>Ta runda warta: {Math.round(worth * 10) / 10}</Badge>
      </div>
      <div className="flex items-center gap-4">
        <Mime talking={!answered} />
        <div className="bubble flex-1 min-h-20 rounded-2xl border-[2.5px] border-outline bg-[#fff6e2] px-4 py-3">
          <p className="text-xs text-faint mb-1">Mim pokazuje (bez słów, oczywiście):</p>
          <div className="flex flex-wrap gap-2 text-3xl sm:text-4xl" aria-label={`Wskazówki: ${puzzle.clues.slice(0, shown).join(' ')}`}>
            <AnimatePresence>
              {puzzle.clues.slice(0, shown).map((c, i) => (
                <motion.span key={`${round}-${i}`} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                  {c}
                </motion.span>
              ))}
            </AnimatePresence>
            {Array.from({ length: puzzle.clues.length - shown }, (_, i) => (
              <span key={`h${i}`} className="opacity-25">❔</span>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 mt-5">
        {options.map((opt, i) => (
          <button
            key={opt}
            onClick={() => guess(opt)}
            disabled={!!answered}
            className={cx(
              'flex items-center justify-between gap-2 rounded-xl border-[2.5px] border-outline px-3 py-2.5 font-bold text-left shadow-[0_3px_0_var(--color-outline)] transition-transform',
              !answered && 'bg-[#fff6e2] hover:-translate-y-0.5',
              answered && opt === puzzle.answer && 'bg-[#cdeccf]',
              answered && opt === answered.picked && !answered.ok && 'bg-[#ffd3cc]',
              answered && opt !== puzzle.answer && opt !== answered.picked && 'bg-[#fff6e2] opacity-50',
            )}
          >
            {opt} <Kbd>{i + 1}</Kbd>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
        {answered ? (
          <>
            <p className="font-bold" role="status">
              {answered.ok ? `Brawo! Mim kłania się w milczeniu. +${Math.round(worth * 10) / 10}` : `Pudło. To był(a) ${puzzle.answer}. Mim udaje, że płacze.`}
            </p>
            <Button variant="primary" onClick={next} autoFocus>{round + 1 >= ROUNDS ? 'Zakończ' : 'Dalej'} <Kbd>⏎</Kbd></Button>
          </>
        ) : (
          <Button onClick={hint} disabled={shown >= puzzle.clues.length}>
            <Lightbulb size={16} /> Podpowiedź (−{HINT_COST} pkt) <Kbd>H</Kbd>
          </Button>
        )}
      </div>
    </div>
  );
}
