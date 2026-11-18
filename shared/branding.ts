/**
 * Branding: the name, logo, colour theme and card style of the whole site, edited in /#/admin → Branding.
 * The server bakes it into index.html (title, meta tags, <html> attributes) so the first paint is already
 * on-brand; the client applies the same values live when the admin previews or saves.
 */

export const THEME_IDS = ['workshop', 'nebula'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const CARD_STYLES = ['paper', 'holo'] as const;
export type CardStyle = (typeof CARD_STYLES)[number];

export const BRAND_IMAGE_KINDS = ['logo', 'share'] as const;
export type BrandImageKind = (typeof BRAND_IMAGE_KINDS)[number];

export interface BrandColors {
  /** Buttons, links, drop caps (the --color-ember token). */
  primary: string | null;
  /** Highlights, active nav, XP (the --color-gold token). */
  highlight: string | null;
  /** Pixel screens, neon rims of holo cards (the --color-pixel token). */
  neon: string | null;
}

export interface Branding {
  /** Full name in the header on wide screens. */
  name: string;
  /** Short name on phones and at the start of the browser tab title. */
  shortName: string;
  /** Small pixel line under the name in the header. */
  tagline: string;
  /** Search and link-preview description. */
  description: string;
  theme: ThemeId;
  cards: CardStyle;
  /** Overrides on top of the theme's own colours; null keeps the theme colour. */
  colors: BrandColors;
  /** Uploaded logo (/brand/...). Without one the header uses the Art Kit mark or the built-in pixel face. */
  logo: string | null;
  /** Uploaded share card (/brand/...). Without one /og.png serves the Art Kit share card. */
  shareImage: string | null;
  updatedAt: number;
}

export const THEMES: Record<ThemeId, { label: string; description: string; themeColor: string; colors: Required<{ [K in keyof BrandColors]: string }>; swatches: string[] }> = {
  workshop: {
    label: 'Cozy Workshop',
    description: 'Wooden detective office at night: fireplace glow, fairy lights, snow at the window.',
    themeColor: '#2a1c15',
    colors: { primary: '#ff7a2f', highlight: '#f4c84a', neon: '#5ef0ff' },
    swatches: ['#2a1c15', '#4a3427', '#fdf5e4', '#ff7a2f', '#f4c84a', '#8b63e6'],
  },
  nebula: {
    label: 'Cyber-Magic Nebula',
    description: 'Fairy-tale castles under a cosmic sky: nebula violets, rainbow arcs, a golden moon, neon pink and cyan tech.',
    themeColor: '#0d0b26',
    colors: { primary: '#ff4f9a', highlight: '#ffc24a', neon: '#5ef0ff' },
    swatches: ['#0d0b26', '#251e55', '#ff4f9a', '#ffc24a', '#5ef0ff', '#a86bff'],
  },
};

export const CARD_STYLE_INFO: Record<CardStyle, { label: string; description: string }> = {
  paper: { label: 'Paper sticker', description: 'Cream paper, bold ink outline and a hard cartoon shadow.' },
  holo: { label: 'Holo tech', description: 'Dark glass panel with a neon rainbow rim, HUD corner brackets, circuit glow and scanlines.' },
};

export const DEFAULT_BRANDING: Branding = {
  name: 'Arcane Rescue Bureau',
  shortName: 'ARB',
  tagline: 'ARB · IGNIS assist',
  description:
    'Old tales. Enchanted code. Hilarious side effects. Step into familiar tales, investigate what went wrong and decide what happens next, with IGNIS, your field assistant.',
  theme: 'workshop',
  cards: 'paper',
  colors: { primary: null, highlight: null, neon: null },
  logo: null,
  shareImage: null,
  updatedAt: 0,
};

export const HEX = /^#[0-9a-f]{6}$/i;

export const pageTitle = (b: Pick<Branding, 'name' | 'shortName'>) => (b.shortName && b.shortName !== b.name ? `${b.shortName} · ${b.name}` : b.name);

/** Inline CSS variables for the colour overrides (only the ones that are set). */
export function brandingVars(b: Pick<Branding, 'colors'>): Record<string, string> {
  const vars: Record<string, string> = {};
  const { primary, highlight, neon } = b.colors;
  if (primary && HEX.test(primary)) {
    vars['--color-ember'] = primary;
    vars['--color-ember-soft'] = `${primary}2e`;
  }
  if (highlight && HEX.test(highlight)) vars['--color-gold'] = highlight;
  if (neon && HEX.test(neon)) vars['--color-pixel'] = neon;
  return vars;
}
