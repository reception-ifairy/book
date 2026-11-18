import { useEffect, useState } from 'react';
import { CalendarPlus, Pencil, Plus, Save, Trash2, X, Zap } from 'lucide-react';
import type { adminApi, DailyAdminView } from '../api';
import { Badge, Button, useToast } from '../ui';
import { bureauDay, type Glitch, type Quest, type QuestParams } from '../../shared/daily';

type Client = ReturnType<typeof adminApi>;
type QuestRow = Quest & { status: string };
type GlitchRow = Glitch & { status: string };

const STATUS_TONE: Record<string, 'ok' | 'neutral' | 'warn'> = { active: 'ok', draft: 'warn', retired: 'neutral' };

/** Which params each quest kind uses, so the form only shows what matters. */
const KIND_FIELDS: Record<string, (keyof QuestParams)[]> = {
  close_case: ['tale_id', 'count'],
  ending: ['ending', 'tale_id', 'count'],
  choice_kind: ['choice', 'count'],
  custom_moves: ['count'],
  pages: ['count'],
  stat: ['stat', 'op', 'value'],
  canon_finish: ['min_canon', 'tale_id', 'count'],
  open_case: ['tale_id'],
};
const KIND_HELP: Record<string, string> = {
  close_case: 'Reach any ending',
  ending: 'Reach a given ending type',
  choice_kind: 'Pick a kind of choice N times',
  custom_moves: 'Type N custom moves',
  pages: 'Play N pages',
  stat: 'Push a meter past a value',
  canon_finish: 'Close a case with canon ≥ X%',
  open_case: 'Start a given case',
};

const blankQuest = (): QuestRow => ({ slug: '', title: '', description: '', kind: 'close_case', params: {}, reward_xp: 50, status: 'active' });

/**
 * Daily ops for the Bureau console: today's board, the quest pool, the glitch pool and hand-planned days.
 * Days without a plan rotate three active quests and one active glitch from the pools.
 */
export function DailyOpsPanel({ client }: { client: Client }) {
  const toast = useToast();
  const [view, setView] = useState<DailyAdminView | null>(null);
  const [error, setError] = useState('');
  const [quest, setQuest] = useState<QuestRow | null>(null);
  const [glitch, setGlitch] = useState<GlitchRow | null>(null);
  const [plan, setPlan] = useState<{ day: string; briefing: string; glitch_slug: string; quest_slugs: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.daily.get().then(setView).catch((e) => setError(e.message));
  }, [client]);

  const run = async (fn: () => Promise<DailyAdminView>, done: string) => {
    setBusy(true);
    try {
      setView(await fn());
      toast(done, 'ok');
      return true;
    } catch (e) {
      toast((e as Error).message, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="text-sm text-muted">{error}</p>;
  if (!view) return <p className="text-sm text-muted">Loading daily ops…</p>;

  const today = view.today;
  const setParam = (k: keyof QuestParams, raw: string) =>
    setQuest((q) => {
      if (!q) return q;
      const params = { ...q.params } as Record<string, unknown>;
      if (raw === '') delete params[k];
      else params[k] = ['count', 'value', 'min_canon'].includes(k) ? Number(raw) : raw;
      return { ...q, params: params as QuestParams };
    });

  return (
    <div className="space-y-8">
      {/* Today */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">Today · {today?.day}</span>
          <Badge tone={today?.source === 'schedule' ? 'ember' : 'neutral'}>{today?.source === 'schedule' ? 'Planned by hand' : 'Rotating from the pool'}</Badge>
        </div>
        {today?.glitch && (
          <p className="mt-3 text-sm flex gap-2"><Zap size={16} className="text-ember shrink-0 mt-0.5" /> <span><b>Glitch:</b> {today.glitch.text}</span></p>
        )}
        <ul className="mt-2 text-sm text-muted list-disc pl-5">
          {today?.quests.map((q) => <li key={q.slug}><b className="text-ink">{q.title}</b> · +{q.reward_xp} XP</li>)}
        </ul>
        {today?.briefing && <p className="mt-2 text-sm italic">“{today.briefing}”</p>}
      </div>

      {/* Plan a day */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif font-bold text-lg">Planned days</h3>
          <Button size="sm" onClick={() => setPlan({ day: bureauDay(), briefing: '', glitch_slug: '', quest_slugs: [] })}><CalendarPlus size={15} /> Plan a day</Button>
        </div>
        {plan && (
          <div className="card p-4 space-y-3 mb-3">
            <div className="grid sm:grid-cols-[160px_1fr] gap-3">
              <input type="date" className="field" value={plan.day} onChange={(e) => setPlan({ ...plan, day: e.target.value })} />
              <select className="field" value={plan.glitch_slug} onChange={(e) => setPlan({ ...plan, glitch_slug: e.target.value })}>
                <option value="">No glitch</option>
                {view.glitches.map((g) => <option key={g.slug} value={g.slug}>{g.text.slice(0, 80)}</option>)}
              </select>
            </div>
            <input className="field" placeholder="IGNIS briefing for the day (optional)" maxLength={300} value={plan.briefing} onChange={(e) => setPlan({ ...plan, briefing: e.target.value })} />
            <div className="grid sm:grid-cols-2 gap-1.5 max-h-56 overflow-auto">
              {view.quests.filter((q) => q.status !== 'retired').map((q) => (
                <label key={q.slug} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={plan.quest_slugs.includes(q.slug)}
                    disabled={!plan.quest_slugs.includes(q.slug) && plan.quest_slugs.length >= 5}
                    onChange={(e) => setPlan({ ...plan, quest_slugs: e.target.checked ? [...plan.quest_slugs, q.slug] : plan.quest_slugs.filter((s) => s !== q.slug) })}
                  />
                  {q.title} <span className="text-faint">+{q.reward_xp}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !plan.day}
                onClick={async () => {
                  if (await run(() => client.daily.planDay(plan.day, { briefing: plan.briefing.trim() || null, glitch_slug: plan.glitch_slug || null, quest_slugs: plan.quest_slugs }), 'Day planned.')) setPlan(null);
                }}
              >
                <Save size={15} /> Save day
              </Button>
              <Button size="sm" onClick={() => setPlan(null)}><X size={15} /> Cancel</Button>
            </div>
          </div>
        )}
        {view.planned.length === 0 ? (
          <p className="text-sm text-muted">No days planned. Every day rotates three active quests and one glitch from the pools below.</p>
        ) : (
          <ul className="card divide-y-2 divide-line">
            {view.planned.map((d) => (
              <li key={d.day} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <span className="font-pixel text-xs w-24 shrink-0">{d.day}</span>
                <span className="flex-1 min-w-0 truncate text-muted">{d.quest_slugs.join(', ') || 'no quests'}{d.glitch_slug ? ` · glitch: ${d.glitch_slug}` : ''}</span>
                <button className="text-faint hover:text-ink" title="Edit" onClick={() => setPlan({ day: d.day, briefing: d.briefing ?? '', glitch_slug: d.glitch_slug ?? '', quest_slugs: d.quest_slugs })}><Pencil size={15} /></button>
                <button className="text-faint hover:text-danger" title="Remove plan (day rotates again)" onClick={() => run(() => client.daily.unplanDay(d.day), 'Plan removed.')}><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quest pool */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif font-bold text-lg">Quest pool <span className="text-faint text-sm">({view.quests.filter((q) => q.status === 'active').length} active)</span></h3>
          <Button size="sm" onClick={() => setQuest(blankQuest())}><Plus size={15} /> New quest</Button>
        </div>
        {quest && (
          <div className="card p-4 space-y-3 mb-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="field" placeholder="slug (e.g. secret-ending)" value={quest.slug} onChange={(e) => setQuest({ ...quest, slug: e.target.value.toLowerCase() })} />
              <input className="field" placeholder="Title" maxLength={120} value={quest.title} onChange={(e) => setQuest({ ...quest, title: e.target.value })} />
            </div>
            <textarea className="field" rows={2} placeholder="What the agent has to do, in IGNIS's voice" maxLength={400} value={quest.description} onChange={(e) => setQuest({ ...quest, description: e.target.value })} />
            <div className="grid sm:grid-cols-3 gap-3">
              <select className="field" value={quest.kind} onChange={(e) => setQuest({ ...quest, kind: e.target.value as Quest['kind'], params: {} })}>
                {view.kinds.map((k) => <option key={k} value={k}>{KIND_HELP[k] ?? k}</option>)}
              </select>
              <input className="field" type="number" min={0} max={1000} value={quest.reward_xp} onChange={(e) => setQuest({ ...quest, reward_xp: Number(e.target.value) })} title="Reward XP" />
              <select className="field" value={quest.status} onChange={(e) => setQuest({ ...quest, status: e.target.value })}>
                <option value="active">active (rotates)</option>
                <option value="draft">draft</option>
                <option value="retired">retired</option>
              </select>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {KIND_FIELDS[quest.kind]?.map((k) => {
                const v = (quest.params as Record<string, unknown>)[k] ?? '';
                const options: Record<string, string[]> = {
                  tale_id: view.tales.map((t) => t.id),
                  ending: ['canon', 'subverted', 'cursed', 'secret', 'death'],
                  choice: ['sane', 'chaos', 'dumb', 'sudo'],
                  stat: ['chaos', 'karma', 'mana'],
                  op: ['gte', 'lte'],
                };
                return options[k] ? (
                  <select key={k} className="field" value={String(v)} onChange={(e) => setParam(k, e.target.value)}>
                    <option value="">{k === 'tale_id' ? 'any tale' : `${k}…`}</option>
                    {options[k].map((o) => <option key={o} value={o}>{k === 'tale_id' ? view.tales.find((t) => t.id === o)?.title : o}</option>)}
                  </select>
                ) : (
                  <input key={k} className="field" type="number" placeholder={k} value={String(v)} onChange={(e) => setParam(k, e.target.value)} />
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={busy || !quest.slug || !quest.title} onClick={async () => { if (await run(() => client.daily.saveQuest(quest), 'Quest saved.')) setQuest(null); }}><Save size={15} /> Save quest</Button>
              <Button size="sm" onClick={() => setQuest(null)}><X size={15} /> Cancel</Button>
            </div>
          </div>
        )}
        <ul className="card divide-y-2 divide-line">
          {view.quests.map((q) => (
            <li key={q.slug} className="px-4 py-2.5 flex items-center gap-3 text-sm">
              <Badge tone={STATUS_TONE[q.status] ?? 'neutral'}>{q.status}</Badge>
              <span className="flex-1 min-w-0">
                <b>{q.title}</b> <span className="text-faint">· {KIND_HELP[q.kind] ?? q.kind} · +{q.reward_xp} XP</span>
                <span className="block text-muted truncate">{q.description}</span>
              </span>
              <button className="text-faint hover:text-ink" title="Edit" onClick={() => setQuest({ ...q, params: { ...q.params } })}><Pencil size={15} /></button>
            </li>
          ))}
        </ul>
      </div>

      {/* Glitch pool */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif font-bold text-lg">Glitch pool</h3>
          <Button size="sm" onClick={() => setGlitch({ slug: '', text: '', status: 'active' })}><Plus size={15} /> New glitch</Button>
        </div>
        <p className="text-sm text-muted mb-3">The glitch of the day is shown to agents and added to the story prompt, so IGNIS weaves it into every tale that day. One sentence, in English.</p>
        {glitch && (
          <div className="card p-4 space-y-3 mb-3">
            <div className="grid sm:grid-cols-[1fr_180px] gap-3">
              <input className="field" placeholder="slug (e.g. rhyming-wolves)" value={glitch.slug} onChange={(e) => setGlitch({ ...glitch, slug: e.target.value.toLowerCase() })} />
              <select className="field" value={glitch.status} onChange={(e) => setGlitch({ ...glitch, status: e.target.value })}>
                <option value="active">active (rotates)</option>
                <option value="draft">draft</option>
                <option value="retired">retired</option>
              </select>
            </div>
            <input className="field" maxLength={300} placeholder="Every wolf speaks only in rhymes today." value={glitch.text} onChange={(e) => setGlitch({ ...glitch, text: e.target.value })} />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={busy || !glitch.slug || glitch.text.length < 5} onClick={async () => { if (await run(() => client.daily.saveGlitch(glitch), 'Glitch saved.')) setGlitch(null); }}><Save size={15} /> Save glitch</Button>
              <Button size="sm" onClick={() => setGlitch(null)}><X size={15} /> Cancel</Button>
            </div>
          </div>
        )}
        <ul className="card divide-y-2 divide-line">
          {view.glitches.map((g) => (
            <li key={g.slug} className="px-4 py-2.5 flex items-center gap-3 text-sm">
              <Badge tone={STATUS_TONE[g.status] ?? 'neutral'}>{g.status}</Badge>
              <span className="flex-1 min-w-0 truncate">{g.text}</span>
              <button className="text-faint hover:text-ink" title="Edit" onClick={() => setGlitch({ ...g })}><Pencil size={15} /></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
