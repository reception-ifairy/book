import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowRight, ChevronRight, Loader2, Settings2 } from 'lucide-react';
import { SVGCharacter } from '../components/SVGCharacter';
import { api, loadRuns, rememberRun, type WorldInfo } from '../api';
import { navigate } from '../App';
import { Badge, Logo, Segmented, SnowToggle, StatusDot, useToast } from '../ui';
import { StringLights } from '../components/Effects';
import { FORCES, PHASES, type Force, type Lang, type PublicConfig } from '../../shared/types';
import type { AdventureCard, AdventureKind } from '../../shared/universe';
import { ago, coverStyle, KIND, PHASE } from '../meta';
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

const QUIPS = [
  'If you can imagine it, it already exists. In one of the many worlds.',
  'Mistakes are just new branches of reality. I collect them. Mostly my own.',
  'My mana battery is at 87%. Plenty for one portal and a small sneeze.',
  'In Loopia I lost my keys forever. Every single morning.',
  'Every question you ask grows a new star somewhere. I keep a list.',
];

const COPY = {
  eyebrow: '★ The iFairy Quantum Edu-Verse · cyber-magic learning · 8+',
  title: ['Learning', 'in'] as const,
  accent: 'many worlds.',
  lead: 'IGNIS, a winged cyber-grimoire, opens portals into worlds where the laws of nature are different: time runs in loops, words have weight, feelings steer gravity. Explore them, then translate what you find into the science of our own world.',
  nameLabel: 'Your explorer name (made up, never your real one)',
  placeholder: 'e.g. Nova_Quill',
  needName: 'Choose an explorer name first.',
  pick: 'Pick a world below to open its portal.',
};

const GROUPS: { kind: AdventureKind; title: string; desc: string }[] = [
  { kind: 'world', title: 'The Seven Worlds', desc: 'Stage by stage through the Edu-Verse: chaos, loops, heavy words, probability, living stories, fractals and feelings.' },
  { kind: 'lab', title: 'Cyber-Magical Labs', desc: 'Single-portal experiments: tunable gravity, whispering books, ideas that float, time that rewinds, maths that sings, history you can visit.' },
  { kind: 'homework', title: 'Homework Portal', desc: 'Stuck on a real task? Show IGNIS a photo of the page or describe it. IGNIS guides, you solve.' },
];
const badgeOf = (a: AdventureCard) => (a.kind === 'world' ? `Stage ${a.order}` : a.kind === 'lab' ? 'Lab' : 'Homework');
const CTA: Record<AdventureKind, string> = { world: 'Open portal', lab: 'Enter the lab', homework: 'Bring a task' };

export function Home() {
  const toast = useToast();
  const [adventures, setAdventures] = useState<AdventureCard[]>([]);
  const [worlds, setWorlds] = useState<WorldInfo[] | null>(null);
  const [strongest, setStrongest] = useState<Force>(() => prefs.get('ignis.force', 'mythos') as Force);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [lang, setLang] = useState<Lang>(() => prefs.get('ignis.lang', 'en') as Lang);
  const [hero, setHero] = useState(() => prefs.get('ignis.hero', ''));
  const [booting, setBooting] = useState<string | null>(null);
  const [quip, setQuip] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const runs = loadRuns();

  useEffect(() => {
    api.config().then(setConfig).catch(() => {});
    api.worlds().then(setWorlds).catch(() => setWorlds([]));
    api.adventures().then(setAdventures).catch((e) => toast(e.message, 'error'));
    const t = setInterval(() => setQuip((q) => q + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // The Edu-Verse opens once the owner has enabled and synced it.
  const info = worlds?.find((w) => w.id === 'ifairy');
  const open = (info?.adventures ?? 0) > 0;

  const start = async (id: string) => {
    if (!hero.trim()) {
      nameRef.current?.focus();
      return toast(COPY.needName, 'error');
    }
    setBooting(id);
    prefs.set('ignis.lang', lang);
    prefs.set('ignis.hero', hero.trim());
    prefs.set('ignis.force', strongest);
    try {
      const story = await api.startAdventure(id, lang, hero.trim(), strongest);
      rememberRun(story);
      navigate(`story/${story.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
      setBooting(null);
    }
  };

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
          <Settings2 size={16} className="glow-icon transition-transform duration-500 group-hover:rotate-90" /> Sysadmin
        </a>
        </div>
      </header>

      <section className="grid lg:grid-cols-[1.25fr_1fr] gap-10 items-center pt-8 pb-10 sm:pt-14">
        <div>
          <p className="eyebrow mb-5 text-gold">{COPY.eyebrow}</p>
          <h1 className="toon-title text-5xl sm:text-6xl lg:text-7xl leading-[1.02] text-ink">
            {COPY.title.map((w, i) => (
              <motion.span
                key={w}
                className="inline-block mr-[0.25em]"
                initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                {w}
              </motion.span>
            ))}
            <br />
            <motion.em
              className="glitch-text inline-block text-ember not-italic"
              data-text={COPY.accent}
              initial={{ opacity: 0, y: 24, filter: 'blur(14px)', letterSpacing: '0.2em' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '0em' }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {COPY.accent}
            </motion.em>
          </h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-7 text-lg text-muted max-w-xl font-semibold">
            {COPY.lead}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.85, type: 'spring', stiffness: 200, damping: 16 }} className="snowcap spotlight card mt-9 p-4 sm:p-5 max-w-xl">
            <label htmlFor="hero" className="eyebrow">{COPY.nameLabel}</label>
            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              <input
                id="hero"
                ref={nameRef}
                value={hero}
                onChange={(e) => setHero(e.target.value.slice(0, 24))}
                placeholder={COPY.placeholder}
                className="field flex-1"
                autoComplete="off"
              />
              <Segmented<Lang> label="Story language" value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'pl', label: 'Polski' }]} />
            </div>
            <div className="mt-3">
              <div className="eyebrow mb-1.5">How do you like to learn? · {KIND[strongest].learn}{info?.gm ? ' · rolls at +2' : ''}</div>
              <Segmented<Force>
                label="How do you like to learn"
                value={strongest}
                onChange={setStrongest}
                options={FORCES.map((f) => ({ value: f, label: KIND[f].label }))}
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-faint">
              {config === null ? null : config.storyReady ? (
                <Badge tone="ok"><StatusDot tone="ok" /> Portals online</Badge>
              ) : (
                <Badge tone="danger"><StatusDot tone="danger" /> Portals offline</Badge>
              )}
              {config && !config.storyReady && <a href="#/admin" className="underline hover:text-ink">Add an Anthropic key</a>}
              {config?.storyReady && <span>{COPY.pick}</span>}
            </div>
          </motion.div>
        </div>

        <div className="relative hidden sm:flex flex-col items-center">
          <div className="card relative max-w-xs px-5 py-4 mb-6 text-[15px] font-semibold min-h-[4.5rem]">
            <AnimatePresence mode="wait">
              <motion.p key={quip} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                “{QUIPS[quip % QUIPS.length]}”
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
              <SVGCharacter isTalking={!!booting} mood={booting ? 'hyped' : 'sincere'} size={220} />
            )}
          </motion.div>
        </div>
      </section>

      {/* The 3-phase model of learning in the multi-verse. */}
      <section className="pb-14">
        <ol className="grid sm:grid-cols-3 gap-4">
          {PHASES.map((ph, i) => (
            <motion.li key={ph} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 + i * 0.1 }} className="card p-4 flex gap-3 items-start">
              <span className="grid place-items-center w-10 h-10 shrink-0 rounded-full border-[2.5px] border-outline bg-gold font-serif font-bold text-outline shadow-[0_3px_0_var(--color-outline)]">{PHASE[ph].n}</span>
              <span>
                <span className="block font-serif font-bold text-lg leading-tight">Phase {PHASE[ph].n}: {PHASE[ph].label}</span>
                <span className="block text-sm text-muted mt-1">{PHASE[ph].desc}</span>
              </span>
            </motion.li>
          ))}
        </ol>
      </section>

      {worlds !== null && !open && (
        <section className="pb-14">
          <div className="card p-6 max-w-2xl">
            <div className="font-serif font-bold text-xl">The portals are still closed.</div>
            <p className="text-muted mt-2 text-sm">The Edu-Verse opens once the sysadmin connects the iFairy Universe and runs a sync: <a href="#/admin" className="underline hover:text-ink">Sysadmin → iFairy Universe → Sync now</a>, then switch the world on.</p>
          </div>
        </section>
      )}

      {GROUPS.map((g) => {
        const list = adventures.filter((a) => a.kind === g.kind);
        if (!list.length) return null;
        return (
          <section key={g.kind} className="pb-14">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
              <div>
                <h2 className="toon-title text-3xl sm:text-4xl text-ink">{g.title}</h2>
                <p className="text-sm text-muted mt-1">{g.desc}</p>
              </div>
              {g.kind !== 'homework' && <span className="eyebrow">{list.length} {g.kind === 'world' ? 'worlds' : 'labs'}</span>}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((a, i) => (
                <TaleCover key={a.id} tale={a} badge={badgeOf(a)} cta={CTA[a.kind]} busyText="Opening the portal…" lang={lang} index={i} booting={booting} onStart={() => start(a.id)} />
              ))}
            </div>
          </section>
        );
      })}

      {runs.length > 0 && (
        <section className="pb-14">
          <h2 className="toon-title text-3xl mb-5 text-ink">Continue a journey</h2>
          <div className="card divide-y-2 divide-line overflow-hidden">
            {runs.slice(0, 6).map((r) => {
              const cover = art.src(`cover-${r.taleId}`);
              return (
                <a key={r.id} href={`#/story/${r.id}`} className="spotlight flex items-center gap-4 px-4 py-3 hover:bg-raised transition-colors group">
                  <span className="grid place-items-center w-11 h-11 rounded-xl text-xl shrink-0 border-[2.5px] border-outline overflow-hidden bg-cover bg-center" style={cover ? { backgroundImage: `url(${cover})` } : coverStyle(r.hue!)}>{!cover && r.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif font-semibold truncate">{r.title?.[lang] ?? r.taleId}</span>
                    <span className="block text-xs text-faint truncate">
                      {r.heroName} · {r.pages ?? 1} pages · {r.ending ? `ended: ${r.ending}` : 'in progress'} · {ago(r.updatedAt)}
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
        <span>Claude writes the journey · Gemini / OpenAI paint and speak · canon from the iFairy Universe</span>
        <span className="font-pixel">IGNIS // Quantum Edu-Verse v6.0 · cozy workshop</span>
      </footer>
    </div>
    </>
  );
}

type CoverCard = Pick<AdventureCard, 'id' | 'emoji' | 'hue' | 'title' | 'tagline'>;

/** A world card that tilts toward the cursor, with a glowing rim and a floating emblem. */
function TaleCover({ tale: t, badge, cta = 'Open portal', busyText = 'Opening the portal…', lang, index, booting, onStart }: { tale: CoverCard; badge: string; cta?: string; busyText?: string; lang: Lang; index: number; booting: string | null; onStart: () => void }) {
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
          <h3 className="font-serif font-bold text-xl leading-tight">{t.title[lang]}</h3>
          <p className="mt-2 text-[15px] text-muted flex-1">{t.tagline[lang]}</p>
          <span className="mt-4 self-start inline-flex items-center gap-1.5 rounded-xl border-[2.5px] border-outline bg-gold px-3 h-9 text-sm font-serif font-semibold text-outline shadow-[0_3px_0_var(--color-outline)] transition-transform group-hover:-rotate-2 group-hover:scale-105">
            {cta} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </motion.button>
    </motion.div>
  );
}
