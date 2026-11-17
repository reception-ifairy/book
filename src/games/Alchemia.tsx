import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Delete, FlaskConical } from 'lucide-react';
import { Badge, Button, Kbd, cx } from '../ui';

const INGREDIENTS = [
  { emoji: '🍄', name: 'Grzyb z Zaczarowanego Lasu' },
  { emoji: '🪶', name: 'Pióro gryfa' },
  { emoji: '🫘', name: 'Magiczna fasolka' },
  { emoji: '💎', name: 'Kryształ krasnoludzki' },
  { emoji: '🌙', name: 'Rosa księżycowa' },
  { emoji: '🧪', name: 'Łza smoka' },
];
const SLOTS = 4;
const ATTEMPTS = 8;

interface Attempt { recipe: number[]; gold: number; purple: number }

/** Recipe of 4 different ingredients (no repeats), like every respectable DATM potion. */
function secretRecipe() {
  const pool = INGREDIENTS.map((_, i) => i).sort(() => Math.random() - 0.5);
  return pool.slice(0, SLOTS);
}

function judge(secret: number[], guess: number[]) {
  const gold = guess.filter((g, i) => secret[i] === g).length;
  const common = guess.filter((g) => secret.includes(g)).length;
  return { gold, purple: common - gold };
}

function Bubbles({ gold, purple }: { gold: number; purple: number }) {
  const dots = [...Array(gold).fill('gold'), ...Array(purple).fill('purple'), ...Array(SLOTS - gold - purple).fill('empty')];
  return (
    <span className="grid grid-cols-2 gap-1 w-9" aria-label={`${gold} na swoim miejscu, ${purple} w złym miejscu`}>
      {dots.map((d, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, y: 6 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className={cx('w-3.5 h-3.5 rounded-full border-2 border-outline', d === 'gold' ? 'bg-gold' : d === 'purple' ? 'bg-chaos' : 'bg-[#00000018]')}
        />
      ))}
    </span>
  );
}

export function Alchemia({ onFinish }: { onFinish: (score: number) => void }) {
  const secret = useMemo(secretRecipe, []);
  const [current, setCurrent] = useState<number[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [over, setOver] = useState<null | 'win' | 'lose'>(null);

  const add = (i: number) => {
    if (over || current.length >= SLOTS || current.includes(i)) return;
    setCurrent((c) => [...c, i]);
  };
  const removeAt = (slot: number) => !over && setCurrent((c) => c.filter((_, j) => j !== slot));
  const brew = () => {
    if (over || current.length !== SLOTS) return;
    const result = { recipe: current, ...judge(secret, current) };
    const all = [...attempts, result];
    setAttempts(all);
    setCurrent([]);
    if (result.gold === SLOTS) {
      setOver('win');
      setTimeout(() => onFinish(100 - (all.length - 1) * 10), 1200);
    } else if (all.length >= ATTEMPTS) {
      setOver('lose');
      const best = Math.max(...all.map((a) => a.gold));
      setTimeout(() => onFinish(5 + best * 5), 1600);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= INGREDIENTS.length) add(n - 1);
      else if (e.key === 'Backspace') setCurrent((c) => c.slice(0, -1));
      else if (e.key === 'Enter') brew();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px] max-w-4xl mx-auto items-start">
      <div className="card p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge tone="warn">Próba {Math.min(attempts.length + 1, ATTEMPTS)}/{ATTEMPTS}</Badge>
          <Badge>Przepis: 4 różne składniki</Badge>
        </div>
        <ol className="space-y-2 mb-5">
          {Array.from({ length: ATTEMPTS }, (_, row) => {
            const a = attempts[row];
            const isCurrent = row === attempts.length && !over;
            return (
              <li key={row} className={cx('flex items-center gap-3 rounded-xl px-2 py-1.5', isCurrent && 'bg-raised border-2 border-outline')}>
                <span className="font-pixel text-xs text-faint w-5 text-right">{row + 1}</span>
                <span className="flex gap-1.5 flex-1">
                  {Array.from({ length: SLOTS }, (_, s) => {
                    const ing = a ? a.recipe[s] : isCurrent ? current[s] : undefined;
                    return (
                      <button
                        key={s}
                        disabled={!isCurrent || ing === undefined}
                        onClick={() => removeAt(s)}
                        className="grid place-items-center w-10 h-10 sm:w-11 sm:h-11 rounded-full border-[2.5px] border-outline bg-[#fffaf0] text-xl"
                        aria-label={ing !== undefined ? `${INGREDIENTS[ing].name}${isCurrent ? ' (usuń)' : ''}` : 'Puste miejsce'}
                      >
                        {ing !== undefined ? INGREDIENTS[ing].emoji : ''}
                      </button>
                    );
                  })}
                </span>
                {a && <Bubbles gold={a.gold} purple={a.purple} />}
              </li>
            );
          })}
        </ol>
        {over ? (
          <div className="text-center font-bold" role="status">
            {over === 'win' ? '✨ Eliksir się udał! Pachnie poniedziałkiem, który się spóźnia.' : (
              <>💥 Kociołek wybuchł. DAM wystawi rachunek. Przepis brzmiał: {secret.map((i) => INGREDIENTS[i].emoji).join(' ')}</>
            )}
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setCurrent((c) => c.slice(0, -1))} disabled={!current.length}><Delete size={16} /> Cofnij</Button>
            <Button variant="primary" onClick={brew} disabled={current.length !== SLOTS}><FlaskConical size={16} /> Warz! <Kbd>⏎</Kbd></Button>
          </div>
        )}
      </div>
      <div className="card p-5">
        <h2 className="font-serif font-bold mb-3">Półka ze składnikami</h2>
        <div className="grid grid-cols-2 gap-2">
          {INGREDIENTS.map((ing, i) => (
            <button
              key={ing.name}
              onClick={() => add(i)}
              disabled={!!over || current.includes(i) || current.length >= SLOTS}
              className="flex items-center gap-2 rounded-xl border-[2.5px] border-outline bg-[#fff6e2] px-2 py-2 text-left shadow-[0_3px_0_var(--color-outline)] hover:-translate-y-0.5 disabled:opacity-40 transition-transform"
            >
              <span className="text-2xl">{ing.emoji}</span>
              <span className="text-xs font-bold leading-tight flex-1">{ing.name}</span>
              <Kbd>{i + 1}</Kbd>
            </button>
          ))}
        </div>
        <div className="text-xs text-muted mt-4 space-y-1">
          <p className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full bg-gold border-2 border-outline" /> właściwy składnik na właściwym miejscu</p>
          <p className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full bg-chaos border-2 border-outline" /> właściwy składnik, złe miejsce</p>
          <p>Bąble nie mówią, który to składnik. Taka już natura kociołków.</p>
        </div>
      </div>
    </div>
  );
}
