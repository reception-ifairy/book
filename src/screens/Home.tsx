import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowRight, ChevronRight, Loader2, Settings2 } from 'lucide-react';
import { SVGCharacter } from '../components/SVGCharacter';
import { ArchivistAvatar } from '../components/ArchivistAvatar';
import { api, loadRuns, rememberRun, type TaleCard, type WorldInfo } from '../api';
import { navigate } from '../App';
import { Badge, Logo, Segmented, SnowToggle, StatusDot, useToast } from '../ui';
import { StringLights } from '../components/Effects';
import { FORCES, type Force, type Lang, type PublicConfig, type World } from '../../shared/types';
import type { AdventureCard, AdventureKind } from '../../shared/universe';
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

const QUIPS: Record<World, string[]> = {
  grimm: [
    'Every fairy tale is legacy code. I just read the stack traces.',
    'Choose wisely. Or don’t. Bad choices make better content.',
    'The wolf has root access. Again.',
    'I have seen 14 million timelines. You die in most of them. Funnily.',
  ],
  ifairy: [
    'Welcome, Young Architect. The Archive has been expecting you.',
    'Every question you ask adds a shelf to the Library.',
    'I once filed a nebula under “N”. It did not appreciate it.',
    'The Golden City hums at optimal resonance today.',
  ],
};

/** What the home screen says in each world. */
const COPY: Record<World, { eyebrow: string; title: [string, string]; accent: string; lead: string; nameLabel: string; placeholder: string; needName: string; pick: string }> = {
  grimm: {
    eyebrow: '★ Interactive fiction · cyber-magic · 16+',
    title: ['Fairy', 'tales,'],
    accent: 'unpatched.',
    lead: 'Classic stories run on cursed legacy code. Pick one, make terrible decisions and fork reality. IGNIS narrates, and judges you for it.',
    nameLabel: 'Your debugger handle',
    placeholder: 'e.g. Morty_404',
    needName: 'Give your debugger a name first.',
    pick: 'Pick a tale below to begin.',
  },
  ifairy: {
    eyebrow: '★ The iFairy Universe · interactive canon · 13+',
    title: ['Stories', 'of the'],
    accent: 'Golden City.',
    lead: 'Step through the Narrative Portals into the canon of the iFairy Universe. The Narrator-Archivist guides you; the four forces answer your choices.',
    nameLabel: 'Your Architect name (made up, never your real one)',
    placeholder: 'e.g. Nova_Quill',
    needName: 'Choose an Architect name first.',
    pick: 'Pick an adventure below to begin.',
  },
};

const GROUPS: { kind: AdventureKind; title: string; desc: string }[] = [
  { kind: 'hook', title: 'Portal hooks', desc: 'Six story hooks from the Narrative Portals and their Guardians.' },
  { kind: 'saga', title: 'The If-AI Saga', desc: 'The founding story in eight acts, walked as a living memory.' },
  { kind: 'district', title: "Travellers' Districts", desc: 'Public-domain story worlds living as Portal Districts of the Golden City.' },
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const badgeOf = (a: AdventureCard) => (a.kind === 'saga' ? `Act ${ROMAN[a.order - 1]}` : a.kind === 'hook' ? `Hook ${a.order}` : 'District');

export function Home() {
  const toast = useToast();
  const [tales, setTales] = useState<TaleCard[]>([]);
  const [adventures, setAdventures] = useState<AdventureCard[]>([]);
  const [worlds, setWorlds] = useState<WorldInfo[]>([]);
  const [world, setWorld] = useState<World>(() => prefs.get('ignis.world', 'grimm') as World);
  const [districtFilter, setDistrictFilter] = useState('');
  const [strongest, setStrongest] = useState<Force>(() => prefs.get('ignis.force', 'mythos') as Force);
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
    api.worlds().then(setWorlds).catch(() => {});
    api.adventures().then(setAdventures).catch(() => {});
    const t = setInterval(() => setQuip((q) => q + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // The iFairy world appears once the owner has enabled and synced it.
  const ifairyInfo = worlds.find((w) => w.id === 'ifairy');
  const ifairyOpen = (ifairyInfo?.adventures ?? 0) > 0;
  const active: World = world === 'ifairy' && ifairyOpen ? 'ifairy' : 'grimm';
  const copy = COPY[active];
  const quips = QUIPS[active];
  const chooseWorld = (w: World) => {
    setWorld(w);
    prefs.set('ignis.world', w);
  };

  const start = async (id: string) => {
    if (!hero.trim()) {
      nameRef.current?.focus();
      return toast(copy.needName, 'error');
    }
    setBooting(id);
    prefs.set('ignis.lang', lang);
    prefs.set('ignis.hero', hero.trim());
    try {
      if (active === 'ifairy') prefs.set('ignis.force', strongest);
      const story = active === 'ifairy' ? await api.startAdventure(id, lang, hero.trim(), ifairyInfo?.gm ? strongest : undefined) : await api.start(id, lang, hero.trim());
      rememberRun(story);
      navigate(`story/${story.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
      setBooting(null);
    }
  };

  const taleById = (id: string) => tales.find((t) => t.id === id);
  const districts = adventures.filter((a) => a.kind === 'district');
  const q = districtFilter.trim().toLowerCase();
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

      <section className="grid lg:grid-cols-[1.25fr_1fr] gap-10 items-center pt-8 pb-14 sm:pt-14">
        <div>
          {ifairyOpen && (
            <div className="mb-6">
              <Segmented<World>
                label="World"
                value={active}
                onChange={chooseWorld}
                options={[{ value: 'grimm', label: 'Grimm Protocol' }, { value: 'ifairy', label: 'iFairy Universe' }]}
              />
            </div>
          )}
          <p className="eyebrow mb-5 text-gold">{copy.eyebrow}</p>
          <h1 key={active} className="toon-title text-5xl sm:text-6xl lg:text-7xl leading-[1.02] text-ink">
            {copy.title.map((w, i) => (
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
              data-text={copy.accent}
              initial={{ opacity: 0, y: 24, filter: 'blur(14px)', letterSpacing: '0.2em' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '0em' }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {copy.accent}
            </motion.em>
          </h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-7 text-lg text-muted max-w-xl font-semibold">
            {copy.lead}
          </motion.p>

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
            {active === 'ifairy' && ifairyInfo?.gm && (
              <div className="mt-3">
                <div className="eyebrow mb-1.5">Your strongest force · rolls at +2</div>
                <Segmented<Force>
                  label="Strongest force"
                  value={strongest}
                  onChange={setStrongest}
                  options={FORCES.map((f) => ({ value: f, label: f[0].toUpperCase() + f.slice(1) }))}
                />
              </div>
            )}
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
              <motion.p key={`${active}-${quip}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                “{quips[quip % quips.length]}”
              </motion.p>
            </AnimatePresence>
            <span className="absolute -bottom-[11px] left-1/2 -translate-x-1/2 w-5 h-5 rotate-45 bg-surface border-r-[3px] border-b-[3px] border-outline" />
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.3 }}>
            {active === 'ifairy' ? (
              <ArchivistAvatar isTalking={!!booting} size={230} />
            ) : heroArt ? (
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
        </div>
      </section>

      {active === 'grimm' ? (
        <section className="pb-14">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="toon-title text-3xl sm:text-4xl text-ink">Choose a corrupted tale</h2>
            <span className="eyebrow hidden sm:block">{tales.length} tales installed</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tales.length === 0 && [0, 1, 2].map((i) => <div key={i} className="skeleton h-80" />)}
            {tales.map((t, i) => (
              <TaleCover key={t.id} tale={t} badge={t.tech} lang={lang} index={i} booting={booting} onStart={() => start(t.id)} />
            ))}
          </div>
        </section>
      ) : (
        GROUPS.map((g) => {
          const list = adventures.filter((a) => a.kind === g.kind && (g.kind !== 'district' || !q || `${a.title.en} ${a.title.pl} ${a.tagline.en}`.toLowerCase().includes(q)));
          return (
            <section key={g.kind} className="pb-14">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                <div>
                  <h2 className="toon-title text-3xl sm:text-4xl text-ink">{g.title}</h2>
                  <p className="text-sm text-muted mt-1">{g.desc}</p>
                </div>
                {g.kind === 'district' ? (
                  <input value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} placeholder={`Filter ${districts.length} districts…`} className="field w-full sm:w-64" aria-label="Filter districts" />
                ) : (
                  <span className="eyebrow">{list.length} adventures</span>
                )}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((a, i) => (
                  <TaleCover key={a.id} tale={a} badge={badgeOf(a)} cta="Begin" busyText="Opening the Archive…" lang={lang} index={i} booting={booting} onStart={() => start(a.id)} />
                ))}
              </div>
              {g.kind === 'district' && list.length === 0 && <p className="text-sm text-faint">No district matches “{districtFilter}”.</p>}
            </section>
          );
        })
      )}

      {runs.length > 0 && (
        <section className="pb-14">
          <h2 className="toon-title text-3xl mb-5 text-ink">Continue a timeline</h2>
          <div className="card divide-y-2 divide-line overflow-hidden">
            {runs.slice(0, 6).map((r) => {
              // iFairy runs remember their own card; Grimm runs look their tale up.
              const t = r.title && r.emoji !== undefined && r.hue !== undefined ? { id: r.taleId, title: r.title as TaleCard['title'], emoji: r.emoji, hue: r.hue } : taleById(r.taleId);
              return (
                <a key={r.id} href={`#/story/${r.id}`} className="spotlight flex items-center gap-4 px-4 py-3 hover:bg-raised transition-colors group">
                  <span className="grid place-items-center w-11 h-11 rounded-xl text-xl shrink-0 border-[2.5px] border-outline overflow-hidden bg-cover bg-center" style={t ? (art.src(`cover-${t.id}`) ? { backgroundImage: `url(${art.src(`cover-${t.id}`)})` } : coverStyle(t.hue)) : undefined}>{t && !art.src(`cover-${t.id}`) && t.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif font-semibold truncate">{t?.title[lang] ?? r.taleId}</span>
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
        <span>Claude writes the story · Gemini / OpenAI paint and speak{ifairyOpen ? ' · canon from the iFairy Universe' : ''}</span>
        <span className="font-pixel">IGNIS // OS v4.3 · cozy workshop</span>
      </footer>
    </div>
    </>
  );
}

type CoverCard = Pick<TaleCard, 'id' | 'emoji' | 'hue' | 'title' | 'tagline'>;

/** A tale or adventure card that tilts toward the cursor, with a glowing rim and a floating emblem. */
function TaleCover({ tale: t, badge, cta = 'Run tale', busyText = 'Decrypting tale…', lang, index, booting, onStart }: { tale: CoverCard; badge: string; cta?: string; busyText?: string; lang: Lang; index: number; booting: string | null; onStart: () => void }) {
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
