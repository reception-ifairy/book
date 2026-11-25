import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Copy, Download, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useAgent } from '../agent';
import { navigate } from '../App';
import { AgentScreen } from '../components/agent/AgentScreen';
import { ComicBurst } from '../components/Effects';
import { Button, useToast } from '../ui';

/**
 * The agent key: shown right after enlisting (fresh = true) and any time from the dashboard.
 * It is the only way back into the profile on another device, so the screen insists it gets saved.
 */
export function AgentKey({ fresh }: { fresh: boolean }) {
  const toast = useToast();
  const { key, agent } = useAgent();
  const [shown, setShown] = useState(fresh);
  const [saved, setSaved] = useState(!fresh);
  if (!key || !agent) return <AgentScreen eyebrow="Agent key" title="Your agent key">{null}</AgentScreen>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      setSaved(true);
      toast('Key copied. Paste it somewhere safe (not on the fridge).', 'ok');
    } catch {
      toast('Copy blocked by the browser. Select the key and copy it by hand.', 'error');
    }
  };
  const download = () => {
    const text = `ARB · Arcane Rescue Bureau\nAgent: ${agent.codename} #${agent.tag}\nAgent key: ${key}\n\nLog in at ${location.origin}/ → "I have an agent key".\nKeep it secret: anyone with this key can play as you.\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = `arb-agent-key-${agent.codename.replace(/[^\w-]+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    setSaved(true);
  };

  return (
    <AgentScreen eyebrow={fresh ? 'Welcome to the Bureau' : 'Agent key'} title={fresh ? `Badge issued, Agent ${agent.codename}!` : 'Your agent key'}>
      <motion.div initial={{ scale: 0.9, rotate: -2, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 15 }} className="card relative p-6 sm:p-8 overflow-visible">
        {fresh && <ComicBurst x="88%" y="10%" color="var(--color-gold)" word="ENLISTED!" size={160} delay={0.3} />}
        <p className="text-muted font-semibold">
          {fresh
            ? 'This is your agent key. It is your login, your badge and your save file. There is no email and no password, so if you lose it, IGNIS cannot get your desk back.'
            : 'Use it to log in on another phone or computer. Keep it secret: anyone with this key can play as you.'}
        </p>
        <div className="mt-5 rounded-2xl border-[3px] border-outline bg-screen p-4 sm:p-5 shadow-[0_4px_0_var(--color-outline)] flex flex-wrap items-center justify-between gap-3">
          <code className="font-pixel text-pixel text-xl sm:text-2xl tracking-[0.12em] [text-shadow:0_0_10px_var(--color-pixel)] break-all select-all">
            {shown ? key : `ARB-••••-••••-••••-${key.slice(-4)}`}
          </code>
          <button type="button" onClick={() => setShown((s) => !s)} className="text-pixel/80 hover:text-pixel" aria-label={shown ? 'Hide key' : 'Show key'}>
            {shown ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" onClick={copy}><Copy size={16} /> Copy key</Button>
          <Button onClick={download}><Download size={16} /> Download as .txt</Button>
        </div>
        <p className="mt-4 text-xs text-faint flex items-start gap-2"><ShieldAlert size={14} className="shrink-0 mt-0.5" /> Never share it in chats or screenshots. If someone grown-up helps you, they can keep the .txt file for you.</p>
        {fresh && (
          <div className="mt-6 pt-5 border-t-2 border-line flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="w-5 h-5 accent-[var(--color-gold)]" />
              I saved my key somewhere safe
            </label>
            <Button variant="primary" disabled={!saved} onClick={() => navigate('')}><Check size={16} /> Open my desk</Button>
          </div>
        )}
      </motion.div>
    </AgentScreen>
  );
}
