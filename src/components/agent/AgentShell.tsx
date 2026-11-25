import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Settings2 } from 'lucide-react';
import { logout, useAgent } from '../../agent';
import { navigate } from '../../App';
import { StringLights } from '../Effects';
import { Logo, SnowToggle, cx, useToast } from '../../ui';
import { DeskIcon, type DeskIconName } from './icons';
import { rankFor } from '../../../shared/xp';

export type DeskTab = 'hq' | 'cases' | 'daily' | 'archive' | 'log';

/** The desk's sections. Each one is a view of the same single page; the hash only remembers which. */
export const DESK_TABS: { id: DeskTab; href: string; label: string; sub: string; icon: DeskIconName }[] = [
  { id: 'hq', href: '#/', label: 'HQ', sub: 'the coffee is symbolic', icon: 'hq' },
  { id: 'cases', href: '#/agent/cases', label: 'Case files', sub: 'enchanted & buggy', icon: 'cases' },
  { id: 'daily', href: '#/agent/daily', label: 'Daily ops', sub: 'fresh glitches daily', icon: 'daily' },
  { id: 'archive', href: '#/agent/archive', label: 'Endings vault', sub: 'every ending, filed', icon: 'archive' },
  { id: 'log', href: '#/agent/log', label: 'XP & ranks', sub: 'proof you did stuff', icon: 'xp' },
];

/**
 * The agent's single-page desk: a cyber-magic control panel (left rail on wide screens, a tab bar at the
 * bottom on phones) around whatever section or mission is open. Missions (quiz, incident, interrogation)
 * open inside it, so the way back is always one tap.
 */
export function AgentShell({ active, children }: { active: DeskTab | null; children: ReactNode }) {
  const toast = useToast();
  const { agent, dash } = useAgent();

  const rank = agent ? rankFor(agent.xp) : null;
  const newDaily = dash?.daily.filter((d) => d.state !== 'done').length ?? 0;
  const openCases = dash?.cases.filter((c) => !c.endingType).length ?? 0;
  const badge = (id: DeskTab) => (id === 'daily' ? newDaily : id === 'cases' ? openCases : 0);
  const out = () => {
    logout();
    toast('Logged out. IGNIS will guard your desk (and eat your snacks).', 'ok');
    navigate('');
  };

  return (
    <>
      <StringLights count={28} className="h-10 z-10" />
      <div className="relative z-[1] mx-auto max-w-7xl px-4 sm:px-6 pt-11 pb-28 lg:pb-10 lg:grid lg:grid-cols-[244px_minmax(0,1fr)] lg:gap-7">
        {/* Rail (wide screens) */}
        <aside className="hidden lg:block">
          <nav aria-label="Agent desk" className="desk-rail sticky top-11 flex flex-col gap-1 p-3 max-h-[calc(100vh-3.5rem)] overflow-y-auto scroll-thin">
            <div className="px-1 pb-3 pt-1"><Logo /></div>
            {agent && rank && (
              <a href="#/agent/log" className="block rounded-xl border-2 border-[#ffffff22] bg-[#ffffff08] p-3 mb-2 hover:border-gold transition-colors">
                <span className="flex items-center gap-2.5">
                  <span className="grid place-items-center w-9 h-9 rounded-lg bg-gold text-outline font-pixel text-base border-2 border-outline shadow-[0_2px_0_var(--color-outline)] shrink-0">{rank.level}</span>
                  <span className="min-w-0 leading-tight">
                    <span className="block font-serif font-bold truncate">{agent.codename}</span>
                    <span className="block font-pixel text-[10px] text-pixel truncate">{rank.title}</span>
                  </span>
                </span>
                <span className="block mt-2.5 h-2 rounded-full bg-[#00000066] overflow-hidden">
                  <span className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-ember),var(--color-gold))]" style={{ width: `${Math.round(rank.progress * 100)}%` }} />
                </span>
                <span className="mt-1.5 flex justify-between font-pixel text-[10px] text-[#9fb4c8]">
                  <span>{agent.xp} XP</span>
                  <span className="inline-flex items-center gap-1"><DeskIcon name="streak" size={13} /> {agent.streak}d</span>
                </span>
              </a>
            )}
            {DESK_TABS.map((t) => (
              <RailItem key={t.id} tab={t} active={active === t.id} badge={badge(t.id)} />
            ))}
            <div className="mt-auto pt-4 border-t-2 border-[#ffffff14] grid grid-cols-4 gap-1 items-center">
              <a href="#/agent/key" className="desk-tool" title="Agent key" aria-label="Agent key"><DeskIcon name="key" size={24} /></a>
              <span className="grid place-items-center"><SnowToggle /></span>
              <a href="#/admin" className="desk-tool" title="Bureau console" aria-label="Bureau console"><Settings2 size={18} /></a>
              <button type="button" onClick={out} className="desk-tool" title="Log out" aria-label="Log out"><DeskIcon name="logout" size={24} /></button>
            </div>
          </nav>
        </aside>

        {/* Header (phones and tablets) */}
        <header className="lg:hidden flex items-center justify-between gap-3 h-14 mb-3">
          <Logo />
          <div className="flex items-center gap-2">
            {agent && rank && (
              <a href="#/agent/log" className="flex items-center gap-2 rounded-xl border-2 border-line px-2 py-1">
                <span className="grid place-items-center w-7 h-7 rounded-lg bg-gold text-outline font-pixel text-sm border-2 border-outline">{rank.level}</span>
                <span className="font-pixel text-[11px] text-gold">{agent.xp} XP</span>
              </a>
            )}
            <a href="#/agent/key" className="desk-tool !w-9 !h-9" aria-label="Agent key"><DeskIcon name="key" size={22} /></a>
            <button type="button" onClick={out} className="desk-tool !w-9 !h-9" aria-label="Log out"><DeskIcon name="logout" size={22} /></button>
          </div>
        </header>

        <main className="min-w-0">{children}</main>
      </div>

      {/* Tab bar (phones and tablets) */}
      <nav aria-label="Agent desk" className="desk-rail lg:hidden fixed z-40 bottom-3 inset-x-3 grid grid-cols-5 gap-1 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {DESK_TABS.map((t) => {
          const on = active === t.id;
          const n = badge(t.id);
          return (
            <a key={t.id} href={t.href} aria-current={on ? 'page' : undefined} className={cx('relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors', on ? 'bg-[#ffffff14]' : 'hover:bg-[#ffffff0a]')}>
              <DeskIcon name={t.icon} size={26} className={cx('transition-transform', on && 'scale-110 drop-shadow-[0_0_8px_var(--color-pixel)]')} />
              <span className={cx('font-pixel text-[9px] leading-none truncate max-w-full', on ? 'text-gold' : 'text-[#9fb4c8]')}>{t.label}</span>
              {n > 0 && <span className="absolute top-0.5 right-[22%] min-w-4 h-4 px-1 rounded-full bg-candy text-white text-[10px] font-bold grid place-items-center border border-outline">{n}</span>}
            </a>
          );
        })}
      </nav>
    </>
  );
}

function RailItem({ tab, active, badge }: { tab: (typeof DESK_TABS)[number]; active: boolean; badge: number }) {
  return (
    <a href={tab.href} aria-current={active ? 'page' : undefined} className={cx('desk-item group relative flex items-center gap-3 rounded-xl px-2.5 py-2', active && 'is-active')}>
      {active && <motion.span layoutId="desk-active" className="absolute inset-0 rounded-xl bg-[#ffffff12] border-2 border-[#ffffff26]" transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
        <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-gold shadow-[0_0_10px_var(--color-gold)]" />
      </motion.span>}
      <DeskIcon name={tab.icon} size={34} className="relative shrink-0 transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110" />
      <span className="relative min-w-0 leading-tight">
        <span className={cx('block font-serif font-bold', active ? 'text-gold' : 'text-[#e6f4ff]')}>{tab.label}</span>
        <span className="block font-pixel text-[10px] text-[#8ea3b8] truncate">{tab.sub}</span>
      </span>
      {badge > 0 && <span className="relative ml-auto min-w-5 h-5 px-1.5 rounded-full bg-candy text-white text-[11px] font-bold grid place-items-center border-2 border-outline">{badge}</span>}
    </a>
  );
}
