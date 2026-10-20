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

const TALE_COVERS: [string, string, string][] = [
  ['red-hood', 'Little Red Packet', 'a red-hooded courier carrying a glowing encrypted parcel through a snowy forest strung with fibre-optic fairy lights, a sly wolf in a hacker headset peeking from behind a tree'],
  ['three-pigs', 'Three Little Firewalls', 'three cartoon pigs proudly in front of a straw hut, a stick shack and a brick server-house with blinking lights, a big bad wolf inflating his cheeks with a gust full of red error icons'],
  ['hansel-gretel', 'Hansel & Gretel & Cookies', 'two kids following a trail of glowing cookie crumbs to a gingerbread cottage with candy-cane antennas, a sweet-looking witch with a data-harvesting ladle in the doorway'],
  ['cinderella', 'Cinderella: Session Expired', 'a junior-developer Cinderella running down palace stairs at the stroke of midnight, a glass-slipper USB key left glowing on a step, a pumpkin hover-carriage glitching back into a pumpkin'],
  ['wawel-dragon', 'The Wawel Dragon Exploit', 'Wawel castle on a snowy hill above the Vistula, a big goofy robot dragon with server-fan wings and a pixel-screen face about to swallow a woolly sheep stitched with glowing circuitry, a cobbler-pentester hiding behind a rock'],
];

const ENDINGS: [string, string, string][] = [
  ['canon', 'Canon ending', 'an open storybook with a golden ribbon bookmark and a small check-mark rune'],
  ['subverted', 'Subverted ending', 'a storybook spinning upside down with a swirling twist arrow'],
  ['cursed', 'Cursed ending', 'a cracked glitching storybook leaking purple smoke and broken pixels'],
  ['secret', 'Secret ending', 'a keyhole-shaped portal with a tiny glowing key and sparkles'],
  ['death', 'Garbage collected', 'a cartoon trash can with a little ghost made of pixels floating out, dizzy stars around it'],
];

export const ART_SLOTS: ArtSlot[] = [
  {
    id: 'scene-workshop',
    group: 'scene',
    label: 'Workshop backdrop',
    brief:
      "IGNIS's cozy cyber-magic workshop at night: timber beams, a stone fireplace, shelves of glowing grimoires and gadgets, fairy-light garlands, a frosty window with falling snow. Leave the left half calm and darker so a headline can sit over it.",
    usedIn: 'Full-width background behind the home screen hero, dimmed under the text.',
    size: '1536x1024',
    transparent: false,
  },
  {
    id: 'ignis-hero',
    group: 'character',
    label: 'IGNIS, hero pose',
    brief: 'IGNIS the grimoire-robot flying toward the viewer, waving, smug pixel smile on its CRT face, wings spread.',
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
  ...TALE_COVERS.map(([id, title, scene]) => ({
    id: `cover-${id}`,
    group: 'cover' as const,
    label: `Cover: ${title}`,
    brief: `Storybook cover scene for "${title}": ${scene}. One clear focal action, readable when cropped to a wide strip.`,
    usedIn: 'Tale card header (wide strip, about 360x160 crop), saved-run thumbnails, the reader header and the empty illustration frame.',
    size: '1536x1024' as ArtSize,
    transparent: false,
  })),
  { id: 'icon-sane', group: 'icon', label: 'Choice: sane', brief: 'A sturdy shield with a glowing rune check mark: the sensible move.', usedIn: 'Round icon on choice cards, 44 px.', size: '1024x1024', transparent: true },
  { id: 'icon-chaos', group: 'icon', label: 'Choice: chaos', brief: 'A crackling lightning bolt bursting out of a tiny spellbook: the unhinged move.', usedIn: 'Round icon on choice cards, 44 px.', size: '1024x1024', transparent: true },
  { id: 'icon-dumb', group: 'icon', label: 'Choice: dumb', brief: 'A cartoon banana peel with a dizzy face: the obviously terrible move.', usedIn: 'Round icon on choice cards, 44 px.', size: '1024x1024', transparent: true },
  { id: 'icon-sudo', group: 'icon', label: 'Choice: sudo', brief: 'A glowing terminal window with a magic wand poking out of it: the rule-breaking power move.', usedIn: 'Round icon on choice cards, 44 px.', size: '1024x1024', transparent: true },
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
    brief: 'A wide social share image: IGNIS flying over an open glowing storybook from which tiny fairy-tale characters spill out, with the words "Grimm Protocol" in chunky cartoon lettering.',
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
