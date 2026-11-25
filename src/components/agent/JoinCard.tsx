import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { BadgeCheck, KeyRound, Loader2 } from 'lucide-react';
import { enlist, login } from '../../agent';
import { navigate } from '../../App';
import { Badge, Button, Segmented, StatusDot, cx, useToast } from '../../ui';
import type { Lang, PublicConfig } from '../../../shared/types';

/**
 * The landing page's sign-in: join the Bureau with a codename (no email, no password: the agent key
 * is your login) or come back with an agent key from another device.
 */
export function JoinCard({ lang, setLang, config, highlight }: { lang: Lang; setLang: (l: Lang) => void; config: PublicConfig | null; highlight: number }) {
  const toast = useToast();
  const [mode, setMode] = useState<'join' | 'key'>('join');
  const [codename, setCodename] = useState(() => {
    try {
      return localStorage.getItem('ignis.hero') ?? '';
    } catch {
      return '';
    }
  });
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'join') {
        if (codename.trim().length < 2) throw new Error('The Bureau needs a codename of at least 2 characters, Agent.');
        await enlist(codename.trim(), lang);
        navigate('agent/key/new');
      } else {
        await login(key);
        toast('Welcome back, Agent. IGNIS kept your desk exactly as messy as you left it.', 'ok');
        navigate('');
      }
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.form
      id="join"
      onSubmit={submit}
      key={highlight}
      initial={{ opacity: 0, y: 16, rotate: -1 }}
      animate={highlight ? { opacity: 1, y: 0, rotate: 0, x: [0, -10, 9, -6, 4, 0] } : { opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: highlight ? 0 : 0.85, type: 'spring', stiffness: 200, damping: 16 }}
      className={cx('snowcap spotlight card mt-9 p-4 sm:p-5 max-w-xl', highlight > 0 && 'ring-4 ring-gold/60')}
    >
      <div className="flex items-center gap-1 mb-3" role="tablist" aria-label="Sign in">
        {(['join', 'key'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cx('h-8 px-3 rounded-lg text-sm font-serif font-semibold transition-colors', mode === m ? 'bg-gold text-outline border-2 border-outline shadow-[0_2px_0_var(--color-outline)]' : 'text-muted hover:text-ink')}
          >
            {m === 'join' ? 'Join the Bureau' : 'I have an agent key'}
          </button>
        ))}
      </div>

      {mode === 'join' ? (
        <>
          <label htmlFor="codename" className="eyebrow">Agent codename</label>
          <div className="mt-2 flex flex-col sm:flex-row gap-3">
            <input id="codename" value={codename} onChange={(e) => setCodename(e.target.value.slice(0, 24))} placeholder="e.g. Agent Pixel_Pip" className="field flex-1" autoComplete="off" />
            <Segmented<Lang> label="Story language" value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'pl', label: 'Polski' }]} />
          </div>
          <p className="mt-2 text-xs text-faint">No email, no password. You get a secret agent key instead: it is your badge, your login and your save file.</p>
        </>
      ) : (
        <>
          <label htmlFor="agentkey" className="eyebrow">Agent key</label>
          <input id="agentkey" value={key} onChange={(e) => setKey(e.target.value.slice(0, 40))} placeholder="ARB-XXXX-XXXX-XXXX-XXXX" className="field mt-2 font-pixel tracking-wider uppercase" autoComplete="off" spellCheck={false} />
          <p className="mt-2 text-xs text-faint">The key you saved when you joined. Case and dashes do not matter.</p>
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : mode === 'join' ? <BadgeCheck size={16} /> : <KeyRound size={16} />}
          {mode === 'join' ? 'Enlist' : 'Log in'}
        </Button>
        {config === null ? null : config.storyReady ? (
          <Badge tone="ok"><StatusDot tone="ok" /> Story engine online</Badge>
        ) : (
          <Badge tone="danger"><StatusDot tone="danger" /> Story engine offline</Badge>
        )}
      </div>
    </motion.form>
  );
}
