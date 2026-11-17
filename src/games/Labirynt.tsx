import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hourglass } from 'lucide-react';
import { Badge, Button, cx } from '../ui';

const N = 9;
type Dir = 'n' | 's' | 'e' | 'w';
const DELTA: Record<Dir, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

/** Seeded PRNG so a maze can be described by one number. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const idx = (x: number, y: number) => y * N + x;
/** Canonical edge key: always from the cell on the west / north side. */
const edgeKey = (x: number, y: number, d: Dir) => {
  if (d === 'w') return `${x - 1},${y},e`;
  if (d === 'n') return `${x},${y - 1},s`;
  return `${x},${y},${d}`;
};

const TARGETS = [
  { emoji: '📄', label: 'Formularz B-7' },
  { emoji: '📎', label: 'Załącznik nr 1' },
  { emoji: '📎', label: 'Załącznik nr 2' },
  { emoji: '📎', label: 'Załącznik nr 3' },
  { emoji: '🔴', label: 'Pieczątka DKSF' },
  { emoji: '🪟', label: 'Okienko' },
];
const DOOR_PERIOD = 5;

interface Maze {
  open: Set<string>;
  doors: string[];
  targets: number[];
}

function buildMaze(seed: number): Maze {
  const rnd = mulberry32(seed);
  const open = new Set<string>();
  const seen = new Set<number>([0]);
  const stack: [number, number][] = [[0, 0]];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const options = (Object.keys(DELTA) as Dir[]).filter((d) => {
      const nx = x + DELTA[d][0];
      const ny = y + DELTA[d][1];
      return nx >= 0 && ny >= 0 && nx < N && ny < N && !seen.has(idx(nx, ny));
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const d = options[Math.floor(rnd() * options.length)];
    const nx = x + DELTA[d][0];
    const ny = y + DELTA[d][1];
    open.add(edgeKey(x, y, d));
    seen.add(idx(nx, ny));
    stack.push([nx, ny]);
  }
  // Knock out a few extra walls so a closed lunch door always has a way around (eventually).
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(rnd() * (N - 1));
    const y = Math.floor(rnd() * N);
    if (rnd() < 0.5) open.add(`${x},${y},e`);
    else if (y < N - 1) open.add(`${x},${y},s`);
  }
  const edges = [...open];
  const doors: string[] = [];
  while (doors.length < 5) {
    const e = edges[Math.floor(rnd() * edges.length)];
    if (!doors.includes(e) && e !== '0,0,e' && e !== '0,0,s') doors.push(e);
  }
  const cells = Array.from({ length: N * N }, (_, i) => i).filter((i) => i !== 0);
  const targets: number[] = [];
  while (targets.length < TARGETS.length) {
    const c = cells.splice(Math.floor(rnd() * cells.length), 1)[0];
    targets.push(c);
  }
  return { open, doors, targets };
}

const doorClosed = (doorIndex: number, moves: number) => Math.floor((moves + doorIndex * 2) / DOOR_PERIOD) % 2 === 1;

/** Shortest number of moves through all targets in order, ignoring lunch breaks. */
function optimalMoves(m: Maze) {
  const bfs = (from: number, to: number) => {
    const dist = new Map<number, number>([[from, 0]]);
    const q = [from];
    while (q.length) {
      const c = q.shift()!;
      if (c === to) return dist.get(c)!;
      const x = c % N;
      const y = Math.floor(c / N);
      for (const d of Object.keys(DELTA) as Dir[]) {
        const nx = x + DELTA[d][0];
        const ny = y + DELTA[d][1];
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || !m.open.has(edgeKey(x, y, d))) continue;
        const n = idx(nx, ny);
        if (!dist.has(n)) {
          dist.set(n, dist.get(c)! + 1);
          q.push(n);
        }
      }
    }
    return 0;
  };
  let total = 0;
  let at = 0;
  for (const t of m.targets) {
    total += bfs(at, t);
    at = t;
  }
  return total;
}

export function Labirynt({ onFinish }: { onFinish: (score: number) => void }) {
  const maze = useMemo(() => buildMaze(Math.floor(Math.random() * 1e9)), []);
  const optimal = useMemo(() => optimalMoves(maze), [maze]);
  const budget = optimal * 2 + 20;
  const [pos, setPos] = useState(0);
  const [moves, setMoves] = useState(0);
  const [next, setNext] = useState(0);
  const [msg, setMsg] = useState('Zacznij od Formularza B-7. Bez niego nikt z Tobą nie rozmawia.');
  const [done, setDone] = useState(false);

  const finish = useCallback(
    (won: boolean, used: number, collected: number) => {
      setDone(true);
      if (won) onFinish(100 - (60 * Math.max(0, used - optimal)) / Math.max(1, budget - optimal));
      else onFinish(collected * 8);
    },
    [onFinish, optimal, budget],
  );

  const step = useCallback(
    (d: Dir | null) => {
      if (done) return;
      const x = pos % N;
      const y = Math.floor(pos / N);
      let to = pos;
      if (d) {
        const nx = x + DELTA[d][0];
        const ny = y + DELTA[d][1];
        const key = edgeKey(x, y, d);
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || !maze.open.has(key)) {
          setMsg('Ściana. Solidna, nośna i z pełną dokumentacją.');
          return;
        }
        const di = maze.doors.indexOf(key);
        if (di >= 0 && doorClosed(di, moves)) {
          setMsg('🍽️ Przerwa obiadowa. Zapraszamy za chwilę (albo obejdź).');
          return;
        }
        to = idx(nx, ny);
      }
      const used = moves + 1;
      setMoves(used);
      setPos(to);
      let collected = next;
      if (to === maze.targets[next]) {
        collected = next + 1;
        setNext(collected);
        if (collected === TARGETS.length) {
          setMsg('Okienko przyjęło komplet dokumentów. Podobno to się zdarza raz na pokolenie.');
          finish(true, used, collected);
          return;
        }
        setMsg(`Zdobyto: ${TARGETS[next].label}. Następnie: ${TARGETS[collected].label}.`);
      } else if (!d) {
        setMsg('Czekasz grzecznie w kolejce. Ruch zaliczony.');
      } else if (maze.targets.includes(to) && maze.targets.indexOf(to) > next) {
        setMsg(`To ${TARGETS[maze.targets.indexOf(to)].label}, ale jeszcze nie teraz. Kolejność to świętość.`);
      }
      if (used >= budget) {
        setMsg('Limit ruchów wyczerpany. Okienko zamknięte do poniedziałku.');
        finish(false, used, collected);
      }
    },
    [done, pos, maze, moves, next, budget, finish],
  );

  useEffect(() => {
    const keys: Record<string, Dir | null> = { ArrowUp: 'n', ArrowDown: 's', ArrowLeft: 'w', ArrowRight: 'e', w: 'n', s: 's', a: 'w', d: 'e', W: 'n', S: 's', A: 'w', D: 'e', ' ': null };
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key in keys) {
        e.preventDefault();
        step(keys[e.key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  const wall = '3px solid var(--color-outline)';

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,460px)_1fr] items-start max-w-4xl mx-auto">
      <div className="card p-3">
        <div className="grid aspect-square w-full" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }} role="grid" aria-label="Labirynt biur">
          {Array.from({ length: N * N }, (_, i) => {
            const x = i % N;
            const y = Math.floor(i / N);
            const ti = maze.targets.indexOf(i);
            const doorE = maze.doors.indexOf(`${x},${y},e`);
            const doorS = maze.doors.indexOf(`${x},${y},s`);
            return (
              <div
                key={i}
                className="relative grid place-items-center bg-[#fffaf0]"
                style={{
                  borderTop: y === 0 || !maze.open.has(edgeKey(x, y, 'n')) ? wall : '3px solid transparent',
                  borderLeft: x === 0 || !maze.open.has(edgeKey(x, y, 'w')) ? wall : '3px solid transparent',
                  borderRight: x === N - 1 ? wall : undefined,
                  borderBottom: y === N - 1 ? wall : undefined,
                }}
              >
                {ti >= 0 && ti >= next && (
                  <span className={cx('text-sm sm:text-lg leading-none', ti !== next && 'opacity-35 grayscale')} title={TARGETS[ti].label}>
                    {TARGETS[ti].emoji}
                  </span>
                )}
                {pos === i && (
                  <motion.span layoutId="agent" className="absolute inset-[12%] rounded-full bg-ember border-2 border-outline grid place-items-center text-[10px] sm:text-xs" transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                    🕵️
                  </motion.span>
                )}
                {doorE >= 0 && (
                  <span className={cx('absolute -right-[4px] top-[15%] bottom-[15%] w-[5px] rounded z-10', doorClosed(doorE, moves) ? 'bg-candy' : 'bg-pine')} title="Drzwi z przerwą obiadową" />
                )}
                {doorS >= 0 && (
                  <span className={cx('absolute -bottom-[4px] left-[15%] right-[15%] h-[5px] rounded z-10', doorClosed(doorS, moves) ? 'bg-candy' : 'bg-pine')} title="Drzwi z przerwą obiadową" />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="space-y-4">
        <div className="card p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge tone={budget - moves <= 10 ? 'danger' : 'neutral'}>Ruchy: {moves}/{budget}</Badge>
            <Badge tone="ok">Zebrano: {next}/{TARGETS.length}</Badge>
          </div>
          <ol className="space-y-1 text-sm">
            {TARGETS.map((t, i) => (
              <li key={t.label} className={cx('flex items-center gap-2', i < next ? 'line-through text-faint' : i === next ? 'font-extrabold' : 'text-muted')}>
                <span aria-hidden>{t.emoji}</span> {t.label} {i === next && '← teraz'}
              </li>
            ))}
          </ol>
          <p className="text-sm mt-3 min-h-10" role="status">{msg}</p>
          <p className="text-xs text-faint mt-2">
            Strzałki / WASD, spacja = czekaj. Drzwi <span className="text-pine font-bold">zielone</span> są otwarte, <span className="text-candy font-bold">czerwone</span> mają przerwę obiadową (zmiana co {DOOR_PERIOD} ruchów).
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 w-48 mx-auto" aria-label="Sterowanie">
          <span />
          <Button aria-label="Góra" onClick={() => step('n')}><ArrowUp size={18} /></Button>
          <span />
          <Button aria-label="Lewo" onClick={() => step('w')}><ArrowLeft size={18} /></Button>
          <Button aria-label="Czekaj" onClick={() => step(null)}><Hourglass size={18} /></Button>
          <Button aria-label="Prawo" onClick={() => step('e')}><ArrowRight size={18} /></Button>
          <span />
          <Button aria-label="Dół" onClick={() => step('s')}><ArrowDown size={18} /></Button>
          <span />
        </div>
      </div>
    </div>
  );
}
