import { useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowUp, GitFork, ImagePlus, Loader2, Mic, Share2, Undo2, Volume2, VolumeX, X, Sparkles } from 'lucide-react';
import { SVGCharacter } from '../components/SVGCharacter';
import { TimelineMap } from '../components/TimelineMap';
import { api, rememberRun, type TaleCard } from '../api';
import { coverStyle, ENDING, KIND } from '../meta';
import { Badge, Button, IconButton, Kbd, Meter, Sheet, cx, useToast } from '../ui';
import { SUDO_MANA_COST, type Page, type PublicConfig, type Story } from '../../shared/types';

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

function useTypewriter(text: string, key: string) {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(text);
      setDone(true);
      return;
    }
    setShown('');
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i += 4;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [key, text]);
  const skip = useCallback(() => {
    setShown(text);
    setDone(true);
  }, [text]);
  return { shown: done ? text : shown, done, skip };
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

  const send = async (input: { choiceId?: string; custom?: string }) => {
    if (!story || !page || busy) return;
    setBusy(true);
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
    }
  };

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
        const c = page.choices[n - 1];
        if (c.kind === 'sudo' && page.stats.mana < SUDO_MANA_COST) return toast('Not enough mana for sudo.', 'error');
        return send({ choiceId: c.id });
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

  const illustration = config?.image ? (
    <div className="relative aspect-square rounded-2xl overflow-hidden border border-line bg-surface">
      <AnimatePresence mode="wait">
        {page.imageUrl ? (
          <motion.img
            key={page.imageUrl}
            src={page.imageUrl}
            alt={page.imagePrompt}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        ) : (
          <motion.div key="placeholder" className="absolute inset-0 grid place-items-center" style={tale ? coverStyle(tale.hue) : undefined} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex flex-col items-center gap-3 text-sm text-ink/80">
              {imageState === 'failed' ? (
                <>
                  <span className="text-5xl">{tale?.emoji}</span>
                  <span>Illustration failed. Imagine harder.</span>
                </>
              ) : (
                <>
                  <Loader2 className="animate-spin" />
                  <span>Painting this page…</span>
                </>
              )}
            </div>
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

  return (
    <div style={{ ['--glitch' as string]: glitch }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-line">
        <div className="mx-auto max-w-6xl h-14 px-4 sm:px-6 flex items-center gap-3">
          <a href="#/" aria-label="Back to tales" className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-muted hover:text-ink hover:bg-raised">
            <ArrowLeft size={18} />
          </a>
          <span className="grid place-items-center w-8 h-8 rounded-lg text-base shrink-0" style={tale ? coverStyle(tale.hue) : undefined}>{tale?.emoji}</span>
          <div className="min-w-0">
            <div className={cx('font-serif font-semibold truncate leading-tight', glitch > 0 && 'reality-tear')}>{tale?.title[story.lang] ?? '…'}</div>
            <div className="font-mono text-[11px] text-faint">#{story.timeline} · {story.heroName}</div>
          </div>
          <div className="hidden lg:grid grid-cols-4 gap-5 w-[440px] ml-auto mr-4">{stats}</div>
          <div className="flex items-center gap-1 ml-auto lg:ml-0">
            <IconButton label={voiceOn ? 'Mute narration (V)' : 'Read aloud (V)'} active={voiceOn} onClick={() => setVoiceOn((v) => !v)}>
              {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </IconButton>
            <IconButton label="Timeline map (M)" active={showMap} onClick={() => setShowMap(true)}>
              <GitFork size={18} />
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

          <div className="card p-4 hidden lg:flex gap-4 items-start">
            <div className="shrink-0 -my-1">
              <SVGCharacter isTalking={busy || !done} mood={busy ? 'panic' : page.mood} size={config?.image ? 64 : 120} />
            </div>
            <div className="min-w-0">
              <div className="eyebrow mb-1">IGNIS · {busy ? 'compiling' : page.mood}</div>
              <p className="font-serif italic text-muted leading-snug">{busy ? 'Compiling your next mistake…' : `“${page.quip}”`}</p>
            </div>
          </div>

          <div className="card p-4 grid grid-cols-2 gap-4 lg:hidden">{stats}</div>

          <div className="card p-4">
            <div className="eyebrow mb-2">Inventory</div>
            {page.inventory.length ? (
              <div className="flex flex-wrap gap-1.5">
                {page.inventory.map((i) => (
                  <span key={i} className="font-mono text-xs px-2 py-1 rounded-md bg-raised border border-line text-muted">{i}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-faint">Empty. Like your plan.</p>
            )}
          </div>
        </aside>

        {/* Reading column */}
        <article className="min-w-0 max-w-[68ch]">
          {illustration && <div className="lg:hidden mb-6">{illustration}</div>}
          <AnimatePresence mode="wait">
            <motion.div key={page.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="eyebrow">Page {page.depth + 1}</span>
                {page.action && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted max-w-full">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: KIND[page.action.kind === 'boot' ? 'sane' : page.action.kind].color }} />
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
            </motion.div>
          </AnimatePresence>

          <div className="lg:hidden mt-6 flex items-center gap-3 rounded-xl bg-surface border border-line px-3 py-2">
            <SVGCharacter isTalking={busy || !done} mood={busy ? 'panic' : page.mood} size={44} />
            <p className="font-serif italic text-sm text-muted leading-snug">{busy ? 'Compiling your next mistake…' : `“${page.quip}”`}</p>
          </div>

          {/* What happens next */}
          <div className="mt-8">
            {page.ending ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6 sm:p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-40" style={tale ? coverStyle(tale.hue) : undefined} />
                <div className="relative">
                  <Badge tone={ENDING[page.ending.type].tone}>{ENDING[page.ending.type].label}</Badge>
                  <h2 className="font-serif text-3xl sm:text-4xl mt-4">{page.ending.title}</h2>
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
            ) : busy ? (
              <div className="space-y-3" aria-live="polite">
                <div className="flex items-center gap-2 text-sm text-muted"><Sparkles size={16} className="text-ember" /> IGNIS is writing page {page.depth + 2}…</div>
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-11/12" />
                <div className="skeleton h-4 w-4/5" />
              </div>
            ) : (
              done && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <div className="eyebrow mb-3">What do you do?</div>
                  <ol className="space-y-2">
                    {page.choices.map((c, i) => {
                      const noMana = c.kind === 'sudo' && page.stats.mana < SUDO_MANA_COST;
                      return (
                        <motion.li key={c.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                          <button
                            disabled={noMana}
                            onClick={() => send({ choiceId: c.id })}
                            title={noMana ? `Needs ${SUDO_MANA_COST} mana` : undefined}
                            className="group w-full flex items-start gap-4 text-left rounded-xl border border-line bg-surface px-4 py-3.5 transition-all hover:bg-raised hover:border-[var(--k)] hover:translate-x-1 disabled:opacity-40 disabled:hover:translate-x-0"
                            style={{ ['--k' as string]: KIND[c.kind].color }}
                          >
                            <Kbd>{i + 1}</Kbd>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] leading-snug">{c.label}</span>
                              <span className="mt-1 inline-flex items-center gap-1.5 text-xs" style={{ color: KIND[c.kind].color }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: KIND[c.kind].color }} />
                                {KIND[c.kind].label}
                                {c.kind === 'sudo' && <span className="text-faint">· −{SUDO_MANA_COST} mana</span>}
                              </span>
                            </span>
                          </button>
                        </motion.li>
                      );
                    })}
                  </ol>

                  {/* Composer */}
                  <div className="mt-4 rounded-2xl border border-line bg-surface focus-within:border-ember focus-within:shadow-[0_0_0_3px_var(--color-ember-soft)] transition-all">
                    {attachment && (
                      <div className="flex items-center gap-3 px-3 pt-3">
                        <img src={attachment.preview} alt="Attached artifact" className="w-12 h-12 object-cover rounded-lg border border-line" />
                        <span className="text-xs text-muted flex-1">Artifact attached. IGNIS will weave it into the story.</span>
                        <IconButton label="Remove artifact" onClick={() => setAttachment(null)}><X size={16} /></IconButton>
                      </div>
                    )}
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={custom}
                      onChange={(e) => setCustom(e.target.value.slice(0, 280))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (canSend) send({ custom });
                        } else if (e.key === 'Escape') inputRef.current?.blur();
                      }}
                      placeholder="Or write your own move…"
                      className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] placeholder:text-faint focus:outline-none field-sizing-content max-h-40"
                    />
                    <div className="flex items-center gap-1 px-2 pb-2">
                      <IconButton label="Dictate your move" active={listening} onClick={listen}><Mic size={18} /></IconButton>
                      {config?.vision && (
                        <IconButton label="Attach an artifact image" onClick={() => fileRef.current?.click()}><ImagePlus size={18} /></IconButton>
                      )}
                      <span className="ml-auto mr-2 text-xs text-faint tabular-nums">{custom.length > 200 ? `${custom.length}/280` : ''}</span>
                      <Button variant="primary" size="sm" disabled={!canSend} onClick={() => send({ custom })} aria-label="Send move" className="h-9 w-9 px-0">
                        <ArrowUp size={18} />
                      </Button>
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
                </motion.div>
              )
            )}
          </div>
        </article>
      </div>

      <Sheet open={showMap} onClose={() => setShowMap(false)} title="Timeline">
        <TimelineMap story={story} onJump={jump} busy={busy} />
      </Sheet>
    </div>
  );
}
