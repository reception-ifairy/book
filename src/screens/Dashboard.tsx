import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, CheckCircle2, ChevronRight, Clock, Flame, KeyRound, LogOut, Sparkles, Star, Trophy, Zap } from 'lucide-react';
import { api, rememberRun, type TaleCard } from '../api';
import { logout, refreshDashboard, useAgent } from '../agent';
import { navigate } from '../App';
import { prefs, QUIPS } from './Home';
import { TopBar } from '../components/agent/TopBar';
import { TaleCover } from '../components/TaleCard';
import { DailyOps } from '../components/DailyOps';
import { SVGCharacter } from '../components/SVGCharacter';
import { StringLights } from '../components/Effects';
import { Badge, Button, Segmented, cx, useToast } from '../ui';
import { useArt } from '../artkit';
import { ago, coverStyle, ENDING } from '../meta';
import { DAILY_ACTIVITIES } from '../../shared/activities';
import { XP_RULES } from '../../shared/xp';
import type { DailyBoard } from '../../shared/daily';
import type { EndingType, Lang } from '../../shared/types';

const ENDING_TYPES: EndingType[] = ['canon', 'subverted', 'secret', 'cursed', 'death'];
const ENDING_EMOJI: Record<EndingType, string> = { canon: '📖', subverted: '🔀', secret: '🗝️', cursed: '🌀', death: '🗑️' };

/**
 * The agent's desk at the Bureau: ID card and rank, today's quick formats, Daily ops, the main case files,
 * quick cases, open cases, the endings archive and the XP log. Everything a later update adds goes here too.
 */
export function Dashboard() {
  const toast = useToast();
  const { agent, dash } = useAgent();
  const [tales, setTales] = useState<TaleCard[]>([]);
  const [board, setBoard] = useState<DailyBoard | null>(null);
  const [lang, setLangState] = useState<Lang>(() => (prefs.get('ignis.lang', agent?.lang ?? 'en') as Lang) || 'en');
  const [booting, setBooting] = useState<string | null>(null);
  const [quip, setQuip] = useState(0);
  const art = useArt();
  const heroArt = art.src('ignis-hero');
  const setLang = (l: Lang) => {
    setLangState(l);
    prefs.set('ignis.lang', l);
  };

  useEffect(() => {
    refreshDashboard().catch((e) => toast(e.message, 'error'));
    api.tales().then(setTales).catch((e) => toast(e.message, 'error'));
    api.daily().then(setBoard).catch(() => {});
    const t = setInterval(() => setQuip((q) => q + 1), 6000);
    return () => clearInterval(t);
  }, []);

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

  const main = tales.filter((t) => t.format !== 'quick');
  const quick = tales.filter((t) => t.format === 'quick');
  const rank = dash?.rank;
  const endings = dash?.endings ?? {};
  const foundTotal = Object.values(endings).reduce((n, e) => n + e.length, 0);
  const closed = dash?.cases.filter((c) => c.endingType).length ?? 0;
  const open = dash?.cases.filter((c) => !c.endingType).slice(0, 6) ?? [];
  const taleById = (id: string) => tales.find((t) => t.id === id);
  const dailyState = (id: string) => dash?.daily.find((d) => d.kind === id);
  const briefing = [
    `Agent ${agent.codename}, your desk is ready. I alphabetised the chaos. It is still chaos, but alphabetical.`,
    ...QUIPS,
  ];

  return (
    <>
      <StringLights count={28} className="h-10 z-10" />
      <div className="relative z-[1] mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-10">
        <TopBar />

        {/* ID card + IGNIS */}
        <section className="grid lg:grid-cols-[1.35fr_1fr] gap-5 pt-6 pb-10 items-stretch">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card snowcap p-5 sm:p-6 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="eyebrow">ARB agent ID · since {new Date(agent.createdAt).toLocaleDateString()}</span>
                <h1 className="toon-title text-4xl sm:text-5xl text-ink mt-1 break-words">{agent.codename}</h1>
                <span className="font-pixel text-sm text-faint">#{agent.tag}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="grid place-items-center w-16 h-16 rounded-2xl bg-screen border-[3px] border-outline shadow-[0_4px_0_var(--color-outline)] ml-auto">
                  <span className="font-pixel text-pixel text-2xl [text-shadow:0_0_8px_var(--color-pixel)]">{rank?.level ?? 1}</span>
                </span>
                <span className="eyebrow block mt-1.5">level</span>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="inline-flex items-center gap-2 font-serif font-bold text-lg"><Trophy size={18} className="text-gold" /> {rank?.title ?? 'Rookie'}</span>
                <span className="font-pixel text-xs text-faint">{rank?.next ? `${agent.xp} / ${rank.next} XP → ${rank.nextTitle}` : `${agent.xp} XP · top rank`}</span>
              </div>
              <div className="relative h-4 mt-2 rounded-full border-[2.5px] border-outline bg-[#00000040] overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,var(--color-ember),var(--color-gold))] shadow-[0_0_14px_var(--color-gold)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((rank?.progress ?? 0) * 100)}%` }}
                  transition={{ type: 'spring', stiffness: 60, damping: 16, delay: 0.3 }}
                />
                <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_18px,#00000033_18px_20px)]" />
              </div>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                { icon: Flame, label: 'Streak', value: `${agent.streak} ${agent.streak === 1 ? 'day' : 'days'}`, color: 'text-ember' },
                { icon: Zap, label: 'Today', value: `+${dash?.todayXp ?? 0} XP`, color: 'text-gold' },
                { icon: CheckCircle2, label: 'Cases closed', value: closed, color: 'text-ok' },
                { icon: Star, label: 'Endings found', value: `${foundTotal}/${tales.length * ENDING_TYPES.length || 45}`, color: 'text-chaos' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="rounded-xl border-2 border-line px-3 py-2">
                  <dt className="eyebrow flex items-center gap-1.5"><Icon size={13} className={color} /> {label}</dt>
                  <dd className="font-serif font-bold text-lg mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Segmented<Lang> label="Story language" value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'pl', label: 'Polski' }]} />
              <Button size="sm" onClick={() => navigate('agent/key')}><KeyRound size={14} /> Agent key</Button>
              <Button size="sm" variant="ghost" onClick={() => { logout(); toast('Logged out. Your desk will wait for your key.', 'ok'); }}><LogOut size={14} /> Log out</Button>
            </div>
          </motion.div>

          <div className="flex flex-col items-center justify-center gap-3">
            <div className="card relative max-w-sm px-5 py-4 text-[15px] font-semibold min-h-[5rem]">
              <AnimatePresence mode="wait">
                <motion.p key={quip} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                  “{briefing[quip % briefing.length]}”
                </motion.p>
              </AnimatePresence>
              <span className="absolute -bottom-[11px] left-1/2 -translate-x-1/2 w-5 h-5 rotate-45 bg-surface border-r-[3px] border-b-[3px] border-outline" />
            </div>
            {heroArt ? <img src={heroArt} alt={art.alt('ignis-hero')} className="floating w-32 h-32 sm:w-48 sm:h-48 object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]" /> : <SVGCharacter isTalking={false} mood="smug" size={170} />}
            <Badge tone="ember">IGNIS · your field assistant</Badge>
          </div>
        </section>

        {/* Today at the Bureau */}
        <section className="pb-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 className="toon-title text-3xl sm:text-4xl text-ink">Today at the Bureau</h2>
            <span className="eyebrow">{dash?.day ?? board?.day} · new every day</span>
          </div>
          {board?.glitch && (
            <div className="rounded-xl border-[2.5px] border-outline bg-screen text-pixel p-4 mb-4 shadow-[0_3px_0_var(--color-outline)]">
              <span className="font-pixel text-[11px] flex items-center gap-1.5">{art.src('icon-glitch') ? <img src={art.src('icon-glitch')} alt="" className="w-7 h-7 -my-1.5 object-contain" /> : <Zap size={13} />} GLITCH OF THE DAY · it leaks into every case</span>
              <p className="mt-1.5 text-[15px] font-semibold text-[#d9fbff]">{board.glitch.text}</p>
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-4">
            {DAILY_ACTIVITIES.map((a, i) => {
              const st = dailyState(a.id);
              const done = st?.state === 'done';
              return (
                <motion.a
                  key={a.id}
                  href={`#/${a.route}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className={cx('spotlight group card p-5 flex flex-col transition-transform hover:-translate-y-1', done && 'opacity-90')}
                  style={{ ['--spot' as string]: done ? 'var(--color-ok)' : 'var(--color-gold)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-4xl drop-shadow-[2px_3px_0_var(--color-outline)] transition-transform group-hover:-rotate-6 group-hover:scale-110">{a.emoji}</span>
                    {done ? <Badge tone="ok"><CheckCircle2 size={12} /> Done · +{st!.xp} XP</Badge> : st?.state === 'started' ? <Badge tone="warn">In progress</Badge> : <Badge tone="ember">New</Badge>}
                  </div>
                  <h3 className="font-serif font-bold text-xl mt-3">{a.title}</h3>
                  <p className="text-sm text-muted mt-1 flex-1">{a.blurb}</p>
                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-faint">
                    <span className="inline-flex items-center gap-1"><Clock size={13} /> ~{a.minutes} min · {a.xp}</span>
                    <span className="inline-flex items-center gap-1 text-ember group-hover:translate-x-1 transition-transform">{done ? 'See result' : 'Go'} <ChevronRight size={15} /></span>
                  </div>
                </motion.a>
              );
            })}
          </div>
        </section>

        <DailyOps serverProgress={dash?.quests} />

        {/* Main case files */}
        <section className="pb-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <h2 className="toon-title text-3xl sm:text-4xl text-ink">Main case files</h2>
            <span className="eyebrow">{main.length} long cases · 8–12 pages</span>
          </div>
          <p className="text-muted font-semibold mb-5 max-w-2xl">The big investigations. Every ending you find goes into your archive, and each new one pays a bonus.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {main.length === 0 && [0, 1, 2].map((i) => <div key={i} className="skeleton h-80" />)}
            {main.map((t, i) => (
              <TaleCover
                key={t.id}
                tale={t}
                badge={t.tech}
                caseNo={`ARB-${String(i + 1).padStart(3, '0')}`}
                lang={lang}
                index={i}
                booting={booting}
                onStart={() => start(t.id)}
                extra={<EndingDots found={endings[t.id] ?? []} />}
              />
            ))}
          </div>
        </section>

        {/* Quick cases */}
        <section className="pb-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <h2 className="toon-title text-3xl sm:text-4xl text-ink">Quick cases</h2>
            <span className="eyebrow">{quick.length} short missions · 3–5 pages</span>
          </div>
          <p className="text-muted font-semibold mb-5 max-w-2xl">Five-minute fixes for smaller tales. Perfect for a break, a bus ride or pretending to do homework.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quick.map((t, i) => (
              <TaleCover
                key={t.id}
                tale={t}
                badge={t.tech}
                caseNo={`Q-${String(i + 1).padStart(2, '0')}`}
                cta="Quick case"
                lang={lang}
                index={i}
                booting={booting}
                onStart={() => start(t.id)}
                compact
                extra={<EndingDots found={endings[t.id] ?? []} />}
              />
            ))}
          </div>
        </section>

        {/* Open cases + endings archive */}
        <section className="grid lg:grid-cols-2 gap-5 pb-12">
          <div>
            <h2 className="toon-title text-3xl text-ink mb-4">Open cases</h2>
            {open.length ? (
              <div className="card divide-y-2 divide-line overflow-hidden">
                {open.map((c) => {
                  const t = taleById(c.taleId);
                  const cover = t && art.src(`cover-${t.id}`);
                  return (
                    <a key={c.storyId} href={`#/story/${c.storyId}`} className="spotlight flex items-center gap-4 px-4 py-3 hover:bg-raised transition-colors group">
                      <span className="grid place-items-center w-11 h-11 rounded-xl text-xl shrink-0 border-[2.5px] border-outline overflow-hidden bg-cover bg-center" style={t ? (cover ? { backgroundImage: `url(${cover})` } : coverStyle(t.hue)) : undefined}>{t && !cover && t.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-serif font-semibold truncate">{t?.title[lang] ?? c.taleId}</span>
                        <span className="block text-xs text-faint truncate">{c.format === 'quick' ? 'Quick case' : 'Main case'} · {c.pages} pages · {ago(c.updatedAt)}</span>
                      </span>
                      <ChevronRight size={18} className="glow-icon text-faint group-hover:text-ember group-hover:translate-x-1 transition-all" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="card p-5 text-sm text-muted">No open cases. IGNIS is polishing the magnifying glass. Pick a case above.</div>
            )}
          </div>

          <div>
            <h2 className="toon-title text-3xl text-ink mb-4">Endings archive</h2>
            <div className="card p-4">
              <p className="text-xs text-faint mb-3">{ENDING_TYPES.map((e) => `${ENDING_EMOJI[e]} ${ENDING[e].label}`).join(' · ')}</p>
              <div className="grid grid-cols-[minmax(0,1fr)_repeat(5,2.25rem)] gap-x-2 gap-y-2 items-center text-sm">
                <span />
                {ENDING_TYPES.map((e) => (
                  <span key={e} className="text-center text-base" title={ENDING[e].label} aria-label={ENDING[e].label}>{ENDING_EMOJI[e]}</span>
                ))}
                {tales.map((t) => (
                  <ArchiveRow key={t.id} name={t.title[lang]} emoji={t.emoji} found={endings[t.id] ?? []} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* XP log + rules */}
        <section className="grid lg:grid-cols-[1.2fr_1fr] gap-5 pb-12">
          <div>
            <h2 className="toon-title text-3xl text-ink mb-4">XP log</h2>
            <ol className="card divide-y-2 divide-line overflow-hidden">
              {(dash?.feed ?? []).length === 0 && <li className="p-4 text-sm text-muted">Nothing yet. Every page, ending and daily mission lands here.</li>}
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
            <h2 className="toon-title text-3xl text-ink mb-4">How to earn XP</h2>
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

        <footer className="py-8 border-t-2 border-line text-xs font-semibold text-faint flex flex-wrap gap-x-6 gap-y-2 justify-between">
          <span className="inline-flex items-center gap-1.5"><BookOpen size={13} /> ARB · The Arcane Rescue Bureau · every tale here lives in the Public Domain</span>
          <span className="font-pixel inline-flex items-center gap-1.5"><Sparkles size={12} /> IGNIS // field assistant v7.0</span>
        </footer>
      </div>
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

function ArchiveRow({ name, emoji, found }: { name: string; emoji: string; found: EndingType[] }) {
  const art = useArt();
  return (
    <>
      <span className="truncate font-semibold" title={name}>{emoji} {name}</span>
      {ENDING_TYPES.map((e) => {
        const has = found.includes(e);
        const badge = art.src(`ending-${e}`);
        return (
          <span key={e} className={cx('grid place-items-center w-9 h-9 rounded-full border-2 mx-auto', has ? 'border-outline bg-raised' : 'border-dashed border-line')} title={has ? ENDING[e].label : 'Not found yet'}>
            {has ? badge ? <img src={badge} alt={ENDING[e].label} className="w-8 h-8 object-contain" /> : <span>{ENDING_EMOJI[e]}</span> : <span className="font-pixel text-faint text-xs">?</span>}
          </span>
        );
      })}
    </>
  );
}
