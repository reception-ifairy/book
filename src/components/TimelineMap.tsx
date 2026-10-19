import type { Page, Story } from '../../shared/types';
import { KIND, ENDING } from '../meta';
import { cx } from '../ui';

/** Every page ever generated in this run, as a tree of forks. Clicking a node rolls back to it. */
export function TimelineMap({ story, onJump, busy }: { story: Story; onJump: (pageId: string) => void; busy: boolean }) {
  const children = new Map<string, Page[]>();
  for (const p of Object.values(story.pages)) {
    if (!p.parentId) continue;
    children.set(p.parentId, [...(children.get(p.parentId) ?? []), p].sort((a, b) => a.createdAt - b.createdAt));
  }
  const onPath = new Set<string>();
  for (let p: Page | undefined = story.pages[story.currentPageId]; p; p = p.parentId ? story.pages[p.parentId] : undefined) onPath.add(p.id);
  const pages = Object.values(story.pages);
  const forks = [...children.values()].filter((c) => c.length > 1).length;
  const endings = pages.filter((p) => p.ending).length;

  const Node = ({ page }: { page: Page }) => {
    const kids = children.get(page.id) ?? [];
    const current = page.id === story.currentPageId;
    const color = page.action ? KIND[page.action.kind === 'boot' ? 'sane' : page.action.kind].color : 'var(--color-ember)';
    return (
      <li className="relative">
        <button
          disabled={busy || current}
          onClick={() => onJump(page.id)}
          className={cx(
            'w-full flex items-start gap-3 text-left rounded-lg px-2 py-2 transition-colors',
            current ? 'bg-ember-soft' : 'hover:bg-raised',
          )}
        >
          <span
            className={cx('mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ring-4 ring-surface', !onPath.has(page.id) && 'opacity-40')}
            style={{ background: color }}
          />
          <span className="min-w-0 flex-1">
            <span className={cx('block text-sm leading-snug', current ? 'text-ember' : onPath.has(page.id) ? 'text-ink' : 'text-faint')}>
              {page.action ? page.action.label : 'The tale begins'}
            </span>
            <span className="block font-mono text-[11px] text-faint mt-0.5">
              page {page.depth + 1}
              {current && ' · you are here'}
              {page.ending && ` · ${ENDING[page.ending.type].label}: ${page.ending.title}`}
            </span>
          </span>
        </button>
        {kids.length > 0 && (
          <ul className={cx('ml-[13px] pl-3 border-l', kids.length > 1 ? 'border-ember/40' : 'border-line')}>
            {kids.map((k) => <Node key={k.id} page={k} />)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          ['Pages', pages.length],
          ['Forks', forks],
          ['Endings', endings],
        ].map(([label, n]) => (
          <div key={label} className="rounded-xl bg-raised border border-line px-3 py-2">
            <div className="eyebrow">{label}</div>
            <div className="font-serif text-2xl">{n}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-faint mb-3">Pick any page to roll back. Your next move from there forks a new branch.</p>
      <ul>
        <Node page={story.pages[story.rootPageId]} />
      </ul>
    </div>
  );
}
