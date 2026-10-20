import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, BookOpen, FlaskConical, Gauge, Image as ImageIcon, KeyRound, Loader2, Lock, Mic2, Palette, PlugZap, ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react';
import { ArtKitPanel } from './ArtKitPanel';
import { adminApi } from '../api';
import { Badge, Button, Logo, SnowToggle, StatusDot, cx, useToast } from '../ui';
import { StringLights } from '../components/Effects';

type Provider = 'anthropic' | 'gemini' | 'openai';
type Model = { id: string; label?: string; tags: ('text' | 'image' | 'tts')[] };
type TestResult = { ok: boolean; ms?: number; error?: string; count?: number; loading?: boolean };

const PROVIDERS: { id: Provider; name: string; initial: string; role: string; hint: string }[] = [
  { id: 'anthropic', name: 'Anthropic', initial: 'A', role: 'Story engine · narration, choices, vision', hint: 'console.anthropic.com → API keys' },
  { id: 'gemini', name: 'Google Gemini', initial: 'G', role: 'Illustrations · voice', hint: 'aistudio.google.com → Get API key' },
  { id: 'openai', name: 'OpenAI', initial: 'O', role: 'Illustrations · voice', hint: 'platform.openai.com → API keys' },
];

const VOICES: Record<string, string[]> = {
  openai: ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse'],
  gemini: ['Charon', 'Kore', 'Puck', 'Fenrir', 'Aoede', 'Zephyr', 'Orus', 'Enceladus'],
};

const NAV = [
  { id: 'keys', label: 'API keys', icon: KeyRound },
  { id: 'story', label: 'Story engine', icon: BookOpen },
  { id: 'image', label: 'Illustrations', icon: ImageIcon },
  { id: 'tts', label: 'Voice', icon: Mic2 },
  { id: 'artkit', label: 'Art kit', icon: Palette },
  { id: 'limits', label: 'Limits', icon: Gauge },
];

const PW_KEY = 'ignis.adminPw';
const session = {
  get: () => {
    try {
      return sessionStorage.getItem(PW_KEY) || '';
    } catch {
      return '';
    }
  },
  set: (v: string) => {
    try {
      sessionStorage.setItem(PW_KEY, v);
    } catch {
      /* ignore */
    }
  },
};

const rolesOf = (c: any) => c && JSON.stringify({ story: c.story, image: c.image, tts: c.tts, limits: c.limits, artkit: c.artkit });

export function Admin() {
  const toast = useToast();
  const [password, setPassword] = useState(session.get);
  const client = useMemo(() => adminApi(password), [password]);
  const [saved, setSaved] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [authError, setAuthError] = useState('');
  const [keys, setKeys] = useState<Record<Provider, string>>({ anthropic: '', gemini: '', openai: '' });
  const [models, setModels] = useState<Partial<Record<Provider, Model[]>>>({});
  const [tests, setTests] = useState<Partial<Record<Provider, TestResult>>>({});
  const [probes, setProbes] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState('keys');

  // Scroll-spy: the active section is the last one whose heading has passed just under the sticky header.
  useEffect(() => {
    if (!cfg) return;
    const onScroll = () => {
      let current = NAV[0].id;
      for (const { id } of NAV) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 160) current = id;
      }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) current = NAV[NAV.length - 1].id;
      setSection(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [!!cfg]);

  const apply = (c: any) => {
    setSaved(c);
    setCfg(c);
  };

  const testProvider = async (p: Provider, key?: string, quiet = false) => {
    setTests((t) => ({ ...t, [p]: { ok: false, loading: true } }));
    try {
      const r = await client.models(p, key || undefined);
      setModels((m) => ({ ...m, [p]: r.models }));
      setTests((t) => ({ ...t, [p]: { ok: true, ms: r.ms, count: r.models.length } }));
      if (!quiet) toast(`${p}: key works, ${r.models.length} models fetched.`);
    } catch (e) {
      setTests((t) => ({ ...t, [p]: { ok: false, error: (e as Error).message } }));
      if (!quiet) toast((e as Error).message, 'error');
    }
  };

  useEffect(() => {
    client.get()
      .then((c) => {
        apply(c);
        setAuthError('');
        // Verify every configured key straight away so the status cards are live.
        for (const p of PROVIDERS) if (c.providers[p.id].source !== 'none') testProvider(p.id, undefined, true);
      })
      .catch((e) => setAuthError(e.message));
  }, [client]);

  const saveKey = async (p: Provider, value: string | null) => {
    try {
      const next = await client.save({ keys: { [p]: value } });
      // Keep any unsaved role edits in the form; only the key status comes from the server.
      setSaved(next);
      setCfg((c: any) => ({ ...next, story: c.story, image: c.image, tts: c.tts, limits: c.limits, artkit: c.artkit }));
      setKeys((k) => ({ ...k, [p]: '' }));
      toast(value ? `${p} key saved.` : `${p} key removed.`);
      if (value) testProvider(p, undefined, true);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const saveRoles = async () => {
    setSaving(true);
    try {
      const { story, image, tts, limits, artkit } = cfg;
      apply(await client.save({ story, image, tts, limits, artkit }));
      toast('Configuration saved.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
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
  const dirty = !!cfg && rolesOf(cfg) !== rolesOf(saved);

  if (authError && !cfg) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const pw = new FormData(e.currentTarget).get('pw') as string;
            session.set(pw);
            setPassword(pw);
          }}
          className="card w-full max-w-sm p-6"
        >
          <div className="grid place-items-center w-12 h-12 rounded-xl bg-screen text-pixel border-[2.5px] border-outline shadow-[0_3px_0_var(--color-outline)] mb-4"><Lock size={22} /></div>
          <h1 className="font-serif font-bold text-2xl">Sysadmin access</h1>
          <p className="text-sm text-muted mt-1 mb-5">{authError}</p>
          <input name="pw" type="password" placeholder="Admin password" className="field" autoFocus />
          <Button variant="primary" className="w-full mt-3">Unlock</Button>
          <a href="#/" className="block text-center text-sm text-faint hover:text-ink mt-4">Back to the tales</a>
        </form>
      </div>
    );
  }

  if (!cfg) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-muted" /></div>;
  }

  const keyStatus = (p: Provider) => {
    const t = tests[p];
    if (cfg.providers[p].source === 'none') return { tone: 'neutral' as const, text: 'Not configured' };
    if (!t || t.loading) return { tone: 'neutral' as const, text: 'Checking…' };
    return t.ok ? { tone: 'ok' as const, text: 'Connected' } : { tone: 'danger' as const, text: 'Key rejected' };
  };
  const ready = (p: Provider) => cfg.providers[p].source !== 'none' && tests[p]?.ok !== false;
  const problem = (p: Provider) => (cfg.providers[p].source === 'none' ? `Needs a ${p} key` : `${p} key rejected`);

  const overview = [
    {
      label: 'Story engine',
      ok: ready('anthropic'),
      value: ready('anthropic') ? cfg.story.model : problem('anthropic'),
    },
    {
      label: 'Illustrations',
      ok: cfg.image.provider === 'off' ? null : ready(cfg.image.provider),
      value: cfg.image.provider === 'off' ? 'Off' : ready(cfg.image.provider) ? `${cfg.image.provider} · ${cfg.image.model || 'no model'}` : problem(cfg.image.provider),
    },
    {
      label: 'Voice',
      ok: cfg.tts.provider === 'browser' ? true : ready(cfg.tts.provider),
      value: cfg.tts.provider === 'browser' ? 'Browser voice' : ready(cfg.tts.provider) ? `${cfg.tts.provider} · ${cfg.tts.model || 'no model'}` : problem(cfg.tts.provider),
    },
    { label: 'Admin access', ok: cfg.passwordProtected, value: cfg.passwordProtected ? 'Password protected' : 'Localhost only' },
  ];

  return (
    <div className="pb-28">
      <header className="sticky top-0 z-30 bg-[#3a2619] border-b-[3px] border-outline shadow-[0_6px_0_#00000033]">
        <div className="mx-auto max-w-6xl h-16 px-4 sm:px-6 flex items-center gap-4">
          <Logo />
          <span className="text-faint">/</span>
          <span className="font-serif font-semibold">Sysadmin</span>
          <div className="ml-auto flex items-center gap-2">
            <SnowToggle />
            <a href="#/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-gold"><ArrowLeft size={16} /> Back to tales</a>
          </div>
        </div>
      </header>
      {/* Hung under the bar but scrolls away with the page, so it never covers what you're reading. */}
      <div className="relative h-0 z-20"><StringLights count={24} /></div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8">
        <h1 className="toon-title text-4xl sm:text-5xl text-ink">Console</h1>
        <p className="text-muted mt-3">Wire up the models behind IGNIS. Claude writes the story; Gemini or OpenAI paint and speak.</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {overview.map((o) => (
            <motion.div key={o.label} layout className="spotlight card p-4" style={{ ['--spot' as string]: o.ok === null ? 'var(--color-faint)' : o.ok ? 'var(--color-ok)' : 'var(--color-danger)' }}>
              <div className="flex items-center gap-2">
                <StatusDot tone={o.ok === null ? 'idle' : o.ok ? 'ok' : 'danger'} />
                <span className="eyebrow">{o.label}</span>
              </div>
              <div className="mt-2 font-serif font-semibold truncate" title={o.value}>{o.value}</div>
            </motion.div>
          ))}
        </div>

        {!cfg.passwordProtected && (
          <div className="card mt-5 flex items-start gap-3 px-4 py-3 text-sm !bg-[#ffe9a8]">
            <ShieldAlert size={18} className="text-[#6b4a00] shrink-0 mt-0.5" />
            <span className="text-muted"><span className="text-ink">ADMIN_PASSWORD is not set.</span> This console only answers from localhost until you set it on the server.</span>
          </div>
        )}

        <div className="grid lg:grid-cols-[200px_minmax(0,1fr)] gap-8 mt-10">
          <nav className="hidden lg:block">
            <ul className="sticky top-24 space-y-1">
              {NAV.map(({ id, label, icon: Icon }) => (
                <li key={id} className="relative">
                  {section === id && (
                    <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl bg-raised border-2 border-outline shadow-[0_3px_0_var(--color-outline)]" transition={{ type: 'spring', stiffness: 400, damping: 34 }}>
                      <span className="absolute left-1.5 top-2 bottom-2 w-1 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold)]" />
                    </motion.span>
                  )}
                  <a
                    href="#/admin"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={cx('group relative flex items-center gap-2.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors', section === id ? 'text-ink glow-on' : 'text-muted hover:text-ink')}
                  >
                    <Icon size={16} className={cx('glow-icon', section === id && 'text-gold')} /> {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-10 min-w-0">
            <Section id="keys" title="API keys" desc="Keys are stored on the server, never sent back in full. A key saved here overrides the environment variable.">
              <div className="space-y-3">
                {PROVIDERS.map((p) => {
                  const st = keyStatus(p.id);
                  const t = tests[p.id];
                  const src = cfg.providers[p.id];
                  return (
                    <div key={p.id} className="spotlight card p-5" style={{ ['--spot' as string]: st.tone === 'ok' ? 'var(--color-ok)' : st.tone === 'danger' ? 'var(--color-danger)' : 'var(--color-ember)' }}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={cx('grid place-items-center w-10 h-10 rounded-xl border-[2.5px] border-outline font-pixel text-lg shadow-[0_3px_0_var(--color-outline)] transition-all', st.tone === 'ok' ? 'bg-screen text-pixel [text-shadow:0_0_6px_var(--color-pixel)]' : 'bg-raised text-ink')}>{p.initial}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-serif font-semibold text-lg leading-tight">{p.name}</div>
                          <div className="text-xs text-faint">{p.role}</div>
                        </div>
                        <motion.span key={st.text} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
                          <Badge tone={st.tone}>
                            {st.tone !== 'neutral' && <StatusDot tone={st.tone === 'ok' ? 'ok' : 'danger'} />}
                            {st.text}
                          </Badge>
                        </motion.span>
                      </div>
                      <div className="mt-4 text-xs text-faint flex flex-wrap gap-x-4 gap-y-1">
                        {src.source !== 'none' ? (
                          <span>Key <span className="font-mono text-muted">{src.masked}</span> · from {src.source === 'env' ? 'environment' : 'this console'}</span>
                        ) : (
                          <span>Get a key: {p.hint}</span>
                        )}
                        {t?.ok && <span>{t.count} models · {t.ms} ms</span>}
                        {t && !t.ok && !t.loading && <span className="text-danger">{t.error}</span>}
                      </div>
                      <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <input
                          type="password"
                          autoComplete="off"
                          value={keys[p.id]}
                          onChange={(e) => setKeys((k) => ({ ...k, [p.id]: e.target.value }))}
                          placeholder={src.source === 'none' ? 'Paste API key' : 'Paste a new key to replace it'}
                          className="field flex-1 font-mono text-sm"
                        />
                        <div className="flex gap-2">
                          <Button onClick={() => testProvider(p.id, keys[p.id])} disabled={t?.loading || (!keys[p.id] && src.source === 'none')}>
                            {t?.loading ? <Loader2 size={16} className="animate-spin" /> : <PlugZap size={16} />} Test
                          </Button>
                          <Button variant="primary" onClick={() => saveKey(p.id, keys[p.id])} disabled={!keys[p.id].trim()}>Save</Button>
                          {src.source === 'admin' && (
                            <Button variant="danger" onClick={() => saveKey(p.id, null)} aria-label="Remove saved key" title="Remove saved key"><Trash2 size={16} /></Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section id="story" title="Story engine" desc="Claude writes every page as structured JSON: narration, choices, stats, endings and the illustration brief.">
              <div className="card p-5 space-y-5">
                <Field label="Model" help="Fetched from your Anthropic key. Type any model id to override.">
                  <ModelInput value={cfg.story.model} onChange={(v) => set('story', 'model', v)} models={options('anthropic', 'text')} id="story-models" />
                </Field>
                <Field label="Effort" help="Lower is faster per page; higher writes smarter twists.">
                  <select value={cfg.story.effort} onChange={(e) => set('story', 'effort', e.target.value)} className="field">
                    <option value="low">Low · fastest pages</option>
                    <option value="medium">Medium · balanced</option>
                    <option value="high">High · smartest, slowest</option>
                  </select>
                </Field>
                <Field label="Pages before an ending" help="The story wraps up by this depth.">
                  <input type="number" min={4} max={30} value={cfg.story.maxDepth} onChange={(e) => set('story', 'maxDepth', Number(e.target.value))} className="field w-28" />
                </Field>
                <Probe role="story" state={probes.story} onRun={() => probe('story')} dirty={dirty} />
              </div>
            </Section>

            <Section id="image" title="Illustrations" desc="Each page gets an image from Claude's brief, drawn in the cozy cartoon-workshop style.">
              <div className="card p-5 space-y-5">
                <Field label="Provider">
                  <ProviderPicker value={cfg.image.provider} onChange={(v) => set('image', 'provider', v)} options={[['gemini', 'Gemini'], ['openai', 'OpenAI'], ['off', 'Off']]} />
                </Field>
                {cfg.image.provider !== 'off' && (
                  <Field label="Model" help={`Image models from your ${cfg.image.provider} key.`}>
                    <ModelInput value={cfg.image.model} onChange={(v) => set('image', 'model', v)} models={options(cfg.image.provider, 'image')} id="image-models" />
                  </Field>
                )}
                <Probe role="image" state={probes.image} onRun={() => probe('image')} dirty={dirty} />
              </div>
            </Section>

            <Section id="tts" title="Narration voice" desc="Players toggle read-aloud per page. The browser voice is free and always available.">
              <div className="card p-5 space-y-5">
                <Field label="Provider">
                  <ProviderPicker value={cfg.tts.provider} onChange={(v) => set('tts', 'provider', v)} options={[['browser', 'Browser'], ['openai', 'OpenAI'], ['gemini', 'Gemini']]} />
                </Field>
                {cfg.tts.provider !== 'browser' && (
                  <>
                    <Field label="Model">
                      <ModelInput value={cfg.tts.model} onChange={(v) => set('tts', 'model', v)} models={options(cfg.tts.provider, 'tts')} id="tts-models" />
                    </Field>
                    <Field label="Voice">
                      <div className="flex flex-wrap gap-1.5">
                        {(VOICES[cfg.tts.provider] ?? []).map((v) => (
                          <button
                            key={v}
                            onClick={() => set('tts', 'voice', v)}
                            className={cx('h-8 px-3 rounded-lg text-sm border transition-colors', cfg.tts.voice === v ? 'border-ember text-ember bg-ember-soft' : 'border-line text-muted hover:text-ink')}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </>
                )}
                <Probe role="tts" state={probes.tts} onRun={() => probe('tts')} dirty={dirty} />
              </div>
            </Section>

            <Section id="artkit" title="Art kit" desc="Claude art-directs the whole cyber-magic look, OpenAI paints it: backdrop, IGNIS, tale covers, choice icons, ending badges, logo and share card.">
              <ArtKitPanel
                client={client}
                settings={cfg.artkit}
                onSettings={(field, value) => set('artkit', field, value)}
                imageModels={options('openai', 'image')}
                dirty={dirty}
              />
            </Section>

            <Section id="limits" title="Limits" desc="Protect your API bill from enthusiastic timeline-breakers.">
              <div className="card p-5 space-y-5">
                <Field label="Actions per minute" help="Per visitor: new pages, illustrations and voice.">
                  <input type="number" min={1} value={cfg.limits.actionsPerMinute} onChange={(e) => set('limits', 'actionsPerMinute', Number(e.target.value))} className="field w-28" />
                </Field>
                <Field label="Illustrations per day" help="Shared across all visitors. Failed renders don't count.">
                  <input type="number" min={0} value={cfg.limits.imagesPerDay} onChange={(e) => set('limits', 'imagesPerDay', Number(e.target.value))} className="field w-28" />
                </Field>
              </div>
            </Section>
          </div>
        </div>
      </div>

      {/* Unsaved changes bar */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="card fixed bottom-4 inset-x-4 z-40 mx-auto max-w-xl px-4 py-3 flex items-center gap-3"
          >
            <span className="w-2 h-2 rounded-full bg-ember" />
            <span className="text-sm font-bold flex-1">Unsaved changes</span>
            <Button variant="ghost" size="sm" onClick={() => setCfg(saved)}>Discard</Button>
            <Button variant="primary" size="sm" onClick={saveRoles} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Save changes
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ id, title, desc, children }: { id: string; title: string; desc: string; children: ReactNode }) {
  return (
    <motion.section id={id} className="scroll-mt-24" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5 }}>
      <h2 className="toon-title text-2xl sm:text-3xl text-ink">{title}</h2>
      <p className="text-sm text-muted mt-2 mb-4">{desc}</p>
      {children}
    </motion.section>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
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

function ProviderPicker({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-raised border-[2.5px] border-outline">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} className={cx('h-8 px-4 text-sm font-serif font-semibold rounded-lg transition-all', value === v ? 'bg-gold text-outline border-2 border-outline shadow-[0_2px_0_var(--color-outline)]' : 'text-muted hover:text-ink border-2 border-transparent')}>
          {label}
        </button>
      ))}
    </div>
  );
}

function ModelInput({ value, onChange, models, id }: { value: string; onChange: (v: string) => void; models: Model[]; id: string }) {
  return (
    <div>
      <input list={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="model id" className="field font-mono text-sm" />
      <datalist id={id}>{models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</datalist>
      <div className="text-xs text-faint mt-1.5">
        {models.length ? `${models.length} models available, start typing to filter.` : 'Test the provider key above to load its models.'}
      </div>
    </div>
  );
}

function Probe({ role, state, onRun, dirty }: { role: string; state: any; onRun: () => void; dirty: boolean }) {
  return (
    <div className="group rounded-2xl border-[2.5px] border-dashed border-line-strong bg-raised/50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={onRun} disabled={state?.loading || dirty}>
          {state?.loading ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} className="glow-icon" />} Run live test
        </Button>
        <span className="text-xs text-faint">{dirty ? 'Save your changes first: tests use the saved configuration.' : 'Makes a real call with the saved configuration.'}</span>
      </div>
      {state && !state.loading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-sm">
          {state.ok ? (
            <>
              <div className="text-ok [text-shadow:0_0_12px_var(--color-ok)]">✓ Passed in {state.ms} ms{state.model ? ` · served by ${state.model}` : ''}</div>
              {state.text && <p className="mt-2 font-serif italic text-muted">“{state.text}”</p>}
              {role === 'image' && state.dataUrl && <img src={state.dataUrl} alt="Test render" className="mt-3 w-56 rounded-xl border border-line" />}
              {role === 'tts' && (state.dataUrl ? <audio controls src={state.dataUrl} className="mt-3 w-full" /> : <p className="mt-2 text-muted">Browser voice selected: nothing to fetch.</p>)}
            </>
          ) : (
            <div className="text-danger">✗ {state.error}</div>
          )}
        </motion.div>
      )}
    </div>
  );
}
