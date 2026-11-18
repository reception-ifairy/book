import express, { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { DATA_DIR } from './config';
import { getKit } from './artkit/store';
import { BRAND_IMAGE_KINDS, CARD_STYLES, DEFAULT_BRANDING, HEX, THEMES, THEME_IDS, brandingVars, pageTitle, type BrandImageKind, type Branding } from '../shared/branding';

const DIR = path.join(DATA_DIR, 'branding');
export const BRAND_FILES_DIR = path.join(DIR, 'files');
const STATE_FILE = path.join(DIR, 'branding.json');

/** Uploaded images: the raster formats browsers show everywhere. SVG is refused (it can carry scripts). */
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const FORMATS: { ext: string; test: (b: Buffer) => boolean }[] = [
  { ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
];

const color = z.string().regex(HEX, 'Colours are #rrggbb.').nullable();
const BrandingSchema = z.object({
  name: z.string().trim().min(1, 'The name cannot be empty.').max(60),
  shortName: z.string().trim().min(1, 'The short name cannot be empty.').max(16),
  tagline: z.string().trim().max(60),
  description: z.string().trim().max(300),
  theme: z.enum(THEME_IDS),
  cards: z.enum(CARD_STYLES),
  colors: z.object({ primary: color, highlight: color, neon: color }),
});
/** What the admin may send: any subset; colours merge field by field. */
const UpdateSchema = BrandingSchema.extend({ colors: BrandingSchema.shape.colors.partial() }).partial();

function load(): Branding {
  try {
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const parsed = BrandingSchema.partial().safeParse(saved);
    const ok = parsed.success ? parsed.data : {};
    const file = (u: unknown) => (typeof u === 'string' && /^\/brand\/[\w.-]+$/.test(u) ? u : null);
    return {
      ...DEFAULT_BRANDING,
      ...ok,
      colors: { ...DEFAULT_BRANDING.colors, ...ok.colors },
      logo: file(saved.logo),
      shareImage: file(saved.shareImage),
      updatedAt: Number(saved.updatedAt) || 0,
    } as Branding;
  } catch {
    return { ...DEFAULT_BRANDING };
  }
}

let state = load();
let indexCache: { template: string; html: string; at: number } | null = null;

export const getBranding = () => state;

function save(next: Partial<Branding>) {
  state = { ...state, ...next, updatedAt: Date.now() };
  indexCache = null;
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  return state;
}

export function updateBranding(patch: unknown) {
  const p = UpdateSchema.parse(patch);
  return save({ ...p, colors: { ...state.colors, ...p.colors } } as Partial<Branding>);
}

function removeFile(url: string | null) {
  if (!url) return;
  const file = path.resolve(BRAND_FILES_DIR, path.basename(url));
  if (file.startsWith(BRAND_FILES_DIR + path.sep)) fs.rm(file, { force: true }, () => {});
}

const FIELD: Record<BrandImageKind, 'logo' | 'shareImage'> = { logo: 'logo', share: 'shareImage' };

/** Stores an uploaded data URL (PNG, JPEG or WebP, checked by its bytes, not its label) as the logo or share card. */
export function setBrandImage(kind: BrandImageKind, dataUrl: string) {
  const m = /^data:[\w/+.-]+;base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!m) throw new BrandingError('Send the image as a base64 data URL.');
  const data = Buffer.from(m[1], 'base64');
  if (data.length > MAX_IMAGE_BYTES) throw new BrandingError('The image is larger than 3 MB.', 413);
  const format = FORMATS.find((f) => f.test(data));
  if (!format) throw new BrandingError('Use a PNG, JPEG or WebP image.');
  fs.mkdirSync(BRAND_FILES_DIR, { recursive: true });
  const name = `${kind}-${Date.now().toString(36)}.${format.ext}`;
  fs.writeFileSync(path.join(BRAND_FILES_DIR, name), data);
  const previous = state[FIELD[kind]];
  save({ [FIELD[kind]]: `/brand/${name}` });
  removeFile(previous);
  return state;
}

export function clearBrandImage(kind: BrandImageKind) {
  const previous = state[FIELD[kind]];
  save({ [FIELD[kind]]: null });
  removeFile(previous);
  return state;
}

export class BrandingError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Bakes the branding into the built index.html: title, description, link-preview tags, theme colour,
 * and the theme / card style / colour overrides on <html>, so the first paint is already on-brand.
 */
export function renderIndex(template: string, b: Branding = state): string {
  const title = esc(pageTitle(b));
  const desc = esc(b.description);
  const style = Object.entries(brandingVars(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
  const meta = (attr: string, key: string, value: string) => (html: string) =>
    html.replace(new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`), `$1${value}$2`);
  return [
    (h: string) => h.replace(/<html([^>]*)>/, (_m, attrs: string) => `<html${attrs.replace(/\s(data-theme|data-cards|style)="[^"]*"/g, '')} data-theme="${b.theme}" data-cards="${b.cards}"${style ? ` style="${esc(style)}"` : ''}>`),
    (h: string) => h.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`),
    meta('name', 'description', desc),
    meta('name', 'theme-color', THEMES[b.theme].themeColor),
    meta('property', 'og:title', title),
    meta('property', 'og:description', desc),
    // The client starts from this instead of the defaults, so the header never flashes the old name.
    (h: string) => h.replace('</head>', `<script id="branding-data" type="application/json">${JSON.stringify(b).replace(/</g, '\\u003c')}</script>\n  </head>`),
  ].reduce((h, f) => f(h), template);
}

/** index.html for a template read from disk; re-rendered only when the branding changes. */
export function indexHtml(template: string) {
  if (indexCache?.template !== template || indexCache.at !== state.updatedAt) indexCache = { template, html: renderIndex(template), at: state.updatedAt };
  return indexCache.html;
}

/** Player-facing: the branding, its images, and the favicon / share-card shortcuts (upload first, Art Kit second). */
export const brandingPublic = Router();
brandingPublic.get('/api/branding', (_req, res) => res.json(state));
brandingPublic.use('/brand', express.static(BRAND_FILES_DIR, { maxAge: '365d', immutable: true, fallthrough: false }));
for (const [route, field, slot] of [
  ['/favicon.png', 'logo', 'brand-mark'],
  ['/og.png', 'shareImage', 'brand-share'],
] as const) {
  brandingPublic.get(route, (_req, res) => {
    const url = state[field] ?? getKit().published?.assets[slot];
    if (url) res.redirect(302, url);
    else res.status(404).end();
  });
}

/** Mounted inside the admin router, behind its guard. */
export const brandingAdmin = Router();
const fail = (res: express.Response, e: unknown) => {
  if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message ?? 'Invalid branding.' });
  if (e instanceof BrandingError) return res.status(e.status).json({ error: e.message });
  console.error(e);
  return res.status(500).json({ error: 'Could not save the branding.' });
};
const kindOf = (k: string) => {
  const kind = BRAND_IMAGE_KINDS.find((x) => x === k);
  if (!kind) throw new BrandingError('Unknown image.', 404);
  return kind;
};

brandingAdmin.get('/', (_req, res) => res.json(state));
brandingAdmin.put('/', (req, res) => {
  try {
    res.json(updateBranding(req.body));
  } catch (e) {
    fail(res, e);
  }
});
brandingAdmin.put('/images/:kind', (req, res) => {
  try {
    const { dataUrl } = z.object({ dataUrl: z.string() }).parse(req.body);
    res.json(setBrandImage(kindOf(String(req.params.kind)), dataUrl));
  } catch (e) {
    fail(res, e);
  }
});
brandingAdmin.delete('/images/:kind', (req, res) => {
  try {
    res.json(clearBrandImage(kindOf(String(req.params.kind))));
  } catch (e) {
    fail(res, e);
  }
});
