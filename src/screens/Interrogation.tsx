import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, Send } from 'lucide-react';
import { agentApi, type InterrogationView } from '../api';
import { celebrate } from '../agent';
import { navigate } from '../App';
import { prefs } from './Home';
import { AgentScreen } from '../components/agent/AgentScreen';
import { ComicBurst } from '../components/Effects';
import { Badge, Button, Meter, cx, useToast } from '../ui';
import type { Lang } from '../../shared/types';

const MOOD_EMOJI: Record<string, string> = { smug: '😏', nervous: '😬', offended: '😤', sweating: '😅', dramatic: '🎭', broken: '😭' };

const HINTS = [
  'Ask about the alibi: where exactly were they?',
  'Mention a detail only the culprit would know.',
  'Be clever, not loud. Suspects crack for logic.',
];

/**
 * Interrogation of the day: six questions to make today's suspect from the Public Domain confess.
 * The suspect answers in character, IGNIS rates every question, and the truth meter sets the XP.
 */
export function Interrogation() {
  const toast = useToast();
  const [state, setState] = useState<InterrogationView | null>(null);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    agentApi.interrogation((prefs.get('ignis.lang', 'en') as Lang) || 'en').then(setState).catch((e) => toast(e.message, 'error'));
  }, []);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [state?.turns.length]);

  if (!state) {
    return (
      <AgentScreen eyebrow="Interrogation" title="Bringing in the suspect…">
        <div className="card p-6 inline-flex items-center gap-3 text-muted"><Loader2 className="animate-spin" size={18} /> The suspect is being escorted in. They asked for a lawyer. The lawyer is a goose.</div>
      </AgentScreen>
    );
  }

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    try {
      const r = await agentApi.ask(question.trim(), state.lang);
      setState(r.state);
      setQuestion('');
      celebrate(r.xp);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const { suspect, turns } = state;
  const mood = turns.at(-1)?.mood ?? 'smug';

  return (
    <AgentScreen eyebrow="Interrogation of the day" title={`Interrogating ${suspect.name}`} wide>
      <div className="grid lg:grid-cols-[1fr_280px] gap-5 items-start">
        <div className="space-y-4">
          <div className="card p-5 flex items-start gap-4">
            <motion.span key={mood} initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="grid place-items-center w-20 h-20 rounded-2xl bg-screen border-[3px] border-outline shadow-[0_4px_0_var(--color-outline)] text-5xl shrink-0">
              {suspect.emoji}
            </motion.span>
            <div className="min-w-0">
              <span className="eyebrow">Charge</span>
              <p className="font-semibold mt-1">{suspect.charge}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">Mood: {MOOD_EMOJI[mood] ?? '🎭'} {mood}</span>
            </div>
          </div>

          <div className="space-y-3">
            {turns.length === 0 && (
              <div className="card p-4 text-sm text-muted">
                The suspect sits under the lamp, looking innocent in a way that is extremely suspicious. You have {state.questionsLeft} questions. Make them count.
              </div>
            )}
            <AnimatePresence initial={false}>
              {turns.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md border-[2.5px] border-outline bg-gold text-outline px-4 py-2.5 font-semibold shadow-[2px_3px_0_var(--color-outline)]">{t.question}</div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <span className="text-2xl shrink-0">{suspect.emoji}</span>
                    <div className="bubble max-w-[85%] px-4 py-2.5 ml-2 font-semibold">{t.reply}</div>
                  </div>
                  <div className="ml-10 inline-flex items-start gap-2 rounded-xl border-2 border-outline bg-screen px-3 py-2 text-sm text-[#d9fbff] max-w-[85%]">
                    <span className="font-pixel text-[11px] text-pixel shrink-0 pt-0.5">IGNIS</span>
                    <span>{t.note} <span className={cx('font-pixel text-[11px] whitespace-nowrap', t.delta >= 0 ? 'text-[#7dffa8]' : 'text-[#ff9aa5]')}>{t.delta >= 0 ? '+' : ''}{t.delta} truth</span></span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={endRef} />
          </div>

          {state.done ? (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="card relative p-6 text-center overflow-visible">
              <ComicBurst x="50%" y="0%" color="var(--color-gold)" word={`+${state.xp} XP`} size={150} delay={0.3} />
              <span className="eyebrow">Case report</span>
              <h2 className="toon-title text-3xl text-gold mt-2">{state.verdict?.title ?? 'Interview over'}</h2>
              {state.verdict?.report && <p className="mt-3 font-semibold">{state.verdict.report}</p>}
              <p className="mt-3 font-pixel text-sm text-faint">Truth extracted: {state.truth}% · a new suspect arrives tomorrow</p>
              <Button variant="primary" className="mt-5" onClick={() => navigate('')}>Back to your desk</Button>
            </motion.div>
          ) : (
            <form onSubmit={ask} className="ring-flow card p-3 flex gap-2 items-center">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
                placeholder={turns.length ? 'Your next question…' : 'Where were you on the night of the incident?'}
                className="field flex-1"
                disabled={busy}
                aria-label="Your question"
              />
              <Button variant="primary" type="submit" disabled={busy || !question.trim()}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Ask
              </Button>
            </form>
          )}
        </div>

        <aside className="card p-5 space-y-4 lg:sticky lg:top-6">
          <Meter label="Truth meter" value={state.truth} color="var(--color-ok)" />
          <div className="flex items-center justify-between">
            <span className="eyebrow">Questions left</span>
            <span className="font-serif font-bold text-2xl">{state.questionsLeft}</span>
          </div>
          <div>
            <span className="eyebrow">IGNIS’s tips</span>
            <ul className="mt-2 space-y-1.5 text-sm text-muted list-disc pl-4">
              {HINTS.map((h) => <li key={h}>{h}</li>)}
            </ul>
          </div>
          <Badge tone="ember">XP: 20 + half the truth</Badge>
        </aside>
      </div>
    </AgentScreen>
  );
}
