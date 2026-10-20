import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Brush, Check, Loader2, Pencil, RefreshCw, Rocket, Undo2, Wand2 } from 'lucide-react';
import type { adminApi, ArtKitView } from '../api';
import { refreshArtKit } from '../artkit';
import { Badge, Button, cx, useToast } from '../ui';
import type { ArtAsset, ArtGroup, ArtSlot } from '../../shared/artkit';

const GROUPS: { id: ArtGroup; label: string }[] = [
  { id: 'scene', label: 'Scene' },
  { id: 'character', label: 'IGNIS' },
  { id: 'cover', label: 'Tale covers' },
  { id: 'icon', label: 'Choice icons' },
  { id: 'badge', label: 'Ending badges' },
  { id: 'brand', label: 'Brand' },
];

const STATUS: Record<ArtAsset['status'], { label: string; tone: 'neutral' | 'ok' | 'warn' | 'danger' | 'ember' }> = {
  idle: { label: 'Not rendered', tone: 'neutral' },
  queued: { label: 'Queued', tone: 'warn' },
  rendering: { label: 'Rendering…', tone: 'ember' },
  done: { label: 'Ready', tone: 'ok' },
  failed: { label: 'Failed', tone: 'danger' },
};

/** Checkerboard so transparent artwork is visibly transparent. */
const CHECKER = { background: 'repeating-conic-gradient(#e9dcc2 0% 25%, #fdf5e4 0% 50%) 50% / 16px 16px' };

type Client = ReturnType<typeof adminApi>;

/**
 * Art Kit: Claude art-directs (style bible + one prompt per slot), OpenAI renders, the sysadmin
 * reviews, edits prompts, re-renders single slots and publishes the set to players.
 */
export function ArtKitPanel({
  client,
  settings,
  onSettings,
  imageModels,
  dirty,
}: {
  client: Client;
  settings: { model: string; quality: 'low' | 'medium' | 'high' };
  onSettings: (field: 'model' | 'quality', value: string) => void;
  imageModels: { id: string }[];
  dirty: boolean;
}) {
  const toast = useToast();
  const [view, setView] = useState<ArtKitView | null>(null);
  const [notes, setNotes] = useState('');
  const [planning, setPlanning] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const load = () => client.artkit.get().then((v) => {
    setView(v);
    setNotes((n) => n || v.kit.notes);
  });

  useEffect(() => {
    load().catch((e) => toast(e.message, 'error'));
  }, [client]);

  // Poll while OpenAI is rendering.
  useEffect(() => {
    if (!view?.kit.running) return;
    const t = setInterval(() => client.artkit.get().then(setView).catch(() => {}), 2000);
    return () => clearInterval(t);
  }, [view?.kit.running, client]);

  const run = async (fn: () => Promise<ArtKitView>, ok?: string) => {
    try {
      setView(await fn());
      if (ok) toast(ok);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const plan = async () => {
    setPlanning(true);
    await run(() => client.artkit.plan(notes), 'Claude delivered the art direction.');
    setPlanning(false);
  };

  if (!view) return <div className="card p-5 text-sm text-muted inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading the art kit…</div>;

  const { kit, slots, ready } = view;
  const assets = slots.map((s) => kit.assets[s.id]);
  const done = assets.filter((a) => a.status === 'done').length;
  const busy = assets.filter((a) => a.status === 'queued' || a.status === 'rendering').length;
  const missing = slots.filter((s) => kit.assets[s.id].status !== 'done').map((s) => s.id);
  const publishedCount = Object.keys(kit.published?.assets ?? {}).length;

  return (
    <div className="space-y-5">
      {/* Status strip */}
      <div className="flex flex-wrap gap-2">
        <Badge tone={ready.anthropic ? 'ok' : 'danger'}>Claude {ready.anthropic ? 'ready' : 'needs a key'}</Badge>
        <Badge tone={ready.openai ? 'ok' : 'danger'}>OpenAI {ready.openai ? 'ready' : 'needs a key'}</Badge>
        <Badge tone={done === slots.length ? 'ok' : 'neutral'}>{done}/{slots.length} rendered</Badge>
        <Badge tone={kit.published ? 'ember' : 'neutral'}>
          {kit.published ? `Live: v${kit.published.version} · ${publishedCount} images` : 'Players see the built-in look'}
        </Badge>
      </div>

      {/* 1 · Plan */}
      <div className="card p-5">
        <StepTitle n={1} title="Art direction by Claude" icon={<Wand2 size={18} />} />
        <p className="text-sm text-muted mt-1">
          Claude writes a style bible for the cyber-magic workshop look and one prompt per asset ({slots.length} slots), designed for where each image appears.
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
          rows={2}
          placeholder="Optional notes, e.g. “more snow and gingerbread, IGNIS a bit grumpier, covers at golden hour”"
          className="field mt-3 resize-y"
        />
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <Button variant="primary" onClick={plan} disabled={planning || !ready.anthropic}>
            {planning ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {planning ? 'Claude is art-directing… (about a minute)' : kit.plan ? 'Re-plan with Claude' : 'Plan with Claude'}
          </Button>
          {kit.plannedAt && (
            <span className="text-xs text-faint">
              Planned {new Date(kit.plannedAt).toLocaleString()} {kit.plannedWith && `with ${kit.plannedWith}`}
            </span>
          )}
        </div>

        <AnimatePresence>
          {kit.plan && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl border-[2.5px] border-dashed border-line-strong bg-raised/50 p-4 space-y-3">
              <div>
                <div className="eyebrow">Style bible</div>
                <div className="font-serif font-bold text-xl mt-1">{kit.plan.style_name}</div>
                <p className="text-sm text-muted mt-1">{kit.plan.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {kit.plan.palette.map((p) => (
                  <span key={p.hex + p.name} title={`${p.hex} · ${p.role}`} className="inline-flex items-center gap-1.5 rounded-full border-2 border-outline bg-[#fff6e2] pl-1 pr-2.5 py-0.5 text-xs font-bold text-[#2b211c]">
                    <span className="w-4 h-4 rounded-full border-2 border-outline" style={{ background: p.hex }} />
                    {p.name}
                  </span>
                ))}
              </div>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div><dt className="font-bold">Line and shading</dt><dd className="text-muted">{kit.plan.line_and_shading}</dd></div>
                <div><dt className="font-bold">Lighting</dt><dd className="text-muted">{kit.plan.lighting}</dd></div>
                <div><dt className="font-bold">Motifs</dt><dd className="text-muted">{kit.plan.motifs.join(' · ')}</dd></div>
                <div><dt className="font-bold">Avoid</dt><dd className="text-muted">{kit.plan.avoid.join(' · ')}</dd></div>
              </dl>
              <details className="text-sm">
                <summary className="font-bold cursor-pointer">IGNIS model sheet</summary>
                <p className="text-muted mt-1">{kit.plan.ignis_model_sheet}</p>
              </details>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2 · Render */}
      <div className="card p-5">
        <StepTitle n={2} title="Render with OpenAI" icon={<Brush size={18} />} />
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 mt-3 items-end">
          <label className="block">
            <span className="text-sm font-bold">Image model</span>
            <input list="artkit-models" value={settings.model} onChange={(e) => onSettings('model', e.target.value)} className="field font-mono text-sm mt-1" />
            <datalist id="artkit-models">{imageModels.map((m) => <option key={m.id} value={m.id} />)}</datalist>
          </label>
          <div>
            <span className="text-sm font-bold block mb-1">Quality</span>
            <div className="inline-flex p-1 rounded-xl bg-raised border-[2.5px] border-outline">
              {(['low', 'medium', 'high'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => onSettings('quality', q)}
                  className={cx('h-8 px-3 text-sm font-serif font-semibold rounded-lg', settings.quality === q ? 'bg-gold text-outline border-2 border-outline' : 'text-muted border-2 border-transparent')}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-faint mt-2">
          {dirty ? 'Save the configuration first: renders use the saved model and quality.' : `A full render is ${slots.length} images; transparent backgrounds are used for characters, icons and badges.`}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button variant="primary" disabled={!kit.plan || !ready.openai || kit.running || dirty} onClick={() => run(() => client.artkit.generate(), `Rendering ${slots.length} images…`)}>
            <Brush size={16} /> Render all {slots.length}
          </Button>
          {missing.length > 0 && missing.length < slots.length && (
            <Button disabled={!kit.plan || !ready.openai || kit.running || dirty} onClick={() => run(() => client.artkit.generate(missing), `Rendering ${missing.length} images…`)}>
              <RefreshCw size={16} /> Render the {missing.length} missing
            </Button>
          )}
        </div>
        {kit.running && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-bold"><span>Rendering · {busy} left</span><span>{done}/{slots.length}</span></div>
            <div className="h-3 mt-1 rounded-full border-2 border-outline bg-raised overflow-hidden">
              <motion.div className="h-full bg-ember" animate={{ width: `${(done / slots.length) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="mt-5 space-y-6">
          {GROUPS.map((g) => {
            const groupSlots = slots.filter((s) => s.group === g.id);
            return (
              <div key={g.id}>
                <div className="eyebrow mb-2">{g.label}</div>
                <div className={cx('grid gap-3', g.id === 'cover' || g.id === 'scene' ? 'sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4')}>
                  {groupSlots.map((s) => (
                    <AssetTile
                      key={s.id}
                      slot={s}
                      asset={kit.assets[s.id]}
                      prompt={kit.plan?.assets.find((a) => a.slot === s.id)}
                      editing={editing === s.id}
                      onEdit={() => setEditing(editing === s.id ? null : s.id)}
                      onSave={(prompt, alt) => run(() => client.artkit.edit(s.id, prompt, alt), 'Prompt saved.').then(() => setEditing(null))}
                      onRender={() => run(() => client.artkit.generate([s.id]), `Re-rendering ${s.label}…`)}
                      canRender={!!kit.plan && ready.openai && !kit.running && !dirty}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 · Publish */}
      <div className="card p-5">
        <StepTitle n={3} title="Publish to players" icon={<Rocket size={18} />} />
        <p className="text-sm text-muted mt-1">
          Every ready image goes live: home backdrop and IGNIS, tale covers, choice icons, ending badges, logo, favicon and share card. Slots without an image keep the built-in look.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button variant="primary" disabled={!done || kit.running} onClick={() => run(() => client.artkit.publish(), 'Art kit is live.').then(refreshArtKit)}>
            <Rocket size={16} /> Publish {done} image{done === 1 ? '' : 's'}
          </Button>
          {kit.published && (
            <Button variant="danger" onClick={() => run(() => client.artkit.unpublish(), 'Back to the built-in look.').then(refreshArtKit)}>
              <Undo2 size={16} /> Back to built-in look
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepTitle({ n, title, icon }: { n: number; title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid place-items-center w-9 h-9 rounded-full bg-gold border-[2.5px] border-outline font-serif font-bold text-outline shadow-[0_3px_0_var(--color-outline)]">{n}</span>
      <h3 className="font-serif font-bold text-xl flex-1">{title}</h3>
      <span className="text-muted">{icon}</span>
    </div>
  );
}

function AssetTile({
  slot,
  asset,
  prompt,
  editing,
  onEdit,
  onSave,
  onRender,
  canRender,
}: {
  slot: ArtSlot;
  asset: ArtAsset;
  prompt?: { prompt: string; alt: string };
  editing: boolean;
  onEdit: () => void;
  onSave: (prompt: string, alt: string) => void;
  onRender: () => void;
  canRender: boolean;
}) {
  const [draft, setDraft] = useState(prompt?.prompt ?? '');
  const [alt, setAlt] = useState(prompt?.alt ?? '');
  useEffect(() => {
    setDraft(prompt?.prompt ?? '');
    setAlt(prompt?.alt ?? '');
  }, [prompt?.prompt, prompt?.alt]);
  const st = STATUS[asset.status];
  const wide = slot.size === '1536x1024';

  return (
    <div className="rounded-2xl border-[2.5px] border-outline bg-[#fffaf0] overflow-hidden shadow-[3px_4px_0_var(--color-outline)]">
      <div className={cx('relative grid place-items-center', wide ? 'aspect-[3/2]' : 'aspect-square')} style={slot.transparent ? CHECKER : { background: '#e9dcc2' }}>
        {asset.url ? (
          <img src={asset.url} alt={prompt?.alt ?? slot.label} className={cx('absolute inset-0 w-full h-full', slot.transparent ? 'object-contain p-2' : 'object-cover')} />
        ) : (
          <span className="text-xs font-bold text-faint px-3 text-center">{slot.label}</span>
        )}
        {(asset.status === 'queued' || asset.status === 'rendering') && (
          <div className="absolute inset-0 grid place-items-center bg-[#241913aa]">
            <Loader2 className={cx('text-gold', asset.status === 'rendering' && 'animate-spin')} />
          </div>
        )}
        <span className="absolute top-2 left-2">
          <Badge tone={st.tone}>
            {asset.status === 'done' && <Check size={12} />}
            {st.label}
          </Badge>
        </span>
      </div>
      <div className="p-3">
        <div className="text-sm font-bold leading-tight">{slot.label}</div>
        <div className="text-[11px] text-faint mt-0.5">{slot.size}{slot.transparent ? ' · transparent' : ''}</div>
        {asset.error && <div className="text-xs text-candy mt-1 break-words">{asset.error}</div>}
        <div className="flex gap-1.5 mt-2">
          <Button size="sm" onClick={onEdit} disabled={!prompt}>
            <Pencil size={13} /> Prompt
          </Button>
          <Button size="sm" onClick={onRender} disabled={!canRender}>
            <RefreshCw size={13} /> {asset.url ? 'Redo' : 'Render'}
          </Button>
        </div>
        <AnimatePresence>
          {editing && prompt && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} className="field mt-2 text-xs resize-y" />
              <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Alt text" className="field mt-2 text-xs" />
              <Button size="sm" variant="primary" className="mt-2" onClick={() => onSave(draft, alt)} disabled={draft.trim().length < 10 || !alt.trim()}>
                Save prompt
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
