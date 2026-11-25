import { useEffect, useState } from 'react';
import { Loader2, Pencil, RefreshCw, Save, X } from 'lucide-react';
import type { adminApi, PacksView } from '../api';
import { Badge, Button, Segmented, useToast } from '../ui';

type Client = ReturnType<typeof adminApi>;
type Row = PacksView['packs'][number];

const SOURCE_TONE: Record<string, 'ok' | 'warn' | 'ember' | 'neutral'> = { claude: 'ok', seed: 'warn', edited: 'ember' };

/**
 * The daily Quiz ABC and Incident in the Bureau console: see today's (or any day's) pack per language,
 * fix it by hand as JSON, or ask Claude for a fresh one. Packs appear on the first agent's visit of the day.
 */
export function PacksPanel({ client, suspect }: { client: Client; suspect: { name: string; emoji: string; charge: string } | null }) {
  const toast = useToast();
  const [view, setView] = useState<PacksView | null>(null);
  const [day, setDay] = useState<string>('');
  const [lang, setLang] = useState<'en' | 'pl'>('pl');
  const [editing, setEditing] = useState<{ kind: string; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = (d?: string) =>
    client.packs
      .get(d)
      .then((v) => {
        setView(v);
        setDay(v.day);
      })
      .catch((e) => toast(e.message, 'error'));
  useEffect(() => {
    void load();
  }, [client]);

  if (!view) return <div className="card p-5 mt-8 text-sm text-muted">Loading the daily packs…</div>;
  const rows = view.packs.filter((p) => p.lang === lang);

  const regenerate = async (kind: string) => {
    setBusy(kind);
    try {
      await client.packs.regenerate(day, lang, kind);
      await load(day);
      toast(`New ${kind} written by Claude.`, 'ok');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };
  const save = async () => {
    if (!editing) return;
    let payload: unknown;
    try {
      payload = JSON.parse(editing.text);
    } catch {
      return toast('That is not valid JSON.', 'error');
    }
    setBusy(editing.kind);
    try {
      await client.packs.save(day, lang, editing.kind, payload);
      setEditing(null);
      await load(day);
      toast('Saved. Agents who have not played it yet see the new version.', 'ok');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif font-bold text-xl">Quiz ABC &amp; Incident</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={day} onChange={(e) => e.target.value && load(e.target.value)} className="field !w-auto !py-1.5" aria-label="Day" />
          <Segmented<'en' | 'pl'> label="Pack language" value={lang} onChange={setLang} options={[{ value: 'pl', label: 'Polski' }, { value: 'en', label: 'English' }]} />
        </div>
      </div>
      <p className="text-sm text-muted">
        Claude writes each day’s pack on the first visit (or a few minutes after midnight). Without a key, a hand-written seed fills in. Edits apply to agents who have not played it yet.
      </p>
      {suspect && (
        <div className="card p-4 flex items-center gap-3">
          <span className="text-3xl">{suspect.emoji}</span>
          <span className="min-w-0">
            <span className="eyebrow">Interrogation suspect today</span>
            <span className="block font-semibold">{suspect.name}: <span className="text-muted font-normal">{suspect.charge}</span></span>
          </span>
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-4">
        {rows.map((r) => (
          <PackCard
            key={r.kind}
            row={r}
            busy={busy === r.kind}
            canRegenerate={view.ready}
            editing={editing?.kind === r.kind ? editing.text : null}
            onEdit={() => setEditing({ kind: r.kind, text: JSON.stringify(r.payload, null, 2) })}
            onChange={(text) => setEditing({ kind: r.kind, text })}
            onCancel={() => setEditing(null)}
            onSave={save}
            onRegenerate={() => regenerate(r.kind)}
          />
        ))}
      </div>
    </div>
  );
}

function PackCard({ row, busy, canRegenerate, editing, onEdit, onChange, onCancel, onSave, onRegenerate }: { row: Row; busy: boolean; canRegenerate: boolean; editing: string | null; onEdit: () => void; onChange: (t: string) => void; onCancel: () => void; onSave: () => void; onRegenerate: () => void }) {
  const p = row.payload;
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{row.kind === 'quiz' ? 'Quiz ABC' : 'Incident'}</span>
        {row.source ? <Badge tone={SOURCE_TONE[row.source] ?? 'neutral'}>{row.source}</Badge> : <Badge>not written yet</Badge>}
      </div>
      {editing !== null ? (
        <textarea value={editing} onChange={(e) => onChange(e.target.value)} rows={16} className="field font-mono text-xs" spellCheck={false} />
      ) : p ? (
        <div className="text-sm space-y-2">
          <p className="font-serif font-bold text-lg">{p.title}</p>
          {row.kind === 'quiz' ? (
            <ol className="list-decimal pl-5 space-y-1.5">
              {p.questions?.map((q: any, i: number) => (
                <li key={i}>
                  <span className="font-semibold">{q.question}</span>
                  <span className="block text-xs text-muted">{q.answers.map((a: any) => `${a.letter}${a.approved ? '✓' : ''} ${a.text}`).join(' · ')}</span>
                </li>
              ))}
            </ol>
          ) : (
            <>
              <p className="text-muted line-clamp-4">{p.report}</p>
              <ul className="text-xs text-muted list-disc pl-5">{p.choices?.map((c: any, i: number) => <li key={i}>{c.label} (+{c.xp} XP)</li>)}</ul>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">Appears when the first agent opens it today, or press Regenerate.</p>
      )}
      <div className="flex flex-wrap gap-2 mt-auto">
        {editing !== null ? (
          <>
            <Button size="sm" variant="primary" onClick={onSave} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</Button>
            <Button size="sm" variant="ghost" onClick={onCancel}><X size={14} /> Cancel</Button>
          </>
        ) : (
          <>
            {p && <Button size="sm" onClick={onEdit}><Pencil size={14} /> Edit JSON</Button>}
            <Button size="sm" onClick={onRegenerate} disabled={busy || !canRegenerate} title={canRegenerate ? '' : 'Needs an Anthropic key'}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Regenerate with Claude
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
