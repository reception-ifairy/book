import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, Lock, MapPin, MessageSquare, Search, Star } from 'lucide-react';
import { RANKS, locationOf, missionOf, rankOf, MISSION_TYPES } from '../../shared/arb';
import { ARCHIVE_CATEGORIES, type ArchiveCategory, type ArchiveComment, type ArchiveEntryView, type ArchiveListItem } from '../../shared/archive';
import { Shell } from '../components/Shell';
import { useAgent } from '../agent';
import { api } from '../api';
import { Badge, Button, cx, useToast } from '../ui';

function ago(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'przed chwilą';
  if (s < 3600) return `${Math.round(s / 60)} min temu`;
  if (s < 86400) return `${Math.round(s / 3600)} godz. temu`;
  return `${Math.round(s / 86400)} dni temu`;
}

const rankForClearance = (level: number) => RANKS.find((r) => r.clearance >= level) ?? RANKS[RANKS.length - 1];
const lockLabel = (level: number) => `[UTAJNIONE] wymagany poziom dostępu ${level} (ranga: ${rankForClearance(level).name})`;

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`Ocena ${value.toFixed(1)} na 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'text-gold fill-gold' : 'text-faint'} />
      ))}
    </span>
  );
}

export function ArchiveScreen({ entryId }: { entryId?: string }) {
  return <Shell active="archiwum">{entryId ? <EntryView key={entryId} entryId={entryId} /> : <ArchiveList />}</Shell>;
}

function ArchiveList() {
  const { agent } = useAgent();
  const [items, setItems] = useState<ArchiveListItem[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ArchiveCategory | ''>('');

  useEffect(() => {
    if (!agent) return;
    api.archive(agent.id).then(setItems).catch((e) => setError((e as Error).message));
  }, [agent?.id]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((i) => (!category || i.category === category) && (!q || `${i.title} ${i.summary}`.toLowerCase().includes(q)));
  }, [items, query, category]);

  if (!agent) return null;
  const { rank } = rankOf(agent.xp);
  const unlocked = (items ?? []).filter((i) => !i.locked).length;

  return (
    <div>
      <div className="mb-5">
        <p className="eyebrow">Archiwum ARB</p>
        <h1 className="toon-title text-3xl sm:text-4xl">Biblioteka Nieskończonych Opowieści</h1>
        <p className="text-muted mt-1 text-sm">
          Twój poziom dostępu: <b className="text-ink">{rank.clearance}</b> ({rank.name}).
          {items && <> Odtajnione wpisy: {unlocked} z {items.length}.</>}
        </p>
      </div>

      <div className="card p-3 sm:p-4 mb-5 space-y-3">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input className="field pl-9" placeholder="Szukaj w archiwum (np. smok, paradoks, formularz)…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <CategoryChip active={!category} onClick={() => setCategory('')}>Wszystko</CategoryChip>
          {(Object.keys(ARCHIVE_CATEGORIES) as ArchiveCategory[]).map((c) => (
            <CategoryChip key={c} active={category === c} onClick={() => setCategory(c)}>
              {ARCHIVE_CATEGORIES[c].emoji} {ARCHIVE_CATEGORIES[c].label}
            </CategoryChip>
          ))}
        </div>
      </div>

      {error && <div className="card p-4 text-candy font-semibold">{error}</div>}
      {!items && !error && <p className="eyebrow animate-pulse">Bibliotekarka Echo szuka teczek…</p>}
      {items && shown.length === 0 && <p className="text-muted">Nic nie znaleziono. Może ktoś to zgubił w Wymiarze Zagubionych Słuchawek.</p>}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((i, n) => (
          <motion.li key={i.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(n * 0.03, 0.4) }}>
            <a
              href={`#/archiwum/${i.id}`}
              className={cx('card spotlight block h-full p-4 transition-transform hover:-translate-y-1', i.locked && 'opacity-80')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow">{ARCHIVE_CATEGORIES[i.category].emoji} {ARCHIVE_CATEGORIES[i.category].label}</span>
                <span className="font-pixel text-xs text-faint">poz. {i.clearance}</span>
              </div>
              <h2 className="font-serif font-bold text-lg leading-snug mt-1 flex items-center gap-1.5">
                {i.locked && <Lock size={16} className="text-candy shrink-0" />} {i.title}
              </h2>
              <p className="text-sm text-muted mt-1">{i.summary}</p>
              {i.locked && <p className="mt-2 text-xs font-bold text-candy">{lockLabel(i.clearance)}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                {i.rating !== null && <Stars value={i.rating} size={12} />}
                {i.comments > 0 && <span className="inline-flex items-center gap-1"><MessageSquare size={12} /> {i.comments}</span>}
                {i.warnings > 0 && <Badge tone="danger"><AlertTriangle size={11} /> {i.warnings}</Badge>}
              </div>
            </a>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-pressed={active}
      onClick={onClick}
      className={cx('h-8 px-3 rounded-lg border-2 border-outline text-sm font-serif font-semibold', active ? 'bg-gold text-outline shadow-[0_2px_0_var(--color-outline)]' : 'bg-field text-muted hover:text-ink')}
    >
      {children}
    </button>
  );
}

function EntryView({ entryId }: { entryId: string }) {
  const { agent } = useAgent();
  const [view, setView] = useState<ArchiveEntryView | null>(null);
  const [error, setError] = useState('');
  const [titles, setTitles] = useState<Record<string, ArchiveListItem>>({});

  useEffect(() => {
    if (!agent) return;
    api.entry(agent.id, entryId).then(setView).catch((e) => setError((e as Error).message));
    api.archive(agent.id).then((list) => setTitles(Object.fromEntries(list.map((i) => [i.id, i])))).catch(() => {});
  }, [agent?.id, entryId]);

  const back = (
    <a href="#/archiwum" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink mb-4">
      <ArrowLeft size={16} /> Wróć do Archiwum
    </a>
  );

  if (error) {
    const item = titles[entryId];
    return (
      <div>
        {back}
        <div className="card p-6 sm:p-8 text-center max-w-xl mx-auto">
          <Lock size={42} className="mx-auto text-candy" />
          <p className="eyebrow mt-3">Teczka zapieczętowana</p>
          <h1 className="toon-title text-2xl sm:text-3xl mt-1">{item?.title ?? 'Wpis niedostępny'}</h1>
          {item && <p className="text-muted mt-2">{item.summary}</p>}
          <p className="mt-4 font-bold text-candy">{item?.locked ? lockLabel(item.clearance) : error}</p>
          <p className="text-sm text-muted mt-2">Awansuj, wykonując misje i szkolenia, a DKSF łaskawie podniesie Twój poziom dostępu.</p>
        </div>
      </div>
    );
  }
  if (!view) return <div>{back}<p className="eyebrow animate-pulse">Odkurzanie teczki…</p></div>;

  const { entry } = view;
  const loc = entry.locationId ? locationOf(entry.locationId) : undefined;
  const missions = (entry.missionIds ?? []).map(missionOf).filter((m) => !!m);

  return (
    <div>
      {back}
      <article className="card p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{ARCHIVE_CATEGORIES[entry.category].emoji} {ARCHIVE_CATEGORIES[entry.category].label}</Badge>
          <Badge tone={entry.clearance >= 3 ? 'danger' : entry.clearance >= 1 ? 'warn' : 'ok'}>Poziom dostępu {entry.clearance}</Badge>
        </div>
        <h1 className="toon-title text-3xl sm:text-4xl mt-3">{entry.title}</h1>
        <p className="text-muted font-semibold mt-2">{entry.summary}</p>

        <div className="prose-story mt-5 text-[1.05rem]">
          {entry.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        {entry.falseLead && (
          <div className="mt-5 rounded-xl border-[2.5px] border-outline bg-[#ffe1db] p-4">
            <p className="eyebrow text-candy">🚫 Dział Błędów i Przekłamań</p>
            <p className="mt-2 line-through decoration-candy decoration-2 text-muted">„{entry.falseLead.claim}”</p>
            <p className="mt-2 font-bold">Stan faktyczny: {entry.falseLead.truth}</p>
          </div>
        )}

        {entry.simulation && <Simulation sim={entry.simulation} />}

        {(loc || missions.length > 0 || entry.related.length > 0) && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3 text-sm">
            {loc && (
              <div>
                <p className="eyebrow mb-1">Lokacja</p>
                <a href={`#/mapa/${loc.id}`} className="inline-flex items-center gap-1.5 font-semibold hover:text-ember underline decoration-dotted underline-offset-2">
                  <MapPin size={14} /> {loc.name}
                </a>
              </div>
            )}
            {missions.length > 0 && (
              <div>
                <p className="eyebrow mb-1">Powiązane misje</p>
                <ul className="space-y-1">
                  {missions.map((m) => (
                    <li key={m!.id}>{MISSION_TYPES[m!.type].emoji} {m!.title}</li>
                  ))}
                </ul>
              </div>
            )}
            {entry.related.length > 0 && (
              <div>
                <p className="eyebrow mb-1">Zobacz też</p>
                <ul className="space-y-1">
                  {entry.related.map((id) => (
                    <li key={id}>
                      <a href={`#/archiwum/${id}`} className="font-semibold hover:text-ember underline decoration-dotted underline-offset-2">
                        {titles[id]?.locked && <Lock size={12} className="inline mr-1 text-candy" />}
                        {titles[id]?.title ?? id}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </article>

      <Comments entryId={entry.id} initial={view.comments} />
    </div>
  );
}

function Simulation({ sim }: { sim: NonNullable<ArchiveEntryView['entry']['simulation']> }) {
  const [picked, setPicked] = useState<number | null>(null);
  const choice = picked !== null ? sim.options[picked] : null;
  return (
    <div className="mt-6 rounded-xl border-[2.5px] border-outline bg-raised p-4">
      <p className="eyebrow">🧪 Symulacja szkoleniowa</p>
      <p className="font-serif font-bold text-lg mt-1">{sim.prompt}</p>
      <div className="mt-3 grid gap-2">
        {sim.options.map((o, i) => (
          <button
            key={i}
            disabled={picked !== null}
            onClick={() => setPicked(i)}
            className={cx(
              'text-left rounded-xl border-2 border-outline px-3 py-2 font-semibold transition-colors',
              picked === null && 'bg-field hover:bg-gold/40',
              picked !== null && o.correct && 'bg-[#cdeccf]',
              picked === i && !o.correct && 'bg-[#ffd3cc]',
              picked !== null && picked !== i && !o.correct && 'bg-field opacity-60',
            )}
          >
            {String.fromCharCode(65 + i)}) {o.label}
          </button>
        ))}
      </div>
      {choice && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
          <p className={cx('font-bold', choice.correct ? 'text-ok' : 'text-candy')}>{choice.correct ? '✔ Zgodnie z procedurą.' : '✘ Niezgodnie z procedurą.'}</p>
          <p className="mt-1">{choice.outcome}</p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setPicked(null)}>Spróbuj ponownie</Button>
        </motion.div>
      )}
    </div>
  );
}

function Comments({ entryId, initial }: { entryId: string; initial: ArchiveComment[] }) {
  const { agent } = useAgent();
  const toast = useToast();
  const [comments, setComments] = useState(initial);
  const [text, setText] = useState('');
  const [rating, setRating] = useState(4);
  const [warning, setWarning] = useState(false);
  const [busy, setBusy] = useState(false);
  const avg = comments.length ? comments.reduce((s, c) => s + c.rating, 0) / comments.length : null;

  const submit = async () => {
    if (!agent || !text.trim()) return;
    setBusy(true);
    try {
      const c = await api.comment(agent.id, entryId, { text: text.trim().slice(0, 400), rating, warning });
      setComments((cs) => [c, ...cs]);
      setText('');
      setWarning(false);
      toast('Komentarz dopisany do teczki.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...comments].sort((a, b) => Number(b.warning) - Number(a.warning) || b.createdAt - a.createdAt);

  return (
    <section className="card p-5 sm:p-6 mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif font-bold text-xl flex items-center gap-2"><MessageSquare size={18} /> Uwagi agentów</h2>
        {avg !== null && <span className="flex items-center gap-2 text-sm text-muted"><Stars value={avg} /> {avg.toFixed(1)} ({comments.length})</span>}
      </div>

      <div className="mt-4 space-y-2">
        <textarea
          className="field min-h-20"
          maxLength={400}
          placeholder="Dopisz uwagę, ostrzeżenie lub trop dla innych agentów…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex" role="radiogroup" aria-label="Ocena wpisu">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} role="radio" aria-checked={rating === i} aria-label={`${i} gwiazdek`} onClick={() => setRating(i)} className="p-0.5">
                <Star size={20} className={i <= rating ? 'text-gold fill-gold' : 'text-faint'} />
              </button>
            ))}
          </span>
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={warning} onChange={(e) => setWarning(e.target.checked)} className="w-4 h-4 accent-[var(--color-candy)]" />
            Ostrzeżenie
          </label>
          <span className="text-xs text-faint ml-auto">{text.length}/400</span>
          <Button size="sm" variant="primary" disabled={busy || !text.trim()} onClick={submit}>Dopisz</Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted mt-4">Brak uwag. Bądź pierwszym agentem, który coś tu dopisze.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {sorted.map((c) => (
            <li key={c.id} className={cx('rounded-xl border-2 px-3 py-2.5', c.warning ? 'border-candy bg-[#ffe1db]' : 'border-line bg-raised')}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <b className="text-ink">Agent {c.codename}</b>
                <Stars value={c.rating} size={12} />
                {c.warning && <Badge tone="danger"><AlertTriangle size={11} /> Ostrzeżenie</Badge>}
                <span className="ml-auto">{ago(c.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm break-words">{c.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
