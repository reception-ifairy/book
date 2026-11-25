import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FileSearch, GitFork, ScanSearch, Settings2, Sparkles } from 'lucide-react';
import { SVGCharacter } from '../components/SVGCharacter';
import { api, type TaleCard } from '../api';
import { Badge, Logo, SnowToggle, useToast } from '../ui';
import { StringLights } from '../components/Effects';
import { DailyOps } from '../components/DailyOps';
import { TaleCover } from '../components/TaleCard';
import { JoinCard } from '../components/agent/JoinCard';
import { useAgent } from '../agent';
import type { Lang, PublicConfig } from '../../shared/types';
import { useArt } from '../artkit';

// The dashboard is what logged-in agents see at #/; visitors only download the landing page.
const Dashboard = lazy(() => import('./Dashboard').then((m) => ({ default: m.Dashboard })));

export const prefs = {
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
export const QUIPS = [
  'Agent! Five tales are throwing errors. I have colour-coded them. The colour is “panic”.',
  'Your assistant is fully charged. Well, 60%. Enough for one heroic decision and two silly ones.',
  'Briefing: every fairy tale is old code. Somebody enchanted it. We find out who.',
  'The wolf guessed the password again. It was “password”. I am filing a report.',
  'House rule: if you can explain it, it can exist. “Because magic” is not an explanation, Agent.',
];

/** What the home screen says. */
const COPY = {
  eyebrow: 'ARB · The Arcane Rescue Bureau',
  title: ['Old', 'tales.', 'Enchanted', 'code.'],
  accent: 'Hilarious side effects.',
  hook: 'Someone has enchanted the plot.',
  incidents: [
    'Cinderella’s slipper is tracking the wrong dancer.',
    'Snow White’s mirror has started answering questions before they’re asked.',
    'And Baba Yaga’s cottage has installed a navigation spell. It now takes the scenic route to its own front door.',
  ],
  welcome: 'Welcome to the Arcane Rescue Bureau, where you step into familiar tales, investigate what went wrong and decide what happens next.',
  nameLabel: 'Agent codename',
  placeholder: 'e.g. Agent Pixel_Pip',
  needName: 'Join the Bureau first, Agent: one codename and you are in.',
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

/** #/ : the dashboard for a logged-in agent, the landing page for everyone else. */
export function Home() {
  const { key } = useAgent();
  if (key) {
    return (
      <Suspense fallback={<div className="min-h-screen grid place-items-center"><span className="eyebrow animate-pulse">Opening your desk…</span></div>}>
        <Dashboard />
      </Suspense>
    );
  }
  return <Landing />;
}

function Landing() {
  const toast = useToast();
  const [tales, setTales] = useState<TaleCard[]>([]);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [lang, setLangState] = useState<Lang>(() => prefs.get('ignis.lang', 'en') as Lang);
  const [quip, setQuip] = useState(0);
  const [nudge, setNudge] = useState(0);
  const setLang = (l: Lang) => {
    setLangState(l);
    prefs.set('ignis.lang', l);
  };

  useEffect(() => {
    api.tales().then(setTales).catch((e) => toast(e.message, 'error'));
    api.config().then(setConfig).catch(() => {});
    const t = setInterval(() => setQuip((q) => q + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const copy = COPY;
  const quips = QUIPS;

  // Visitors join first; the case opens from their dashboard.
  const start = () => {
    document.getElementById('join')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setNudge((n) => n + 1);
    toast(copy.needName, 'error');
  };

  const mainTales = tales.filter((t) => t.format !== 'quick');
  const booting = null;
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
        <div className="backdrop-fade absolute inset-0" />
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

          <JoinCard lang={lang} setLang={setLang} config={config} highlight={nudge} />
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
          <span className="eyebrow">{mainTales.length} cases open · {tales.length - mainTales.length} quick cases inside</span>
        </div>
        <p className="text-muted font-semibold mb-5 max-w-2xl">{copy.casesNote}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tales.length === 0 && [0, 1, 2].map((i) => <div key={i} className="skeleton h-80" />)}
          {mainTales.map((t, i) => (
            <TaleCover key={t.id} tale={t} badge={t.tech} caseNo={`ARB-${String(i + 1).padStart(3, '0')}`} lang={lang} index={i} booting={booting} onStart={start} cta="Join to open" />
          ))}
        </div>
      </section>

      <footer className="py-8 border-t-2 border-line text-xs font-semibold text-faint flex flex-wrap gap-x-6 gap-y-2 justify-between">
        <span>ARB · The Arcane Rescue Bureau · Claude writes the story, Gemini / OpenAI paint and speak</span>
        <span className="font-pixel">IGNIS // field assistant v7.0</span>
      </footer>
    </div>
    </>
  );
}
