import { useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowUp, Dices, FileCheck2, ImagePlus, Loader2, PenLine, Stamp, Volume2, VolumeX } from 'lucide-react';
import { CHOICE_META, ENDING_META, MISSION_TYPES, locationOf, missionOf, type ChoiceKind } from '../../shared/arb';
import type { Choice, Page, PublicConfig, RollResult, Story } from '../../shared/types';
import { api } from '../api';
import { useAgent } from '../agent';
import { navigate } from '../App';
import { Cat } from '../components/Cat';
import { D20 } from '../components/D20';
import { ComicBurst } from '../components/Effects';
import { Shell } from '../components/Shell';
import { CAT_MOOD, KIND_COLOR, OUTCOME } from '../meta';
import { Badge, Button, IconButton, Kbd, Meter, cx, useToast } from '../ui';
import { stressColor } from '../desk';

/** Reveals `text` a few characters per frame; tied to `key` so a new page never flashes the old one. */
function useTypewriter(text: string, key: string) {
  const [state, setState] = useState({ key: '', shown: '', done: false });
  useEffect(() => {
    if (!key) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setState({ key, shown: text, done: true });
    setState({ key, shown: '', done: false });
    let i = 0;
    const t = setInterval(() => {
      i += 4;
      const done = i >= text.length;
      setState({ key, shown: text.slice(0, i), done });
      if (done) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [key, text]);
  const skip = useCallback(() => setState({ key, shown: text, done: true }), [key, text]);
  const current = state.key === key;
  return { shown: current ? (state.done ? text : state.shown) : '', done: current && state.done, skip };
}

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

export function MissionScreen({ storyId }: { storyId: string }) {
  const toast = useToast();
  const { agent, setAgent } = useAgent();
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [busy, setBusy] = useState<null | { risky: boolean; label: string }>(null);
  const [custom, setCustom] = useState('');
  const [imageState, setImageState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [voice, setVoice] = useState(false);
  const [burst, setBurst] = useState<{ key: number; word: string; color: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const page: Page | undefined = story?.pages[story.currentPageId];
  const { shown, done, skip } = useTypewriter(page?.narration ?? '', page?.id ?? '');
  const mission = story ? missionOf(story.missionId) : undefined;

  useEffect(() => {
    api.story(storyId).then(setStory).catch((e) => setError(e.message));
    api.config().then(setConfig).catch(() => {});
  }, [storyId]);

  useEffect(() => setImageState('idle'), [page?.id]);

  // Read aloud: the server voice when configured, otherwise the browser's.
  useEffect(() => {
    if (!voice || !page || !story || !done) return;
    let cancelled = false;
    const text = `${page.narration.replace(/[*_#`]/g, '')} ${page.catNote}`;
    if (config?.tts && config.tts !== 'browser') {
      api.speech(story.id, page.id).then(({ url }) => {
        if (cancelled || !url) return;
        audioRef.current?.pause();
        audioRef.current = new Audio(url);
        void audioRef.current.play().catch(() => {});
      }).catch((e) => toast(e.message, 'error'));
    } else if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = story.lang === 'pl' ? 'pl-PL' : 'en-GB';
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }
    return () => {
      cancelled = true;
      audioRef.current?.pause();
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    };
  }, [voice, page?.id, done]);

  const move = async (input: { choice?: Choice; custom?: string }) => {
    if (!story || !page || busy) return;
    const risky = input.custom ? true : !!input.choice?.risky && input.choice.kind !== 'pieczatka';
    setBusy({ risky, label: input.choice?.label ?? input.custom ?? '' });
    try {
      const res = await api.act(story.id, { pageId: page.id, ...(input.choice ? { choiceId: input.choice.id } : { custom: input.custom }) });
      setStory(res.story);
      setAgent(res.agent);
      setCustom('');
      if (res.page.roll) setBurst({ key: Date.now(), word: OUTCOME[res.page.roll.outcome].sfx, color: res.page.roll.outcome.includes('sukces') ? 'var(--color-gold)' : 'var(--color-candy)' });
      if (res.page.ending && res.story.settled) toast(`Akta zamknięte: +${res.story.settled.xp} XP`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!page || busy || isTyping(e.target)) return;
      if (!done && (e.key === ' ' || e.key === 'Enter')) return skip();
      const n = Number(e.key);
      const c = page.choices[n - 1];
      if (c && done && !(c.kind === 'pieczatka' && page.stats.stamps < 1)) void move({ choice: c });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const illustrate = async () => {
    if (!story || !page) return;
    setImageState('loading');
    try {
      const { url } = await api.image(story.id, page.id);
      setStory((s) => (s ? { ...s, pages: { ...s.pages, [page.id]: { ...s.pages[page.id], imageUrl: url } } } : s));
      setImageState('idle');
    } catch (e) {
      setImageState('failed');
      toast((e as Error).message, 'error');
    }
  };

  if (error) {
    return (
      <Shell active="">
        <div className="card p-6 max-w-lg mx-auto text-center">
          <p className="font-serif font-bold text-xl">Akta niedostępne</p>
          <p className="text-muted mt-2">{error}</p>
          <Button className="mt-4" onClick={() => navigate('')}>Wróć na Pulpit</Button>
        </div>
      </Shell>
    );
  }
  if (!story || !page || !mission || !agent) {
    return (
      <Shell active="">
        <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-muted" /></div>
      </Shell>
    );
  }

  const path: Page[] = [];
  for (let p: Page | undefined = page; p; p = p.parentId ? story.pages[p.parentId] : undefined) path.unshift(p);
  const place = locationOf(mission.locationId);
  const mine = story.agentId === agent.id;

  return (
    <Shell active="" wide>
      <a href="#/" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-gold"><ArrowLeft size={16} /> Pulpit</a>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 mt-3">
        <div className="min-w-0 space-y-5">
          <header className="card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="ember">{MISSION_TYPES[mission.type].emoji} {MISSION_TYPES[mission.type].name}</Badge>
              {story.paradox && <Badge tone="danger">Paradoks przydziału</Badge>}
              <span className="font-mono text-xs text-faint ml-auto">Sprawa nr {story.caseNo}</span>
            </div>
            <h1 className="toon-title text-3xl sm:text-4xl mt-2">{mission.title}</h1>
            <p className="text-sm text-muted mt-1">
              {mission.tale}
              {place && <> · <a className="underline" href={`#/mapa/${place.id}`}>{place.name}</a></>}
              {' · '}strona {page.depth + 1}
            </p>
          </header>

          <AnimatePresence mode="wait">
            <motion.article key={page.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-5 sm:p-7 relative overflow-hidden">
              {burst && <ComicBurst key={burst.key} x="85%" y={40} word={burst.word} color={burst.color} size={110} />}
              {page.action && (
                <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="eyebrow">Ruch agenta</span>
                  <span className="font-bold" style={{ color: KIND_COLOR[page.action.kind] }}>{CHOICE_META[page.action.kind].label}:</span>
                  <span className="text-muted">{page.action.label}</span>
                </div>
              )}
              {page.roll && <RollPanel roll={page.roll} />}

              {page.imageUrl ? (
                <img src={page.imageUrl} alt={page.imagePrompt} className="w-full max-w-md mx-auto rounded-2xl border-[3px] border-outline mb-5 aspect-square object-cover" />
              ) : config?.image ? (
                <Button size="sm" className="mb-4" onClick={illustrate} disabled={imageState === 'loading'}>
                  {imageState === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {imageState === 'failed' ? 'Spróbuj jeszcze raz' : 'Zilustruj stronę'}
                </Button>
              ) : null}

              <div className="prose-story" onClick={() => !done && skip()}>
                <Markdown>{shown || ' '}</Markdown>
              </div>

              {done && page.formFiled && (
                <motion.div initial={{ scale: 2, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: -8, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }} className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-lg border-[3px] border-candy text-candy font-comic text-lg tracking-wider">
                  <FileCheck2 size={18} /> ZŁOŻONO: {page.formFiled}
                </motion.div>
              )}

              <AnimatePresence>
                {done && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex items-start gap-3 rounded-2xl bg-raised border-2 border-outline p-3">
                    <Cat mood={page.catMood} size={56} />
                    <div className="text-sm">
                      <div className="eyebrow">Kot, Zastępca Dyrektora {CAT_MOOD[page.catMood].emoji} {CAT_MOOD[page.catMood].label}</div>
                      <div className="mt-0.5">{page.catNote}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2 mt-4">
                <IconButton label={voice ? 'Wyłącz czytanie na głos' : 'Czytaj na głos'} active={voice} onClick={() => setVoice((v) => !v)}>
                  {voice ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </IconButton>
                {!done && <span className="text-xs text-faint">Kliknij tekst albo naciśnij spację, żeby przewinąć.</span>}
              </div>
            </motion.article>
          </AnimatePresence>

          {page.ending ? (
            <EndingCard story={story} ending={page.ending} />
          ) : busy ? (
            <div className="card p-6 flex flex-col items-center gap-3 text-center" aria-live="polite">
              {busy.risky ? <D20 value={null} rolling size={84} /> : <Loader2 className="animate-spin text-muted" size={32} />}
              <span className="eyebrow animate-pulse">{busy.risky ? 'Test K20 w toku. Narratoriusz pisze stronę…' : `Narratoriusz pisze stronę ${page.depth + 2}…`}</span>
            </div>
          ) : mine ? (
            <section className={cx('space-y-3 transition-opacity', !done && 'opacity-50 pointer-events-none')} aria-label="Twój ruch">
              {page.choices.map((c, i) => (
                <ChoiceButton key={c.id} choice={c} index={i + 1} disabled={c.kind === 'pieczatka' && page.stats.stamps < 1} onPick={() => move({ choice: c })} />
              ))}
              <form
                className="card p-3 flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (custom.trim()) void move({ custom: custom.trim() });
                }}
              >
                <label className="flex-1">
                  <span className="eyebrow flex items-center gap-1.5 mb-1"><PenLine size={13} /> Własny ruch · zawsze test K20</span>
                  <textarea value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={280} rows={2} placeholder="np. Wręczam smokowi formularz N-2 i ciasteczko…" className="field resize-none" />
                </label>
                <Button variant="primary" disabled={!custom.trim()} aria-label="Wyślij ruch"><ArrowUp size={18} /></Button>
              </form>
            </section>
          ) : (
            <p className="card p-4 text-sm text-muted">To akta innego agenta. Możesz je czytać, ale nie wpisywać.</p>
          )}
        </div>

        <aside className="space-y-5 min-w-0">
          <section className="card p-5 space-y-4">
            <h2 className="font-serif font-bold text-lg">Wskaźniki sprawy</h2>
            <Meter label="Spójność Fabuły" value={page.stats.coherence} color="var(--color-sane)" />
            <Meter label="Stres" value={page.stats.stress} color={stressColor(page.stats.stress)} />
            <Meter label="Kofeina" value={page.stats.coffee} color="var(--color-ember)" />
            <div className="flex items-center justify-between">
              <span className="eyebrow">Pieczątki DKSF</span>
              <span className="flex gap-1" aria-label={`${page.stats.stamps} pieczątek`}>
                {Array.from({ length: Math.max(page.stats.stamps, 2) }, (_, i) => (
                  <Stamp key={i} size={20} className={i < page.stats.stamps ? 'text-candy' : 'text-faint opacity-40'} />
                ))}
              </span>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-serif font-bold text-lg">Dowody i załączniki</h2>
            {page.evidence.length ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {page.evidence.map((e) => <li key={e}><Badge>{e}</Badge></li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted mt-1">Teczka pusta. Jak sumienie Rumpelsztyka.</p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-serif font-bold text-lg">Przebieg sprawy</h2>
            <ol className="mt-2 space-y-2 text-sm">
              {path.map((p) => (
                <li key={p.id} className={cx('flex gap-2', p.id === page.id && 'font-bold')}>
                  <span className="font-mono text-faint w-5 shrink-0">{p.depth + 1}.</span>
                  <span className="min-w-0">
                    {p.action ? <span style={{ color: KIND_COLOR[p.action.kind] }}>{p.action.label}</span> : 'Otwarcie akt'}
                    {p.roll && <span className="text-xs text-faint"> · K20 {p.roll.die} → {OUTCOME[p.roll.outcome].label.toLowerCase()}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="card p-5 text-sm">
            <h2 className="font-serif font-bold text-lg">Odprawa</h2>
            <p className="mt-1">{mission.brief}</p>
            <p className="text-muted mt-2">{mission.details}</p>
            <p className="mt-2"><b>Formularze:</b> {mission.forms.join(', ')}</p>
          </section>
        </aside>
      </div>
    </Shell>
  );
}

function RollPanel({ roll }: { roll: RollResult }) {
  const o = OUTCOME[roll.outcome];
  return (
    <div className="mb-5 flex items-center gap-4 rounded-2xl border-2 border-outline bg-raised p-3">
      <D20 value={roll.die} size={64} />
      <div className="min-w-0 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">Test K20</span>
          <Badge tone={o.tone}>{o.label}</Badge>
        </div>
        <div className="font-mono mt-1">
          {roll.die} {roll.modifier >= 0 ? '+' : '−'} {Math.abs(roll.modifier)} = <b>{roll.total}</b> vs DC {roll.dc}
        </div>
        {roll.parts.length > 0 && <div className="text-xs text-faint mt-0.5">{roll.parts.map((p) => `${p.label} ${p.value > 0 ? '+' : ''}${p.value}`).join(' · ')}</div>}
      </div>
    </div>
  );
}

function ChoiceButton({ choice, index, disabled, onPick }: { choice: Choice; index: number; disabled: boolean; onPick: () => void }) {
  const color = KIND_COLOR[choice.kind as ChoiceKind];
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onPick}
      disabled={disabled}
      className="card w-full flex items-center gap-3 p-3 sm:p-4 text-left hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:pointer-events-none"
      style={{ borderLeft: `10px solid ${color}` }}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-bold leading-snug">{choice.label}</span>
        <span className="mt-0.5 inline-flex flex-wrap items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide" style={{ color }}>
          {CHOICE_META[choice.kind].label}
          {choice.kind === 'pieczatka' ? <span className="text-faint normal-case">· bez rzutu, −1 pieczątka</span> : choice.risky ? <span className="text-faint normal-case inline-flex items-center gap-1">· <Dices size={12} /> test K20</span> : <span className="text-faint normal-case">· bez ryzyka</span>}
        </span>
      </span>
      <Kbd>{index}</Kbd>
    </motion.button>
  );
}

function EndingCard({ story, ending }: { story: Story; ending: NonNullable<Page['ending']> }) {
  const meta = ENDING_META[ending.type];
  return (
    <motion.section initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card p-6 text-center">
      <motion.div
        initial={{ scale: 3, rotate: -30, opacity: 0 }}
        animate={{ scale: 1, rotate: -6, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.2 }}
        className={cx('inline-block px-5 py-2 rounded-xl border-4 font-comic text-3xl tracking-wider', meta.tone === 'ok' ? 'border-pine text-pine' : meta.tone === 'warn' ? 'border-gold text-[#8a6500]' : meta.tone === 'ember' ? 'border-ember text-ember' : 'border-candy text-candy')}
      >
        {meta.label.toUpperCase()}
      </motion.div>
      <h2 className="font-serif font-bold text-2xl mt-4">{ending.title}</h2>
      {story.settled && <p className="text-muted mt-1">Zaksięgowano: <b>+{story.settled.xp} XP</b></p>}
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        <Button variant="primary" onClick={() => navigate('')}>Wróć na Pulpit po kolejną misję</Button>
        <Button onClick={() => navigate('szkolenia')}>Odreaguj na szkoleniu</Button>
      </div>
    </motion.section>
  );
}
