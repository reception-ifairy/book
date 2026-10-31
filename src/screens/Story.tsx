import { useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowUp, BookMarked, Brain, GitFork, HeartHandshake, ImagePlus, Laugh, Mic, PenLine, ScrollText, Share2, ShieldCheck, Sparkles, SquareTerminal, Undo2, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { SVGCharacter } from '../components/SVGCharacter';
import { ArchivistAvatar } from '../components/ArchivistAvatar';
import { DiceTray } from '../components/DiceTray';
import { TimelineMap } from '../components/TimelineMap';
import { ComicBurst, Equalizer, RuneLoader, StringLights } from '../components/Effects';
import { api, rememberRun, type TaleCard } from '../api';
import { coverStyle, ENDING, KIND, WORLD_TEXT } from '../meta';
import { useArt } from '../artkit';
import { Badge, Button, IconButton, Kbd, Meter, Sheet, SnowToggle, cx, useToast } from '../ui';
import { SUDO_MANA_COST, worldOf, type Choice, type ChoiceKind, type LoreRef, type Mood, type Page, type PublicConfig, type PublicStory } from '../../shared/types';

const KIND_ICON: Record<ChoiceKind | 'custom', typeof Zap> = {
  sane: ShieldCheck,
  chaos: Zap,
  dumb: Laugh,
  sudo: SquareTerminal,
  logos: Brain,
  mythos: ScrollText,
  gnosis: HeartHandshake,
  phantasia: Sparkles,
  custom: PenLine,
};

/** The sound effect each kind of choice makes when picked. */
const SFX: Record<ChoiceKind | 'custom', string> = {
  sane: 'OK!', chaos: 'ZAP!', dumb: 'BONK!', sudo: 'SUDO!', logos: 'CLICK!', mythos: 'ONCE…', gnosis: 'AWW!', phantasia: 'SPARK!', custom: 'POOF!',
};

/** IGNIS narrates Grimm Protocol; the Archivist narrates the iFairy world. */
function Narrator({ ifairy, isTalking, mood, size, sparks }: { ifairy: boolean; isTalking: boolean; mood: Mood; size: number; sparks?: boolean }) {
  return ifairy ? <ArchivistAvatar isTalking={isTalking} size={size} /> : <SVGCharacter isTalking={isTalking} mood={mood} size={size} sparks={sparks} />;
}

/** Every canon passage cited along the path to this page, newest first, each once. */
function codexOf(story: PublicStory, page: Page): LoreRef[] {
  const seen = new Map<string, LoreRef>();
  for (let p: Page | undefined = page; p; p = p.parentId ? story.pages[p.parentId] : undefined) {
    for (const l of p.lore ?? []) if (!seen.has(l.ref)) seen.set(l.ref, l);
  }
  return [...seen.values()];
}

type Picked = { id: string; kind: ChoiceKind | 'custom'; label: string };

function WritingIndicator({ page, text }: { page: number; text: string }) {
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
      {text} {page}…
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
  const art = useArt();
  const [story, setStory] = useState<PublicStory | null>(null);
  const [loadError, setLoadError] = useState('');
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [tale, setTale] = useState<TaleCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [imageState, setImageState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [listening, setListening] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [burst, setBurst] = useState<{ key: number; target: string; x: number; y: number; color: string; word: string } | null>(null);
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
        if (!s.adventure) api.tales().then((ts) => setTale(ts.find((t) => t.id === s.taleId) ?? null)).catch(() => {});
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
      setBurst({ key: Date.now(), target: c.id, x, y, color: KIND[c.kind].color, word: SFX[c.kind] });
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
    const W = WORLD_TEXT[worldOf(story)];
    const head = story.adventure ?? tale;
    const endingLabel = page.ending ? W.endings[page.ending.type] ?? ENDING[page.ending.type].label : '';
    const meters = story.adventure
      ? `${W.meters.karma.toLowerCase()} ${page.stats.karma} · ${W.meters.chaos.toLowerCase()} ${page.stats.chaos}`
      : `canon ${page.canon}% · chaos ${page.stats.chaos} · karma ${page.stats.karma}`;
    const text = `${story.adventure ? 'JOURNEY' : 'TIMELINE'} #${story.timeline} · ${head?.title[story.lang] ?? story.taleId}\n${page.ending ? `${endingLabel}: ${page.ending.title}\n` : ''}${meters}\n${W.narrator}: "${page.quip}"\n${location.href}`;
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


  const ifairy = worldOf(story) === 'ifairy';
  const W = WORLD_TEXT[worldOf(story)];
  // The header and placeholders show the Grimm tale or the pinned iFairy adventure card.
  const head = story.adventure ?? tale;
  const codex = ifairy ? codexOf(story, page) : [];
  const glitch = Math.max(0, (60 - page.canon) / 60);
  // Getting garbage-collected leaves IGNIS seeing spirals, like the bonked robot in the workshop.
  const ignisMood = busy || page.ending?.type === 'death' ? 'panic' : page.mood;
  const parent = page.parentId ? story.pages[page.parentId] : null;
  const canSend = !busy && (custom.trim().length > 0 || !!attachment);
  const forks = Object.values(story.pages).filter((p) => p.parentId && Object.values(story.pages).some((q) => q.parentId === p.parentId && q.id !== p.id)).length;
  const ending = page.ending ? { ...ENDING[page.ending.type], label: W.endings[page.ending.type] ?? ENDING[page.ending.type].label } : null;
  const endingColor = ending ? { ok: 'var(--color-sane)', warn: 'var(--color-dumb)', danger: 'var(--color-danger)', ember: 'var(--color-ember)' }[ending.tone] : '';

  const illustration = config?.image ? (
    <div className="frame">
    <div className="relative aspect-square overflow-hidden bg-screen">
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
          <motion.div key="placeholder" className="absolute inset-0 grid place-items-center" style={head ? coverStyle(head.hue) : undefined} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {head && art.src(`cover-${head.id}`) && (
              <img src={art.src(`cover-${head.id}`)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-45 blur-[2px] scale-105" />
            )}
            {imageState === 'failed' ? (
              <div className="flex flex-col items-center gap-3 text-sm text-ink/80">
                <motion.span className="text-6xl" animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 2, repeat: Infinity }}>{head?.emoji}</motion.span>
                <span>Illustration failed. Imagine harder.</span>
              </div>
            ) : (
              <>
                <div className="absolute inset-0 scanline" />
                <div className="relative flex flex-col items-center gap-4 text-sm text-ink/80">
                  {art.src('ignis-painting') ? (
                    <motion.img
                      src={art.src('ignis-painting')}
                      alt={art.alt('ignis-painting')}
                      className="w-44 h-44 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                      animate={{ y: [0, -8, 0], rotate: [0, -2, 2, 0] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ) : (
                    <RuneLoader />
                  )}
                  <span className="font-pixel text-sm text-pixel [text-shadow:0_0_8px_var(--color-pixel)]">painting this page…</span>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  ) : null;

  const stats = (
    <>
      {!ifairy && <Meter label="Canon" value={page.canon} color="var(--color-ink)" />}
      {ifairy && <Meter label={W.meters.karma} value={page.stats.karma} min={-100} max={100} center color="var(--color-mythos)" />}
      <Meter label={W.meters.chaos} value={page.stats.chaos} color={ifairy ? 'var(--color-gnosis)' : 'var(--color-chaos)'} />
      {!ifairy && <Meter label="Karma" value={page.stats.karma} min={-100} max={100} center color="var(--color-dumb)" />}
      <Meter label={W.meters.mana} value={page.stats.mana} color="var(--color-mana)" />
    </>
  );

  const parentInventory = new Set(parent?.inventory ?? []);

  return (
    <div style={{ ['--glitch' as string]: glitch }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[#3a2619] border-b-[3px] border-outline shadow-[0_6px_0_#00000033]">
        <div className="mx-auto max-w-6xl h-16 px-4 sm:px-6 flex items-center gap-3">
          <IconButton label="Back to tales" onClick={() => (location.hash = '/')}>
            <ArrowLeft size={18} />
          </IconButton>
          <span
            className="grid place-items-center w-10 h-10 rounded-xl text-lg shrink-0 border-[2.5px] border-outline shadow-[0_3px_0_var(--color-outline)] bg-cover bg-center"
            style={head ? (art.src(`cover-${head.id}`) ? { backgroundImage: `url(${art.src(`cover-${head.id}`)})` } : coverStyle(head.hue)) : undefined}
          >
            {head && !art.src(`cover-${head.id}`) && head.emoji}
          </span>
          <div className="min-w-0">
            <div className={cx('font-serif font-bold text-lg truncate leading-tight', glitch > 0 && 'reality-tear')}>{head?.title[story.lang] ?? '…'}</div>
            <div className="font-mono text-[11px] text-faint">#{story.timeline} · {story.heroName}</div>
          </div>
          <div className={cx('hidden lg:grid gap-5 ml-auto mr-4', ifairy ? 'grid-cols-3 w-[340px]' : 'grid-cols-4 w-[440px]')}>{stats}</div>
          <div className="flex items-center gap-1 ml-auto lg:ml-0">
            <IconButton label={voiceOn ? 'Mute narration (V)' : 'Read aloud (V)'} active={voiceOn} onClick={() => setVoiceOn((v) => !v)}>
              {voiceOn ? <><Volume2 size={18} /><Equalizer /></> : <VolumeX size={18} />}
            </IconButton>
            {ifairy && (
              <IconButton label="Codex: canon cited so far" active={showCodex} onClick={() => setShowCodex(true)}>
                <BookMarked size={18} />
                {codex.length > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_6px_var(--color-gold)]" />}
              </IconButton>
            )}
            <IconButton label="Timeline map (M)" active={showMap} onClick={() => setShowMap(true)}>
              <GitFork size={18} />
              {forks > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-ember shadow-[0_0_6px_var(--color-ember)]" />}
            </IconButton>
            <IconButton label="Copy timeline card" onClick={share}>
              <Share2 size={18} />
            </IconButton>
            <SnowToggle />
          </div>
        </div>
      </header>
      {/* Hung under the bar but scrolls away with the page, so it never covers what you're reading. */}
      <div className="relative h-0 z-20"><StringLights count={24} /></div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-10 lg:pt-14 grid lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] gap-8 lg:gap-12">
        {/* Visual column */}
        <aside className="order-last lg:order-none lg:sticky lg:top-24 self-start space-y-4">
          {illustration && <div className="hidden lg:block">{illustration}</div>}

          <div className="hidden lg:flex gap-5 items-start pt-2">
            <div className="shrink-0 -my-2">
              <Narrator ifairy={ifairy} isTalking={busy || !done} mood={ignisMood} size={config?.image ? 96 : 130} />
            </div>
            <div className="bubble min-w-0 flex-1 px-4 py-3 mt-2">
              <div className="eyebrow mb-1 !text-[#9c7f62]">{W.narrator} · {busy ? (ifairy ? 'writing' : 'compiling') : ifairy ? 'aside' : ignisMood}</div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={busy ? 'busy' : page.id}
                  className="font-serif font-medium text-[15px] leading-snug"
                  initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  {busy ? W.busy : `“${page.quip}”`}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className="card p-4 grid grid-cols-2 gap-4 lg:hidden">{stats}</div>

          {page.gm && <DiceTray key={page.id} rolls={page.gm.rolls} commit={story.gmCommit} />}

          <div className="card p-4">
            <div className="eyebrow mb-2">🎒 Inventory</div>
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
                          'font-pixel text-sm px-2 py-0.5 rounded-lg border-2 border-outline shadow-[0_2px_0_var(--color-outline)]',
                          fresh ? 'bg-gold text-outline shadow-[0_2px_0_var(--color-outline),0_0_16px_-2px_var(--color-gold)]' : 'bg-raised text-ink',
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
              <p className="text-sm text-faint">{W.emptyInventory}</p>
            )}
            {!!page.gm?.state.conditions.length && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="eyebrow">Conditions</span>
                {page.gm.state.conditions.map((c) => <Badge key={c} tone="warn">{c}</Badge>)}
              </div>
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
                className="pointer-events-none absolute -inset-y-4 w-32 -skew-x-12 bg-gradient-to-r from-transparent via-[#ffd36b33] to-transparent"
                initial={{ left: '-20%', opacity: 1 }}
                animate={{ left: '110%', opacity: 0 }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
              />

              <div className="card relative overflow-hidden p-6 sm:p-8">
              {/* Ruled-paper hint and a folded corner. */}
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50 [background:repeating-linear-gradient(180deg,transparent_0_33px,#e8d6b4_33px_34px)]" />
              <div aria-hidden className="absolute top-0 right-0 w-10 h-10 bg-[linear-gradient(225deg,var(--color-bg)_50%,#e9d4ac_50%)] border-l-[3px] border-b-[3px] border-outline rounded-bl-xl" />
              <div className="relative flex flex-wrap items-center gap-2 mb-5">
                <span className="eyebrow">Page {page.depth + 1}</span>
                {page.action && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted max-w-full">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: KIND[page.action.kind === 'boot' ? 'sane' : page.action.kind].color, boxShadow: `0 0 6px ${KIND[page.action.kind === 'boot' ? 'sane' : page.action.kind].color}` }} />
                    <span className="truncate">{page.action.label}</span>
                  </span>
                )}
              </div>

              <div className={cx('relative prose-story', !done && 'caret cursor-pointer')} onClick={done ? undefined : skip}>
                <Markdown>{shown}</Markdown>
              </div>
              {!done && (
                <button onClick={skip} className="relative mt-1 text-xs font-bold text-faint hover:text-muted inline-flex items-center gap-2">
                  Skip animation <Kbd>Space</Kbd>
                </button>
              )}
              </div>

              {page.safety?.distress && (
                // Shown whenever the player's own words sounded upset, whatever the narrator wrote.
                <div className="card mt-4 p-4 text-sm !bg-[#e8f4ff]" role="note">
                  <div className="font-serif font-bold">The Archivist hopes you are all right.</div>
                  <p className="text-muted mt-1">If something real is worrying you, please talk to a trusted adult. In the UK you can contact Childline free and in confidence: call 0800 1111 or visit childline.org.uk.</p>
                </div>
              )}

              <div className="lg:hidden mt-6 flex items-center gap-4">
                <Narrator ifairy={ifairy} isTalking={busy || !done} mood={ignisMood} size={64} sparks={false} />
                <p className="bubble flex-1 px-3 py-2 font-serif font-medium text-sm leading-snug">{busy ? W.busy : `“${page.quip}”`}</p>
              </div>

              {/* What happens next */}
              <div className="mt-8">
                {page.ending && ending ? (
                  done && (
                  <motion.div
                    key={`end-${page.id}`}
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={page.ending.type === 'death' ? { opacity: 1, y: 0, scale: 1, x: [0, -12, 10, -8, 6, -3, 0] } : { opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                    className="card p-6 sm:p-8 text-center relative overflow-visible"
                    style={{ boxShadow: `0 0 60px -20px ${endingColor}` }}
                  >
                    <div className="absolute inset-0 rounded-[17px] opacity-25" style={head ? coverStyle(head.hue) : undefined} />
                    <motion.div className="absolute inset-0 rounded-[17px]" style={{ background: endingColor }} initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} transition={{ duration: 1.2, delay: 0.3 }} />
                    <ComicBurst key={page.id} x="50%" y="38%" color={endingColor} word={page.ending.type === 'death' ? 'BONK!' : 'THE END!'} size={190} delay={0.45} />
                    <div className="relative">
                      {art.src(`ending-${page.ending.type}`) && (
                        <motion.img
                          src={art.src(`ending-${page.ending.type}`)}
                          alt={art.alt(`ending-${page.ending.type}`)}
                          className="mx-auto -mt-16 mb-2 w-32 h-32 object-contain drop-shadow-[4px_6px_0_var(--color-outline)]"
                          initial={{ scale: 0, rotate: -30 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 260, damping: 11, delay: 0.4 }}
                        />
                      )}
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.5 }}>
                        <Badge tone={ending.tone}>{ending.label}</Badge>
                      </motion.div>
                      <motion.h2
                        className="toon-title text-4xl sm:text-5xl mt-4 text-[#fff6e2]"
                        style={{ textShadow: `0 0 28px ${endingColor}` }}
                        initial={{ opacity: 0, letterSpacing: '0.3em', filter: 'blur(8px)' }}
                        animate={{ opacity: 1, letterSpacing: '0em', filter: 'blur(0px)' }}
                        transition={{ duration: 1, delay: 0.6 }}
                      >
                        {page.ending.title}
                      </motion.h2>
                      <p className="text-sm text-muted mt-3">
                        {Object.keys(story.pages).length} pages written in this {ifairy ? 'journey' : `timeline · canon ${page.canon}% intact`}
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
                  )
                ) : (
                  (done || busy) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                      <div className="font-serif font-bold text-lg text-gold mb-3 mt-2">{busy ? 'Committed!' : 'What do you do?'}</div>
                      <ol className="space-y-2">
                        {picked?.kind === 'custom' && (
                          <motion.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                            <ChoiceCard index={null} kind="custom" label={picked.label} kindLabel={W.customKind} committed />
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
                                letter={ifairy ? 'AB'[i] : undefined}
                                id={c.id}
                                kind={c.kind}
                                label={c.label}
                                disabled={noMana || busy}
                                committed={isPicked}
                                onPick={(e) => choose(c, e)}
                                title={noMana ? `Needs ${SUDO_MANA_COST} mana` : c.risk === 'risky' ? 'Risky: the dice decide how it goes' : undefined}
                                risky={c.risk === 'risky'}
                              >
                                {burst?.target === c.id && <ComicBurst key={burst.key} x={burst.x} y={burst.y} color={burst.color} word={burst.word} size={96} />}
                              </ChoiceCard>
                            </motion.li>
                          );
                        })}
                      </ol>

                      {busy ? (
                        <div className="mt-5"><WritingIndicator page={page.depth + 2} text={W.writing} /></div>
                      ) : (
                        <>
                          {/* Composer */}
                          <div className="ring-flow card mt-5 transition-shadow">
                            {attachment && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-3 px-3 pt-3">
                                <img src={attachment.preview} alt="Attached artifact" className="w-12 h-12 object-cover rounded-lg border-[2.5px] border-outline rotate-[-4deg] shadow-[2px_3px_0_var(--color-outline)]" />
                                <span className="text-xs text-muted flex-1">Artifact attached. {W.narrator} will weave it into the story.</span>
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
                              placeholder={ifairy && page.freeForm ? `C) ${page.freeForm}` : 'Or write your own move…'}
                              className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] font-semibold placeholder:text-faint focus:outline-none field-sizing-content max-h-40"
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
                          <p className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs font-semibold text-faint">
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
      {ifairy && (
        <Sheet open={showCodex} onClose={() => setShowCodex(false)} title="Codex">
          {!!page.gm?.state.facts.length && (
            <>
              <div className="eyebrow mb-2">Journal</div>
              <ul className="space-y-1.5 mb-6 text-sm">
                {page.gm.state.facts.map((f) => (
                  <li key={f.id}><span className="font-bold">{f.subject}:</span> <span className="text-muted">{f.text}</span>{f.ref && <span className="font-mono text-[11px] text-faint"> · {f.ref}</span>}</li>
                ))}
              </ul>
              <div className="eyebrow mb-2">Canon</div>
            </>
          )}
          <p className="text-sm text-muted mb-4">Canon passages from the iFairy Universe that the Archivist drew on along this path.</p>
          {codex.length ? (
            <ul className="space-y-3">
              {codex.map((l) => (
                <li key={l.ref} className="card p-4">
                  <div className="font-serif font-semibold leading-snug">{l.title}</div>
                  <div className="font-mono text-[11px] text-faint mt-0.5 break-all">{l.ref}</div>
                  <p className="text-sm text-muted mt-2 whitespace-pre-line">{l.excerpt}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-faint">No canon cited yet on this path.</p>
          )}
        </Sheet>
      )}
    </div>
  );
}

/** One choice: glowing kind icon, label, and its number key. */
function ChoiceCard({
  index,
  letter,
  id,
  kind,
  label,
  kindLabel: kindLabelOverride,
  risky,
  disabled,
  committed,
  onPick,
  title,
  children,
}: {
  index: number | null;
  /** iFairy options are lettered A and B, per the canon's choice block. */
  letter?: string;
  id?: string;
  kind: ChoiceKind | 'custom';
  label: string;
  kindLabel?: string;
  /** iFairy Game Master: picking this option rolls the dice. */
  risky?: boolean;
  disabled?: boolean;
  committed?: boolean;
  onPick?: (e: React.MouseEvent) => void;
  title?: string;
  children?: React.ReactNode;
}) {
  const { color } = KIND[kind];
  const kindLabel = kindLabelOverride ?? KIND[kind].label;
  const Icon = KIND_ICON[kind];
  const iconArt = useArt().src(`icon-${kind}`);
  return (
    <button
      data-choice={id}
      disabled={disabled && !committed}
      onClick={committed ? undefined : onPick}
      title={title}
      className={cx(
        'paper sticker spotlight group relative w-full flex items-center gap-4 text-left bg-surface px-3.5 py-3',
        disabled && !committed && 'opacity-40',
        committed && 'commit-glow cursor-default',
      )}
      style={{ ['--k' as string]: color, ['--spot' as string]: color }}
    >
      <span
        className={cx('grid place-items-center w-11 h-11 rounded-full shrink-0 border-[2.5px] border-outline text-white shadow-[0_3px_0_var(--color-outline)] transition-transform group-hover:scale-110 group-hover:-rotate-12', committed && 'animate-bounce')}
        style={{ background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${color} 55%, white), ${color})` }}
      >
        {iconArt ? (
          <img src={iconArt} alt="" className="w-[130%] max-w-none h-[130%] object-contain drop-shadow-[1px_2px_0_#241913]" />
        ) : (
          <Icon size={20} strokeWidth={2.5} className="drop-shadow-[1px_1px_0_#241913]" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold leading-snug">{letter && <span className="mr-1.5 font-serif" style={{ color }}>{letter})</span>}{label}</span>
        <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide" style={{ color }}>
          {kindLabel}
          {kind === 'sudo' && <span className="text-faint">· −{SUDO_MANA_COST} mana</span>}
          {risky && <span className="text-faint normal-case">· 🎲 risky</span>}
        </span>
      </span>
      {index !== null && <Kbd>{index}</Kbd>}
      {children}
    </button>
  );
}
