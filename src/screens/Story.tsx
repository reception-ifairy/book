import { useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowUp, GitFork, ImagePlus, Laugh, Mic, PenLine, Share2, ShieldCheck, SquareTerminal, Undo2, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { SVGCharacter } from '../components/SVGCharacter';
import { TimelineMap } from '../components/TimelineMap';
import { Burst, Equalizer, RuneLoader } from '../components/Effects';
import { api, rememberRun, type TaleCard } from '../api';
import { coverStyle, ENDING, KIND } from '../meta';
import { Badge, Button, IconButton, Kbd, Meter, Sheet, cx, useToast } from '../ui';
import { SUDO_MANA_COST, type Choice, type ChoiceKind, type Page, type PublicConfig, type Story } from '../../shared/types';

const KIND_ICON: Record<ChoiceKind | 'custom', typeof Zap> = {
  sane: ShieldCheck,
  chaos: Zap,
  dumb: Laugh,
  sudo: SquareTerminal,
  custom: PenLine,
};

type Picked = { id: string; kind: ChoiceKind | 'custom'; label: string };

function WritingIndicator({ page }: { page: number }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted" aria-live="polite">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-ember shadow-[0_0_8px_var(--color-ember)]"
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
      IGNIS is writing page {page}…
    </div>
  );
}

type Attachment = { mime: 'image/jpeg'; data: string; preview: string };

/** Downscales a picked image so artifacts stay well under the upload limit. */
async function toAttachment(file: File): Promise<Attachment> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const preview = canvas.toDataURL('image/jpeg', 0.85);
  return { mime: 'image/jpeg', data: preview.split(',')[1], preview };
}

/**
 * Reveals `text` a few characters per frame. Progress is tied to `key` (the page id), so a new page
 * never inherits the previous page's "done" state for even a frame.
 */
function useTypewriter(text: string, key: string) {
  const [state, setState] = useState({ key: '', shown: '', done: false });
  useEffect(() => {
    if (!key) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setState({ key, shown: text, done: true });
      return;
    }
    setState({ key, shown: '', done: false });
    let i = 0;
    const timer = setInterval(() => {
      i += 4;
      const done = i >= text.length;
      setState({ key, shown: text.slice(0, i), done });
      if (done) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [key, text]);
  const skip = useCallback(() => setState({ key, shown: text, done: true }), [key, text]);
  const current = state.key === key;
  return { shown: current ? (state.done ? text : state.shown) : '', done: current && state.done, skip };
}

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

export function StoryScreen({ storyId }: { storyId: string }) {
  const toast = useToast();
  const [story, setStory] = useState<Story | null>(null);
  const [loadError, setLoadError] = useState('');
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [tale, setTale] = useState<TaleCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [imageState, setImageState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [listening, setListening] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [burst, setBurst] = useState<{ key: number; target: string; x: number; y: number; color: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const page: Page | undefined = story?.pages[story.currentPageId];
  const { shown, done, skip } = useTypewriter(page?.narration ?? '', page?.id ?? '');

  useEffect(() => {
    api.story(storyId)
      .then((s) => {
        setStory(s);
        rememberRun(s);
        api.tales().then((ts) => setTale(ts.find((t) => t.id === s.taleId) ?? null)).catch(() => {});
      })
      .catch((e) => setLoadError(e.message));
    api.config().then(setConfig).catch(() => {});
  }, [storyId]);

  // Illustration arrives after the text so reading never waits on the image model.
  useEffect(() => {
    if (!story || !page || page.imageUrl || !config?.image) return;
    let alive = true;
    setImageState('loading');
    api.image(story.id, page.id)
      .then(({ url }) => {
        if (!alive) return;
        setStory((s) => (s ? { ...s, pages: { ...s.pages, [page.id]: { ...s.pages[page.id], imageUrl: url } } } : s));
        setImageState('idle');
      })
      .catch(() => alive && setImageState('failed'));
    return () => {
      alive = false;
    };
  }, [page?.id, config?.image]);

  // Narration audio: provider TTS when configured, the browser's voice otherwise.
  useEffect(() => {
    const stop = () => {
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
    };
    if (!voiceOn || !story || !page) return stop;
    let alive = true;
    if (config?.tts && config.tts !== 'browser') {
      api.speech(story.id, page.id).then(({ url }) => {
        if (!alive || !url) return;
        audioRef.current = new Audio(url);
        audioRef.current.play().catch(() => {});
      }).catch((e) => toast(e.message, 'error'));
    } else if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(`${page.narration.replace(/[*_#`]/g, '')} ... ${page.quip}`);
      u.lang = story.lang === 'pl' ? 'pl-PL' : 'en-US';
      u.pitch = 0.7;
      window.speechSynthesis.speak(u);
    }
    return () => {
      alive = false;
      stop();
    };
  }, [voiceOn, page?.id]);

  const send = async (input: { choiceId?: string; custom?: string }, chosen: Picked) => {
    if (!story || !page || busy) return;
    setBusy(true);
    setPicked(chosen);
    try {
      const { story: next } = await api.act(story.id, {
        pageId: page.id,
        ...input,
        image: input.custom !== undefined && attachment ? { mime: attachment.mime, data: attachment.data } : undefined,
      });
      setStory(next);
      rememberRun(next);
      setCustom('');
      setAttachment(null);
      setImageState('idle');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
      setPicked(null);
    }
  };

  /** Fires the burst from the click point (or the card's center for keyboard picks), then sends. */
  const choose = (c: Choice, e?: { clientX: number; clientY: number }) => {
    if (!page || busy) return;
    if (c.kind === 'sudo' && page.stats.mana < SUDO_MANA_COST) return toast('Not enough mana for sudo.', 'error');
    const el = document.querySelector(`[data-choice="${c.id}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      const x = e && e.clientX ? e.clientX - r.left : r.width / 2;
      const y = e && e.clientY ? e.clientY - r.top : r.height / 2;
      setBurst({ key: Date.now(), target: c.id, x, y, color: KIND[c.kind].color });
    }
    send({ choiceId: c.id }, { id: c.id, kind: c.kind, label: c.label });
  };

  const sendCustom = () => send({ custom }, { id: 'custom', kind: 'custom', label: custom.trim() || 'Shows the artifact' });

  const jump = async (pageId: string) => {
    if (!story) return;
    setBusy(true);
    try {
      setStory(await api.goto(story.id, pageId));
      setShowMap(false);
      toast('Rolled back. Your next move forks a new branch.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const listen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !story) return toast('Voice input is not supported in this browser.', 'error');
    const rec = new SR();
    rec.lang = story.lang === 'pl' ? 'pl-PL' : 'en-US';
    rec.onresult = (e: any) => setCustom((c) => `${c} ${e.results[0][0].transcript}`.trim().slice(0, 280));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const share = async () => {
    if (!story || !page) return;
    const text = `TIMELINE #${story.timeline} · ${tale?.title[story.lang] ?? story.taleId}\n${page.ending ? `${ENDING[page.ending.type].label}: ${page.ending.title}\n` : ''}canon ${page.canon}% · chaos ${page.stats.chaos} · karma ${page.stats.karma}\nIGNIS: "${page.quip}"\n${location.href}`;
    try {
      await navigator.clipboard.writeText(text);
      toast('Timeline card copied to clipboard.');
    } catch {
      toast('Clipboard blocked. Copy the URL instead.', 'error');
    }
  };

  // Keyboard: 1-4 choose, / type, M map, V voice, Space/Enter skip the typewriter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || !page) return;
      if (!done && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        return skip();
      }
      const n = Number(e.key);
      if (n >= 1 && n <= page.choices.length && done && !busy) {
        return choose(page.choices[n - 1]);
      }
      if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key.toLowerCase() === 'm') setShowMap((v) => !v);
      else if (e.key.toLowerCase() === 'v') setVoiceOn((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!story || !page) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-center">
        {loadError ? (
          <div>
            <p className="font-serif text-2xl">This timeline does not exist.</p>
            <p className="text-muted mt-2">{loadError}</p>
            <a href="#/" className="inline-block mt-6 text-ember hover:underline">Back to the tales</a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-muted">
            <SVGCharacter isTalking mood="neutral" size={120} />
            <span className="eyebrow">Decrypting timeline…</span>
          </div>
        )}
      </div>
    );
  }


  const glitch = Math.max(0, (60 - page.canon) / 60);
  const parent = page.parentId ? story.pages[page.parentId] : null;
  const canSend = !busy && (custom.trim().length > 0 || !!attachment);
  const forks = Object.values(story.pages).filter((p) => p.parentId && Object.values(story.pages).some((q) => q.parentId === p.parentId && q.id !== p.id)).length;
  const ending = page.ending ? ENDING[page.ending.type] : null;
  const endingColor = ending ? { ok: 'var(--color-sane)', warn: 'var(--color-dumb)', danger: 'var(--color-danger)', ember: 'var(--color-ember)' }[ending.tone] : '';

  const illustration = config?.image ? (
    <div className="relative aspect-square rounded-2xl overflow-hidden border border-line bg-surface shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]">
      <AnimatePresence mode="wait">
        {page.imageUrl ? (
          <motion.div key={page.imageUrl} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* "Developing" reveal: blurred and desaturated, then sharp, then a slow drift. */}
            <motion.img
              src={page.imageUrl}
              alt={page.imagePrompt}
              className="absolute inset-0 w-full h-full object-cover kenburns"
              initial={{ filter: 'blur(24px) saturate(0) brightness(1.4)', scale: 1.1 }}
              animate={{ filter: 'blur(0px) saturate(1) brightness(1)', scale: 1 }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.div className="absolute inset-0 bg-ember mix-blend-overlay" initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} transition={{ duration: 1.2 }} />
          </motion.div>
        ) : (
          <motion.div key="placeholder" className="absolute inset-0 grid place-items-center" style={tale ? coverStyle(tale.hue) : undefined} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {imageState === 'failed' ? (
              <div className="flex flex-col items-center gap-3 text-sm text-ink/80">
                <motion.span className="text-6xl" animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 2, repeat: Infinity }}>{tale?.emoji}</motion.span>
                <span>Illustration failed. Imagine harder.</span>
              </div>
            ) : (
              <>
                <div className="absolute inset-0 scanline" />
                <div className="relative flex flex-col items-center gap-4 text-sm text-ink/80">
                  <RuneLoader />
                  <span className="font-mono text-xs tracking-wider">rendering holographic projection…</span>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  ) : null;

  const stats = (
    <>
      <Meter label="Canon" value={page.canon} color="var(--color-ink)" />
      <Meter label="Chaos" value={page.stats.chaos} color="var(--color-chaos)" />
      <Meter label="Karma" value={page.stats.karma} min={-100} max={100} center color="var(--color-dumb)" />
      <Meter label="Mana" value={page.stats.mana} color="var(--color-mana)" />
    </>
  );

  const parentInventory = new Set(parent?.inventory ?? []);

  return (
    <div style={{ ['--glitch' as string]: glitch }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-line">
        <div className="mx-auto max-w-6xl h-14 px-4 sm:px-6 flex items-center gap-3">
          <IconButton label="Back to tales" onClick={() => (location.hash = '/')}>
            <ArrowLeft size={18} />
          </IconButton>
          <span className="grid place-items-center w-8 h-8 rounded-lg text-base shrink-0 shadow-[0_0_16px_-4px_var(--color-ember)]" style={tale ? coverStyle(tale.hue) : undefined}>{tale?.emoji}</span>
          <div className="min-w-0">
            <div className={cx('font-serif font-semibold truncate leading-tight', glitch > 0 && 'reality-tear')}>{tale?.title[story.lang] ?? '…'}</div>
            <div className="font-mono text-[11px] text-faint">#{story.timeline} · {story.heroName}</div>
          </div>
          <div className="hidden lg:grid grid-cols-4 gap-5 w-[440px] ml-auto mr-4">{stats}</div>
          <div className="flex items-center gap-1 ml-auto lg:ml-0">
            <IconButton label={voiceOn ? 'Mute narration (V)' : 'Read aloud (V)'} active={voiceOn} onClick={() => setVoiceOn((v) => !v)}>
              {voiceOn ? <><Volume2 size={18} /><Equalizer /></> : <VolumeX size={18} />}
            </IconButton>
            <IconButton label="Timeline map (M)" active={showMap} onClick={() => setShowMap(true)}>
              <GitFork size={18} />
              {forks > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-ember shadow-[0_0_6px_var(--color-ember)]" />}
            </IconButton>
            <IconButton label="Copy timeline card" onClick={share}>
              <Share2 size={18} />
            </IconButton>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 lg:py-10 grid lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] gap-8 lg:gap-12">
        {/* Visual column */}
        <aside className="order-last lg:order-none lg:sticky lg:top-24 self-start space-y-4">
          {illustration && <div className="hidden lg:block">{illustration}</div>}

          <div className="spotlight card p-4 hidden lg:flex gap-4 items-start">
            <div className="shrink-0 -my-1">
              <SVGCharacter isTalking={busy || !done} mood={busy ? 'panic' : page.mood} size={config?.image ? 64 : 120} />
            </div>
            <div className="min-w-0">
              <div className="eyebrow mb-1">IGNIS · {busy ? 'compiling' : page.mood}</div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={busy ? 'busy' : page.id}
                  className="font-serif italic text-muted leading-snug"
                  initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  {busy ? 'Compiling your next mistake…' : `“${page.quip}”`}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className="card p-4 grid grid-cols-2 gap-4 lg:hidden">{stats}</div>

          <div className="card p-4">
            <div className="eyebrow mb-2">Inventory</div>
            {page.inventory.length ? (
              <motion.div layout className="flex flex-wrap gap-1.5">
                <AnimatePresence>
                  {page.inventory.map((i) => {
                    const fresh = !!parent && !parentInventory.has(i);
                    return (
                      <motion.span
                        layout
                        key={i}
                        initial={{ opacity: 0, scale: 0.6, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        className={cx(
                          'font-mono text-xs px-2 py-1 rounded-md border',
                          fresh ? 'text-ember border-[#ff6b3d66] bg-ember-soft shadow-[0_0_14px_-4px_var(--color-ember)]' : 'bg-raised border-line text-muted',
                        )}
                      >
                        {fresh && <span className="mr-1">✦</span>}
                        {i}
                      </motion.span>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            ) : (
              <p className="text-sm text-faint">Empty. Like your plan.</p>
            )}
          </div>
        </aside>

        {/* Reading column */}
        <article className="min-w-0 max-w-[68ch]" style={{ perspective: 1600 }}>
          {illustration && <div className="lg:hidden mb-6">{illustration}</div>}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page.id}
              className="relative"
              style={{ transformOrigin: 'left center' }}
              initial={{ opacity: 0, rotateY: 16, x: 48, filter: 'blur(8px)' }}
              animate={{ opacity: 1, rotateY: 0, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, rotateY: -18, x: -56, filter: 'blur(8px)' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* An ember light sweeping across the fresh page. */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -inset-y-4 w-32 -skew-x-12 bg-gradient-to-r from-transparent via-[#ff6b3d1f] to-transparent"
                initial={{ left: '-20%', opacity: 1 }}
                animate={{ left: '110%', opacity: 0 }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
              />

              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="eyebrow">Page {page.depth + 1}</span>
                {page.action && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted max-w-full">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: KIND[page.action.kind === 'boot' ? 'sane' : page.action.kind].color, boxShadow: `0 0 6px ${KIND[page.action.kind === 'boot' ? 'sane' : page.action.kind].color}` }} />
                    <span className="truncate">{page.action.label}</span>
                  </span>
                )}
              </div>

              <div className={cx('prose-story', !done && 'caret cursor-pointer')} onClick={done ? undefined : skip}>
                <Markdown>{shown}</Markdown>
              </div>
              {!done && (
                <button onClick={skip} className="mt-2 text-xs text-faint hover:text-muted inline-flex items-center gap-2">
                  Skip animation <Kbd>Space</Kbd>
                </button>
              )}

              <div className="lg:hidden mt-6 flex items-center gap-3 rounded-xl bg-surface border border-line px-3 py-2">
                <SVGCharacter isTalking={busy || !done} mood={busy ? 'panic' : page.mood} size={44} />
                <p className="font-serif italic text-sm text-muted leading-snug">{busy ? 'Compiling your next mistake…' : `“${page.quip}”`}</p>
              </div>

              {/* What happens next */}
              <div className="mt-8">
                {page.ending && ending ? (
                  <motion.div
                    key={`end-${page.id}`}
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={page.ending.type === 'death' ? { opacity: 1, y: 0, scale: 1, x: [0, -12, 10, -8, 6, -3, 0] } : { opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                    className="card p-6 sm:p-8 text-center relative overflow-hidden"
                    style={{ boxShadow: `0 0 60px -20px ${endingColor}` }}
                  >
                    <div className="absolute inset-0 opacity-40" style={tale ? coverStyle(tale.hue) : undefined} />
                    <motion.div className="absolute inset-0" style={{ background: endingColor }} initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} transition={{ duration: 1.2, delay: 0.3 }} />
                    <Burst key={page.id} x="50%" y="40%" color={endingColor} count={32} distance={190} />
                    <div className="relative">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.5 }}>
                        <Badge tone={ending.tone}>{ending.label}</Badge>
                      </motion.div>
                      <motion.h2
                        className="font-serif text-3xl sm:text-4xl mt-4"
                        style={{ textShadow: `0 0 28px ${endingColor}` }}
                        initial={{ opacity: 0, letterSpacing: '0.3em', filter: 'blur(8px)' }}
                        animate={{ opacity: 1, letterSpacing: '0em', filter: 'blur(0px)' }}
                        transition={{ duration: 1, delay: 0.6 }}
                      >
                        {page.ending.title}
                      </motion.h2>
                      <p className="text-sm text-muted mt-3">
                        {Object.keys(story.pages).length} pages written in this timeline · canon {page.canon}% intact
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 mt-6">
                        {parent && (
                          <Button onClick={() => jump(parent.id)} disabled={busy}><Undo2 size={16} /> Roll back one page</Button>
                        )}
                        <Button onClick={() => setShowMap(true)}><GitFork size={16} /> Fork from the map</Button>
                        <Button variant="primary" onClick={share}><Share2 size={16} /> Share ending</Button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  (done || busy) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                      <div className="eyebrow mb-3">{busy ? 'Committed' : 'What do you do?'}</div>
                      <ol className="space-y-2">
                        {picked?.kind === 'custom' && (
                          <motion.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                            <ChoiceCard index={null} kind="custom" label={picked.label} committed />
                          </motion.li>
                        )}
                        {page.choices.map((c, i) => {
                          const noMana = c.kind === 'sudo' && page.stats.mana < SUDO_MANA_COST;
                          const isPicked = picked?.id === c.id;
                          return (
                            <motion.li
                              key={c.id}
                              initial={{ opacity: 0, x: -12 }}
                              animate={busy && !isPicked ? { opacity: 0.22, x: 0, scale: 0.98, filter: 'grayscale(1)' } : { opacity: 1, x: 0, scale: isPicked ? 1.01 : 1, filter: 'grayscale(0)' }}
                              transition={{ delay: busy ? 0 : i * 0.06, type: 'spring', stiffness: 300, damping: 26 }}
                            >
                              <ChoiceCard
                                index={i + 1}
                                id={c.id}
                                kind={c.kind}
                                label={c.label}
                                disabled={noMana || busy}
                                committed={isPicked}
                                onPick={(e) => choose(c, e)}
                                title={noMana ? `Needs ${SUDO_MANA_COST} mana` : undefined}
                              >
                                {burst?.target === c.id && <Burst key={burst.key} x={burst.x} y={burst.y} color={burst.color} />}
                              </ChoiceCard>
                            </motion.li>
                          );
                        })}
                      </ol>

                      {busy ? (
                        <div className="mt-5"><WritingIndicator page={page.depth + 2} /></div>
                      ) : (
                        <>
                          {/* Composer */}
                          <div className="ring-flow mt-4 rounded-2xl border border-line bg-surface transition-shadow">
                            {attachment && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-3 px-3 pt-3">
                                <img src={attachment.preview} alt="Attached artifact" className="w-12 h-12 object-cover rounded-lg border border-ember shadow-[0_0_16px_-4px_var(--color-ember)]" />
                                <span className="text-xs text-muted flex-1">Artifact attached. IGNIS will weave it into the story.</span>
                                <IconButton label="Remove artifact" onClick={() => setAttachment(null)}><X size={16} /></IconButton>
                              </motion.div>
                            )}
                            <textarea
                              ref={inputRef}
                              rows={1}
                              value={custom}
                              onChange={(e) => setCustom(e.target.value.slice(0, 280))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (canSend) sendCustom();
                                } else if (e.key === 'Escape') inputRef.current?.blur();
                              }}
                              placeholder="Or write your own move…"
                              className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] placeholder:text-faint focus:outline-none field-sizing-content max-h-40"
                            />
                            <div className="flex items-center gap-1 px-2 pb-2">
                              <IconButton label="Dictate your move" active={listening} onClick={listen}>
                                <Mic size={18} />
                                {listening && <Equalizer />}
                              </IconButton>
                              {config?.vision && (
                                <IconButton label="Attach an artifact image" active={!!attachment} onClick={() => fileRef.current?.click()}><ImagePlus size={18} /></IconButton>
                              )}
                              <span className="ml-auto mr-2 text-xs text-faint tabular-nums">{custom.length > 200 ? `${custom.length}/280` : ''}</span>
                              <motion.div animate={canSend ? { scale: 1 } : { scale: 0.9 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={!canSend}
                                  onClick={sendCustom}
                                  aria-label="Send move"
                                  className={cx('h-9 w-9 px-0', canSend && 'shadow-[0_0_22px_-2px_var(--color-ember)]')}
                                >
                                  <ArrowUp size={18} />
                                </Button>
                              </motion.div>
                            </div>
                            <input
                              ref={fileRef}
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                e.target.value = '';
                                if (f) setAttachment(await toAttachment(f).catch(() => null));
                              }}
                            />
                          </div>
                          <p className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-faint">
                            <span><Kbd>1</Kbd>–<Kbd>{page.choices.length}</Kbd> choose</span>
                            <span><Kbd>/</Kbd> write</span>
                            <span><Kbd>M</Kbd> timeline</span>
                            <span><Kbd>V</Kbd> voice</span>
                          </p>
                        </>
                      )}
                    </motion.div>
                  )
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </article>
      </div>

      <Sheet open={showMap} onClose={() => setShowMap(false)} title="Timeline">
        <TimelineMap story={story} onJump={jump} busy={busy} />
      </Sheet>
    </div>
  );
}

/** One choice: glowing kind icon, label, and its number key. */
function ChoiceCard({
  index,
  id,
  kind,
  label,
  disabled,
  committed,
  onPick,
  title,
  children,
}: {
  index: number | null;
  id?: string;
  kind: ChoiceKind | 'custom';
  label: string;
  disabled?: boolean;
  committed?: boolean;
  onPick?: (e: React.MouseEvent) => void;
  title?: string;
  children?: React.ReactNode;
}) {
  const { color, label: kindLabel } = KIND[kind];
  const Icon = KIND_ICON[kind];
  return (
    <button
      data-choice={id}
      disabled={disabled && !committed}
      onClick={committed ? undefined : onPick}
      title={title}
      className={cx(
        'spotlight group relative w-full flex items-center gap-4 text-left rounded-xl border border-line bg-surface px-3.5 py-3 transition-all',
        !disabled && 'hover:bg-raised hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_var(--k)] active:scale-[0.99]',
        disabled && !committed && 'opacity-40',
        committed && 'commit-glow cursor-default',
      )}
      style={{ ['--k' as string]: color, ['--spot' as string]: color }}
    >
      <span
        className={cx('glow-icon grid place-items-center w-10 h-10 rounded-lg shrink-0 border transition-transform group-hover:scale-110 group-hover:-rotate-6', committed && 'glow-on')}
        style={{ color, borderColor: `color-mix(in srgb, ${color} 30%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-snug">{label}</span>
        <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs" style={{ color }}>
          {kindLabel}
          {kind === 'sudo' && <span className="text-faint">· −{SUDO_MANA_COST} mana</span>}
        </span>
      </span>
      {index !== null && <Kbd>{index}</Kbd>}
      {children}
    </button>
  );
}
