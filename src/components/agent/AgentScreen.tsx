import { useEffect, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAgent } from '../../agent';
import { navigate } from '../../App';
import { StringLights } from '../Effects';
import { TopBar } from './TopBar';

/** Frame for the agent's play screens: header, a way back to the desk, and a redirect home when logged out. */
export function AgentScreen({ eyebrow, title, children, wide = false }: { eyebrow: string; title: string; children: ReactNode; wide?: boolean }) {
  const { key } = useAgent();
  useEffect(() => {
    if (!key) navigate('');
  }, [key]);
  if (!key) return null;
  return (
    <>
      <StringLights count={28} className="h-10 z-10" />
      <div className={`relative z-[1] mx-auto ${wide ? 'max-w-5xl' : 'max-w-3xl'} px-4 sm:px-6 pt-6 pb-16`}>
        <TopBar />
        <a href="#/" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-gold"><ArrowLeft size={16} /> Back to your desk</a>
        <p className="eyebrow text-gold mt-6">{eyebrow}</p>
        <h1 className="toon-title text-4xl sm:text-5xl text-ink mt-1">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
    </>
  );
}
