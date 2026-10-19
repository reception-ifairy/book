import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, KeyRound, PlugZap, Save, Trash2, FlaskConical, RefreshCw } from 'lucide-react';
import { adminApi } from '../api';

type Provider = 'anthropic' | 'gemini' | 'openai';
type Model = { id: string; label?: string; tags: ('text' | 'image' | 'tts')[] };
type TestResult = { ok: boolean; ms?: number; error?: string; count?: number };

const PROVIDERS: { id: Provider; name: string; role: string }[] = [
  { id: 'anthropic', name: 'Anthropic (Claude)', role: 'Story engine: structure, narration, choices, vision' },
  { id: 'gemini', name: 'Google Gemini', role: 'Illustrations and/or voice' },
  { id: 'openai', name: 'OpenAI', role: 'Illustrations and/or voice' },
];

const VOICES: Record<string, string[]> = {
  openai: ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse'],
  gemini: ['Charon', 'Kore', 'Puck', 'Fenrir', 'Aoede', 'Zephyr', 'Orus', 'Enceladus'],
};

const PW_KEY = 'ignis.adminPw';
const readPw = () => {
  try {
    return sessionStorage.getItem(PW_KEY) || '';
  } catch {
    return '';
  }
};

export function Admin() {
  const [password, setPassword] = useState(readPw);
  const client = useMemo(() => adminApi(password), [password]);
  const [cfg, setCfg] = useState<any>(null);
  const [authError, setAuthError] = useState('');
  const [keys, setKeys] = useState<Record<Provider, string>>({ anthropic: '', gemini: '', openai: '' });
  const [models, setModels] = useState<Partial<Record<Provider, Model[]>>>({});
  const [tests, setTests] = useState<Partial<Record<Provider, TestResult & { loading?: boolean }>>>({});
  const [probes, setProbes] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState('');

  const load = () =>
    client.get().then((c) => {
      setCfg(c);
      setAuthError('');
    }).catch((e) => setAuthError(e.message));

  useEffect(() => {
    load();
  }, [client]);

  const login = (pw: string) => {
    try {
      sessionStorage.setItem(PW_KEY, pw);
    } catch {
      /* ignore */
    }
    setPassword(pw);
  };

  const flash = (msg: string) => {
    setSaved(msg);
    setTimeout(() => setSaved(''), 2500);
  };

  const testProvider = async (p: Provider) => {
    setTests((t) => ({ ...t, [p]: { ok: false, loading: true } }));
    try {
      const r = await client.models(p, keys[p] || undefined);
      setModels((m) => ({ ...m, [p]: r.models }));
      setTests((t) => ({ ...t, [p]: { ok: true, ms: r.ms, count: r.models.length } }));
    } catch (e) {
      setTests((t) => ({ ...t, [p]: { ok: false, error: (e as Error).message } }));
    }
  };

  const saveKey = async (p: Provider, value: string | null) => {
    try {
      setCfg(await client.save({ keys: { [p]: value } }));
      setKeys((k) => ({ ...k, [p]: '' }));
      flash(value ? `${p} key saved` : `${p} key removed`);
    } catch (e) {
      setAuthError((e as Error).message);
    }
  };

  const saveRoles = async () => {
    try {
      const { story, image, tts, limits } = cfg;
      setCfg(await client.save({ story, image, tts, limits }));
      flash('configuration saved');
    } catch (e) {
      setAuthError((e as Error).message);
    }
  };

  const probe = async (role: string) => {
    setProbes((p) => ({ ...p, [role]: { loading: true } }));
    try {
      const r = await client.probe(role);
      setProbes((p) => ({ ...p, [role]: r }));
    } catch (e) {
      setProbes((p) => ({ ...p, [role]: { ok: false, error: (e as Error).message } }));
    }
  };

  const set = (section: string, field: string, value: unknown) => setCfg((c: any) => ({ ...c, [section]: { ...c[section], [field]: value } }));
  const options = (p: string, tag: Model['tags'][number]) => {
    const list = models[p as Provider] ?? [];
    const tagged = list.filter((m) => m.tags.includes(tag));
    return tagged.length ? tagged : list;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 font-mono">
      <div className="cyber-shadow page-texture rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <a href="#/" className="icon-btn"><ArrowLeft size={14} /></a>
          <h1 className="font-display text-2xl font-black tracking-widest">SYSADMIN <span className="text-[var(--accent-color)]">//</span> CONSOLE</h1>
          {saved && <span className="ml-auto text-xs text-[var(--accent-color)]">✓ {saved}</span>}
        </div>

        {authError && (
          <div className="border border-[var(--accent-color)] rounded p-4 mb-6 text-sm">
            <p className="text-[var(--accent-color)] mb-3">&gt; {authError}</p>
            <form onSubmit={(e) => { e.preventDefault(); login(new FormData(e.currentTarget).get('pw') as string); }} className="flex gap-2">
              <input name="pw" type="password" placeholder="admin password" className="cyber-input flex-1" autoFocus />
              <button className="cyber-btn"><KeyRound size={14} /> unlock</button>
            </form>
          </div>
        )}

        {cfg && (
          <>
            {!cfg.passwordProtected && (
              <p className="text-xs text-yellow-300/80 mb-6">
                ⚠ ADMIN_PASSWORD is not set, so this console only answers from localhost. Set it on the server before deploying.
              </p>
            )}

            <Section title="1. API keys">
              <div className="space-y-4">
                {PROVIDERS.map(({ id, name, role }) => {
                  const status = cfg.providers[id];
                  const test = tests[id];
                  return (
                    <div key={id} className="rounded border border-[var(--panel-border)] p-4 bg-black/30">
                      <div className="flex flex-wrap items-baseline gap-2 mb-1">
                        <span className="text-[var(--ink-color)] font-bold">{name}</span>
                        <span className="text-xs text-[var(--ink-color)]/50">{role}</span>
                      </div>
                      <p className="text-xs mb-3 text-[var(--ink-color)]/60">
                        {status.source === 'none' ? 'no key' : `key ${status.masked} (from ${status.source === 'env' ? 'environment variable' : 'admin panel'})`}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="password"
                          autoComplete="off"
                          value={keys[id]}
                          onChange={(e) => setKeys((k) => ({ ...k, [id]: e.target.value }))}
                          placeholder="paste new key"
                          className="cyber-input flex-1 min-w-[200px]"
                        />
                        <button onClick={() => testProvider(id)} className="cyber-btn" disabled={test?.loading}>
                          {test?.loading ? <RefreshCw size={14} className="animate-spin" /> : <PlugZap size={14} />} test & fetch models
                        </button>
                        <button onClick={() => saveKey(id, keys[id])} className="cyber-btn" disabled={!keys[id].trim()}><Save size={14} /> save</button>
                        {status.source === 'admin' && (
                          <button onClick={() => saveKey(id, null)} className="cyber-btn" title="Remove the saved key"><Trash2 size={14} /></button>
                        )}
                      </div>
                      {test && !test.loading && (
                        <p className={`text-xs mt-2 ${test.ok ? 'text-emerald-400' : 'text-[var(--accent-color)]'}`}>
                          {test.ok ? `✓ key works · ${test.count} models · ${test.ms} ms` : `✗ ${test.error}`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="2. Story engine (Anthropic)">
              <Field label="Model">
                <ModelInput value={cfg.story.model} onChange={(v) => set('story', 'model', v)} models={options('anthropic', 'text')} id="story-models" />
              </Field>
              <Field label="Effort (latency vs. quality)">
                <select value={cfg.story.effort} onChange={(e) => set('story', 'effort', e.target.value)} className="cyber-input">
                  <option value="low">low · fastest</option>
                  <option value="medium">medium · balanced</option>
                  <option value="high">high · smartest, slowest</option>
                </select>
              </Field>
              <Field label="Max pages before an ending">
                <input type="number" min={4} max={30} value={cfg.story.maxDepth} onChange={(e) => set('story', 'maxDepth', Number(e.target.value))} className="cyber-input w-24" />
              </Field>
              <Probe role="story" state={probes.story} onRun={() => probe('story')} />
            </Section>

            <Section title="3. Illustrations">
              <Field label="Provider">
                <select value={cfg.image.provider} onChange={(e) => set('image', 'provider', e.target.value)} className="cyber-input">
                  <option value="gemini">Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="off">off</option>
                </select>
              </Field>
              {cfg.image.provider !== 'off' && (
                <Field label="Model">
                  <ModelInput value={cfg.image.model} onChange={(v) => set('image', 'model', v)} models={options(cfg.image.provider, 'image')} id="image-models" />
                </Field>
              )}
              <Probe role="image" state={probes.image} onRun={() => probe('image')} />
            </Section>

            <Section title="4. Narration voice">
              <Field label="Provider">
                <select value={cfg.tts.provider} onChange={(e) => set('tts', 'provider', e.target.value)} className="cyber-input">
                  <option value="browser">browser (free, built in)</option>
                  <option value="openai">OpenAI TTS</option>
                  <option value="gemini">Gemini TTS</option>
                </select>
              </Field>
              {cfg.tts.provider !== 'browser' && (
                <>
                  <Field label="Model">
                    <ModelInput value={cfg.tts.model} onChange={(v) => set('tts', 'model', v)} models={options(cfg.tts.provider, 'tts')} id="tts-models" />
                  </Field>
                  <Field label="Voice">
                    <input list="voices" value={cfg.tts.voice} onChange={(e) => set('tts', 'voice', e.target.value)} className="cyber-input" />
                    <datalist id="voices">{(VOICES[cfg.tts.provider] ?? []).map((v) => <option key={v} value={v} />)}</datalist>
                  </Field>
                </>
              )}
              <Probe role="tts" state={probes.tts} onRun={() => probe('tts')} />
            </Section>

            <Section title="5. Limits">
              <Field label="Actions per minute per visitor">
                <input type="number" min={1} value={cfg.limits.actionsPerMinute} onChange={(e) => set('limits', 'actionsPerMinute', Number(e.target.value))} className="cyber-input w-24" />
              </Field>
              <Field label="Illustrations per day (all visitors)">
                <input type="number" min={0} value={cfg.limits.imagesPerDay} onChange={(e) => set('limits', 'imagesPerDay', Number(e.target.value))} className="cyber-input w-28" />
              </Field>
            </Section>

            <button onClick={saveRoles} className="cyber-btn w-full justify-center py-3"><Save size={14} /> save configuration</button>
            <p className="text-xs text-[var(--ink-color)]/40 mt-2">Model tests run with the saved configuration: save first, then test.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xs uppercase tracking-[0.3em] text-[var(--accent-color)] mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
      <span className="sm:w-56 text-[var(--ink-color)]/60 text-xs">{label}</span>
      <div className="flex-1 flex gap-2">{children}</div>
    </label>
  );
}

function ModelInput({ value, onChange, models, id }: { value: string; onChange: (v: string) => void; models: Model[]; id: string }) {
  return (
    <>
      <input list={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={models.length ? 'pick or type a model id' : 'test the key above to fetch models'} className="cyber-input flex-1" />
      <datalist id={id}>{models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</datalist>
    </>
  );
}

function Probe({ role, state, onRun }: { role: string; state: any; onRun: () => void }) {
  return (
    <div className="rounded border border-dashed border-[var(--panel-border)] p-3 text-xs">
      <button onClick={onRun} disabled={state?.loading} className="cyber-btn">
        {state?.loading ? <RefreshCw size={14} className="animate-spin" /> : <FlaskConical size={14} />} run live {role} test
      </button>
      {state && !state.loading && (
        <div className="mt-3">
          {state.ok ? (
            <>
              <p className="text-emerald-400">✓ {state.ms} ms{state.model ? ` · served by ${state.model}` : ''}</p>
              {state.text && <p className="mt-2 text-[var(--ink-color)]">“{state.text}”</p>}
              {role === 'image' && state.dataUrl && <img src={state.dataUrl} alt="test render" className="mt-2 w-48 rounded border border-[var(--panel-border)]" />}
              {role === 'tts' && (state.dataUrl ? <audio controls src={state.dataUrl} className="mt-2" /> : <p className="mt-2">Browser voice selected: nothing to fetch.</p>)}
            </>
          ) : (
            <p className="text-[var(--accent-color)]">✗ {state.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
