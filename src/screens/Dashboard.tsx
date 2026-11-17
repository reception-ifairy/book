import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BadgeInfo, Clock, Coffee, Copy, Dices, FileText, Gauge, Info, Loader2, LogOut, MapPin, RefreshCcw, Stamp, Users } from 'lucide-react';
import {
  CHOICE_META, DEPARTMENTS, ENDING_META, MISSION_TYPES, agentStatus, coffeeNow, dcFor, locationOf, missionOf, rankOf, specialization,
  type DepartmentGroup, type Mission,
} from '../../shared/arb';
import type { CoffeeResult } from '../../shared/types';
import { api } from '../api';
import { signOut, useAgent } from '../agent';
import { navigate } from '../App';
import { Cat } from '../components/Cat';
import { D20 } from '../components/D20';
import { Shell } from '../components/Shell';
import { TELEGRAF_TABS, formatMs, stressColor, telegrafFor, tempusFugit, weatherFor, type TelegrafCategory } from '../desk';
import { ago } from '../meta';
import { Badge, Button, Meter, Sheet, cx, useToast } from '../ui';

const Stars = ({ n }: { n: number }) => (
  <span className="text-gold tracking-tight" aria-label={`Trudność ${n} z 5`}>
    {'★'.repeat(n)}
    <span className="text-faint">{'★'.repeat(5 - n)}</span>
  </span>
);

function useClock(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function Dashboard() {
  const { agent, setAgent } = useAgent();
  const toast = useToast();
  const now = useClock();
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState('');
  const [brewed, setBrewed] = useState<CoffeeResult | null>(null);
  const [more, setMore] = useState(false);
  const [showDc, setShowDc] = useState(false);
  const [tab, setTab] = useState<TelegrafCategory>('pilne');
  const [showOrg, setShowOrg] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const weather = useMemo(() => weatherFor(now), [now.getHours()]);
  const telegraf = useMemo(() => (agent ? telegrafFor(agent) : []), [agent?.id, agent?.offer?.missionId, agent?.history.length]);
  if (!agent) return null;

  const { rank, next, progress, index } = rankOf(agent.xp);
  const coffee = coffeeNow(agent.coffee, agent.coffeeAt, now.getTime());
  const status = agentStatus(agent.stress, coffee);
  const clocks = tempusFugit(agent, now);
  const offer = agent.offer;
  const offered = offer ? missionOf(offer.missionId) : undefined;
  const active = [...agent.history].reverse().find((h) => h.storyId === agent.activeStoryId);
  const closed = [...agent.history].reverse().filter((h) => h.ending);

  const runNarratomat = async (reroll = false) => {
    setRolling(true);
    setMore(false);
    setShowDc(false);
    try {
      const [next] = await Promise.all([api.narratomat(agent.id, reroll), new Promise((r) => setTimeout(r, 1100))]);
      setAgent(next);
      if (next.offer?.roll === 20) toast('Naturalna dwudziestka! Wybierasz z trzech teczek.');
      if (next.offer?.paradox) toast('Naturalna jedynka. PARADOKS PRZYDZIAŁU.', 'error');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setRolling(false);
    }
  };

  const accept = async (missionId: string) => {
    setBusy(missionId);
    try {
      const story = await api.accept(agent.id, missionId);
      await useAgentRefresh();
      navigate(`misja/${story.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
      setBusy('');
    }
  };
  const useAgentRefresh = async () => setAgent(await api.agent(agent.id));

  const brew = async () => {
    setBusy('coffee');
    try {
      const { agent: next, result } = await api.coffee(agent.id);
      setAgent(next);
      setBrewed(result);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy('');
    }
  };

  const spec = specialization(agent.specialization);

  return (
    <Shell active="">
      {/* 1. Dynamic header */}
      <section className="card p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-5">
        <Cat mood={status.tone === 'danger' ? 'syczy' : status.tone === 'warn' ? 'zaciekawiony' : 'mruczy'} size={84} />
        <div className="min-w-0 flex-1">
          <div className="eyebrow">Pulpit Agenta 2.0 · Narratoriusz</div>
          <h1 className="toon-title text-3xl sm:text-4xl mt-1">Agent {agent.codename}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge tone="ember">{rank.name}</Badge>
            <Badge>{spec?.emoji} {spec?.name}</Badge>
            <Badge tone={status.tone}>Status: {status.label}</Badge>
          </div>
          <div className="mt-3 max-w-md">
            <div className="flex justify-between text-xs text-muted font-bold">
              <span>{agent.xp} XP</span>
              <span>{next ? `do rangi „${next.name}”: ${next.minXp - agent.xp} XP` : 'Najwyższa ranga. Legenda.'}</span>
            </div>
            <div className="h-2.5 mt-1 rounded-full border-2 border-outline bg-[#00000020] overflow-hidden">
              <motion.div className="h-full bg-gold" initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', stiffness: 80, damping: 18 }} />
            </div>
          </div>
        </div>
        <div className="flex md:flex-col gap-2">
          <Button size="sm" onClick={() => setShowOrg(true)}><Users size={16} /> Struktura ARB</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowPass(true)}><BadgeInfo size={16} /> Przepustka</Button>
        </div>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-5 mt-5">
        <div className="space-y-5 min-w-0">
          {/* 6. Today's mission */}
          <section className="card p-5 sm:p-6" aria-labelledby="misja-dnia">
            <div className="flex items-center gap-2">
              <Dices className="text-chaos" />
              <h2 id="misja-dnia" className="font-serif font-bold text-2xl">Twoja Dzisiejsza Misja</h2>
              <span className="ml-auto font-pixel text-xs text-faint">NarratoMat 5000</span>
            </div>

            {active ? (
              <div className="mt-4 rounded-2xl border-[2.5px] border-outline bg-raised p-4">
                <div className="eyebrow">Sprawa w toku</div>
                <div className="font-serif font-bold text-xl mt-1">{MISSION_TYPES[active.type].emoji} {active.title}</div>
                <p className="text-sm text-muted mt-1">Otwarta {ago(active.startedAt)}. Akta czekają na kolejny wpis.</p>
                <Button variant="primary" className="mt-3" onClick={() => navigate(`misja/${active.storyId}`)}><FileText size={16} /> Wróć do akt</Button>
              </div>
            ) : rolling ? (
              <div className="mt-6 flex flex-col items-center gap-3 py-6" aria-live="polite">
                <D20 value={null} rolling size={96} />
                <span className="eyebrow animate-pulse">NarratoMat analizuje rangę, historię i kaprysy…</span>
              </div>
            ) : !offer || !offered ? (
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <p className="text-muted flex-1">Algorytm przydziela zadania według rangi, specjalizacji, historii misji, rzutu kością K20 i czasem… kaprysu systemu.</p>
                <Button variant="primary" size="lg" onClick={() => runNarratomat()}><Dices size={18} /> Uruchom NarratoMat</Button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={offer.createdAt} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="mt-4 grid sm:grid-cols-[auto_1fr] gap-4">
                    <div className="flex sm:flex-col items-center gap-2">
                      <D20 value={offer.roll} size={80} />
                      {offer.paradox && <Badge tone="danger">PARADOKS</Badge>}
                    </div>
                    <MissionCard mission={offered} paradox={offer.paradox} />
                  </div>

                  <details className="mt-4 rounded-xl bg-screen text-pixel font-pixel text-xs p-3 border-2 border-outline">
                    <summary className="cursor-pointer">Wydruk NarratoMat 5000 (uzasadnienie przydziału)</summary>
                    <ul className="mt-2 space-y-1">
                      {offer.reasons.map((r) => <li key={r}>&gt; {r}</li>)}
                    </ul>
                  </details>

                  <AnimatePresence>
                    {more && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-4 rounded-xl border-2 border-outline bg-field p-4 text-sm space-y-2">
                          <p>{offered.details}</p>
                          <p><b>Obsada:</b> {offered.cast.join(', ')}</p>
                          <p><b>Wymagane formularze:</b> {offered.forms.join(', ')}</p>
                        </div>
                      </motion.div>
                    )}
                    {showDc && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <DifficultyBox mission={offered} paradox={offer.paradox} rankIndex={index} specMatch={[offered.region, offered.theme].includes(agent.specialization)} stress={agent.stress} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {offer.alternatives.length > 0 && (
                    <div className="mt-4">
                      <div className="eyebrow mb-2">Albo wybierz inną teczkę (nagroda za naturalną 20)</div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {offer.alternatives.map((id) => {
                          const m = missionOf(id);
                          return m ? (
                            <button key={id} onClick={() => accept(id)} disabled={!!busy} className="text-left rounded-xl border-2 border-outline bg-field p-3 hover:bg-raised transition-colors">
                              <div className="font-serif font-bold">{MISSION_TYPES[m.type].emoji} {m.title}</div>
                              <div className="text-xs text-muted mt-0.5">{m.brief}</div>
                              <div className="text-xs mt-1"><Stars n={m.difficulty} /></div>
                            </button>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-5">
                    <Button variant="primary" onClick={() => accept(offered.id)} disabled={!!busy}>
                      {busy === offered.id ? <Loader2 size={16} className="animate-spin" /> : <Stamp size={16} />} Przyjmij misję
                    </Button>
                    <Button onClick={() => setMore((v) => !v)}><Info size={16} /> Poproś o więcej informacji</Button>
                    <Button onClick={() => runNarratomat(true)} disabled={!!busy || agent.rerolls.left < 1}>
                      <RefreshCcw size={16} /> Zaproponuj innego Agenta ({agent.rerolls.left})
                    </Button>
                    <Button onClick={() => setShowDc((v) => !v)}><Gauge size={16} /> Sprawdź poziom trudności</Button>
                  </div>
                  {busy === offered.id && <p className="text-sm text-muted mt-3 animate-pulse">Narratoriusz zakłada teczkę i pisze pierwszą stronę akt…</p>}
                </motion.div>
              </AnimatePresence>
            )}
          </section>

          {/* 5. Plotkarski Telegraf */}
          <section className="card p-5" aria-labelledby="telegraf">
            <h2 id="telegraf" className="font-serif font-bold text-xl">Centrum Powiadomień: Plotkarski Telegraf</h2>
            <div className="flex gap-1.5 mt-3 overflow-x-auto scroll-thin pb-1" role="tablist">
              {TELEGRAF_TABS.map((t) => {
                const n = telegraf.filter((m) => m.category === t.id).length;
                return (
                  <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cx('shrink-0 rounded-xl px-3 h-9 text-sm font-bold border-2 transition-colors', tab === t.id ? 'bg-gold border-outline' : 'border-transparent text-muted hover:bg-raised')}>
                    {t.emoji} {t.label} <span className="text-faint">({n})</span>
                  </button>
                );
              })}
            </div>
            <ul className="mt-3 space-y-2">
              {telegraf.filter((m) => m.category === tab).map((m, i) => (
                <motion.li key={`${tab}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl bg-field border-2 border-line px-3 py-2">
                  <div className="text-xs font-extrabold text-candy">{m.from}</div>
                  <div className="text-sm">{m.text}</div>
                </motion.li>
              ))}
            </ul>
          </section>

          {/* Closed cases */}
          <section className="card p-5">
            <h2 className="font-serif font-bold text-xl">Akta zamknięte</h2>
            {closed.length === 0 ? (
              <p className="text-sm text-muted mt-2">Jeszcze żadnych. Pierwsza sprawa czeka w NarratoMacie.</p>
            ) : (
              <ul className="mt-3 divide-y-2 divide-line">
                {closed.slice(0, 8).map((h) => (
                  <li key={h.storyId} className="py-2 flex flex-wrap items-center gap-2">
                    <span className="font-serif font-semibold">{MISSION_TYPES[h.type].emoji} {h.title}</span>
                    <Badge tone={ENDING_META[h.ending!].tone}>{ENDING_META[h.ending!].label}</Badge>
                    <span className="text-xs text-faint ml-auto">+{h.xp} XP · {ago(h.endedAt ?? h.startedAt)}</span>
                    <a href={`#/misja/${h.storyId}`} className="text-xs font-bold underline">akta</a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-5 min-w-0">
          {/* 4. Tempus Fugit */}
          <section className="card p-5" aria-labelledby="tempus">
            <h2 id="tempus" className="font-serif font-bold text-xl flex items-center gap-2"><Clock size={20} /> Zegar Tempus Fugit</h2>
            <div className="mt-3 rounded-2xl bg-screen border-[2.5px] border-outline p-4 text-center">
              <div className="font-pixel text-xs text-pixel/70 uppercase">Do weekendu (najważniejsze osiągnięcie agenta)</div>
              <div className="font-pixel text-3xl sm:text-4xl text-pixel [text-shadow:0_0_10px_var(--color-pixel)] mt-1 tabular-nums">
                {clocks.weekend.now ?? formatMs(clocks.weekend.ms)}
              </div>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              {[clocks.shift, clocks.deadline].filter(Boolean).map((c) => (
                <div key={c!.label} className="flex justify-between gap-3">
                  <dt className="text-muted">{c!.label}</dt>
                  <dd className="font-mono font-bold tabular-nums text-right">{c!.now ?? formatMs(c!.ms)}</dd>
                </div>
              ))}
              <div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{clocks.meeting.label}</dt>
                  <dd className="font-mono font-bold tabular-nums">{formatMs(clocks.meeting.ms)}</dd>
                </div>
                <div className="text-xs text-faint mt-0.5">{clocks.meeting.title}</div>
              </div>
            </dl>
          </section>

          {/* 2. Stress & caffeine */}
          <section className="card p-5" aria-labelledby="wskazniki">
            <h2 id="wskazniki" className="font-serif font-bold text-xl">Wskaźniki stresu i kofeiny</h2>
            <div className="mt-3 space-y-4">
              <Meter label="Stres" value={agent.stress} color={stressColor(agent.stress)} />
              <div className="flex items-end gap-3">
                <div className="flex-1"><Meter label="Kofeina" value={coffee} color="var(--color-ember)" /></div>
                <motion.span animate={coffee <= 15 ? { opacity: [1, 0.2, 1] } : { opacity: 1 }} transition={{ duration: 0.8, repeat: coffee <= 15 ? Infinity : 0 }} aria-hidden>
                  <Coffee className={coffee <= 15 ? 'text-candy' : 'text-faint'} />
                </motion.span>
              </div>
              <Button className="w-full" onClick={brew} disabled={busy === 'coffee'}>
                {busy === 'coffee' ? <Loader2 size={16} className="animate-spin" /> : <Coffee size={16} />} Automat w Mrocznym Korytarzu
              </Button>
              <AnimatePresence>
                {brewed && (
                  <motion.div key={brewed.text} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className={cx('rounded-xl border-2 border-outline p-3 text-sm', brewed.kind === 'lawa' ? 'bg-[#ffd3cc]' : 'bg-field')}>
                    {brewed.text}
                    <div className="text-xs text-faint mt-1">Kofeina {brewed.coffee >= 0 ? '+' : ''}{brewed.coffee} · stres {brewed.stress >= 0 ? '+' : ''}{brewed.stress}</div>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-xs text-faint">Stres powyżej 70 daje −2 do testów K20, brak kofeiny −1. Szkolenia i czas wolny obniżają stres.</p>
            </div>
          </section>

          {/* 3. Weather */}
          <section className="card p-5" aria-labelledby="pogoda">
            <h2 id="pogoda" className="font-serif font-bold text-xl">Panele pogodowe</h2>
            <ul className="mt-3 space-y-2">
              {weather.map((w) => (
                <li key={w.place} className="flex items-start gap-3 rounded-xl bg-field border-2 border-line px-3 py-2">
                  <span className="text-2xl" aria-hidden>{w.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold text-sm">{w.place}</span>
                      <span className="font-mono text-sm">{w.temp}°C</span>
                    </div>
                    <div className="text-xs text-muted">{w.sky}. {w.note}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Quick links */}
          <section className="grid grid-cols-3 gap-3">
            {[
              ['#/mapa', '🗺️', 'Kartograf Narracji'],
              ['#/archiwum', '📚', 'Biblioteka'],
              ['#/szkolenia', '🎯', 'Szkolenia DSRK'],
            ].map(([href, emoji, label]) => (
              <a key={href} href={href} className="card p-3 text-center hover:-translate-y-0.5 transition-transform">
                <div className="text-2xl">{emoji}</div>
                <div className="text-xs font-bold mt-1">{label}</div>
              </a>
            ))}
          </section>
        </div>
      </div>

      <Sheet open={showOrg} onClose={() => setShowOrg(false)} title="Struktura Agencji">
        <OrgChart />
      </Sheet>

      <Sheet open={showPass} onClose={() => setShowPass(false)} title="Przepustka agenta">
        <p className="text-sm text-muted">Numer przepustki to jedyny klucz do Twojego profilu. Wpisz go na innym urządzeniu, żeby kontynuować służbę. Nie pokazuj go nikomu (zwłaszcza goblinowi z IT).</p>
        <div className="mt-3 flex gap-2">
          <code className="field font-mono text-xs break-all">{agent.id}</code>
          <Button size="sm" onClick={() => navigator.clipboard?.writeText(agent.id).then(() => toast('Skopiowano numer przepustki.'))}><Copy size={14} /></Button>
        </div>
        <p className="text-xs text-faint mt-4">W służbie od {new Date(agent.createdAt).toLocaleDateString('pl-PL')}. Misji: {agent.history.length}. Szkoleń: {Object.values(agent.training).reduce((s, t) => s + (t?.plays ?? 0), 0)}.</p>
        <Button variant="danger" className="mt-6" onClick={() => { signOut(); setShowPass(false); }}><LogOut size={16} /> Wyloguj z tej przeglądarki</Button>
      </Sheet>
    </Shell>
  );
}

function MissionCard({ mission, paradox }: { mission: Mission; paradox: boolean }) {
  const place = locationOf(mission.locationId);
  return (
    <div className="rounded-2xl border-[2.5px] border-outline bg-field p-4 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="ember">{MISSION_TYPES[mission.type].emoji} {MISSION_TYPES[mission.type].name}</Badge>
        <Stars n={Math.min(5, mission.difficulty + (paradox ? 1 : 0))} />
      </div>
      <h3 className="font-serif font-bold text-2xl mt-2 leading-tight">{mission.title}</h3>
      <div className="text-xs text-faint mt-0.5">Baśń: {mission.tale}</div>
      <p className="mt-2">{mission.brief}</p>
      {place && (
        <a href={`#/mapa/${place.id}`} className="inline-flex items-center gap-1 text-sm font-bold mt-2 underline">
          <MapPin size={14} /> {place.name}
        </a>
      )}
    </div>
  );
}

function DifficultyBox({ mission, paradox, rankIndex, specMatch, stress }: { mission: Mission; paradox: boolean; rankIndex: number; specMatch: boolean; stress: number }) {
  const dc = dcFor(mission.difficulty, paradox);
  const base = rankIndex + (specMatch ? 2 : 0) - (stress > 70 ? 2 : 0);
  const chance = (mod: number) => Math.round((Math.min(19, Math.max(1, 21 - (dc - mod))) / 20) * 100);
  return (
    <div className="mt-4 rounded-xl border-2 border-outline bg-field p-4 text-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span><b>Klasa trudności (DC):</b> {dc}{paradox ? ' (w tym +2 za paradoks)' : ''}</span>
        <span><b>Twój modyfikator bazowy:</b> {base >= 0 ? '+' : ''}{base}</span>
      </div>
      <p className="text-xs text-muted mt-1">Ranga +{rankIndex}{specMatch ? ', specjalizacja sekcji +2' : ''}{stress > 70 ? ', stres −2' : ''}. Naturalne 20 zawsze się udaje, naturalne 1 zawsze kończy się katastrofą.</p>
      <ul className="mt-2 grid sm:grid-cols-2 gap-1">
        {(['procedura', 'dyplomacja', 'improwizacja', 'custom'] as const).map((k) => (
          <li key={k}>{CHOICE_META[k].label}: <b>{chance(base + CHOICE_META[k].bonus)}%</b> szans na sukces</li>
        ))}
      </ul>
      <p className="text-xs text-faint mt-2">Pieczątka DKSF działa bez rzutu (2 pieczątki na misję).</p>
    </div>
  );
}

const GROUPS: Record<DepartmentGroup, string> = {
  dyrekcja: 'Dyrekcja Naczelna i Rada Nadzorcza',
  operacyjne: 'Departamenty Operacyjne',
  wsparcia: 'Departamenty Wsparcia',
  kontroli: 'Departamenty Kontroli (nienawidzone, lecz niezbędne)',
};

function OrgChart() {
  return (
    <div className="space-y-6">
      {(Object.keys(GROUPS) as DepartmentGroup[]).map((g) => (
        <section key={g}>
          <h3 className="eyebrow mb-2">{GROUPS[g]}</h3>
          <ul className="space-y-2">
            {DEPARTMENTS.filter((d) => d.group === g).map((d) => (
              <li key={d.id} className="rounded-xl border-2 border-outline bg-field p-3">
                <div className="font-serif font-bold"><span className="font-pixel text-candy mr-2">{d.short}</span>{d.name}</div>
                <p className="text-sm text-muted mt-0.5">{d.desc}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
