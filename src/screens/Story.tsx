import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { ArrowLeft, Volume2, VolumeX, GitFork, Mic, ImagePlus, X, RefreshCw, Terminal, Undo2, Share2 } from 'lucide-react';
import { SVGCharacter } from '../components/SVGCharacter';
import { TimelineMap } from '../components/TimelineMap';
import { api, rememberRun, type TaleCard } from '../api';
import { SUDO_MANA_COST, type ChoiceKind, type Page, type PublicConfig, type Story } from '../../shared/types';

const KIND_STYLE: Record<ChoiceKind, { tag: string; cls: string }> = {
  sane: { tag: 'sane', cls: 'border-[var(--ink-color)]/50 hover:border-[var(--ink-color)]' },
  chaos: { tag: 'chaos', cls: 'border-fuchsia-500/60 hover:border-fuchsia-400' },
  dumb: { tag: 'dumb', cls: 'border-yellow-400/50 hover:border-yellow-300' },
  sudo: { tag: `sudo −${SUDO_MANA_COST} mana`, cls: 'border-[var(--accent-color)] hover:shadow-[0_0_15px_rgba(255,0,85,0.6)]' },
};

const ENDING_LABEL: Record<string, string> = {
  canon: 'CANON ENDING', subverted: 'SUBVERTED ENDING', cursed: 'CURSED ENDING', secret: 'SECRET ENDING', death: 'GARBAGE COLLECTED',
};

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
    setShown('');
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i += 3;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [key, text]);
  return { shown: done ? text : shown, done, skip: () => { setShown(text); setDone(true); } };
}

export function StoryScreen({ storyId }: { storyId: string }) {
  const [story, setStory] = useState<Story | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [tale, setTale] = useState<TaleCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [custom, setCustom] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [imageState, setImageState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [listening, setListening] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const page: Page | undefined = story?.pages[story.currentPageId];
  const { shown, done, skip } = useTypewriter(page?.narration ?? '', page?.id ?? '');

  useEffect(() => {
    api.story(storyId).then((s) => {
      setStory(s);
      rememberRun(s);
      api.tales().then((ts) => setTale(ts.find((t) => t.id === s.taleId) ?? null)).catch(() => {});
    }).catch((e) => setError(e.message));
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
    const text = `${page.narration.replace(/[*_#`]/g, '')} ... ${page.quip}`;
    if (config?.tts && config.tts !== 'browser') {
      api.speech(story.id, page.id).then(({ url }) => {
        if (!alive || !url) return;
        audioRef.current = new Audio(url);
        audioRef.current.play().catch(() => {});
      }).catch(() => {});
    } else if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = story.lang === 'pl' ? 'pl-PL' : 'en-US';
      u.pitch = 0.6;
      u.rate = 1.05;
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
    setError('');
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
      setError(`> ${(e as Error).message}`);
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
    } catch (e) {
      setError(`> ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const listen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !story) return setError('> Voice input is not supported in this browser.');
    const rec = new SR();
    rec.lang = story.lang === 'pl' ? 'pl-PL' : 'en-US';
    rec.interimResults = false;
    rec.onresult = (e: any) => setCustom((c) => `${c} ${e.results[0][0].transcript}`.trim().slice(0, 280));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const share = async () => {
    if (!story || !page) return;
    const text = `TIMELINE #${story.timeline} · ${tale?.title[story.lang] ?? story.taleId}\n${page.ending ? `${ENDING_LABEL[page.ending.type]}: ${page.ending.title}\n` : ''}canon ${page.canon}% · chaos ${page.stats.chaos} · karma ${page.stats.karma}\nIGNIS: "${page.quip}"\n${location.href}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('> Clipboard blocked. Copy the URL manually.');
    }
  };

  if (!story || !page) {
    return (
      <div className="font-mono text-[var(--ink-color)] p-8">
        {error ? <>&gt; {error} <a href="#/" className="underline ml-2">home</a></> : '> decrypting timeline…'}
      </div>
    );
  }

  const glitch = Math.max(0, (60 - page.canon) / 60);
  const parent = page.parentId ? story.pages[page.parentId] : null;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6" style={{ ['--glitch' as string]: glitch }}>
      <div className={`cyber-shadow bg-[#090910]/90 backdrop-blur-md rounded-xl ${glitch > 0 ? 'reality-glitch' : ''}`}>
        <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[var(--panel-border)] font-mono text-xs">
          <a href="#/" className="flex items-center gap-1 text-[var(--ink-color)]/60 hover:text-[var(--ink-color)]"><ArrowLeft size={14} /> tales</a>
          <span className="text-[var(--accent-color)]">TIMELINE #{story.timeline}</span>
          <span className="text-[var(--ink-color)]/60 truncate">{tale?.emoji} {tale?.title[story.lang]}</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setVoiceOn((v) => !v)} className={`icon-btn ${voiceOn ? 'icon-btn-on' : ''}`} title="Narration voice">
              {voiceOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <button onClick={() => setShowMap((v) => !v)} className={`icon-btn ${showMap ? 'icon-btn-on' : ''}`} title="Timeline map">
              <GitFork size={14} />
            </button>
            <button onClick={share} className="icon-btn" title="Copy timeline card">
              <Share2 size={14} /> {copied && <span>copied</span>}
            </button>
          </div>
        </header>

        {showMap && (
          <div className="p-4 border-b border-[var(--panel-border)] bg-black/40">
            <TimelineMap story={story} onJump={jump} busy={busy} />
          </div>
        )}

        <div className="flex flex-col lg:flex-row">
          <aside className="page-texture lg:w-72 p-6 flex flex-col items-center border-b lg:border-b-0 lg:border-r border-[var(--panel-border)]">
            <SVGCharacter isTalking={busy || !done} mood={busy ? 'panic' : page.mood} />
            <div className="w-full font-mono text-sm text-[var(--accent-color)] border-l-2 border-[var(--accent-color)] pl-3 mb-6">
              <span className="opacity-50 text-xs block">IGNIS:</span>
              {busy ? 'Compiling your next mistake…' : page.quip}
            </div>
            <div className="w-full space-y-3 font-mono text-xs">
              <Meter label="CANON INTEGRITY" value={page.canon} max={100} color="var(--ink-color)" />
              <Meter label="CHAOS" value={page.stats.chaos} max={100} color="#d946ef" />
              <Meter label="KARMA" value={page.stats.karma + 100} max={200} color="#facc15" display={page.stats.karma} />
              <Meter label="MANA" value={page.stats.mana} max={100} color="var(--accent-color)" />
            </div>
            <div className="w-full mt-6">
              <h4 className="font-mono text-xs text-[var(--ink-color)]/50 mb-2">/inventory</h4>
              {page.inventory.length ? (
                <ul className="font-mono text-xs space-y-1">{page.inventory.map((i) => <li key={i} className="truncate">▸ {i}</li>)}</ul>
              ) : (
                <p className="font-mono text-xs text-[var(--ink-color)]/30">empty. like your plan.</p>
              )}
            </div>
          </aside>

          <main className="page-texture flex-1 p-6 min-w-0">
            {config?.image && (
              <div className="mb-5 aspect-square max-h-[420px] w-full mx-auto rounded border border-[var(--accent-color)]/40 bg-black/60 overflow-hidden flex items-center justify-center">
                {page.imageUrl ? (
                  <img src={page.imageUrl} alt={page.imagePrompt} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-mono text-xs text-[var(--ink-color)]/50 animate-pulse">
                    {imageState === 'failed' ? '> HOLOGRAPH MATRIX FAILED. Imagine it really hard.' : '> rendering holographic projection…'}
                  </span>
                )}
              </div>
            )}

            {page.action && (
              <p className="font-mono text-xs text-[var(--accent-color)] mb-3">
                &gt; {page.action.kind === 'custom' ? 'custom' : page.action.kind}: {page.action.label}
              </p>
            )}

            <div className={`markdown-body text-[var(--ink-color)]/90 leading-relaxed cursor-pointer ${done ? '' : 'typing-cursor'}`} onClick={skip}>
              <Markdown>{shown}</Markdown>
            </div>

            {error && <p className="font-mono text-sm text-[var(--accent-color)] mt-4">{error}</p>}

            {page.ending ? (
              <div className="mt-6 p-5 rounded border border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-center">
                <div className="font-mono text-xs tracking-[0.3em] text-[var(--accent-color)]">{ENDING_LABEL[page.ending.type]}</div>
                <div className="font-display text-2xl font-bold mt-2">{page.ending.title}</div>
                <div className="flex flex-wrap justify-center gap-3 mt-5 font-mono text-xs">
                  {parent && (
                    <button disabled={busy} onClick={() => jump(parent.id)} className="cyber-btn"><Undo2 size={14} /> rollback 1 page</button>
                  )}
                  <button onClick={() => setShowMap(true)} className="cyber-btn"><GitFork size={14} /> fork from map</button>
                  <a href="#/" className="cyber-btn">new tale</a>
                </div>
              </div>
            ) : (
              done && (
                <div className="mt-6 space-y-3">
                  {page.choices.map((c, i) => {
                    const noMana = c.kind === 'sudo' && page.stats.mana < SUDO_MANA_COST;
                    return (
                      <button
                        key={c.id}
                        disabled={busy || noMana}
                        onClick={() => send({ choiceId: c.id })}
                        className={`w-full text-left font-mono text-sm px-4 py-3 rounded border bg-black/40 transition-all disabled:opacity-30 ${KIND_STYLE[c.kind].cls}`}
                      >
                        <span className="opacity-50">&gt; run choice_0{i + 1}.exe</span>{' '}
                        <span className="text-[10px] uppercase tracking-wider opacity-60">[{KIND_STYLE[c.kind].tag}]</span>
                        <div className="text-[var(--ink-color)] mt-1">{c.label}</div>
                      </button>
                    );
                  })}

                  <div className="pt-3 border-t border-dashed border-[var(--panel-border)]">
                    {attachment && (
                      <div className="flex items-center gap-2 mb-2 font-mono text-xs">
                        <img src={attachment.preview} alt="artifact" className="w-10 h-10 object-cover rounded border border-[var(--accent-color)]" />
                        artifact attached
                        <button onClick={() => setAttachment(null)} className="text-[var(--accent-color)]"><X size={14} /></button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Terminal size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent-color)]" />
                        <input
                          value={custom}
                          onChange={(e) => setCustom(e.target.value.slice(0, 280))}
                          onKeyDown={(e) => e.key === 'Enter' && (custom.trim() || attachment) && send({ custom })}
                          placeholder="or type your own move…"
                          disabled={busy}
                          className="cyber-input w-full pl-9"
                        />
                      </div>
                      <button onClick={listen} disabled={busy} className={`icon-btn ${listening ? 'icon-btn-on animate-pulse' : ''}`} title="Speak your move"><Mic size={16} /></button>
                      {config?.vision && (
                        <button onClick={() => fileRef.current?.click()} disabled={busy} className="icon-btn" title="Attach an artifact image"><ImagePlus size={16} /></button>
                      )}
                      <button
                        onClick={() => send({ custom })}
                        disabled={busy || (!custom.trim() && !attachment)}
                        className="w-11 h-11 flex items-center justify-center rounded bg-[var(--accent-color)] text-[#05050a] disabled:opacity-30"
                      >
                        {busy ? <RefreshCw size={16} className="animate-spin" /> : <Terminal size={16} />}
                      </button>
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
                </div>
              )
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Meter({ label, value, max, color, display }: { label: string; value: number; max: number; color: string; display?: number }) {
  return (
    <div>
      <div className="flex justify-between text-[var(--ink-color)]/60"><span>{label}</span><span>{display ?? value}</span></div>
      <div className="h-1.5 rounded bg-white/10 mt-1 overflow-hidden">
        <div className="h-full transition-all duration-700" style={{ width: `${(value / max) * 100}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
    </div>
  );
}
