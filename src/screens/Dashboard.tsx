import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, ChevronRight, Clock, Dices, Loader2, Lock, Zap } from 'lucide-react';
import { api, rememberRun, type TaleCard } from '../api';
import { refreshDashboard, useAgent } from '../agent';
import { navigate } from '../App';
import { useDesk } from '../desk';
import { prefs, QUIPS } from './Home';
import { AgentShell, type DeskTab } from '../components/agent/AgentShell';
import { DeskIcon, type DeskIconName } from '../components/agent/icons';
import { TaleCover } from '../components/TaleCard';
import { DailyOps } from '../components/DailyOps';
import { SVGCharacter } from '../components/SVGCharacter';
import { Badge, Button, Segmented, cx, useToast } from '../ui';
import { useArt } from '../artkit';
import { ago, coverStyle, ENDING } from '../meta';
import { DAILY_ACTIVITIES, type Activity } from '../../shared/activities';
import { RANKS, XP_RULES } from '../../shared/xp';
import type { AgentDashboard } from '../../shared/agent';
import type { EndingType, Lang } from '../../shared/types';

const Quiz = lazy(() => import('./Quiz').then((m) => ({ default: m.Quiz })));
const Incident = lazy(() => import('./Incident').then((m) => ({ default: m.Incident })));
const Interrogation = lazy(() => import('./Interrogation').then((m) => ({ default: m.Interrogation })));
const AgentKey = lazy(() => import('./AgentKey').then((m) => ({ default: m.AgentKey })));

const ENDING_TYPES: EndingType[] = ['canon', 'subverted', 'secret', 'cursed', 'death'];
export const ENDING_EMOJI: Record<EndingType, string> = { canon: '📖', subverted: '🔀', secret: '🗝️', cursed: '🌀', death: '🗑️' };

/** Everything that can be open on the desk: its sections and the missions that run inside it. */
export type DeskView = DeskTab | 'quiz' | 'incident' | 'interrogation' | 'key';
const MISSIONS = new Set<DeskView>(['quiz', 'incident', 'interrogation']);
export const isDeskView = (v: string | undefined): v is DeskView => !!v && ['hq', 'cases', 'daily', 'archive', 'log', 'quiz', 'incident', 'interrogation', 'key'].includes(v);

function useLang(fallback: Lang) {
  const [lang, setLangState] = useState<Lang>(() => (prefs.get('ignis.lang', fallback) as Lang) || 'en');
  return [lang, (l: Lang) => { setLangState(l); prefs.set('ignis.lang', l); }] as const;
}

/**
 * The agent's desk on one page: HQ (everything at a glance), Case files, Daily ops, the Endings vault and
 * XP & ranks, plus the daily missions, all inside one cyber-magic control panel. Switching sections never
 * leaves the page; the hash only remembers where you are.
 */
export function Dashboard({ view = 'hq', extra }: { view?: DeskView; extra?: string }) {
  const toast = useToast();
  const { agent, dash } = useAgent();
  const { tales, board } = useDesk();
  const [lang, setLang] = useLang(agent?.lang ?? 'en');
  const [booting, setBooting] = useState<string | null>(null);
  // Fresh numbers whenever a section opens (a mission may just have paid out).
  useEffect(() => {
    refreshDashboard().catch(() => {});
  }, [view]);

  if (!agent) return null;

  const start = async (id: string) => {
    setBooting(id);
    try {
      const story = await api.start(id, lang, agent.codename);
      rememberRun(story);
      navigate(`story/${story.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
      setBooting(null);
    }
  };

  const active: DeskTab | null = MISSIONS.has(view) ? 'daily' : view === 'key' ? null : (view as DeskTab);
  const ctx: Ctx = { dash, tales, board, lang, setLang, start, booting };

  return (
    <AgentShell active={active}>
      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
          <Suspense fallback={<div className="card p-6 inline-flex items-center gap-3 text-muted"><Loader2 size={18} className="animate-spin" /> IGNIS is fetching the file…</div>}>
            {view === 'hq' && <Hq {...ctx} />}
            {view === 'cases' && <Cases {...ctx} />}
            {view === 'daily' && <Daily {...ctx} />}
            {view === 'archive' && <Archive {...ctx} />}
            {view === 'log' && <Log {...ctx} />}
            {view === 'quiz' && <Quiz />}
            {view === 'incident' && <Incident />}
            {view === 'interrogation' && <Interrogation />}
            {view === 'key' && <AgentKey fresh={extra === 'new'} />}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </AgentShell>
  );
}

type Ctx = {
  dash: AgentDashboard | null;
  tales: TaleCard[];
  board: ReturnType<typeof useDesk>['board'];
  lang: Lang;
  setLang: (l: Lang) => void;
  start: (id: string) => void;
  booting: string | null;
};

function DeskTitle({ eyebrow, title, sub, right }: { eyebrow: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        <p className="eyebrow text-gold">{eyebrow}</p>
        <h1 className="toon-title text-4xl sm:text-5xl text-ink mt-1">{title}</h1>
        {sub && <p className="text-muted font-semibold mt-2 max-w-2xl">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

const LangSwitch = ({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) => (
  <Segmented<Lang> label="Story language" value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'pl', label: 'Polski' }]} />
);

const dailyOf = (dash: AgentDashboard | null, id: string) => dash?.daily.find((d) => d.kind === id);

/** A daily mission tile: big on the Daily tab, compact on HQ. */
function MissionTile({ a, dash, index, compact }: { a: Activity; dash: AgentDashboard | null; index: number; compact?: boolean }) {
  const st = dailyOf(dash, a.id);
  const done = st?.state === 'done';
  return (
    <motion.a
      href={`#/${a.route}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.07 }}
      className={cx('spotlight group card flex flex-col transition-transform hover:-translate-y-1', compact ? 'p-4' : 'p-5')}
      style={{ ['--spot' as string]: done ? 'var(--color-ok)' : 'var(--color-gold)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <DeskIcon name={a.id as DeskIconName} size={compact ? 44 : 56} className="transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110" />
        {done ? <Badge tone="ok"><CheckCircle2 size={12} /> +{st!.xp} XP</Badge> : st?.state === 'started' ? <Badge tone="warn">In progress</Badge> : <Badge tone="ember">New</Badge>}
      </div>
      <h3 className={cx('font-serif font-bold mt-3', compact ? 'text-lg' : 'text-xl')}>{a.title}</h3>
      {!compact && <p className="text-sm text-muted mt-1 flex-1">{a.blurb}</p>}
      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-faint">
        <span className="inline-flex items-center gap-1"><Clock size={13} /> ~{a.minutes} min · {a.xp}</span>
        <span className="inline-flex items-center gap-1 text-ember group-hover:translate-x-1 transition-transform">{done ? 'Result' : 'Go'} <ChevronRight size={15} /></span>
      </div>
    </motion.a>
  );
}

// ---------- HQ ----------

function Hq({ dash, tales, board, lang, setLang, start, booting }: Ctx) {
  const { agent } = useAgent();
  const art = useArt();
  const heroArt = art.src('ignis-hero');
  const [quip, setQuip] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setQuip((q) => q + 1), 6500);
    return () => clearInterval(t);
  }, []);
  if (!agent) return null;

  const rank = dash?.rank;
  const endings = dash?.endings ?? {};
  const found = Object.values(endings).reduce((n, e) => n + e.length, 0);
  const total = (tales.length || 9) * ENDING_TYPES.length;
  const closed = dash?.cases.filter((c) => c.endingType).length ?? 0;
  const latest = dash?.cases.find((c) => !c.endingType);
  const latestTale = latest && tales.find((t) => t.id === latest.taleId);
  const quick = tales.filter((t) => t.format === 'quick');
  const briefing = [`Agent ${agent.codename}, your desk is ready. I alphabetised the chaos. It is still chaos, but alphabetical.`, ...QUIPS];
  const quests = board?.quests ?? [];

  return (
    <>
      <DeskTitle eyebrow="ARB · Agent HQ" title={`Hello, Agent ${agent.codename}`} sub="Everything on one desk. The coffee is symbolic, the glitches are real." right={<LangSwitch lang={lang} setLang={setLang} />} />

      <div className="grid lg:grid-cols-6 gap-4">
        {/* ID card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card snowcap p-5 lg:col-span-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="eyebrow">Agent ID #{agent.tag} · since {new Date(agent.createdAt).toLocaleDateString()}</span>
              <h2 className="font-serif font-bold text-2xl mt-1 truncate">{rank?.title ?? 'Rookie'}</h2>
              <span className="font-pixel text-xs text-faint">{rank?.next ? `${agent.xp} / ${rank.next} XP → ${rank.nextTitle}` : `${agent.xp} XP · the top rank`}</span>
            </div>
            <span className="grid place-items-center w-16 h-16 rounded-2xl bg-screen border-[3px] border-outline shadow-[0_4px_0_var(--color-outline)] shrink-0">
              <span className="font-pixel text-pixel text-2xl [text-shadow:0_0_8px_var(--color-pixel)]">{rank?.level ?? 1}</span>
            </span>
          </div>
          <div className="relative h-4 mt-4 rounded-full border-[2.5px] border-outline bg-[#00000040] overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,var(--color-ember),var(--color-gold))] shadow-[0_0_14px_var(--color-gold)]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round((rank?.progress ?? 0) * 100)}%` }}
              transition={{ type: 'spring', stiffness: 60, damping: 16, delay: 0.2 }}
            />
            <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_18px,#00000033_18px_20px)]" />
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {([
              ['streak', 'Streak', `${agent.streak} ${agent.streak === 1 ? 'day' : 'days'}`, '#/agent/log'],
              ['xp', 'Today', `+${dash?.todayXp ?? 0} XP`, '#/agent/log'],
              ['cases', 'Closed', closed, '#/agent/cases'],
              ['archive', 'Endings', `${found}/${total}`, '#/agent/archive'],
            ] as [DeskIconName, string, ReactNode, string][]).map(([icon, label, value, href]) => (
              <a key={label} href={href} className="group rounded-xl border-2 border-line px-3 py-2 flex items-center gap-2.5 hover:border-line-strong transition-colors">
                <DeskIcon name={icon} size={30} className="shrink-0 transition-transform group-hover:-rotate-6" />
                <span className="min-w-0">
                  <dt className="eyebrow">{label}</dt>
                  <dd className="font-serif font-bold text-lg leading-tight">{value}</dd>
                </span>
              </a>
            ))}
          </dl>
        </motion.div>

        {/* IGNIS */}
        <div className="card p-4 lg:col-span-2 flex flex-col items-center justify-center text-center gap-2">
          <AnimatePresence mode="wait">
            <motion.p key={quip} className="text-[15px] font-semibold min-h-[4.5rem]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
              “{briefing[quip % briefing.length]}”
            </motion.p>
          </AnimatePresence>
          {heroArt ? <img src={heroArt} alt={art.alt('ignis-hero')} className="floating w-28 h-28 sm:w-32 sm:h-32 object-contain" /> : <SVGCharacter isTalking={false} mood="smug" size={110} />}
          <span className="eyebrow">IGNIS · field assistant</span>
        </div>

        {/* Today's missions */}
        <div className="lg:col-span-6 grid sm:grid-cols-3 gap-4">
          {DAILY_ACTIVITIES.map((a, i) => <MissionTile key={a.id} a={a} dash={dash} index={i} compact />)}
        </div>

        {/* Continue */}
        <div className="card p-4 lg:col-span-2 flex flex-col">
          <span className="eyebrow flex items-center gap-2"><DeskIcon name="continue" size={22} /> Continue</span>
          {latest && latestTale ? (
            <a href={`#/story/${latest.storyId}`} className="group mt-3 flex-1 flex flex-col">
              <span className="relative block h-24 rounded-xl border-[2.5px] border-outline overflow-hidden bg-cover bg-center" style={art.src(`cover-${latestTale.id}`) ? { backgroundImage: `url(${art.src(`cover-${latestTale.id}`)})` } : coverStyle(latestTale.hue)}>
                {!art.src(`cover-${latestTale.id}`) && <span className="absolute inset-0 grid place-items-center text-5xl">{latestTale.emoji}</span>}
              </span>
              <span className="mt-2 font-serif font-bold truncate">{latestTale.title[lang]}</span>
              <span className="text-xs text-faint">{latest.pages} pages · {ago(latest.updatedAt)}</span>
              <span className="mt-auto pt-2 inline-flex items-center gap-1 text-sm font-semibold text-ember group-hover:translate-x-1 transition-transform">Back into the tale <ChevronRight size={15} /></span>
            </a>
          ) : (
            <div className="mt-3 flex-1 flex flex-col">
              <p className="text-sm text-muted flex-1">No open cases. IGNIS suggests a quick one: five minutes, maximum chaos, minimum homework.</p>
              <Button variant="primary" size="sm" className="mt-3 self-start" disabled={!quick.length || !!booting} onClick={() => start(quick[Math.floor(Math.random() * quick.length)].id)}>
                {booting ? <Loader2 size={14} className="animate-spin" /> : <Dices size={14} />} Random quick case
              </Button>
            </div>
          )}
        </div>

        {/* Daily ops, compact */}
        <a href="#/agent/daily" className="group card p-4 lg:col-span-2 flex flex-col hover:-translate-y-0.5 transition-transform">
          <span className="eyebrow flex items-center gap-2"><DeskIcon name="daily" size={22} /> Daily ops</span>
          <ul className="mt-3 space-y-2.5 flex-1">
            {quests.length === 0 && <li className="text-sm text-muted">No quests today. Even the Bureau takes a nap.</li>}
            {quests.map((q) => {
              const p = dash?.quests[q.slug];
              const pct = p ? Math.round((p.value / p.target) * 100) : 0;
              return (
                <li key={q.slug}>
                  <span className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={cx('font-semibold truncate', p?.claimed && 'line-through text-faint')}>{q.title}</span>
                    <span className="font-pixel text-[10px] text-gold shrink-0">{p?.claimed ? '✓' : `+${q.reward_xp}`}</span>
                  </span>
                  <span className="block mt-1 h-1.5 rounded-full bg-line overflow-hidden"><span className="block h-full bg-gold rounded-full" style={{ width: `${pct}%` }} /></span>
                </li>
              );
            })}
          </ul>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ember group-hover:translate-x-1 transition-transform">All daily ops <ChevronRight size={15} /></span>
        </a>

        {/* Vault + glitch */}
        <div className="lg:col-span-2 grid gap-4">
          <a href="#/agent/archive" className="group card p-4 flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
            <Ring value={found} total={total} />
            <span className="min-w-0">
              <span className="eyebrow flex items-center gap-1.5"><DeskIcon name="archive" size={20} /> Endings vault</span>
              <span className="block text-sm text-muted mt-1">{found ? `${found} endings filed. ${total - found} still hiding behind a password.` : 'Empty shelves. Every ending you find lands here.'}</span>
            </span>
          </a>
          {board?.glitch && (
            <div className="rounded-xl border-[2.5px] border-outline bg-screen text-pixel p-3 shadow-[0_3px_0_var(--color-outline)] flex gap-3 items-start">
              <DeskIcon name="glitch" size={34} className="shrink-0" />
              <span>
                <span className="font-pixel text-[10px]">GLITCH OF THE DAY</span>
                <span className="block text-sm font-semibold text-[#d9fbff] mt-0.5">{board.glitch.text}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Ring({ value, total }: { value: number; total: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  return (
    <svg viewBox="0 0 64 64" width="72" height="72" className="shrink-0" aria-label={`${value} of ${total}`}>
      <circle cx="32" cy="32" r={r} stroke="var(--color-line)" strokeWidth="8" fill="none" />
      <motion.circle cx="32" cy="32" r={r} stroke="var(--color-chaos)" strokeWidth="8" fill="none" strokeLinecap="round" transform="rotate(-90 32 32)" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1, ease: 'easeOut' }} />
      <text x="32" y="36" textAnchor="middle" className="font-pixel" fontSize="13" fill="currentColor">{Math.round(pct * 100)}%</text>
    </svg>
  );
}

// ---------- Case files ----------

function Cases({ dash, tales, lang, setLang, start, booting }: Ctx) {
  const art = useArt();
  const endings = dash?.endings ?? {};
  const main = tales.filter((t) => t.format !== 'quick');
  const quick = tales.filter((t) => t.format === 'quick');
  const open = dash?.cases.filter((c) => !c.endingType).slice(0, 6) ?? [];
  return (
    <>
      <DeskTitle eyebrow="ARB · Case files" title="Case files" sub="Every tale here lives in the Public Domain: free to tell, free to remix and, right now, slightly enchanted." right={<LangSwitch lang={lang} setLang={setLang} />} />

      {open.length > 0 && (
        <section className="mb-8">
          <h2 className="font-serif font-bold text-xl mb-3 flex items-center gap-2"><DeskIcon name="continue" size={26} /> In progress</h2>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {open.map((c) => {
              const t = tales.find((x) => x.id === c.taleId);
              const cover = t && art.src(`cover-${t.id}`);
              return (
                <a key={c.storyId} href={`#/story/${c.storyId}`} className="spotlight card flex items-center gap-3 p-3 group">
                  <span className="grid place-items-center w-12 h-12 rounded-xl text-2xl shrink-0 border-[2.5px] border-outline overflow-hidden bg-cover bg-center" style={t ? (cover ? { backgroundImage: `url(${cover})` } : coverStyle(t.hue)) : undefined}>{t && !cover && t.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif font-semibold truncate">{t?.title[lang] ?? c.taleId}</span>
                    <span className="block text-xs text-faint truncate">{c.format === 'quick' ? 'Quick case' : 'Main case'} · {c.pages} pages · {ago(c.updatedAt)}</span>
                  </span>
                  <ChevronRight size={18} className="text-faint group-hover:text-ember group-hover:translate-x-1 transition-all" />
                </a>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="font-serif font-bold text-xl mb-1 flex items-center gap-2"><DeskIcon name="cases" size={26} /> Main case files</h2>
        <p className="text-sm text-muted mb-4">The big investigations, 8–12 pages. Every new ending pays a bonus.</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {main.length === 0 && [0, 1, 2].map((i) => <div key={i} className="skeleton h-80" />)}
          {main.map((t, i) => (
            <TaleCover key={t.id} tale={t} badge={t.tech} caseNo={`ARB-${String(i + 1).padStart(3, '0')}`} lang={lang} index={i} booting={booting} onStart={() => start(t.id)} extra={<EndingDots found={endings[t.id] ?? []} />} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif font-bold text-xl mb-1 flex items-center gap-2"><DeskIcon name="quick" size={26} /> Quick cases</h2>
        <p className="text-sm text-muted mb-4">Five-minute fixes in 3–5 pages. Perfect for a bus ride or pretending to do homework.</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {quick.map((t, i) => (
            <TaleCover key={t.id} tale={t} badge={t.tech} caseNo={`Q-${String(i + 1).padStart(2, '0')}`} cta="Quick case" lang={lang} index={i} booting={booting} onStart={() => start(t.id)} compact extra={<EndingDots found={endings[t.id] ?? []} />} />
          ))}
        </div>
      </section>
    </>
  );
}

function EndingDots({ found }: { found: EndingType[] }) {
  return (
    <span className="mt-3 flex items-center gap-1.5" title={`${found.length} of 5 endings found`}>
      {ENDING_TYPES.map((e) => (
        <span key={e} className={cx('grid place-items-center w-6 h-6 rounded-full border-2 text-[11px]', found.includes(e) ? 'border-outline bg-gold' : 'border-line text-faint')}>
          {found.includes(e) ? ENDING_EMOJI[e] : '?'}
        </span>
      ))}
      <span className="font-pixel text-[10px] text-faint ml-1">{found.length}/5</span>
    </span>
  );
}

// ---------- Daily ops ----------

function Daily({ dash, board }: Ctx) {
  return (
    <>
      <DeskTitle eyebrow={`ARB · Daily ops · ${dash?.day ?? board?.day ?? ''}`} title="Daily ops" sub="Three missions, today's quests and the glitch of the day. Everything resets at midnight, Bureau time, like a pumpkin carriage." />
      {board?.glitch && (
        <div className="rounded-2xl border-[3px] border-outline bg-screen text-pixel p-4 mb-5 shadow-[0_4px_0_var(--color-outline)] flex gap-4 items-center">
          <DeskIcon name="glitch" size={52} className="shrink-0" />
          <span>
            <span className="font-pixel text-[11px]">GLITCH OF THE DAY · it leaks into every case</span>
            <span className="block mt-1 text-[15px] font-semibold text-[#d9fbff]">{board.glitch.text}</span>
          </span>
        </div>
      )}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {DAILY_ACTIVITIES.map((a, i) => <MissionTile key={a.id} a={a} dash={dash} index={i} />)}
      </div>
      <DailyOps serverProgress={dash?.quests} />
    </>
  );
}

// ---------- Endings vault ----------

function Archive({ dash, tales, lang }: Ctx) {
  const art = useArt();
  const endings = dash?.endings ?? {};
  const found = Object.values(endings).reduce((n, e) => n + e.length, 0);
  const total = tales.length * ENDING_TYPES.length;
  const perType = (e: EndingType) => Object.values(endings).filter((x) => x.includes(e)).length;
  return (
    <>
      <DeskTitle eyebrow="ARB · Endings vault" title="Endings vault" sub="Every tale hides five endings. Each new one you find is filed here and pays +25 XP. The secret ones are, unsurprisingly, secret." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
        <div className="card p-4 lg:col-span-1 flex items-center gap-3">
          <Ring value={found} total={total} />
        </div>
        {ENDING_TYPES.map((e) => (
          <div key={e} className="card p-4 flex items-center gap-3">
            <span className="grid place-items-center w-11 h-11 rounded-full border-2 border-outline bg-raised shrink-0">
              {art.src(`ending-${e}`) ? <img src={art.src(`ending-${e}`)} alt="" className="w-10 h-10 object-contain" /> : <span className="text-xl">{ENDING_EMOJI[e]}</span>}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold truncate">{ENDING[e].label}</span>
              <span className="font-pixel text-xs text-faint">{perType(e)}/{tales.length || 9}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="card p-4 sm:p-5 overflow-x-auto">
        <div className="grid grid-cols-[minmax(10rem,1fr)_repeat(5,2.75rem)] gap-x-2 gap-y-2.5 items-center text-sm min-w-[24rem]">
          <span className="eyebrow">Tale</span>
          {ENDING_TYPES.map((e) => <span key={e} className="text-center text-lg" title={ENDING[e].label}>{ENDING_EMOJI[e]}</span>)}
          {tales.map((t) => (
            <VaultRow key={t.id} name={t.title[lang]} emoji={t.emoji} quick={t.format === 'quick'} found={endings[t.id] ?? []} />
          ))}
        </div>
      </div>
    </>
  );
}

function VaultRow({ name, emoji, quick, found }: { name: string; emoji: string; quick: boolean; found: EndingType[] }) {
  const art = useArt();
  return (
    <>
      <span className="truncate font-semibold" title={name}>{emoji} {name} {quick && <span className="font-pixel text-[10px] text-faint">quick</span>}</span>
      {ENDING_TYPES.map((e) => {
        const has = found.includes(e);
        const badge = art.src(`ending-${e}`);
        return (
          <span key={e} className={cx('grid place-items-center w-10 h-10 rounded-full border-2 mx-auto', has ? 'border-outline bg-raised' : 'border-dashed border-line')} title={has ? ENDING[e].label : 'Not found yet'}>
            {has ? badge ? <img src={badge} alt={ENDING[e].label} className="w-9 h-9 object-contain" /> : <span>{ENDING_EMOJI[e]}</span> : <Lock size={13} className="text-faint" />}
          </span>
        );
      })}
    </>
  );
}

// ---------- XP & ranks ----------

const RANK_JOKES = [
  'Has a badge. The badge is a sticker.',
  'Allowed to touch the patch cables (gently).',
  'Can debug a curse without crying. Mostly.',
  'Reads spellbooks for typos. Finds many.',
  'Fixes tales before breakfast, breaks them after.',
  'Glitches salute when you walk past.',
  'Your patches are sung by bards. Badly.',
  'Every fairy tale has your number on speed dial.',
];

function Log({ dash }: Ctx) {
  const { agent } = useAgent();
  const level = dash?.rank.level ?? 1;
  return (
    <>
      <DeskTitle eyebrow="ARB · XP & ranks" title="XP & ranks" sub="Every page, ending and mission pays XP once. Climb the ladder from Rookie to Legend of the Public Domain." />
      <div className="grid lg:grid-cols-[1fr_1.15fr] gap-5">
        <section>
          <h2 className="font-serif font-bold text-xl mb-3 flex items-center gap-2"><DeskIcon name="hq" size={26} /> The rank ladder</h2>
          <ol className="card divide-y-2 divide-line overflow-hidden">
            {[...RANKS].reverse().map((r, ri) => {
              const i = RANKS.length - 1 - ri;
              const here = i + 1 === level;
              const reached = i + 1 <= level;
              return (
                <li key={r.title} className={cx('flex items-center gap-3 px-4 py-2.5', here && 'bg-raised')}>
                  <span className={cx('grid place-items-center w-9 h-9 rounded-lg border-2 border-outline font-pixel text-sm shrink-0', reached ? 'bg-gold text-outline' : 'bg-screen text-faint')}>{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cx('block font-serif font-bold truncate', !reached && 'text-faint')}>{r.title} {here && <Badge tone="ember">you are here</Badge>}</span>
                    <span className="block text-xs text-faint truncate">{RANK_JOKES[i]}</span>
                  </span>
                  <span className="font-pixel text-xs text-faint shrink-0">{r.xp} XP</span>
                </li>
              );
            })}
          </ol>
          {agent && <p className="text-xs text-faint mt-2">You have {agent.xp} XP{dash?.rank.next ? `, ${dash.rank.next - agent.xp} to ${dash.rank.nextTitle}` : ''}.</p>}
        </section>
        <section className="space-y-5">
          <div>
            <h2 className="font-serif font-bold text-xl mb-3 flex items-center gap-2"><DeskIcon name="xp" size={26} /> XP log</h2>
            <ol className="card divide-y-2 divide-line overflow-hidden">
              {(dash?.feed ?? []).length === 0 && <li className="p-4 text-sm text-muted">Nothing yet. IGNIS is holding the pen dramatically.</li>}
              {dash?.feed.map((f, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="comic text-lg text-gold w-14 shrink-0">+{f.amount}</span>
                  <span className="text-sm font-semibold flex-1 min-w-0 truncate">{f.label}</span>
                  <span className="text-xs text-faint shrink-0">{ago(f.createdAt)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="font-serif font-bold text-xl mb-3 flex items-center gap-2"><Zap size={22} className="text-gold" /> How to earn XP</h2>
            <ul className="card divide-y-2 divide-line overflow-hidden text-sm">
              {XP_RULES.map((r) => (
                <li key={r.label} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="font-pixel text-xs text-gold w-20 shrink-0 pt-0.5">{r.xp}</span>
                  <span className="min-w-0">
                    <span className="font-semibold">{r.label}</span>
                    {r.note && <span className="block text-xs text-faint">{r.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
