import { useSyncExternalStore } from 'react';
import { DEFAULT_BRANDING, THEMES, brandingVars, pageTitle, type Branding } from '../shared/branding';

/**
 * The site's branding, fetched once per page load. The server already baked theme and title into
 * index.html; this keeps them in sync and lets the admin preview edits live before saving.
 */
function baked(): Branding {
  try {
    const b = JSON.parse(document.getElementById('branding-data')?.textContent || 'null');
    return b ? { ...DEFAULT_BRANDING, ...b, colors: { ...DEFAULT_BRANDING.colors, ...b.colors } } : DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
}

let saved: Branding = baked();
let current: Branding = saved;
const listeners = new Set<() => void>();
const OVERRIDES = ['--color-ember', '--color-ember-soft', '--color-gold', '--color-pixel'];

function setMeta(selector: string, value: string) {
  document.querySelector(selector)?.setAttribute('content', value);
}

/** Puts a branding on the page: theme and card style on <html>, colour overrides, title and meta tags. */
function apply(b: Branding) {
  current = b;
  const root = document.documentElement;
  root.dataset.theme = b.theme;
  root.dataset.cards = b.cards;
  const vars = brandingVars(b);
  for (const k of OVERRIDES) {
    if (vars[k]) root.style.setProperty(k, vars[k]);
    else root.style.removeProperty(k);
  }
  document.title = pageTitle(b);
  setMeta('meta[name="theme-color"]', THEMES[b.theme].themeColor);
  setMeta('meta[name="description"]', b.description);
  listeners.forEach((l) => l());
}

export function refreshBranding() {
  return fetch('/api/branding')
    .then((r) => (r.ok ? r.json() : null))
    .then((b: Branding | null) => {
      if (!b) return;
      saved = b;
      apply(b);
    })
    .catch(() => {});
}
refreshBranding();

/** Admin: show an unsaved edit on the page (null drops back to the saved branding). */
export const previewBranding = (b: Branding | null) => apply(b ?? saved);

/** Admin: the server accepted a new branding. */
export function brandingSaved(b: Branding) {
  saved = b;
  apply(b);
}

export const useBranding = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
