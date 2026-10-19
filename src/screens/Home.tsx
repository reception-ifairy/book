import { useEffect, useState } from 'react';
import { Settings, Terminal, RefreshCw, History } from 'lucide-react';
import { SVGCharacter } from '../components/SVGCharacter';
import { api, loadRuns, rememberRun, type TaleCard } from '../api';
import { navigate } from '../App';
import type { Lang, PublicConfig } from '../../shared/types';

const prefs = {
  get: (k: string, d: string) => {
    try {
      return localStorage.getItem(k) ?? d;
    } catch {
      return d;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
};

export function Home() {
  const [tales, setTales] = useState<TaleCard[]>([]);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [lang, setLang] = useState<Lang>(() => (prefs.get('ignis.lang', 'en') as Lang));
  const [hero, setHero] = useState(() => prefs.get('ignis.hero', ''));
  const [booting, setBooting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const runs = loadRuns();

  useEffect(() => {
    api.tales().then(setTales).catch((e) => setError(e.message));
    api.config().then(setConfig).catch(() => {});
  }, []);

  const start = async (taleId: string) => {
    if (!hero.trim()) return setError('> ERROR: debugger handle required. Type a name, meatbag.');
    setError('');
    setBooting(taleId);
    prefs.set('ignis.lang', lang);
    prefs.set('ignis.hero', hero.trim());
    try {
      const story = await api.start(taleId, lang, hero.trim());
      rememberRun(story);
      navigate(`story/${story.id}`);
    } catch (e) {
      setError(`> BOOT FAILURE: ${(e as Error).message}`);
      setBooting(null);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="cyber-shadow page-texture rounded-xl p-6 md:p-10">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <SVGCharacter isTalking={!!booting} mood={booting ? 'hyped' : 'smug'} />
          <div className="text-center md:text-left">
            <h1 className="font-display font-black tracking-widest text-4xl md:text-5xl drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]">
              IGNIS <span className="text-[var(--accent-color)]">//</span> OS
            </h1>
            <h2 className="font-mono text-xs text-[var(--accent-color)] uppercase tracking-[0.3em] mt-1 animate-pulse">Grimm Protocol v3.0 · fairy tales, unpatched</h2>
            <p className="font-sans text-[var(--ink-color)]/70 mt-4 max-w-md">
              Classic fairy tales are running on cursed legacy code. Pick one, make terrible decisions, fork reality. I'll narrate. And judge.
            </p>
          </div>
        </div>

        {config && !config.storyReady && (
          <div className="font-mono text-sm border border-[var(--accent-color)] text-[var(--accent-color)] rounded p-3 mb-6">
            &gt; STORY ENGINE OFFLINE: no Anthropic key. Open the{' '}
            <a href="#/admin" className="underline">admin panel</a> to plug one in.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-8 font-mono">
          <div className="relative flex-1">
            <Terminal size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent-color)]" />
            <input
              value={hero}
              onChange={(e) => setHero(e.target.value.slice(0, 24))}
              placeholder="debugger handle (your name)"
              className="cyber-input w-full pl-9"
            />
          </div>
          <div className="flex rounded border border-[var(--panel-border)] overflow-hidden text-xs">
            {(['en', 'pl'] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`px-4 py-2 uppercase tracking-wider ${lang === l ? 'bg-[var(--ink-color)]/20 text-[var(--ink-color)]' : 'text-[var(--ink-color)]/40 hover:text-[var(--ink-color)]'}`}>
                {l === 'en' ? 'English' : 'Polski'}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="font-mono text-sm text-[var(--accent-color)] mb-4">{error}</p>}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tales.map((t) => (
            <button
              key={t.id}
              disabled={!!booting}
              onClick={() => start(t.id)}
              className="tale-card text-left rounded-lg p-5 border border-[var(--panel-border)] bg-black/40 hover:border-[var(--ink-color)] disabled:opacity-40 transition-all"
            >
              <div className="text-3xl mb-2">{t.emoji}</div>
              <div className="font-display font-bold tracking-wide text-[var(--ink-color)]">{t.title[lang]}</div>
              <p className="text-sm text-[var(--ink-color)]/60 mt-2">{t.tagline[lang]}</p>
              <div className="font-mono text-xs text-[var(--accent-color)] mt-3 flex items-center gap-2">
                {booting === t.id ? <><RefreshCw size={12} className="animate-spin" /> decrypting tale…</> : '> run tale.exe'}
              </div>
            </button>
          ))}
        </div>

        {runs.length > 0 && (
          <div className="mt-10">
            <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--ink-color)]/50 mb-3 flex items-center gap-2"><History size={14} /> Saved timelines</h3>
            <div className="flex flex-wrap gap-2">
              {runs.map((r) => {
                const t = tales.find((x) => x.id === r.taleId);
                return (
                  <a key={r.id} href={`#/story/${r.id}`} className="font-mono text-xs px-3 py-2 rounded border border-[var(--panel-border)] hover:border-[var(--ink-color)]">
                    {t?.emoji} {t?.title[lang] ?? r.taleId} · {r.heroName}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <a href="#/admin" className="mt-10 inline-flex items-center gap-2 font-mono text-xs text-[var(--ink-color)]/30 hover:text-[var(--ink-color)]">
          <Settings size={12} /> sysadmin
        </a>
      </div>
    </div>
  );
}
