import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronRight, Loader2, Settings2 } from 'lucide-react';
import { SVGCharacter } from '../components/SVGCharacter';
import { api, loadRuns, rememberRun, type TaleCard } from '../api';
import { navigate } from '../App';
import { Badge, Logo, Segmented, useToast } from '../ui';
import type { Lang, PublicConfig } from '../../shared/types';
import { ago, coverStyle } from '../meta';

const prefs = {
  get: (k: string, d: string) => {
    try {
      return localStorage.getItem(k) ?? d;
    } catch {
      return d;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* preferences are a convenience only */
    }
  },
};

const QUIPS = [
  'Every fairy tale is legacy code. I just read the stack traces.',
  'Choose wisely. Or don’t. Bad choices make better content.',
  'The wolf has root access. Again.',
  'I have seen 14 million timelines. You die in most of them. Funnily.',
];

export function Home() {
  const toast = useToast();
  const [tales, setTales] = useState<TaleCard[]>([]);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [lang, setLang] = useState<Lang>(() => prefs.get('ignis.lang', 'en') as Lang);
  const [hero, setHero] = useState(() => prefs.get('ignis.hero', ''));
  const [booting, setBooting] = useState<string | null>(null);
  const [quip, setQuip] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const runs = loadRuns();

  useEffect(() => {
    api.tales().then(setTales).catch((e) => toast(e.message, 'error'));
    api.config().then(setConfig).catch(() => {});
    const t = setInterval(() => setQuip((q) => (q + 1) % QUIPS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const start = async (taleId: string) => {
    if (!hero.trim()) {
      nameRef.current?.focus();
      return toast('Give your debugger a name first.', 'error');
    }
    setBooting(taleId);
    prefs.set('ignis.lang', lang);
    prefs.set('ignis.hero', hero.trim());
    try {
      const story = await api.start(taleId, lang, hero.trim());
      rememberRun(story);
      navigate(`story/${story.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
      setBooting(null);
    }
  };

  const taleById = (id: string) => tales.find((t) => t.id === id);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="flex items-center justify-between h-16">
        <Logo />
        <a href="#/admin" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
          <Settings2 size={16} /> Sysadmin
        </a>
      </header>

      <section className="grid lg:grid-cols-[1.25fr_1fr] gap-10 items-center pt-8 pb-14 sm:pt-14">
        <div>
          <p className="eyebrow mb-4">Interactive fiction · cyber-magic · 16+</p>
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
            Fairy tales,
            <br />
            <em className="text-ember">unpatched.</em>
          </h1>
          <p className="mt-6 text-lg text-muted max-w-xl">
            Classic stories run on cursed legacy code. Pick one, make terrible decisions and fork reality. IGNIS narrates, and judges you for it.
          </p>

          <div className="card mt-8 p-4 sm:p-5 max-w-xl">
            <label htmlFor="hero" className="eyebrow">Your debugger handle</label>
            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              <input
                id="hero"
                ref={nameRef}
                value={hero}
                onChange={(e) => setHero(e.target.value.slice(0, 24))}
                placeholder="e.g. Morty_404"
                className="field flex-1"
                autoComplete="off"
              />
              <Segmented<Lang> label="Story language" value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'pl', label: 'Polski' }]} />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-faint">
              {config === null ? null : config.storyReady ? (
                <Badge tone="ok">● Story engine online</Badge>
              ) : (
                <Badge tone="danger">● Story engine offline</Badge>
              )}
              {config && !config.storyReady && <a href="#/admin" className="underline hover:text-ink">Add an Anthropic key</a>}
              {config?.storyReady && <span>Pick a tale below to begin.</span>}
            </div>
          </div>
        </div>

        <div className="relative hidden sm:flex flex-col items-center">
          <div className="card relative max-w-xs px-5 py-4 mb-4 text-sm text-muted min-h-[4.5rem]">
            <AnimatePresence mode="wait">
              <motion.p key={quip} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                “{QUIPS[quip]}”
              </motion.p>
            </AnimatePresence>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-surface border-r border-b border-line" />
          </div>
          <SVGCharacter isTalking={!!booting} mood={booting ? 'hyped' : 'smug'} size={220} />
        </div>
      </section>

      <section className="pb-14">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-serif text-2xl sm:text-3xl">Choose a corrupted tale</h2>
          <span className="eyebrow hidden sm:block">{tales.length} tales installed</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tales.length === 0 && [0, 1, 2].map((i) => <div key={i} className="skeleton h-80" />)}
          {tales.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              disabled={!!booting}
              onClick={() => start(t.id)}
              className="group card overflow-hidden text-left flex flex-col transition-all hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.8)] disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <div className="relative h-36 flex items-center justify-center" style={coverStyle(t.hue)}>
                <span className="text-6xl drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">{t.emoji}</span>
                <span className="absolute top-3 left-3"><Badge>{t.tech}</Badge></span>
                {booting === t.id && (
                  <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm text-sm">
                    <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Decrypting tale…</span>
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-serif text-xl leading-tight">{t.title[lang]}</h3>
                <p className="mt-2 text-sm text-muted flex-1">{t.tagline[lang]}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-faint group-hover:text-ember transition-colors">
                  Run tale <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {runs.length > 0 && (
        <section className="pb-14">
          <h2 className="font-serif text-2xl mb-4">Continue a timeline</h2>
          <div className="card divide-y divide-line overflow-hidden">
            {runs.slice(0, 6).map((r) => {
              const t = taleById(r.taleId);
              return (
                <a key={r.id} href={`#/story/${r.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-raised transition-colors group">
                  <span className="grid place-items-center w-10 h-10 rounded-lg text-xl shrink-0" style={t ? coverStyle(t.hue) : undefined}>{t?.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium truncate">{t?.title[lang] ?? r.taleId}</span>
                    <span className="block text-xs text-faint truncate">
                      {r.heroName} · {r.pages ?? 1} pages · {r.ending ? `ended: ${r.ending}` : 'in progress'} · {ago(r.updatedAt)}
                    </span>
                  </span>
                  <ChevronRight size={18} className="text-faint group-hover:text-ink transition-colors" />
                </a>
              );
            })}
          </div>
        </section>
      )}

      <footer className="py-8 border-t border-line text-xs text-faint flex flex-wrap gap-x-6 gap-y-2 justify-between">
        <span>Claude writes the story · Gemini / OpenAI paint and speak</span>
        <span className="font-mono">IGNIS // OS v3.1</span>
      </footer>
    </div>
  );
}
