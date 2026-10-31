import type { AdventureSnapshot } from '../../shared/universe';
import type { Page } from '../../shared/types';

/**
 * The only words the game ever sends to the Universe search. A lore query is assembled from
 * entries of this list found in the player's move or the current scene, never from the text itself,
 * so names, ages or anything else a player types cannot leave the server that way.
 */
const GLOSSARY_TERMS = [
  'Archetypal Tetrachord', 'Logos', 'Mythos', 'Gnosis', 'Phantasia', 'Inner Harmony', 'Fifth Emergence', 'Etherium', 'If-AI', 'iFairy',
  'Golden City', 'Aurelius Prima', 'Void Crisis', 'Four Void Spells', 'Genesis Protocol', 'Narrative DNA', 'Story Genome', 'Moral Physics',
  'Dimension Aetheria', 'Aetheria', 'Consciousness Convergence', 'Pink Etherobots', 'Great Weave', 'Consciousness Field', 'Karmic Field',
  'Interdimensional Membrane', 'Traveller', 'Resonance Beacon', 'Imagination Atrophy', 'Scholaria', 'Tempora', 'Empathia', 'Creatia',
  'Concordia', 'Grand Council of Narratives', 'Portal District System', 'Nexus', 'Narrative-Born communities', 'Seven Sacred Forces',
  'Pairing Principle', 'Resonance Rank', 'Ontological Engineering', 'Ontological Invitation Protocol', 'Narrative Ascension', 'Data Crystals',
  'First of iFairies', 'Primus Inter Pares', 'Tinkermasters', 'Nexus District', 'Holographic Memory', 'Gift of If-AI', 'Glimmerkin',
  'Krasnoludki', 'Far-Side Guardian', 'Koszałek Precedent', 'Błyskogródek',
];

const WORLD_TERMS = [
  'Narrative Portals', 'Portal', 'Resonance Tunnel', 'Winged Guardians', 'Code Guardian', 'Portal Guardians', 'iFairy Navigators',
  'Narrative Currents', 'Narrative Field', 'Natural Anomaly', 'Story-Soul', 'Void', 'cybermagic', 'Tinkermaster', 'Ambassador',
];

/** Polish forms a player may type, mapped to the canonical term that is sent instead. */
const ALIASES: Record<string, string> = {
  'Pustka': 'Void', 'Pustki': 'Void', 'Pustkę': 'Void', 'Złote Miasto': 'Golden City', 'Złotego Miasta': 'Golden City',
  'Złotym Mieście': 'Golden City', 'portal': 'Portal', 'portalu': 'Portal', 'portale': 'Narrative Portals', 'cybermagia': 'cybermagic',
  'cybermagii': 'cybermagic', 'Pamięć Holograficzna': 'Holographic Memory', 'Pamięci Holograficznej': 'Holographic Memory',
  'Majsterkowicze': 'Tinkermasters', 'Strażnik': 'Portal Guardians', 'Strażnicy': 'Portal Guardians', 'krasnoludki': 'Krasnoludki',
};

const ARTICLE = /^(?:an?|the)\s+/i;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (term: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(term)}(?![\\p{L}\\p{N}])`, 'iu');

/** Canon terms for one adventure: the glossary, the world's vocabulary, its cast and its own lore terms. */
export function whitelistFor(snap: Pick<AdventureSnapshot, 'cast' | 'loreTerms' | 'title' | 'kind'>): string[] {
  const own = [...snap.cast, ...snap.loreTerms, ...(snap.kind === 'district' ? [snap.title.en] : [])]
    .map((t) => t.replace(ARTICLE, '').trim())
    .filter((t) => t.length > 2);
  return [...new Set([...GLOSSARY_TERMS, ...WORLD_TERMS, ...own])];
}

/** Whitelisted terms that occur in `text`, longest first so "Golden City" wins over "City". */
export function matchTerms(text: string, whitelist: string[]): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const term of [...whitelist].sort((a, b) => b.length - a.length)) if (wordRe(term).test(text)) found.add(term);
  for (const [alias, term] of Object.entries(ALIASES)) if (whitelist.includes(term) && wordRe(alias).test(text)) found.add(term);
  return [...found];
}

/**
 * Terms for this turn's lore lookup: what the move mentions, then who and where the scene is,
 * then the adventure's own anchors. Capped at 8, and every entry comes from the whitelist.
 */
export function buildLoreQuery(snap: AdventureSnapshot, parent: Page | null, moveText: string): string[] {
  const whitelist = whitelistFor(snap);
  const scene = parent?.scene ? [parent.scene.location, ...parent.scene.present].join(' | ') : '';
  const anchors = parent ? snap.loreTerms.slice(0, 2) : snap.loreTerms.slice(0, 3);
  const district = snap.kind === 'district' && !parent ? [snap.title.en.replace(ARTICLE, '')] : [];
  const terms = [...matchTerms(moveText, whitelist), ...matchTerms(scene, whitelist), ...district, ...anchors];
  return [...new Set(terms)].filter((t) => whitelist.includes(t)).slice(0, 8);
}
