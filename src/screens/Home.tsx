import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowRight, ChevronRight, FileSearch, GitFork, Loader2, ScanSearch, Settings2, Sparkles } from 'lucide-react';
import { SVGCharacter } from '../components/SVGCharacter';
import { api, loadRuns, rememberRun, type TaleCard } from '../api';
import { navigate } from '../App';
import { Badge, Logo, Segmented, SnowToggle, StatusDot, useToast } from '../ui';
import { StringLights } from '../components/Effects';
import { DailyOps } from '../components/DailyOps';
import type { Lang, PublicConfig } from '../../shared/types';
import { ago, coverStyle } from '../meta';
import { useArt } from '../artkit';

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

/** IGNIS briefing the agent, one line every few seconds. */
const QUIPS = [
  'Agent! Five tales are throwing errors. I have colour-coded them. The colour is “panic”.',
  'Your assistant is fully charged. Well, 60%. Enough for one heroic decision and two silly ones.',
  'Briefing: every fairy tale is old code. Somebody enchanted it. We find out who.',
  'The wolf guessed the password again. It was “password”. I am filing a report.',
  'House rule: if you can explain it, it can exist. “Because magic” is not an explanation, Agent.',
];

/** What the home screen says. */
const COPY = {
  eyebrow: 'ARB · The Arcane Retellings Bureau',
  title: ['Old', 'tales.', 'Enchanted', 'code.'],
  accent: 'Hilarious side effects.',
  hook: 'Someone has enchanted the plot.',
  incidents: [
    'Cinderella’s slipper is tracking the wrong dancer.',
    'Snow White’s mirror has started answering questions before they’re asked.',
    'And Baba Yaga’s cottage has installed a navigation spell. It now takes the scenic route to its own front door.',
  ],
  welcome: 'Welcome to the Arcane Retellings Bureau, where you step into familiar tales, investigate what went wrong and decide what happens next.',
  nameLabel: 'Agent codename',
  placeholder: 'e.g. Agent Pixel_Pip',
  needName: 'The Bureau needs your codename first, Agent.',
  pick: 'Pick a case file below.',
  assistant: 'IGNIS · your field assistant',
  casesTitle: 'Open case files',
  casesNote: 'Every tale here lives in the Public Domain: free to tell, free to remix and, right now, slightly enchanted.',
  steps: [
    { icon: FileSearch, title: 'Step in', text: 'Open a case and land inside a tale you already know, right where the magic went wrong.' },
    { icon: ScanSearch, title: 'Investigate', text: 'IGNIS scans the plot, explains the enchanted code and has opinions about all of it.' },
    { icon: GitFork, title: 'Decide', text: 'Fix the tale, twist it or break it beautifully. Every choice forks the timeline.' },
  ],
};

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
    const t = setInterval(() => setQuip((q) => q + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const copy = COPY;
  const quips = QUIPS;

  const start = async (id: string) => {
    if (!hero.trim()) {
      nameRef.current?.focus();
      return toast(copy.needName, 'error');
    }
    setBooting(id);
    prefs.set('ignis.lang', lang);
    prefs.set('ignis.hero', hero.trim());
    try {
      const story = await api.start(id, lang, hero.trim());
      rememberRun(story);
      navigate(`story/${story.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
      setBooting(null);
    }
  };

  const taleById = (id: string) => tales.find((t) => t.id === id);
  const art = useArt();
  const backdrop = art.src('scene-workshop');
  const heroArt = art.src('ignis-hero');

  return (
    <>
    {backdrop && (
      // Generated workshop scene behind the hero, fading into the plank wall below and under the headline.
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[780px] overflow-hidden">
        <motion.img
          src={backdrop}
          alt=""
          className="w-full h-full object-cover"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 0.55, scale: 1 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#2a1c15ee_0%,#2a1c15aa_45%,transparent_80%),linear-gradient(180deg,transparent_55%,#2a1c15_100%)]" />
      </div>
    )}
    <StringLights count={28} className="h-10 z-10" />
    {/* Positioned so it paints above the absolutely positioned backdrop. */}
    <div className="relative z-[1] mx-auto max-w-6xl px-4 sm:px-6 pt-6">
      <header className="flex items-center justify-between h-16">
        <Logo />
        <div className="flex items-center gap-3">
        <SnowToggle />
        <a href="#/admin" className="group inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-gold transition-colors">
          <Settings2 size={16} className="glow-icon transition-transform duration-500 group-hover:rotate-90" /> <span className="hidden sm:inline">Bureau console</span><span className="sr-only sm:hidden">Bureau console</span>
        </a>
        </div>
      </header>

      <section className="grid lg:grid-cols-[1.25fr_1fr] gap-10 items-center pt-8 pb-14 sm:pt-14">
        <div>
          <p className="eyebrow mb-5 text-gold">{copy.eyebrow}</p>
          <h1 className="toon-title text-5xl sm:text-6xl lg:text-7xl leading-[1.02] text-ink">
            {copy.title.map((w, i) => (
              <span key={w}>
                {i === 2 && <br />}
                <motion.span
                  className="inline-block mr-[0.25em]"
                  initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  {w}
                </motion.span>
              </span>
            ))}
            <br />
            <motion.em
              className="glitch-text inline-block text-ember not-italic text-3xl sm:text-4xl lg:text-5xl mt-3"
              data-text={copy.accent}
              initial={{ opacity: 0, y: 24, filter: 'blur(14px)', letterSpacing: '0.2em' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '0em' }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {copy.accent}
            </motion.em>
          </h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-7 max-w-xl">
            <p className="font-serif font-bold text-2xl text-gold">{copy.hook}</p>
            <ul className="mt-3 space-y-1.5 text-[17px] text-muted font-semibold">
              {copy.incidents.map((line) => (
                <li key={line} className="flex gap-2.5">
                  <Sparkles size={16} className="glow-icon text-ember shrink-0 mt-1" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-lg text-ink font-semibold">{copy.welcome}</p>
          </motion.div>

          <div className="sm:hidden mt-7 card flex items-center gap-3 p-3">
            <span className="shrink-0">{heroArt ? <img src={heroArt} alt="" className="w-16 h-16 object-contain" /> : <SVGCharacter isTalking={false} mood="smug" size={64} />}</span>
            <span className="min-w-0">
              <span className="eyebrow block">{copy.assistant}</span>
              <AnimatePresence mode="wait">
                <motion.span key={quip} className="block text-sm font-semibold mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  “{quips[quip % quips.length]}”
                </motion.span>
              </AnimatePresence>
            </span>
          </div>

          <motion.div initial={{ opacity: 0, y: 16, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.85, type: 'spring', stiffness: 200, damping: 16 }} className="snowcap spotlight card mt-9 p-4 sm:p-5 max-w-xl">
            <label htmlFor="hero" className="eyebrow">{copy.nameLabel}</label>
            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              <input
                id="hero"
                ref={nameRef}
                value={hero}
                onChange={(e) => setHero(e.target.value.slice(0, 24))}
                placeholder={copy.placeholder}
                className="field flex-1"
                autoComplete="off"
              />
              <Segmented<Lang> label="Story language" value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'pl', label: 'Polski' }]} />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-faint">
              {config === null ? null : config.storyReady ? (
                <Badge tone="ok"><StatusDot tone="ok" /> Story engine online</Badge>
              ) : (
                <Badge tone="danger"><StatusDot tone="danger" /> Story engine offline</Badge>
              )}
              {config && !config.storyReady && <a href="#/admin" className="underline hover:text-ink">Add an Anthropic key</a>}
              {config?.storyReady && <span>{copy.pick}</span>}
            </div>
          </motion.div>
        </div>

        <div className="relative hidden sm:flex flex-col items-center">
          <div className="card relative max-w-xs px-5 py-4 mb-6 text-[15px] font-semibold min-h-[4.5rem]">
            <AnimatePresence mode="wait">
              <motion.p key={quip} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                “{quips[quip % quips.length]}”
              </motion.p>
            </AnimatePresence>
            <span className="absolute -bottom-[11px] left-1/2 -translate-x-1/2 w-5 h-5 rotate-45 bg-surface border-r-[3px] border-b-[3px] border-outline" />
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.3 }}>
            {heroArt ? (
              <motion.img
                src={heroArt}
                alt={art.alt('ignis-hero')}
                className="floating w-[260px] h-[260px] object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]"
                animate={booting ? { rotate: [0, -6, 6, 0] } : { rotate: 0 }}
                transition={booting ? { duration: 0.6, repeat: Infinity } : undefined}
              />
            ) : (
              <SVGCharacter isTalking={!!booting} mood={booting ? 'hyped' : 'smug'} size={220} />
            )}
          </motion.div>
          <span className="mt-4"><Badge tone="ember">{copy.assistant}</Badge></span>
        </div>
      </section>

      <section className="pb-12">
        <ol className="grid sm:grid-cols-3 gap-4">
          {copy.steps.map(({ icon: Icon, title, text }, i) => (
            <motion.li key={title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 + i * 0.1 }} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-10 h-10 rounded-xl bg-screen text-pixel border-[2.5px] border-outline shadow-[0_3px_0_var(--color-outline)]"><Icon size={20} /></span>
                <span className="eyebrow">Step {i + 1}</span>
              </div>
              <h3 className="font-serif font-bold text-xl mt-3">{title}</h3>
              <p className="text-[15px] text-muted mt-1">{text}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <DailyOps />

      <section className="pb-14">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <h2 className="toon-title text-3xl sm:text-4xl text-ink">{copy.casesTitle}</h2>
          <span className="eyebrow">{tales.length} cases open</span>
        </div>
        <p className="text-muted font-semibold mb-5 max-w-2xl">{copy.casesNote}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tales.length === 0 && [0, 1, 2].map((i) => <div key={i} className="skeleton h-80" />)}
          {tales.map((t, i) => (
            <TaleCover key={t.id} tale={t} badge={t.tech} caseNo={`ARB-${String(i + 1).padStart(3, '0')}`} lang={lang} index={i} booting={booting} onStart={() => start(t.id)} />
          ))}
        </div>
      </section>

      {runs.length > 0 && (
        <section className="pb-14">
          <h2 className="toon-title text-3xl mb-5 text-ink">Your active cases</h2>
          <div className="card divide-y-2 divide-line overflow-hidden">
            {runs.slice(0, 6).map((r) => {
              const t = taleById(r.taleId);
              return (
                <a key={r.id} href={`#/story/${r.id}`} className="spotlight flex items-center gap-4 px-4 py-3 hover:bg-raised transition-colors group">
                  <span className="grid place-items-center w-11 h-11 rounded-xl text-xl shrink-0 border-[2.5px] border-outline overflow-hidden bg-cover bg-center" style={t ? (art.src(`cover-${t.id}`) ? { backgroundImage: `url(${art.src(`cover-${t.id}`)})` } : coverStyle(t.hue)) : undefined}>{t && !art.src(`cover-${t.id}`) && t.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif font-semibold truncate">{t?.title[lang] ?? r.taleId}</span>
                    <span className="block text-xs text-faint truncate">
                      Agent {r.heroName} · {r.pages ?? 1} pages · {r.ending ? `closed: ${r.ending}` : 'under investigation'} · {ago(r.updatedAt)}
                    </span>
                  </span>
                  <ChevronRight size={18} className="glow-icon text-faint group-hover:text-ember group-hover:translate-x-1 transition-all" />
                </a>
              );
            })}
          </div>
        </section>
      )}

      <footer className="py-8 border-t-2 border-line text-xs font-semibold text-faint flex flex-wrap gap-x-6 gap-y-2 justify-between">
        <span>ARB · The Arcane Retellings Bureau · Claude writes the story, Gemini / OpenAI paint and speak</span>
        <span className="font-pixel">IGNIS // field assistant v6.6</span>
      </footer>
    </div>
    </>
  );
}

/** A tale card that tilts toward the cursor, with a glowing rim and a floating emblem. */
function TaleCover({ tale: t, badge, caseNo, cta = 'Open case', busyText = 'IGNIS is briefing you…', lang, index, booting, onStart }: { tale: TaleCard; badge: string; caseNo: string; cta?: string; busyText?: string; lang: Lang; index: number; booting: string | null; onStart: () => void }) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), { stiffness: 200, damping: 20 });
  const emblemX = useSpring(useTransform(px, [0, 1], [-10, 10]), { stiffness: 150, damping: 15 });
  const emblemY = useSpring(useTransform(py, [0, 1], [-8, 8]), { stiffness: 150, damping: 15 });
  const color = `hsl(${t.hue} 85% 62%)`;
  const art = useArt();
  const cover = art.src(`cover-${t.id}`);
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + index * 0.07, ease: [0.22, 1, 0.36, 1], duration: 0.6 }} style={{ perspective: 900 }}>
      <motion.button
        disabled={!!booting}
        onClick={onStart}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
        whileTap={{ scale: 0.98 }}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d', ['--spot' as string]: color }}
        className="spotlight group card snowcap w-full h-full text-left flex flex-col transition-shadow hover:shadow-[6px_9px_0_var(--color-outline),0_0_40px_-6px_var(--spot)] disabled:opacity-50"
      >
        <div className="relative h-40 flex items-center justify-center overflow-hidden rounded-t-[17px] border-b-[3px] border-outline" style={coverStyle(t.hue)}>
          {cover && (
            // Painted cover drifts against the tilt for a little depth.
            <motion.img src={cover} alt={art.alt(`cover-${t.id}`)} className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] max-w-none object-cover transition-transform duration-500 group-hover:scale-105" style={{ x: emblemX, y: emblemY }} />
          )}
          {!cover && <motion.span className="inline-block" style={{ x: emblemX, y: emblemY }}>
            <motion.span
              className="inline-block text-7xl drop-shadow-[3px_4px_0_#241913] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_24px_var(--spot)]"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4 + index * 0.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {t.emoji}
            </motion.span>
          </motion.span>}
          <span className="absolute top-3 left-3">
            <Badge>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              {badge}
            </Badge>
          </span>
          <AnimatePresence>
            {booting === t.id && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm text-sm">
                <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin text-ember" /> {busyText}</span>
                <motion.span className="absolute bottom-0 left-0 h-0.5 bg-ember shadow-[0_0_10px_var(--color-ember)]" initial={{ width: '0%' }} animate={{ width: '92%' }} transition={{ duration: 12, ease: 'easeOut' }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="p-5 flex-1 flex flex-col">
          <span className="font-pixel text-[11px] text-faint">CASE FILE {caseNo}</span>
          <h3 className="font-serif font-bold text-xl leading-tight mt-1">{t.title[lang]}</h3>
          <p className="mt-2 text-[15px] text-muted flex-1">{t.tagline[lang]}</p>
          <span className="mt-4 self-start inline-flex items-center gap-1.5 rounded-xl border-[2.5px] border-outline bg-gold px-3 h-9 text-sm font-serif font-semibold text-outline shadow-[0_3px_0_var(--color-outline)] transition-transform group-hover:-rotate-2 group-hover:scale-105">
            {cta} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </motion.button>
    </motion.div>
  );
}
