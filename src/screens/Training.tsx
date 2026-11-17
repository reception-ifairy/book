import { useState, type ComponentType } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import { MINI_GAMES, type MiniGameId } from '../../shared/arb';
import { api } from '../api';
import { useAgent } from '../agent';
import { Shell } from '../components/Shell';
import { Badge, Button, useToast } from '../ui';
import { Fasolki } from '../games/Fasolki';
import { Labirynt } from '../games/Labirynt';
import { Smok } from '../games/Smok';
import { Kalambury } from '../games/Kalambury';
import { Alchemia } from '../games/Alchemia';

type GameProps = { onFinish: (score: number) => void };

const GAMES: Record<MiniGameId, ComponentType<GameProps>> = {
  fasolki: Fasolki,
  labirynt: Labirynt,
  smok: Smok,
  kalambury: Kalambury,
  alchemia: Alchemia,
};

function verdict(score: number) {
  if (score >= 90) return 'Wzorowo. DSRK rozważa nadanie Ci tytułu Instruktora (po wypełnieniu formularza I-1).';
  if (score >= 70) return 'Bardzo dobrze. Kot mruknął z aprobatą, co Mrucz-Term przetłumaczył jako „może być”.';
  if (score >= 40) return 'Zaliczone. Protokół trafia do teczki „Rokujący, ale bez przesady”.';
  if (score > 0) return 'Ledwo, ledwo. DKW otworzyło w tej sprawie teczkę, na razie cienką.';
  return 'Wynik zerowy. Formalnie to też wynik. Spróbuj jeszcze raz.';
}

function Hub() {
  const { agent } = useAgent();
  return (
    <>
      <div className="mb-6">
        <p className="eyebrow">Departament Szkoleń i Rozwoju Kadr</p>
        <h1 className="toon-title text-3xl sm:text-4xl mt-1">Ośrodek Szkoleniowy DSRK</h1>
        <p className="text-muted mt-2 max-w-2xl">
          Pięć ćwiczeń, które każdy Agent musi przejść przed okresem próbnym, w jego trakcie i po nim. Każde podejście daje XP, a nowy rekord dodaje premię.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MINI_GAMES.map((g, i) => {
          const rec = agent?.training[g.id];
          return (
            <motion.a
              key={g.id}
              href={`#/szkolenia/${g.id}`}
              className="card spotlight p-5 flex flex-col gap-3 hover:-translate-y-1 transition-transform"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-start gap-3">
                <span className="text-4xl leading-none" aria-hidden>{g.emoji}</span>
                <div className="min-w-0">
                  <h2 className="font-serif font-bold text-lg leading-snug">{g.name}</h2>
                  <p className="eyebrow mt-1">{g.skill}</p>
                </div>
              </div>
              <p className="text-sm text-muted flex-1">{g.desc}</p>
              <div className="flex flex-wrap gap-2">
                {rec ? (
                  <>
                    <Badge tone="ok"><Trophy size={12} /> Rekord {rec.best}</Badge>
                    <Badge>Podejścia: {rec.plays}</Badge>
                  </>
                ) : (
                  <Badge tone="warn">Jeszcze nie zaliczone</Badge>
                )}
              </div>
            </motion.a>
          );
        })}
      </div>
    </>
  );
}

function GameRunner({ id }: { id: MiniGameId }) {
  const { agent, setAgent } = useAgent();
  const toast = useToast();
  const meta = MINI_GAMES.find((g) => g.id === id)!;
  const Game = GAMES[id];
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<{ score: number; xp: number | null; newBest: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const finish = async (raw: number) => {
    const score = Math.max(0, Math.min(100, Math.round(raw)));
    setResult({ score, xp: null, newBest: false });
    if (!agent) return;
    setSaving(true);
    try {
      const res = await api.training(agent.id, id, score);
      setAgent(res.agent);
      setResult({ score, xp: res.xp, newBest: res.newBest });
      toast(res.newBest ? `Nowy rekord! +${res.xp} XP` : `Zaliczone: +${res.xp} XP`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Nie udało się zapisać wyniku.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const again = () => {
    setResult(null);
    setRound((r) => r + 1);
  };

  return (
    <>
      <a href="#/szkolenia" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-ink mb-4">
        <ArrowLeft size={16} /> Ośrodek Szkoleniowy
      </a>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-4xl" aria-hidden>{meta.emoji}</span>
        <div>
          <h1 className="toon-title text-2xl sm:text-3xl">{meta.name}</h1>
          <p className="eyebrow mt-1">{meta.skill}</p>
        </div>
      </div>
      {result ? (
        <motion.div className="card p-6 max-w-xl mx-auto text-center" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <p className="eyebrow">Protokół z ćwiczenia</p>
          <div className="toon-title text-6xl my-3">{result.score}</div>
          <p className="text-sm text-muted">punktów na 100</p>
          <div className="flex justify-center gap-2 my-4 flex-wrap">
            {saving && <Badge>Zapisywanie w teczce…</Badge>}
            {result.xp !== null && <Badge tone="ok">+{result.xp} XP</Badge>}
            {result.newBest && <Badge tone="warn"><Trophy size={12} /> Nowy rekord</Badge>}
          </div>
          <p className="mb-5">{verdict(result.score)}</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button variant="primary" onClick={again} autoFocus><RotateCcw size={16} /> Zagraj ponownie</Button>
            <Button onClick={() => (window.location.hash = '/szkolenia')}>Wróć do ośrodka</Button>
          </div>
        </motion.div>
      ) : (
        <Game key={round} onFinish={finish} />
      )}
    </>
  );
}

export function Training({ game }: { game?: string }) {
  const known = MINI_GAMES.some((g) => g.id === game);
  return <Shell active="szkolenia">{game && known ? <GameRunner key={game} id={game as MiniGameId} /> : <Hub />}</Shell>;
}
