import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ImageUp, Loader2, RotateCcw, Save, Sparkles, Trash2, Zap } from 'lucide-react';
import type { adminApi } from '../api';
import { brandingSaved, previewBranding } from '../branding';
import { useArt } from '../artkit';
import { Badge, Button, Logo, cx, useToast } from '../ui';
import { CARD_STYLES, CARD_STYLE_INFO, THEMES, THEME_IDS, type BrandColors, type BrandImageKind, type Branding } from '../../shared/branding';

type Client = ReturnType<typeof adminApi>;

const MAX_BYTES = 3 * 1024 * 1024;
const COLOR_FIELDS: { key: keyof BrandColors; label: string; help: string }[] = [
  { key: 'primary', label: 'Primary', help: 'Buttons, drop caps, accents' },
  { key: 'highlight', label: 'Highlight', help: 'Active items, XP, gold' },
  { key: 'neon', label: 'Neon', help: 'Pixel screens, holo rims' },
];

const editable = (b: Branding) => JSON.stringify({ ...b, logo: null, shareImage: null, updatedAt: 0 });

const readDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read the file.'));
    r.readAsDataURL(file);
  });

/**
 * Branding for the Bureau console: names, logo, share card, colour theme and card style.
 * Every edit previews live on this page; Save makes it the look for every visitor.
 */
export function BrandingPanel({ client }: { client: Client }) {
  const toast = useToast();
  const art = useArt();
  const [saved, setSaved] = useState<Branding | null>(null);
  const [draft, setDraft] = useState<Branding | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    client.branding
      .get()
      .then((b) => {
        setSaved(b);
        setDraft(b);
      })
      .catch((e) => setError(e.message));
  }, [client]);

  // The whole console is the preview; leaving the panel drops unsaved edits from the page.
  useEffect(() => {
    if (draft) previewBranding(draft);
  }, [draft]);
  useEffect(() => () => previewBranding(null), []);

  if (error) return <p className="text-sm text-muted">{error}</p>;
  if (!draft || !saved) return <div className="card p-5 text-sm text-muted inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading the branding…</div>;

  const dirty = editable(draft) !== editable(saved);
  const set = <K extends keyof Branding>(k: K, v: Branding[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const setColor = (k: keyof BrandColors, v: string | null) => setDraft((d) => (d ? { ...d, colors: { ...d.colors, [k]: v } } : d));
  const theme = THEMES[draft.theme];

  const accept = (b: Branding, done: string) => {
    setSaved(b);
    // Keep unsaved text and colour edits; take the images from the server.
    setDraft((d) => (d ? { ...d, logo: b.logo, shareImage: b.shareImage, updatedAt: b.updatedAt } : b));
    brandingSaved(b);
    toast(done, 'ok');
  };

  const save = async () => {
    setBusy('save');
    try {
      const { name, shortName, tagline, description, theme, cards, colors } = draft;
      const b = await client.branding.save({ name, shortName, tagline, description, theme, cards, colors });
      setSaved(b);
      setDraft(b);
      brandingSaved(b);
      toast('Branding saved. Every visitor sees it now.', 'ok');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const upload = async (kind: BrandImageKind, file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) return toast('The image is larger than 3 MB.', 'error');
    setBusy(kind);
    try {
      accept(await client.branding.upload(kind, await readDataUrl(file)), kind === 'logo' ? 'Logo uploaded.' : 'Share card uploaded.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const removeImage = async (kind: BrandImageKind) => {
    setBusy(kind);
    try {
      accept(await client.branding.removeImage(kind), kind === 'logo' ? 'Logo removed.' : 'Share card removed.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const artMark = art.src('brand-mark');
  const artShare = art.src('brand-share');

  return (
    <div className="space-y-5">
      {/* Theme */}
      <div className="card p-5">
        <span className="eyebrow">Colour theme</span>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {THEME_IDS.map((id) => (
            <Choice key={id} active={draft.theme === id} onClick={() => set('theme', id)} title={THEMES[id].label} desc={THEMES[id].description}>
              <span className="flex h-7 rounded-lg overflow-hidden border-2 border-outline">
                {THEMES[id].swatches.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
              </span>
            </Choice>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="card p-5">
        <span className="eyebrow">Card style</span>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {CARD_STYLES.map((id) => (
            <Choice key={id} active={draft.cards === id} onClick={() => set('cards', id)} title={CARD_STYLE_INFO[id].label} desc={CARD_STYLE_INFO[id].description}>
              {id === 'paper' ? (
                <span className="block h-7 rounded-lg bg-[#fdf5e4] border-[2.5px] border-[#241913] shadow-[3px_3px_0_#241913]" />
              ) : (
                <span className="block h-7 rounded-lg border-2 border-transparent [background:linear-gradient(#141238,#141238)_padding-box,linear-gradient(135deg,#ff4f9a,#a86bff_35%,#5ef0ff_65%,#ffc24a)_border-box] shadow-[0_0_14px_-4px_#5ef0ff]" />
              )}
            </Choice>
          ))}
        </div>
      </div>

      {/* Colours */}
      <div className="card p-5">
        <span className="eyebrow">Colours</span>
        <p className="text-xs text-faint mt-1">Empty means the theme’s own colour.</p>
        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          {COLOR_FIELDS.map(({ key, label, help }) => {
            const value = draft.colors[key];
            const effective = value ?? theme.colors[key];
            return (
              <div key={key} className="rounded-xl border-2 border-line p-3 flex items-center gap-3">
                <label className="relative shrink-0 w-11 h-11 rounded-xl border-[2.5px] border-outline shadow-[0_3px_0_var(--color-outline)] cursor-pointer overflow-hidden" style={{ background: effective }}>
                  <input type="color" value={effective} onChange={(e) => setColor(key, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label={`${label} colour`} />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{label}</div>
                  <div className="text-xs text-faint truncate">{value ? value : `theme · ${effective}`}</div>
                  <div className="text-[11px] text-faint truncate">{help}</div>
                </div>
                {value && (
                  <button onClick={() => setColor(key, null)} className="text-faint hover:text-ink" title="Back to the theme colour" aria-label={`Reset ${label}`}>
                    <RotateCcw size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Identity */}
      <div className="card p-5 space-y-4">
        <span className="eyebrow">Name</span>
        <div className="grid sm:grid-cols-2 gap-3">
          <Text label="Full name" help="Header on wide screens, browser tab" value={draft.name} max={60} onChange={(v) => set('name', v)} />
          <Text label="Short name" help="Header on phones, start of the tab title" value={draft.shortName} max={16} onChange={(v) => set('shortName', v)} />
          <Text label="Tagline" help="Small pixel line under the name" value={draft.tagline} max={60} onChange={(v) => set('tagline', v)} />
        </div>
        <label className="block">
          <span className="text-sm font-bold">Description</span>
          <span className="block text-xs text-faint">Search results and link previews</span>
          <textarea value={draft.description} maxLength={300} rows={2} onChange={(e) => set('description', e.target.value)} className="field mt-1.5 resize-y" />
        </label>
      </div>

      {/* Images */}
      <div className="grid md:grid-cols-[1fr_1.6fr] gap-5">
        <ImageCard
          title="Logo"
          help="Header logo and favicon. Square PNG, JPEG or WebP, up to 3 MB; transparent PNG looks best."
          source={draft.logo ? 'Uploaded' : artMark ? 'Art Kit mark' : 'Built-in pixel face'}
          busy={busy === 'logo'}
          onUpload={(f) => upload('logo', f)}
          onRemove={draft.logo ? () => removeImage('logo') : undefined}
        >
          <div className="grid place-items-center h-36 rounded-xl border-2 border-line bg-[repeating-conic-gradient(#ffffff0d_0_25%,transparent_0_50%)_0_0/16px_16px]">
            {draft.logo || artMark ? <img src={draft.logo ?? artMark} alt="Logo" className="max-h-28 max-w-[80%] object-contain" /> : <span className="font-pixel text-pixel text-3xl">^‿^</span>}
          </div>
        </ImageCard>
        <ImageCard
          title="Share card"
          help="The picture shown when a link to the game is shared (1200×630 or 3:2). PNG, JPEG or WebP, up to 3 MB."
          source={draft.shareImage ? 'Uploaded' : artShare ? 'Art Kit share card' : 'None yet'}
          busy={busy === 'share'}
          onUpload={(f) => upload('share', f)}
          onRemove={draft.shareImage ? () => removeImage('share') : undefined}
        >
          <div className="grid place-items-center h-36 rounded-xl border-2 border-line overflow-hidden bg-raised">
            {draft.shareImage || artShare ? <img src={draft.shareImage ?? artShare} alt="Share card" className="w-full h-full object-cover" /> : <span className="text-sm text-faint">No share card yet</span>}
          </div>
        </ImageCard>
      </div>

      {/* Preview */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">Preview</span>
          {dirty && <Badge tone="ember"><Sparkles size={12} /> Previewing unsaved changes</Badge>}
        </div>
        <div className="mt-4 grid sm:grid-cols-[1.1fr_1fr] gap-4 items-start">
          <div className="rounded-2xl border-2 border-line bg-bg p-4 space-y-4">
            <div className="pointer-events-none"><Logo /></div>
            <div className="card overflow-hidden">
              <div className="h-20 grid place-items-center text-4xl border-b-[3px] border-outline" style={{ background: 'radial-gradient(120% 90% at 20% 0%, color-mix(in srgb, var(--color-chaos) 70%, transparent), transparent 60%), linear-gradient(160deg, #1b1550, #0b0a24)' }}>🐉</div>
              <div className="p-4">
                <span className="eyebrow">Case file · exploit</span>
                <h4 className="font-serif text-lg font-bold mt-1">The Wawel Dragon Exploit</h4>
                <p className="text-sm text-muted mt-1">A dragon with server-fan wings, a sheep full of circuitry and you.</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm"><Zap size={14} /> Open case</Button>
              <Button size="sm">Resume</Button>
              <Badge tone="ember">+50 XP</Badge>
            </div>
            <div className="paper sticker bg-surface px-3.5 py-3 text-sm font-semibold flex items-center gap-3">
              <span className="w-8 h-8 rounded-full grid place-items-center text-outline border-2 border-outline" style={{ background: 'var(--color-chaos)' }}>⚡</span>
              Feed the dragon a firewall.
            </div>
            <div className="rounded-xl border-[2.5px] border-outline bg-screen text-pixel p-3 font-pixel text-xs">GLITCH OF THE DAY · every frog says “404”.</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={save} disabled={!dirty || !!busy}>
          {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save branding
        </Button>
        <Button variant="ghost" onClick={() => setDraft({ ...saved })} disabled={!dirty || !!busy}>Discard</Button>
        <span className="text-xs text-faint">{dirty ? 'This page shows the preview; visitors still see the saved branding.' : 'Saved branding is live for every visitor.'}</span>
      </div>
    </div>
  );
}

function Choice({ active, onClick, title, desc, children }: { active: boolean; onClick: () => void; title: string; desc: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx('text-left rounded-xl border-[2.5px] p-3 transition-all', active ? 'border-gold shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-gold)_35%,transparent)]' : 'border-line hover:border-line-strong')}
    >
      {children}
      <span className="mt-2.5 flex items-center gap-1.5 font-serif font-bold">
        {active && <Check size={16} className="text-gold" />} {title}
      </span>
      <span className="block text-xs text-muted mt-0.5">{desc}</span>
    </button>
  );
}

function Text({ label, help, value, max, onChange }: { label: string; help: string; value: string; max: number; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <span className="block text-xs text-faint">{help}</span>
      <input value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} className="field mt-1.5" />
    </label>
  );
}

function ImageCard({ title, help, source, busy, onUpload, onRemove, children }: { title: string; help: string; source: string; busy: boolean; onUpload: (f: File | undefined) => void; onRemove?: () => void; children: ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{title}</span>
        <Badge>{source}</Badge>
      </div>
      {children}
      <p className="text-xs text-faint">{help}</p>
      <div className="flex flex-wrap gap-2 mt-auto">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            onUpload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <Button size="sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ImageUp size={14} />} Upload
        </Button>
        {onRemove && (
          <Button size="sm" variant="ghost" onClick={onRemove} disabled={busy}>
            <Trash2 size={14} /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}
