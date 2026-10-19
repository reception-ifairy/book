import type { Page, Story } from '../../shared/types';

const ENDING_ICON: Record<string, string> = { canon: '📜', subverted: '🌀', cursed: '☠️', secret: '🔮', death: '🪦' };

/** Every page ever generated in this run, as a tree of forks. Clicking a node rolls back to it. */
export function TimelineMap({ story, onJump, busy }: { story: Story; onJump: (pageId: string) => void; busy: boolean }) {
  const children = new Map<string, Page[]>();
  for (const p of Object.values(story.pages)) {
    if (!p.parentId) continue;
    children.set(p.parentId, [...(children.get(p.parentId) ?? []), p].sort((a, b) => a.createdAt - b.createdAt));
  }
  const onPath = new Set<string>();
  for (let p: Page | undefined = story.pages[story.currentPageId]; p; p = p.parentId ? story.pages[p.parentId] : undefined) onPath.add(p.id);
  const forks = [...children.values()].filter((c) => c.length > 1).length;

  const Node = ({ page }: { page: Page }) => {
    const kids = children.get(page.id) ?? [];
    const current = page.id === story.currentPageId;
    return (
      <li className="mt-1">
        <button
          disabled={busy || current}
          onClick={() => onJump(page.id)}
          className={`text-left font-mono text-xs px-2 py-1 rounded border transition-colors ${current ? 'border-[var(--accent-color)] text-[var(--accent-color)]' : onPath.has(page.id) ? 'border-[var(--ink-color)]/60 text-[var(--ink-color)]' : 'border-[var(--panel-border)] text-[var(--ink-color)]/50 hover:text-[var(--ink-color)]'}`}
        >
          <span className="opacity-50">#{page.depth}</span> {page.action ? page.action.label.slice(0, 48) : 'BOOT'}
          {page.ending && <span className="ml-1">{ENDING_ICON[page.ending.type]} {page.ending.title}</span>}
        </button>
        {kids.length > 0 && (
          <ul className={`ml-3 pl-3 border-l ${kids.length > 1 ? 'border-[var(--accent-color)]/50' : 'border-[var(--panel-border)]'}`}>
            {kids.map((k) => <Node key={k.id} page={k} />)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div>
      <p className="font-mono text-xs text-[var(--ink-color)]/60 mb-2">
        TIMELINE #{story.timeline} · {Object.keys(story.pages).length} pages · {forks} forks · click a node to roll back
      </p>
      <ul className="max-h-[50vh] overflow-auto chat-scrollbar pr-2">
        <Node page={story.pages[story.rootPageId]} />
      </ul>
    </div>
  );
}
