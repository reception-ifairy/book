import type { ReactNode } from 'react';

/** Heading for a mission shown inside the agent's desk (the desk itself provides navigation). */
export function AgentScreen({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <div>
      <p className="eyebrow text-gold">{eyebrow}</p>
      <h1 className="toon-title text-4xl sm:text-5xl text-ink mt-1">{title}</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}
