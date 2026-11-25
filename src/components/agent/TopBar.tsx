import { useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { refreshDashboard, useAgent } from '../../agent';
import { Logo, SnowToggle } from '../../ui';
import { rankFor } from '../../../shared/xp';

/** Header for the agent's screens: logo, the agent's badge (codename, rank, XP), snow and the console. */
export function TopBar() {
  const { key, agent, dash } = useAgent();
  // Opened straight on a play screen (or after logging in elsewhere): fetch the profile once.
  useEffect(() => {
    if (key && !dash) refreshDashboard().catch(() => {});
  }, [key]);
  const rank = agent ? rankFor(agent.xp) : null;
  return (
    <header className="flex items-center justify-between gap-3 h-16">
      <Logo />
      <div className="flex items-center gap-3 min-w-0">
        {agent && rank && (
          <a href="#/" className="hidden sm:flex items-center gap-2.5 rounded-xl border-2 border-line px-3 py-1.5 hover:border-gold transition-colors min-w-0" title="Your dashboard">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-screen text-pixel font-pixel text-sm border-2 border-outline shrink-0">{rank.level}</span>
            <span className="leading-tight min-w-0">
              <span className="block text-sm font-serif font-bold truncate">{agent.codename}</span>
              <span className="block font-pixel text-[10px] text-gold truncate">{rank.title} · {agent.xp} XP</span>
            </span>
          </a>
        )}
        <SnowToggle />
        <a href="#/admin" className="group inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-gold transition-colors" title="Bureau console">
          <Settings2 size={16} className="glow-icon transition-transform duration-500 group-hover:rotate-90" />
          <span className="sr-only">Bureau console</span>
        </a>
      </div>
    </header>
  );
}
