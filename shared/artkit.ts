/**
 * The Art Kit: every piece of artwork the UI knows how to use. Claude plans a prompt for each slot,
 * OpenAI renders it, and the frontend swaps it in where listed under `usedIn` (falling back to the
 * built-in CSS/SVG look when a slot is empty). Add a slot here only together with the UI that shows it.
 */

export type ArtSize = '1024x1024' | '1536x1024' | '1024x1536';
export type ArtGroup = 'scene' | 'character' | 'cover' | 'icon' | 'badge' | 'brand';

export interface ArtSlot {
  id: string;
  group: ArtGroup;
  label: string;
  /** What the picture must show: fixed requirements the planner builds on. */
  brief: string;
  /** Where the UI displays it, so the planner can design for the crop and size. */
  usedIn: string;
  size: ArtSize;
  transparent: boolean;
}

/** One cover per Edu-Verse world; ids match the world ids, so `cover-<world id>` finds it. */
const WORLD_COVERS: [string, string, string][] = [
  ['world-bleepworld', 'BleepWorld', 'a candy-coloured chaos landscape where floating objects, musical notes and shapes blink in and out at random, a small explorer stacking a neat glowing pile of sorted things'],
  ['world-loopia', 'Loopia', 'a garden maze under a sky with a giant gentle clock, glowing footprints from earlier loops on the paths, a patient clockwork tortoise and a rooster'],
  ['world-textosfera', 'Textosfera', 'a city of shimmering letters where sentences form bridges and towers, a heavy dark word-cloud drifting over glowing word-brick houses'],
  ['world-probabilion', 'Probabilion', 'a meadow under shimmering rainbow probability waves rising from planted seeds, some waves bright and tall, others faint, a wobbly wave-creature professor'],
  ['world-narramagia', 'Narramagia', 'a landscape drawing itself into being from glowing ink lines that flow from a giant feather quill, half-drawn mountains and a half-written castle'],
  ['world-fraktalia', 'Fraktalia', 'fern-shaped trees made of smaller ferns, a dewdrop holding a tiny galaxy, branching lightning mirrored in crystal paths'],
  ['world-sympathos', 'Sympathos', 'a soft pastel valley where flowers bloom and float upward around a happy cloud-sheep, a distant path turning gently steep under a small grey cloud'],
  ['lab-gravi-lab', 'The Gravi-Lab', 'a bright round laboratory with a giant gravity dial, objects floating at different heights, small moons orbiting a glowing gravity well'],
  ['lab-whispering-tomes', 'The Curved Reading Room', 'a cosy circular library whose floor and shelves curve upward like the inside of a wave, books fluttering like birds'],
  ['lab-levitas', 'Levitas', 'a sky archipelago of floating islands, ideas drawn as glowing balloons lifting a little explorer, a sulking shiny pebble below'],
  ['lab-rewind-realm', 'The Rewind Realm', 'a little town where rain falls upward and spilled milk leaps back into a cup, a long line of dominoes standing back up'],
  ['lab-coloratura', 'Coloratura', 'a concert hall of floating colour waves and glowing musical notes arranged like fraction bars, a conductor whose baton splits into equal parts'],
  ['lab-chrono-voyages', 'Chrono-Voyages', 'a softly glowing holographic reconstruction of a historical hall with translucent people of the past and documents unfolding layers of light'],
  ['homework-portal', 'The Homework Portal', 'a cosy desk under a warm lamp where a homework page glows and opens into a small portal world, pencils floating like little rockets'],
];

const FORCE_ICONS: [string, string, string][] = [
  ['logos', 'Logos', 'a glowing geometric crystal with a tiny ruler and a pattern of dots: patterns and reasoning'],
  ['mythos', 'Mythos', 'an open scroll with a little clock and a spiral of story-light: stories and time'],
  ['gnosis', 'Gnosis', 'two small hands holding a softly glowing heart: feelings and empathy'],
  ['phantasia', 'Phantasia', 'a lightbulb bursting into stars and paint splashes: imagination and play'],
];

const ENDINGS: [string, string, string][] = [
  ['canon', 'World understood', 'a little portal with a golden check-mark rune and a field-guide page tucked into it'],
  ['subverted', 'Your own world-model', 'a small planet the explorer built, with a hand-drawn flag and a twist arrow orbiting it'],
  ['secret', 'Secret discovery', 'a keyhole-shaped portal with a tiny glowing key and sparkles'],
];

export const ART_SLOTS: ArtSlot[] = [
  {
    id: 'scene-workshop',
    group: 'scene',
    label: 'Workshop backdrop',
    brief:
      "IGNIS's cozy cyber-magic workshop at night: timber beams, a stone fireplace, shelves of glowing grimoires and gadgets, fairy-light garlands, a frosty window with falling snow, and a shimmering round portal in the far wall with a glimpse of a strange world. Leave the left half calm and darker so a headline can sit over it.",
    usedIn: 'Full-width background behind the home screen hero, dimmed under the text.',
    size: '1536x1024',
    transparent: false,
  },
  {
    id: 'ignis-hero',
    group: 'character',
    label: 'IGNIS, hero pose',
    brief: 'IGNIS the grimoire-robot flying toward the viewer, waving, warm pixel smile on its screen face, wings spread, a tiny portal sparkling beside it.',
    usedIn: 'Home screen hero, about 260 px tall, floating next to the headline.',
    size: '1024x1024',
    transparent: true,
  },
  {
    id: 'ignis-painting',
    group: 'character',
    label: 'IGNIS painting',
    brief: 'IGNIS hovering at a tiny easel, painting with a glowing brush held in its robot hand, focused squint on its screen face.',
    usedIn: 'Shown while a page illustration is being generated, about 180 px.',
    size: '1024x1024',
    transparent: true,
  },
  ...WORLD_COVERS.map(([id, title, scene]) => ({
    id: `cover-${id}`,
    group: 'cover' as const,
    label: `Cover: ${title}`,
    brief: `Storybook cover scene for the Edu-Verse world "${title}": ${scene}. One clear focal idea, readable when cropped to a wide strip.`,
    usedIn: 'World card header (wide strip, about 360x160 crop), saved-run thumbnails, the reader header and the empty illustration frame.',
    size: '1536x1024' as ArtSize,
    transparent: false,
  })),
  ...FORCE_ICONS.map(([id, label, scene]) => ({
    id: `icon-${id}`,
    group: 'icon' as const,
    label: `Choice: ${label}`,
    brief: `${scene[0].toUpperCase()}${scene.slice(1)}.`,
    usedIn: 'Round icon on choice cards, 44 px.',
    size: '1024x1024' as ArtSize,
    transparent: true,
  })),
  ...ENDINGS.map(([id, label, scene]) => ({
    id: `ending-${id}`,
    group: 'badge' as const,
    label: `Ending: ${label}`,
    brief: `A round sticker badge for the "${label}" ending: ${scene}.`,
    usedIn: 'Top of the ending card, about 120 px, pops in with a comic burst.',
    size: '1024x1024' as ArtSize,
    transparent: true,
  })),
  {
    id: 'brand-mark',
    group: 'brand',
    label: 'App mark',
    brief: "A square app icon: IGNIS's CRT face with a happy pixel smile and the ember antenna, on a rounded tile.",
    usedIn: 'Header logo (40 px) and browser favicon.',
    size: '1024x1024',
    transparent: true,
  },
  {
    id: 'brand-share',
    group: 'brand',
    label: 'Share card',
    brief: 'A wide social share image: IGNIS flying out of a shimmering portal, with little glimpses of strange worlds (probability waves, a fractal fern, floating letters) around it, and the words "Quantum Edu-Verse" in chunky cartoon lettering.',
    usedIn: 'Link preview image (og:image) when the game is shared.',
    size: '1536x1024',
    transparent: false,
  },
];

export const ART_SLOT_IDS = ART_SLOTS.map((s) => s.id);
export const getSlot = (id: string) => ART_SLOTS.find((s) => s.id === id);

/** Published kit as the frontend sees it: slot id → image URL. */
export interface PublicArtKit {
  version: number;
  assets: Record<string, string>;
  alt: Record<string, string>;
}

/** Admin view of the working kit. */
export interface ArtPlan {
  style_name: string;
  summary: string;
  palette: { name: string; hex: string; role: string }[];
  line_and_shading: string;
  lighting: string;
  motifs: string[];
  ignis_model_sheet: string;
  avoid: string[];
  assets: { slot: string; prompt: string; alt: string }[];
}

export type AssetStatus = 'idle' | 'queued' | 'rendering' | 'done' | 'failed';

export interface ArtAsset {
  slot: string;
  status: AssetStatus;
  url: string | null;
  error: string | null;
  updatedAt: number;
}

export interface ArtKitState {
  plan: ArtPlan | null;
  plannedAt: number | null;
  plannedWith: string | null;
  notes: string;
  assets: Record<string, ArtAsset>;
  published: PublicArtKit | null;
  publishedAt: number | null;
  running: boolean;
}
