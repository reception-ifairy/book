import type { ReactNode } from 'react';
import { Archive, Dumbbell, LayoutDashboard, Map as MapIcon } from 'lucide-react';
import { rankOf } from '../../shared/arb';
import { useAgent } from '../agent';
import { Logo, cx } from '../ui';

const NAV = [
  { href: '#/', label: 'Pulpit', icon: LayoutDashboard, match: '' },
  { href: '#/mapa', label: 'Mapa', icon: MapIcon, match: 'mapa' },
  { href: '#/archiwum', label: 'Archiwum', icon: Archive, match: 'archiwum' },
  { href: '#/szkolenia', label: 'Szkolenia', icon: Dumbbell, match: 'szkolenia' },
];

/** Every agent screen sits in this frame: the agency header with navigation and the agent badge. */
export function Shell({ active, children, wide }: { active: string; children: ReactNode; wide?: boolean }) {
  const { agent } = useAgent();
  const rank = agent ? rankOf(agent.xp).rank : null;
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b-[3px] border-outline bg-surface/95 backdrop-blur">
        <div className={cx('mx-auto px-4 sm:px-6 h-16 flex items-center gap-4', wide ? 'max-w-7xl' : 'max-w-6xl')}>
          <Logo />
          <nav className="ml-auto hidden md:flex items-center gap-1" aria-label="Główna nawigacja">
            {NAV.map(({ href, label, icon: Icon, match }) => (
              <a
                key={href}
                href={href}
                aria-current={active === match ? 'page' : undefined}
                className={cx(
                  'inline-flex items-center gap-2 h-9 px-3 rounded-xl font-serif font-semibold text-[15px] transition-colors',
                  active === match ? 'bg-gold text-outline border-2 border-outline shadow-[0_2px_0_var(--color-outline)]' : 'text-muted hover:text-ink hover:bg-raised',
                )}
              >
                <Icon size={17} /> {label}
              </a>
            ))}
          </nav>
          {agent && rank && (
            <a href="#/" className="ml-auto md:ml-2 hidden sm:flex flex-col items-end leading-tight" title="Twój profil agenta">
              <span className="font-serif font-bold text-sm">Agent {agent.codename}</span>
              <span className="font-pixel text-[11px] text-faint">{rank.name}</span>
            </a>
          )}
        </div>
      </header>
      <main className={cx('flex-1 w-full mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-10', wide ? 'max-w-7xl' : 'max-w-6xl')}>{children}</main>
      {/* Phones: navigation as a bottom bar. */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t-[3px] border-outline bg-surface grid grid-cols-4" aria-label="Nawigacja">
        {NAV.map(({ href, label, icon: Icon, match }) => (
          <a key={href} href={href} aria-current={active === match ? 'page' : undefined} className={cx('flex flex-col items-center gap-0.5 py-2 text-xs font-bold', active === match ? 'text-gold' : 'text-muted')}>
            <Icon size={20} /> {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
