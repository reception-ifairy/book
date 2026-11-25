import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BadgeCheck, ChevronRight, Loader2 } from 'lucide-react';
import { agentApi } from '../api';
import { celebrate } from '../agent';
import { navigate } from '../App';
import { prefs } from './Home';
import { AgentScreen } from '../components/agent/AgentScreen';
import { ComicBurst } from '../components/Effects';
import { SVGCharacter } from '../components/SVGCharacter';
import { Badge, Button, cx, useToast } from '../ui';
import { useArt } from '../artkit';
import type { Letter, QuizState } from '../../shared/dailyPack';
import type { Lang } from '../../shared/types';

const LETTER_COLOR: Record<Letter, string> = { A: 'var(--color-mana)', B: 'var(--color-chaos)', C: 'var(--color-ember)' };

/**
 * Quiz ABC of the day: three absurd questions, each answer revealed with its punchline,
 * then a verdict on what kind of agent you are. One go per day; coming back shows the recap.
 */
export function Quiz() {
  const toast = useToast();
  const art = useArt();
  const [state, setState] = useState<(QuizState & { lang: Lang }) | null>(null);
  const [busy, setBusy] = useState<Letter | null>(null);
  // Which question is on screen: the next unanswered one, or the one just answered until "Next" is pressed.
  const [viewing, setViewing] = useState(0);

  useEffect(() => {
    agentApi
      .quiz((prefs.get('ignis.lang', 'en') as Lang) || 'en')
      .then((s) => {
        setState(s);
        setViewing(Math.min(s.answers.length, s.quiz.questions.length - 1));
      })
      .catch((e) => toast(e.message, 'error'));
  }, []);

  if (!state) {
    return (
      <AgentScreen eyebrow="Quiz ABC of the day" title="Warming up the quiz…">
        <div className="card p-6 inline-flex items-center gap-3 text-muted"><Loader2 className="animate-spin" size={18} /> IGNIS is writing today’s questions. They are getting sillier by the second.</div>
      </AgentScreen>
    );
  }

  const { quiz, answers, verdict } = state;
  const q = quiz.questions[viewing];
  const answer = answers[viewing];
  const finished = !!verdict && viewing >= quiz.questions.length - 1 && !!answer;

  const pick = async (letter: Letter) => {
    setBusy(letter);
    try {
      const r = await agentApi.answer(viewing, letter, state.lang);
      setState(r.state);
      celebrate(r.xp);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <AgentScreen eyebrow={`Quiz ABC of the day · question ${viewing + 1} of ${quiz.questions.length}`} title={quiz.title}>
      <div className="card p-4 flex items-center gap-3 mb-5">
        <span className="shrink-0">{art.src('ignis-briefing') ? <img src={art.src('ignis-briefing')} alt="" className="w-16 h-16 object-contain" /> : <SVGCharacter isTalking={false} mood="smug" size={60} />}</span>
        <p className="font-semibold">“{quiz.intro}”</p>
      </div>

      <div className="flex gap-2 mb-4" aria-label="Progress">
        {quiz.questions.map((_, i) => (
          <span key={i} className={cx('h-2.5 flex-1 rounded-full border-2 border-outline', answers[i] ? (answers[i].approved ? 'bg-ok' : 'bg-gold') : i === viewing ? 'bg-raised' : 'bg-[#00000040]')} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={viewing} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
          <div className="card p-5 sm:p-6">
            <h2 className="font-serif font-bold text-2xl leading-snug">{q.question}</h2>
            <div className="mt-5 grid gap-3">
              {q.answers.map((a) => {
                const chosen = answer?.letter === a.letter;
                return (
                  <button
                    key={a.letter}
                    type="button"
                    disabled={!!answer || !!busy}
                    onClick={() => pick(a.letter)}
                    className={cx('paper sticker spotlight group relative w-full flex items-center gap-4 text-left bg-surface px-3.5 py-3 disabled:cursor-default', answer && !chosen && 'opacity-45', chosen && 'ring-4 ring-gold/70')}
                    style={{ ['--spot' as string]: LETTER_COLOR[a.letter] }}
                  >
                    <span className="grid place-items-center w-10 h-10 rounded-xl border-[2.5px] border-outline font-comic text-xl text-outline shrink-0 shadow-[0_3px_0_var(--color-outline)]" style={{ background: LETTER_COLOR[a.letter] }}>
                      {busy === a.letter ? <Loader2 size={18} className="animate-spin" /> : a.letter}
                    </span>
                    <span className="font-semibold">{a.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {answer && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="card relative mt-4 p-5 overflow-visible">
              <ComicBurst key={`${viewing}-${answer.letter}`} x="92%" y="12%" color={answer.approved ? 'var(--color-ok)' : 'var(--color-gold)'} word={`+${answer.xp} XP`} size={120} delay={0.1} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow">What happened</span>
                {answer.approved ? <Badge tone="ok"><BadgeCheck size={12} /> Bureau-approved</Badge> : <Badge tone="warn">Technically an answer</Badge>}
              </div>
              <p className="mt-2 text-lg font-semibold">{answer.outcome}</p>
              {viewing < quiz.questions.length - 1 && (
                <Button variant="primary" className="mt-4" onClick={() => setViewing((v) => v + 1)}>Next question <ChevronRight size={16} /></Button>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {finished && verdict && (
        <motion.div initial={{ opacity: 0, y: 30, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }} className="card relative mt-6 p-6 text-center overflow-visible">
          <ComicBurst x="50%" y="0%" color="var(--color-chaos)" word="VERDICT!" size={170} delay={0.7} />
          <span className="eyebrow">Your agent profile today</span>
          <h2 className="toon-title text-4xl text-gold mt-2">{verdict.title}</h2>
          <p className="mt-3 text-lg font-semibold max-w-xl mx-auto">{verdict.text}</p>
          <p className="mt-3 font-pixel text-sm text-faint">Quiz total: +{state.xp} XP · a new quiz arrives tomorrow</p>
          <Button variant="primary" className="mt-5" onClick={() => navigate('')}>Back to your desk</Button>
        </motion.div>
      )}
    </AgentScreen>
  );
}
