import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Eye, Loader2, PlugZap, RefreshCw, Trash2 } from 'lucide-react';
import type { adminApi } from '../api';
import { Badge, Button, StatusDot, cx, useToast } from '../ui';

type Client = ReturnType<typeof adminApi>;
type Settings = { enabled: boolean; url: string; grant: string };
type KeyInfo = { source: 'admin' | 'env' | 'none'; masked: string | null };
type Row = { id: string; status: 'new' | 'changed' | 'unchanged' | 'seed-only' | 'failed'; version?: string; detail?: string };

const ROW_TONE: Record<Row['status'], 'ok' | 'warn' | 'danger' | 'neutral' | 'ember'> = {
  new: 'ok', changed: 'ember', unchanged: 'neutral', 'seed-only': 'warn', failed: 'danger',
};

function Line({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[180px_minmax(0,1fr)] gap-2 sm:gap-6 items-start">
      <div className="pt-2">
        <div className="text-sm font-bold">{label}</div>
        {help && <div className="text-xs text-faint mt-0.5">{help}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * The iFairy Universe connection: lore API address, key and grant, a live test, the Sync that
 * freezes the adventure catalogue, and a preview of the narrator prompt built from it.
 */
export function UniversePanel({ client, settings, keyInfo, onSettings, onConfig, dirty }: {
  client: Client;
  settings: Settings;
  keyInfo: KeyInfo;
  onSettings: (field: keyof Settings, value: unknown) => void;
  onConfig: (next: any) => void;
  dirty: boolean;
}) {
  const toast = useToast();
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [preview, setPreview] = useState<{ id: string; lang: string; text: string } | null>(null);

  const refresh = () => client.universe.status().then(setStatus).catch(() => {});
  useEffect(() => {
    refresh();
  }, [client]);

  const runTest = async () => {
    setTest({ loading: true });
    try {
      setTest(await client.universe.test({ url: settings.url, grant: settings.grant, key: key.trim() || undefined }));
    } catch (e) {
      setTest({ ok: false, error: (e as Error).message });
    }
  };

  const saveKey = async (value: string | null) => {
    try {
      onConfig(await client.save({ keys: { universe: value } }));
      setKey('');
      toast(value ? 'Universe key saved.' : 'Universe key removed.');
      refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await client.universe.sync();
      const c = r.catalogue.counts;
      toast(`Synced: ${c.hook} hooks, ${c.saga} saga acts, ${c.district} districts.`);
      refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const showPrompt = async (id: string, lang: string) => {
    try {
      const r = await client.universe.prompt(id, lang);
      setPreview({ id, lang, text: r.prompt });
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const cat = status?.catalogue;
  const flagged: Row[] = (cat?.report ?? []).filter((r: Row) => r.status === 'failed' || r.status === 'seed-only');
  const ids: string[] = (cat?.report ?? []).map((r: Row) => r.id);

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-5">
        <Line label="iFairy world" help="Shows the second world on the home page once the catalogue is synced.">
          <div className="inline-flex p-1 rounded-xl bg-raised border-[2.5px] border-outline">
            {([[true, 'On'], [false, 'Off']] as const).map(([v, label]) => (
              <button key={label} onClick={() => onSettings('enabled', v)} className={cx('h-8 px-4 text-sm font-serif font-semibold rounded-lg transition-all', settings.enabled === v ? 'bg-gold text-outline border-2 border-outline shadow-[0_2px_0_var(--color-outline)]' : 'text-muted hover:text-ink border-2 border-transparent')}>
                {label}
              </button>
            ))}
          </div>
        </Line>
        <Line label="API address" help="On this server, the loopback address skips nginx and TLS.">
          <input value={settings.url} onChange={(e) => onSettings('url', e.target.value)} className="field font-mono text-sm" />
        </Line>
        <Line label="Grant" help="The consumer's grant: book-gm once the Universe has it, if-ai until then.">
          <input list="universe-grants" value={settings.grant} onChange={(e) => onSettings('grant', e.target.value)} className="field font-mono text-sm w-56" />
          <datalist id="universe-grants"><option value="book-gm" /><option value="if-ai" /></datalist>
        </Line>
        <Line label="Consumer key" help="Issued once in T1000 → Universe Connections. Never shown again in full.">
          <div className="text-xs text-faint mb-2">
            {keyInfo.source !== 'none' ? <>Key <span className="font-mono text-muted">{keyInfo.masked}</span> · from {keyInfo.source === 'env' ? 'environment' : 'this console'}</> : 'No key yet.'}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="uapi_…" className="field flex-1 font-mono text-sm" />
            <div className="flex gap-2">
              <Button onClick={runTest} disabled={test?.loading || (!key && keyInfo.source === 'none')}>
                {test?.loading ? <Loader2 size={16} className="animate-spin" /> : <PlugZap size={16} />} Test
              </Button>
              <Button variant="primary" onClick={() => saveKey(key)} disabled={!key.trim()}>Save</Button>
              {keyInfo.source === 'admin' && (
                <Button variant="danger" onClick={() => saveKey(null)} aria-label="Remove saved key" title="Remove saved key"><Trash2 size={16} /></Button>
              )}
            </div>
          </div>
          {test && !test.loading && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-sm">
              {test.ok ? (
                <span className="text-ok">✓ Canon {test.version} · {test.chunks} chunks · search works with this grant · {test.ms} ms</span>
              ) : (
                <span className="text-danger">✗ {test.error}</span>
              )}
            </motion.div>
          )}
        </Line>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-serif font-semibold text-lg leading-tight">Adventure catalogue</div>
            <div className="text-xs text-faint mt-0.5">
              {cat ? (
                <>Canon {cat.canonVersion} · synced {new Date(cat.syncedAt).toLocaleString()} · {cat.counts.hook} hooks, {cat.counts.saga} saga acts, {cat.counts.district} districts</>
              ) : (
                'Not synced yet. Running stories keep their own copy, so syncing is always safe.'
              )}
            </div>
          </div>
          <Badge tone={cat ? 'ok' : 'neutral'}>{cat && <StatusDot tone="ok" />}{cat ? 'Synced' : 'Empty'}</Badge>
          <Button variant="primary" onClick={sync} disabled={syncing || dirty || keyInfo.source === 'none'} title={dirty ? 'Save your changes first' : undefined}>
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Sync now
          </Button>
        </div>
        {flagged.length > 0 && (
          <details className="mt-4 group" open={flagged.length <= 5}>
            <summary className="cursor-pointer text-sm font-bold text-muted hover:text-ink">
              {flagged.filter((r) => r.status === 'failed').length} failed · {flagged.filter((r) => r.status === 'seed-only').length} seed-only
            </summary>
            <ul className="mt-2 space-y-1.5 text-sm">
              {flagged.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-2">
                  <Badge tone={ROW_TONE[r.status]}>{r.status}</Badge>
                  <span className="font-mono text-xs">{r.id}</span>
                  {r.detail && <span className="text-xs text-faint">{r.detail}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
        {flagged.some((r) => r.status === 'seed-only') && (
          <p className="mt-3 text-xs text-faint">“seed-only”: the Universe does not index this node yet, so the game uses its built-in copy of the canon entry.</p>
        )}
        {status?.stats && (
          <p className="mt-3 text-xs text-faint">
            Since start: {status.stats.calls} calls · {status.stats.failures} failures · {status.stats.piiRejects} personal-data rejections{status.stats.lastError ? ` · last error: ${status.stats.lastError}` : ''}
          </p>
        )}
      </div>

      {ids.length > 0 && (
        <div className="card p-5">
          <div className="font-serif font-semibold text-lg leading-tight">Narrator prompt preview</div>
          <p className="text-xs text-faint mt-0.5 mb-3">The system prompt an adventure gets, built only from its synced canon. Check it against the canon before opening the world.</p>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              showPrompt(String(f.get('id')), String(f.get('lang')));
            }}
          >
            <select name="id" className="field w-auto font-mono text-sm" defaultValue={ids[0]}>
              {ids.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
            <select name="lang" className="field w-auto" defaultValue="en">
              <option value="en">English</option>
              <option value="pl">Polski</option>
            </select>
            <Button><Eye size={16} /> Show prompt</Button>
          </form>
          {preview && (
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border-2 border-line bg-field p-3 text-xs font-mono text-muted">{preview.text}</pre>
          )}
        </div>
      )}
    </div>
  );
}
