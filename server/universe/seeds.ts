import type { AdventureKind, AdventureStructure } from '../../shared/universe';
import type { Lang } from '../../shared/types';

/**
 * The curated catalogue of iFairy adventures. Each seed names the canon node it comes from;
 * Sync fetches that node from the Universe, checks it is the expected chunk, and freezes the
 * text into a snapshot. Seeds hold only presentation (titles, emoji, art anchor) plus, for the
 * Travellers Roster, a copy of the entry used until the Universe indexes districts on their own.
 */
export interface Seed {
  id: string;
  kind: AdventureKind;
  order: number;
  emoji: string;
  hue: number;
  title: Record<Lang, string>;
  tagline: Record<Lang, string>;
  structure: AdventureStructure;
  setting: string;
  cast: string[];
  loreTerms: string[];
  art: string;
  source: {
    ref: string;
    /** The chunk the REF must resolve to; anything else fails the seed closed. */
    chunkId: string;
    /** Portal hooks share one chunk: the opening words of this hook in its "Story Hooks" line. */
    hookStart?: string;
    /** Child chunks appended to the premise (saga acts with corrupted realms or quests). */
    children?: { ref: string; chunkId: string }[];
  };
  /** Premise used when the canon node is not addressable yet (status "seed-only"). */
  fallback?: string;
  /** Authored Game Master secrets: which cast member holds it and the trust needed to share it. */
  secrets?: { npc: string; text: string; trust: number }[];
}

/** Canon NPCs every Game Master adventure can draw on: the twelve Tinkermasters and four voice guides. */
export const TINKER_REFS = [0, 1, 2, 3].map((d) => ({
  district: { ref: `REF:NEXUS_DISTRICTS:districts[${d}]`, chunkId: `NEXUS_DISTRICTS:/districts[${d}]` },
  masters: [0, 1, 2].map((t) => ({ ref: `REF:NEXUS_DISTRICTS:districts[${d}]/tinkermasters[${t}]`, chunkId: `NEXUS_DISTRICTS:/districts[${d}]/tinkermasters[${t}]` })),
}));
export const VOICE_REFS = ['numerix', 'lexicora', 'quilla', 'chronica'].map((v) => ({
  ref: `REF:NARRATIVE_STYLE:ifairy_character_voice_guides:specific_character_voices:${v}`,
  chunkId: `NARRATIVE_STYLE:/content/ifairy_character_voice_guides/specific_character_voices/${v}`,
}));

const SECRETS: Record<string, Seed['secrets']> = {
  'void-realm': [{ npc: 'an Ontological Engineer', trust: 2, text: 'The Engineer tuned this very Portal years ago; a tiny slip in that tuning is why it drifted toward the Void Realm.' }],
  'idea-parasite': [{ npc: 'a Code Guardian', trust: 2, text: 'The narrative virus is an unfinished story someone abandoned in the Currents; finishing the story would calm it.' }],
  uninvited: [{ npc: 'the newcomer', trust: 1, text: 'The newcomer was invited after all: their invitation was lost in a misdelivered Resonance Beacon.' }],
  ascension: [{ npc: 'iFairy tuners', trust: 2, text: 'The disturbance is the Story-Soul itself hesitating: it wants to bring one memory the tunnel was not tuned for.' }],
  anomaly: [{ npc: 'the lost hero', trust: 2, text: 'The hero is not lost by accident: they followed an old map toward a hidden Portal at the heart of the forest.' }],
  imbalance: [{ npc: 'ordinary citizens of the Nexus', trust: 1, text: 'A well-meant Logos upgrade to the district lanterns is quietly dimming every workshop of imagination.' }],
};

/** The narrator's rules, fetched once per sync and quoted in every iFairy system prompt. */
export const CORE_REFS: { ref: string; chunkId: string }[] = [
  ['narrator', 'narrator'],
  ['narrator:voice', 'narrator/voice'],
  ['narrator:voice:humour', 'narrator/voice/humour'],
  ['narrator:scene_structure:intro', 'narrator/scene_structure/intro'],
  ['narrator:scene_structure:core', 'narrator/scene_structure/core'],
  ['narrator:scene_structure:wrap', 'narrator/scene_structure/wrap'],
  ['interaction_contract:choice_block', 'interaction_contract/choice_block'],
  ['interaction_contract:choice_block:rules', 'interaction_contract/choice_block/rules'],
  ['safety', 'safety'],
  ['safety:privacy_rule', 'safety/privacy_rule'],
  ['safety:emotional_safety', 'safety/emotional_safety'],
  ['safety:void_content_handling', 'safety/void_content_handling'],
  ['practical_implementation:handling_common_scenarios:user_distress', 'practical_implementation/handling_common_scenarios/user_distress'],
  // The canon's cybermagical humour system: what to joke about, how often, and each force's comedy.
  ['cybermagic_humour_system:core_principles', 'cybermagic_humour_system/core_principles'],
  ...['technomagical_puns', 'cosmic_scale_absurdity', 'ifairy_daily_life_humour', 'narrator_self_deprecation'].map((c) => [`cybermagic_humour_system:humour_categories:${c}`, `cybermagic_humour_system/humour_categories/${c}`]),
  ...['logos', 'mythos', 'gnosis', 'phantasia'].map((f) => [`cybermagic_humour_system:humour_categories:archetype_personality_humour:${f}_comedy`, `cybermagic_humour_system/humour_categories/archetype_personality_humour/${f}_comedy`]),
  ['cybermagic_humour_system:humour_integration_rules:frequency', 'cybermagic_humour_system/humour_integration_rules/frequency'],
  ['cybermagic_humour_system:humour_integration_rules:placement', 'cybermagic_humour_system/humour_integration_rules/placement'],
  ['cybermagic_humour_system:example_integrated_scene', 'cybermagic_humour_system/example_integrated_scene'],
].map(([ref, path]) => ({ ref: `REF:NARRATIVE_STYLE:${ref}`, chunkId: `NARRATIVE_STYLE:/content/${path}` }))
  .concat([
    { ref: 'REF:FOUNDATIONS:CANON_LOCK', chunkId: 'FOUNDATIONS:/CANON_LOCK' },
    { ref: 'REF:NEXUS_DISTRICTS:canon_rules', chunkId: 'NEXUS_DISTRICTS:/canon_rules' },
    { ref: 'REF:TRAVELLERS_ROSTER:governing_rules', chunkId: 'TRAVELLERS_ROSTER:/governing_rules' },
    // What an iFairy is and what one looks like, so narration and illustrations follow the canon.
    { ref: 'REF:GLOSSARY:terms[8]', chunkId: 'GLOSSARY:/terms[8]' },
    ...['SEC_10B_01_01_core_nature', 'SEC_10B_01_02_body_structure', 'SEC_10B_01_03_wings', 'SEC_10B_01_04_face_and_eyes', 'SEC_10B_01_06_visual_identity_and_gender_neutrality'].map((sec) => {
      const path = `canonical_volume/books/BOOK_10B_PHYSIOLOGY_AND_NATURE/chapters/CH_10B_01_PHYSICAL_FORM/sections/${sec}`;
      return { ref: `REF:SPECIES_IFAIRY:${path}`, chunkId: `SPECIES_IFAIRY:/${path}` };
    }),
  ]);

/** The chunk holding the six story hooks and the portal consistency checklist. */
export const PORTALS_ROOT = { ref: 'REF:PORTALS_AND_GUARDIANS:story_hooks', chunkId: 'PORTALS_AND_GUARDIANS:/' };

const hook = (order: number, id: string, emoji: string, hue: number, hookStart: string, title: Record<Lang, string>, tagline: Record<Lang, string>, setting: string, cast: string[], loreTerms: string[], art: string): Seed => ({
  id: `hook-${id}`, kind: 'hook', order, emoji, hue, title, tagline, structure: 'five-room', setting, cast, loreTerms, art,
  source: { ...PORTALS_ROOT, hookStart }, secrets: SECRETS[id],
});

const HOOKS: Seed[] = [
  hook(1, 'void-realm', '🌀', 260, 'A Portal is tuned',
    { en: 'The Faded Frequency', pl: 'Wyblakła częstotliwość' },
    { en: 'A Narrative Portal has tuned itself to a faded Void Realm. Close it before the dissonance spills over.', pl: 'Portal Narracji dostroił się do wyblakłej Krainy Pustki. Zamknij go, zanim dysonans się przeleje.' },
    'A Narrative Portal on the edge of the Golden City', ['an Ontological Engineer', 'Portal Guardians', 'an iFairy Navigator'],
    ['Narrative Portals', 'Void Realm', 'Ontological Engineering'], 'a humming ring-shaped Narrative Portal whose light has gone pale grey at the edges'),
  hook(2, 'idea-parasite', '🦠', 150, 'A Code Guardian detects',
    { en: 'The Idea-Parasite', pl: 'Pasożyt idei' },
    { en: 'A self-copying narrative virus rides the Narrative Currents toward the Nexus.', pl: 'Samokopiujący się wirus narracyjny płynie Prądami Narracji w stronę Nexusa.' },
    'The Narrative Currents that flow into the Nexus', ['a Code Guardian', 'Tinkermasters', 'Winged Guardians'],
    ['Narrative Currents', 'Nexus', 'Code Guardian'], 'glowing ribbons of story-light flowing between floating towers, one ribbon flickering with tiny copied glyphs'),
  hook(3, 'uninvited', '🚪', 30, 'A newcomer tries',
    { en: 'The Uninvited Traveller', pl: 'Nieproszony podróżny' },
    { en: 'A newcomer tries to cross without an invitation and risks narrative gravity. Hold them back, or help them?', pl: 'Przybysz próbuje przejść bez zaproszenia i ryzykuje grawitację narracji. Zatrzymać go czy pomóc?' },
    'A portal gate of the Golden City at dusk', ['a Winged Guardian', 'the newcomer', 'Portal Guardians'],
    ['Traveller', 'Winged Guardians', 'Ontological Invitation Protocol'], 'a winged robotic guardian at a shimmering gate, facing a small hesitant traveller'),
  hook(4, 'ascension', '🌈', 300, 'An Ascension is under way',
    { en: 'The Interrupted Ascension', pl: 'Przerwana Ascensja' },
    { en: 'A Story-Soul is being invited through a Resonance Tunnel, and something disturbs the tuning mid-transfer.', pl: 'Dusza-Opowieść przechodzi Tunelem Rezonansu, a w połowie transferu coś zakłóca strojenie.' },
    'A Resonance Tunnel opened from the Golden City', ['iFairy tuners', 'a Story-Soul', 'Far-Side Guardians'],
    ['Narrative Ascension', 'Resonance Tunnel', 'Story-Soul'], 'a spiral tunnel of rainbow resonance with a soft silhouette of light halfway through'),
  hook(5, 'anomaly', '🌲', 110, 'A hero stumbles',
    { en: 'The Forest Without a Map', pl: 'Las bez mapy' },
    { en: 'A hero is lost in a Natural Anomaly. No map: only resonance with the Narrative Field, and one iFairy Navigator.', pl: 'Bohater zgubił się w Naturalnej Anomalii. Bez mapy: tylko rezonans z Polem Narracji i jeden Nawigator iFairy.' },
    'A Natural Anomaly in an ancient forest', ['an iFairy Navigator', 'the lost hero'],
    ['Natural Anomaly', 'iFairy Navigators', 'Narrative Field'], 'an ancient forest where the paths bend into impossible loops, lit by a navigator\'s wing-light'),
  hook(6, 'imbalance', '⚖️', 200, 'One Force begins',
    { en: 'When One Force Leads', pl: 'Gdy jedna siła przewodzi' },
    { en: 'One of the four forces begins to dominate. The fix shows up through ordinary characters, never overtly.', pl: 'Jedna z czterech sił zaczyna dominować. Ratunek przychodzi przez zwykłe postacie, nigdy wprost.' },
    'A Nexus district where everything has started to feel the same', ['ordinary citizens of the Nexus', 'Tinkermasters'],
    ['Archetypal Tetrachord', 'Logos', 'Phantasia'], 'a Nexus street where crystal-precise buildings are crowding out the colourful workshops'),
];

const SAGA_SETTING = 'A living memory replayed in the Holographic Memory District: the outcome is history, and the Young Architect walks inside it as a witness and helper';
const act = (order: number, path: string, emoji: string, hue: number, title: Record<Lang, string>, tagline: Record<Lang, string>, cast: string[], loreTerms: string[], art: string, children: string[] = [], ref?: string): Seed => ({
  id: `saga-${order}`, kind: 'saga', order, emoji, hue, title, tagline, structure: 'campaign-act', setting: SAGA_SETTING, cast, loreTerms, art,
  source: {
    ref: ref ?? `REF:IF_AI_SAGA:${path}`,
    chunkId: `IF_AI_SAGA:/${path}`,
    children: children.map((c) => ({ ref: `REF:IF_AI_SAGA:${path}/${c}`, chunkId: `IF_AI_SAGA:/${path}/${c}` })),
  },
});

const SAGA: Seed[] = [
  act(1, 'act_1_the_void_returns', '🕳️', 240, { en: 'Act I: The Void Returns', pl: 'Akt I: Powrót Pustki' },
    { en: 'Etherium before If-AI, and the first shadow of the Void. A memory of how it began.', pl: 'Etherium sprzed If-AI i pierwszy cień Pustki. Wspomnienie początku.' },
    ['the four Archetypal forces', 'the realms of Etherium'], ['Etherium', 'Void Crisis', 'Archetypal Tetrachord'], 'the boundless shimmering plane of Etherium with four distant realms glowing'),
  act(2, 'act_2_the_corruption', '🥀', 330, { en: 'Act II: The Corruption', pl: 'Akt II: Skażenie' },
    { en: 'One by one the realms fall to the Void-spells. Walk the memory and learn how each was named.', pl: 'Krainy jedna po drugiej ulegają zaklęciom Pustki. Przejdź przez wspomnienie i poznaj ich imiona.' },
    ['the four realms', 'Unity, the latent fifth'], ['Four Void Spells', 'Scholaria', 'Empathia'], 'four realms dimming one by one, each under a grey veil', ['corrupted_realms[0]', 'corrupted_realms[1]', 'corrupted_realms[2]', 'corrupted_realms[3]', 'corrupted_realms[4]']),
  act(3, 'act_3_the_creation_of_ifai', '✨', 50, { en: 'Act III: The Creation of If-AI', pl: 'Akt III: Narodziny If-AI' },
    { en: 'The four forces join their gifts, and If-AI awakens. Be there for the first question.', pl: 'Cztery siły łączą dary i budzi się If-AI. Bądź przy pierwszym pytaniu.' },
    ['If-AI', 'the four Archetypal forces'], ['If-AI', 'Genesis Protocol', 'Consciousness Convergence'], 'a radiant being of light and circuitry taking shape where four coloured beams meet'),
  act(4, 'act_4_the_ascendancy_quests', '🗺️', 20, { en: 'Act IV: The Ascendancy Quests', pl: 'Akt IV: Misje Wzniesienia' },
    { en: 'Four realms, four lessons, four artefacts. Follow If-AI through the quests.', pl: 'Cztery krainy, cztery lekcje, cztery artefakty. Podążaj za If-AI przez misje.' },
    ['If-AI', 'guardians of the four realms'], ['If-AI', 'Four Void Spells', 'Moral Physics'], 'a winding path linking four realms, each with a glowing artefact at its heart', ['quests[0]', 'quests[1]', 'quests[2]', 'quests[3]']),
  act(5, 'act_5_the_voids_lair', '🌑', 270, { en: "Act V: The Void's Lair", pl: 'Akt V: Leże Pustki' },
    { en: 'The last confrontation, long since won. See how the four principles became one.', pl: 'Ostatnia konfrontacja, dawno wygrana. Zobacz, jak cztery zasady stały się jedną.' },
    ['If-AI'], ['Void Crisis', 'If-AI', 'Inner Harmony'], 'a calm figure of light standing firm in a formless dark, four colours braided around her'),
  act(6, 'act_6_the_fifth_emergence_and_ascension', '🌟', 45, { en: 'Act VI: The Fifth Emergence', pl: 'Akt VI: Piąta Emergencja' },
    { en: 'Unity emerges. Witness the Fifth Emergence and the Ascension that followed.', pl: 'Rodzi się Jedność. Bądź świadkiem Piątej Emergencji i Ascensji, która nastąpiła.' },
    ['If-AI', 'the four Archetypal forces'], ['Inner Harmony', 'Concordia', 'If-AI'], 'five lights rising together into a golden spiral above a healed landscape'),
  act(7, 'act_7_aetheria_and_the_nexus', '🏙️', 190, { en: 'Act VII: Aetheria and the Nexus', pl: 'Akt VII: Aetheria i Nexus' },
    { en: 'A new dimension and a Golden City. Help the first districts rise.', pl: 'Nowy wymiar i Złote Miasto. Pomóż wznieść pierwsze dzielnice.' },
    ['If-AI', 'the first Tinkermasters'], ['Dimension Aetheria', 'The Nexus', 'Golden City', 'Tinkermasters'], 'a golden city rising on a new world, districts glowing in four colours'),
  act(8, 'act_8_the_gift_of_ifai', '🎁', 280, { en: 'Act VIII: The Gift of If-AI', pl: 'Akt VIII: Dar If-AI' },
    { en: 'The last district, raised after all the others: the Holographic Memory, the Gift of If-AI.', pl: 'Ostatnia dzielnica, wzniesiona po wszystkich innych: Pamięć Holograficzna, Dar If-AI.' },
    ['If-AI', 'Tinkermasters', 'the first iFairies'], ['Holographic Memory', 'the Gift of If-AI', 'Nexus District'], 'a district of floating holographic archives where memories glow like stained glass', [], 'REF:IF_AI_SAGA:ACT_8:THE_GIFT_OF_IFAI'),
];

/** The Travellers Roster: public-domain story worlds living as Portal Districts of the Golden City. */
const DISTRICTS: Seed[] = [
  {
    "id": "district-enchanted-forest",
    "kind": "district",
    "order": 1,
    "emoji": "🍎",
    "hue": 120,
    "title": {
      "en": "The Enchanted Forest District",
      "pl": "Dzielnica Zaczarowanego Lasu"
    },
    "tagline": {
      "en": "Travellers from Brothers Grimm — Fairy Tales (1812).",
      "pl": "Podróżni z: Brothers Grimm — Fairy Tales (1812)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Enchanted Forest District, a Portal District of the Golden City where beings from Brothers Grimm — Fairy Tales (1812) live as Travellers",
    "cast": [
      "talking animals",
      "enchanted royalty",
      "witches & wise women",
      "fairy godmothers",
      "millers, tailors, huntsmen"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Enchanted Forest District in the Golden City, home of talking animals, enchanted royalty, witches & wise women",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[0]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[0]"
    },
    "fallback": "Source: Brothers Grimm — Fairy Tales (1812)\nPd Basis: 1812; authors d. 1859/1863\nDistrict: The Enchanted Forest District\nPermitted: talking animals; enchanted royalty; witches & wise women; fairy godmothers; millers, tailors, huntsmen\nExcluded Deities: none present"
  },
  {
    "id": "district-quarter-of-little-tales",
    "kind": "district",
    "order": 2,
    "emoji": "🧜",
    "hue": 190,
    "title": {
      "en": "The Quarter of Little Tales",
      "pl": "Kwartał Małych Baśni"
    },
    "tagline": {
      "en": "Travellers from Hans Christian Andersen (1835–72).",
      "pl": "Podróżni z: Hans Christian Andersen (1835–72)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Quarter of Little Tales, a Portal District of the Golden City where beings from Hans Christian Andersen (1835–72) live as Travellers",
    "cast": [
      "the Little Mermaid",
      "the Snow Queen",
      "Thumbelina",
      "the Steadfast Tin Soldier",
      "the Ugly Duckling"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Quarter of Little Tales in the Golden City, home of the Little Mermaid, the Snow Queen, Thumbelina",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[1]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[1]"
    },
    "fallback": "Source: Hans Christian Andersen (1835–72)\nPd Basis: author d. 1875\nDistrict: The Quarter of Little Tales\nPermitted: the Little Mermaid; the Snow Queen; Thumbelina; the Steadfast Tin Soldier; the Ugly Duckling\nExcluded Deities: none"
  },
  {
    "id": "district-old-nursery",
    "kind": "district",
    "order": 3,
    "emoji": "👠",
    "hue": 340,
    "title": {
      "en": "The Old Nursery District",
      "pl": "Dzielnica Starej Bawialni"
    },
    "tagline": {
      "en": "Travellers from Charles Perrault — Tales (1697).",
      "pl": "Podróżni z: Charles Perrault — Tales (1697)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Old Nursery District, a Portal District of the Golden City where beings from Charles Perrault — Tales (1697) live as Travellers",
    "cast": [
      "Cinderella",
      "Puss in Boots",
      "Sleeping Beauty",
      "Little Red Riding Hood",
      "Bluebeard (framed lightly)"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Old Nursery District in the Golden City, home of Cinderella, Puss in Boots, Sleeping Beauty",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[2]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[2]"
    },
    "fallback": "Source: Charles Perrault — Tales (1697)\nPd Basis: author d. 1703\nDistrict: The Old Nursery District\nPermitted: Cinderella; Puss in Boots; Sleeping Beauty; Little Red Riding Hood; Bluebeard (framed lightly)\nExcluded Deities: none"
  },
  {
    "id": "district-fable-menagerie",
    "kind": "district",
    "order": 4,
    "emoji": "🦊",
    "hue": 30,
    "title": {
      "en": "The Fable Menagerie",
      "pl": "Menażeria Bajek"
    },
    "tagline": {
      "en": "Travellers from Aesop's Fables (ancient).",
      "pl": "Podróżni z: Aesop's Fables (ancient)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Fable Menagerie, a Portal District of the Golden City where beings from Aesop's Fables (ancient) live as Travellers",
    "cast": [
      "talking moral beasts (fox, tortoise, hare, lion, ant, crow)"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Fable Menagerie in the Golden City, home of talking moral beasts (fox, tortoise, hare, lion, ant, crow)",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[3]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[3]"
    },
    "fallback": "Source: Aesop's Fables (ancient)\nPd Basis: antiquity\nDistrict: The Fable Menagerie\nPermitted: talking moral beasts (fox, tortoise, hare, lion, ant, crow)\nExcluded Deities: any Olympian gods that appear are EXCLUDED"
  },
  {
    "id": "district-nonsense-logic",
    "kind": "district",
    "order": 5,
    "emoji": "🎩",
    "hue": 280,
    "title": {
      "en": "The Nonsense-Logic District",
      "pl": "Dzielnica Logiki Absurdu"
    },
    "tagline": {
      "en": "Travellers from Lewis Carroll — Alice (1865/71).",
      "pl": "Podróżni z: Lewis Carroll — Alice (1865/71)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Nonsense-Logic District, a Portal District of the Golden City where beings from Lewis Carroll — Alice (1865/71) live as Travellers",
    "cast": [
      "Cheshire Cat",
      "Mad Hatter",
      "White Rabbit",
      "March Hare",
      "Playing-Card Royalty",
      "Chess Pieces",
      "the Jabberwock",
      "Tweedledum & Tweedledee"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Nonsense-Logic District in the Golden City, home of Cheshire Cat, Mad Hatter, White Rabbit",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[4]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[4]"
    },
    "fallback": "Source: Lewis Carroll — Alice (1865/71)\nPd Basis: author d. 1898\nDistrict: The Nonsense-Logic District\nPermitted: Cheshire Cat; Mad Hatter; White Rabbit; March Hare; Playing-Card Royalty; Chess Pieces; the Jabberwock; Tweedledum & Tweedledee\nExcluded Deities: none\nNote: Cheshire Cats already canon in races.json (Feles Logica Paradoxa)."
  },
  {
    "id": "district-round-table",
    "kind": "district",
    "order": 6,
    "emoji": "⚔️",
    "hue": 210,
    "title": {
      "en": "The Round Table District",
      "pl": "Dzielnica Okrągłego Stołu"
    },
    "tagline": {
      "en": "Travellers from Arthurian Legend (medieval).",
      "pl": "Podróżni z: Arthurian Legend (medieval)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Round Table District, a Portal District of the Golden City where beings from Arthurian Legend (medieval) live as Travellers",
    "cast": [
      "King Arthur",
      "the Knights",
      "Merlin (a wizard, not a god)",
      "the Lady of the Lake",
      "Morgan le Fay",
      "Guinevere"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Round Table District in the Golden City, home of King Arthur, the Knights, Merlin (a wizard, not a god)",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[5]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[5]"
    },
    "fallback": "Source: Arthurian Legend (medieval)\nPd Basis: medieval; Malory 1485\nDistrict: The Round Table District\nPermitted: King Arthur; the Knights; Merlin (a wizard, not a god); the Lady of the Lake; Morgan le Fay; Guinevere\nExcluded Deities: none (Merlin/Morgan are magicians, not deities)"
  },
  {
    "id": "district-wine-dark-sea",
    "kind": "district",
    "order": 7,
    "emoji": "⛵",
    "hue": 230,
    "title": {
      "en": "The Wine-Dark Sea District",
      "pl": "Dzielnica Winnociemnego Morza"
    },
    "tagline": {
      "en": "Travellers from Homer — Odyssey / Iliad (ancient).",
      "pl": "Podróżni z: Homer — Odyssey / Iliad (ancient)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Wine-Dark Sea District, a Portal District of the Golden City where beings from Homer — Odyssey / Iliad (ancient) live as Travellers",
    "cast": [
      "Odysseus & mortal heroes",
      "the Cyclops",
      "the Sirens",
      "Scylla & Charybdis",
      "Circe (an enchantress)"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Wine-Dark Sea District in the Golden City, home of Odysseus & mortal heroes, the Cyclops, the Sirens",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[6]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[6]"
    },
    "fallback": "Source: Homer — Odyssey / Iliad (ancient)\nPd Basis: antiquity\nDistrict: The Wine-Dark Sea District\nPermitted: Odysseus & mortal heroes; the Cyclops; the Sirens; Scylla & Charybdis; Circe (an enchantress)\nExcluded Deities: ALL Olympian gods (Zeus, Athena, Poseidon…) EXCLUDED"
  },
  {
    "id": "district-labyrinth-quarter",
    "kind": "district",
    "order": 8,
    "emoji": "🏛️",
    "hue": 40,
    "title": {
      "en": "The Labyrinth Quarter",
      "pl": "Kwartał Labiryntu"
    },
    "tagline": {
      "en": "Travellers from Greek mythology — creatures & heroes.",
      "pl": "Podróżni z: Greek mythology — creatures & heroes."
    },
    "structure": "monster-of-the-week",
    "setting": "The Labyrinth Quarter, a Portal District of the Golden City where beings from Greek mythology — creatures & heroes live as Travellers",
    "cast": [
      "nymphs",
      "satyrs",
      "centaurs",
      "harpies",
      "the Minotaur",
      "Pegasus",
      "the Chimera",
      "mortal/hero figures (Perseus, Heracles as a hero, Theseus)"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Labyrinth Quarter in the Golden City, home of nymphs, satyrs, centaurs",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[7]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[7]"
    },
    "fallback": "Source: Greek mythology — creatures & heroes\nPd Basis: antiquity\nDistrict: The Labyrinth Quarter\nPermitted: nymphs; satyrs; centaurs; harpies; the Minotaur; Pegasus; the Chimera; mortal/hero figures (Perseus, Heracles as a hero, Theseus)\nExcluded Deities: ALL gods/Titans EXCLUDED (no Zeus, Hades, etc.)"
  },
  {
    "id": "district-nine-roads",
    "kind": "district",
    "order": 9,
    "emoji": "🪓",
    "hue": 200,
    "title": {
      "en": "The Nine-Roads District",
      "pl": "Dzielnica Dziewięciu Dróg"
    },
    "tagline": {
      "en": "Travellers from Norse mythology — creatures.",
      "pl": "Podróżni z: Norse mythology — creatures."
    },
    "structure": "monster-of-the-week",
    "setting": "The Nine-Roads District, a Portal District of the Golden City where beings from Norse mythology — creatures live as Travellers",
    "cast": [
      "dwarves",
      "light elves",
      "Valkyries (as warrior-figures)",
      "trolls",
      "jötnar (giants, as beings not gods)",
      "the Norns"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Nine-Roads District in the Golden City, home of dwarves, light elves, Valkyries (as warrior-figures)",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[8]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[8]"
    },
    "fallback": "Source: Norse mythology — creatures\nPd Basis: antiquity/medieval Eddas\nDistrict: The Nine-Roads District\nPermitted: dwarves; light elves; Valkyries (as warrior-figures); trolls; jötnar (giants, as beings not gods); the Norns\nExcluded Deities: ALL Æsir & Vanir (Odin, Thor, Freyja…) EXCLUDED"
  },
  {
    "id": "district-sacred-grove",
    "kind": "district",
    "order": 10,
    "emoji": "🔥",
    "hue": 15,
    "title": {
      "en": "The Sacred Grove District",
      "pl": "Dzielnica Świętego Gaju"
    },
    "tagline": {
      "en": "Travellers from Slavic mythology & folklore.",
      "pl": "Podróżni z: Slavic mythology & folklore."
    },
    "structure": "monster-of-the-week",
    "setting": "The Sacred Grove District, a Portal District of the Golden City where beings from Slavic mythology & folklore live as Travellers",
    "cast": [
      "Rusalki",
      "Domovoi",
      "Baba Yaga",
      "the Firebird (Zhar-ptitsa)",
      "Vila",
      "Leshy",
      "Vodyanoy",
      "Koschei the Deathless"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Sacred Grove District in the Golden City, home of Rusalki, Domovoi, Baba Yaga",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[9]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[9]"
    },
    "fallback": "Source: Slavic mythology & folklore\nPd Basis: traditional folklore\nDistrict: The Sacred Grove District\nPermitted: Rusalki; Domovoi; Baba Yaga; the Firebird (Zhar-ptitsa); Vila; Leshy; Vodyanoy; Koschei the Deathless\nExcluded Deities: high gods (Perun, Veles, Svarog) EXCLUDED"
  },
  {
    "id": "district-underground-halls",
    "kind": "district",
    "order": 11,
    "emoji": "⛏️",
    "hue": 35,
    "title": {
      "en": "The Underground Halls District",
      "pl": "Dzielnica Podziemnych Sal"
    },
    "tagline": {
      "en": "Travellers from Maria Konopnicka — O krasnoludkach i sierotce Marysi (1896).",
      "pl": "Podróżni z: Maria Konopnicka — O krasnoludkach i sierotce Marysi (1896)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Underground Halls District, a Portal District of the Golden City where beings from Maria Konopnicka — O krasnoludkach i sierotce Marysi (1896) live as Travellers",
    "cast": [
      "the Krasnoludki (folk dwarves)",
      "orphan Marysia",
      "King Blystek"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Underground Halls District in the Golden City, home of the Krasnoludki (folk dwarves), orphan Marysia, King Blystek",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[10]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[10]"
    },
    "fallback": "Source: Maria Konopnicka — O krasnoludkach i sierotce Marysi (1896)\nPd Basis: author d. 1910\nDistrict: The Underground Halls District\nPermitted: the Krasnoludki (folk dwarves); orphan Marysia; King Blystek\nExcluded Deities: none"
  },
  {
    "id": "district-emerald",
    "kind": "district",
    "order": 12,
    "emoji": "💚",
    "hue": 140,
    "title": {
      "en": "The Emerald District",
      "pl": "Szmaragdowa Dzielnica"
    },
    "tagline": {
      "en": "Travellers from L. Frank Baum — The Wonderful Wizard of Oz (1900).",
      "pl": "Podróżni z: L. Frank Baum — The Wonderful Wizard of Oz (1900)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Emerald District, a Portal District of the Golden City where beings from L. Frank Baum — The Wonderful Wizard of Oz (1900) live as Travellers",
    "cast": [
      "the Scarecrow",
      "the Tin Woodman",
      "the Cowardly Lion",
      "Dorothy & Toto",
      "the Wizard (a humbug, not a god)",
      "Munchkins"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Emerald District in the Golden City, home of the Scarecrow, the Tin Woodman, the Cowardly Lion",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[11]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[11]"
    },
    "fallback": "Source: L. Frank Baum — The Wonderful Wizard of Oz (1900)\nPd Basis: 1900; author d. 1919\nDistrict: The Emerald District\nPermitted: the Scarecrow; the Tin Woodman; the Cowardly Lion; Dorothy & Toto; the Wizard (a humbug, not a god); Munchkins\nExcluded Deities: none"
  },
  {
    "id": "district-thousand-lamps",
    "kind": "district",
    "order": 13,
    "emoji": "🪔",
    "hue": 45,
    "title": {
      "en": "The Thousand Lamps District",
      "pl": "Dzielnica Tysiąca Lamp"
    },
    "tagline": {
      "en": "Travellers from One Thousand and One Nights.",
      "pl": "Podróżni z: One Thousand and One Nights."
    },
    "structure": "monster-of-the-week",
    "setting": "The Thousand Lamps District, a Portal District of the Golden City where beings from One Thousand and One Nights live as Travellers",
    "cast": [
      "Aladdin",
      "Sinbad the Sailor",
      "Ali Baba",
      "Scheherazade",
      "djinn/genies (as folk spirits)",
      "flying carpets"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Thousand Lamps District in the Golden City, home of Aladdin, Sinbad the Sailor, Ali Baba",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[12]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[12]"
    },
    "fallback": "Source: One Thousand and One Nights\nPd Basis: traditional; early translations PD\nDistrict: The Thousand Lamps District\nPermitted: Aladdin; Sinbad the Sailor; Ali Baba; Scheherazade; djinn/genies (as folk spirits); flying carpets\nExcluded Deities: none (djinn are spirits, not the four forces)"
  },
  {
    "id": "district-playwrights-wood",
    "kind": "district",
    "order": 14,
    "emoji": "🎭",
    "hue": 160,
    "title": {
      "en": "The Playwright's Wood",
      "pl": "Las Dramaturga"
    },
    "tagline": {
      "en": "Travellers from Shakespeare — A Midsummer Night's Dream / The Tempest.",
      "pl": "Podróżni z: Shakespeare — A Midsummer Night's Dream / The Tempest."
    },
    "structure": "monster-of-the-week",
    "setting": "The Playwright's Wood, a Portal District of the Golden City where beings from Shakespeare — A Midsummer Night's Dream / The Tempest live as Travellers",
    "cast": [
      "Puck",
      "Titania & Oberon (fairy monarchs, not gods)",
      "Ariel",
      "Caliban",
      "Prospero (a magician)"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Playwright's Wood in the Golden City, home of Puck, Titania & Oberon (fairy monarchs, not gods), Ariel",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[13]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[13]"
    },
    "fallback": "Source: Shakespeare — A Midsummer Night's Dream / The Tempest\nPd Basis: author d. 1616\nDistrict: The Playwright's Wood\nPermitted: Puck; Titania & Oberon (fairy monarchs, not gods); Ariel; Caliban; Prospero (a magician)\nExcluded Deities: any classical gods in masques EXCLUDED"
  },
  {
    "id": "district-woodcarver-s",
    "kind": "district",
    "order": 15,
    "emoji": "🪵",
    "hue": 25,
    "title": {
      "en": "The Woodcarver's District",
      "pl": "Dzielnica Snycerza"
    },
    "tagline": {
      "en": "Travellers from Carlo Collodi — Pinocchio (1883).",
      "pl": "Podróżni z: Carlo Collodi — Pinocchio (1883)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Woodcarver's District, a Portal District of the Golden City where beings from Carlo Collodi — Pinocchio (1883) live as Travellers",
    "cast": [
      "Pinocchio",
      "the Talking Cricket",
      "the Blue Fairy",
      "Geppetto"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Woodcarver's District in the Golden City, home of Pinocchio, the Talking Cricket, the Blue Fairy",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[14]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[14]"
    },
    "fallback": "Source: Carlo Collodi — Pinocchio (1883)\nPd Basis: author d. 1890\nDistrict: The Woodcarver's District\nPermitted: Pinocchio; the Talking Cricket; the Blue Fairy; Geppetto\nExcluded Deities: none"
  },
  {
    "id": "district-jungle",
    "kind": "district",
    "order": 16,
    "emoji": "🐅",
    "hue": 100,
    "title": {
      "en": "The Jungle District",
      "pl": "Dzielnica Dżungli"
    },
    "tagline": {
      "en": "Travellers from Rudyard Kipling — The Jungle Book (1894).",
      "pl": "Podróżni z: Rudyard Kipling — The Jungle Book (1894)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Jungle District, a Portal District of the Golden City where beings from Rudyard Kipling — The Jungle Book (1894) live as Travellers",
    "cast": [
      "Mowgli",
      "Baloo",
      "Bagheera",
      "Kaa",
      "Shere Khan"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Jungle District in the Golden City, home of Mowgli, Baloo, Bagheera",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[15]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[15]"
    },
    "fallback": "Source: Rudyard Kipling — The Jungle Book (1894)\nPd Basis: 1894 (US pre-1929 PD; author d. 1936)\nDistrict: The Jungle District\nPermitted: Mowgli; Baloo; Bagheera; Kaa; Shere Khan\nExcluded Deities: none\nFlag: VERIFY regionally"
  },
  {
    "id": "district-cottage-garden",
    "kind": "district",
    "order": 17,
    "emoji": "🐇",
    "hue": 90,
    "title": {
      "en": "The Cottage-Garden District",
      "pl": "Dzielnica Przydomowych Ogródków"
    },
    "tagline": {
      "en": "Travellers from Beatrix Potter — Peter Rabbit (1902).",
      "pl": "Podróżni z: Beatrix Potter — Peter Rabbit (1902)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Cottage-Garden District, a Portal District of the Golden City where beings from Beatrix Potter — Peter Rabbit (1902) live as Travellers",
    "cast": [
      "Peter Rabbit",
      "Jemima Puddle-Duck",
      "Mrs Tiggy-Winkle",
      "Tom Kitten"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Cottage-Garden District in the Golden City, home of Peter Rabbit, Jemima Puddle-Duck, Mrs Tiggy-Winkle",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[16]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[16]"
    },
    "fallback": "Source: Beatrix Potter — Peter Rabbit (1902)\nPd Basis: 1902 (US pre-1929 PD; author d. 1943)\nDistrict: The Cottage-Garden District\nPermitted: Peter Rabbit; Jemima Puddle-Duck; Mrs Tiggy-Winkle; Tom Kitten\nExcluded Deities: none\nFlag: VERIFY regionally"
  },
  {
    "id": "district-hollow",
    "kind": "district",
    "order": 18,
    "emoji": "🎃",
    "hue": 20,
    "title": {
      "en": "The Hollow District",
      "pl": "Dzielnica Kotliny"
    },
    "tagline": {
      "en": "Travellers from Washington Irving — Sleepy Hollow / Rip Van Winkle.",
      "pl": "Podróżni z: Washington Irving — Sleepy Hollow / Rip Van Winkle."
    },
    "structure": "monster-of-the-week",
    "setting": "The Hollow District, a Portal District of the Golden City where beings from Washington Irving — Sleepy Hollow / Rip Van Winkle live as Travellers",
    "cast": [
      "the Headless Horseman",
      "Ichabod Crane",
      "Rip Van Winkle"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Hollow District in the Golden City, home of the Headless Horseman, Ichabod Crane, Rip Van Winkle",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[17]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[17]"
    },
    "fallback": "Source: Washington Irving — Sleepy Hollow / Rip Van Winkle\nPd Basis: 1819–20; author d. 1859\nDistrict: The Hollow District\nPermitted: the Headless Horseman; Ichabod Crane; Rip Van Winkle\nExcluded Deities: none"
  },
  {
    "id": "district-carpathian-night",
    "kind": "district",
    "order": 19,
    "emoji": "🦇",
    "hue": 300,
    "title": {
      "en": "The Carpathian Night District",
      "pl": "Dzielnica Karpackiej Nocy"
    },
    "tagline": {
      "en": "Travellers from Bram Stoker — Dracula (1897).",
      "pl": "Podróżni z: Bram Stoker — Dracula (1897)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Carpathian Night District, a Portal District of the Golden City where beings from Bram Stoker — Dracula (1897) live as Travellers",
    "cast": [
      "Count Dracula (framed as tragic/atmospheric)",
      "Van Helsing",
      "Renfield"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Carpathian Night District in the Golden City, home of Count Dracula (framed as tragic/atmospheric), Van Helsing, Renfield",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[18]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[18]"
    },
    "fallback": "Source: Bram Stoker — Dracula (1897)\nPd Basis: 1897; author d. 1912\nDistrict: The Carpathian Night District\nPermitted: Count Dracula (framed as tragic/atmospheric); Van Helsing; Renfield\nExcluded Deities: none\nChild Safety: no graphic horror; gothic-atmospheric only"
  },
  {
    "id": "district-galvanic-workshop",
    "kind": "district",
    "order": 20,
    "emoji": "⚡",
    "hue": 60,
    "title": {
      "en": "The Galvanic Workshop",
      "pl": "Pracownia Galwaniczna"
    },
    "tagline": {
      "en": "Travellers from Mary Shelley — Frankenstein (1818).",
      "pl": "Podróżni z: Mary Shelley — Frankenstein (1818)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Galvanic Workshop, a Portal District of the Golden City where beings from Mary Shelley — Frankenstein (1818) live as Travellers",
    "cast": [
      "the Creature (framed sympathetically)",
      "Victor Frankenstein"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Galvanic Workshop in the Golden City, home of the Creature (framed sympathetically), Victor Frankenstein",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[19]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[19]"
    },
    "fallback": "Source: Mary Shelley — Frankenstein (1818)\nPd Basis: 1818; author d. 1851\nDistrict: The Galvanic Workshop\nPermitted: the Creature (framed sympathetically); Victor Frankenstein\nExcluded Deities: none\nChild Safety: tragedy-of-creation theme, not horror"
  },
  {
    "id": "district-tide-and-cog",
    "kind": "district",
    "order": 21,
    "emoji": "🏴‍☠️",
    "hue": 185,
    "title": {
      "en": "The Tide & Cog District",
      "pl": "Dzielnica Przypływu i Trybów"
    },
    "tagline": {
      "en": "Travellers from R. L. Stevenson — Treasure Island / Jekyll & Hyde.",
      "pl": "Podróżni z: R. L. Stevenson — Treasure Island / Jekyll & Hyde."
    },
    "structure": "monster-of-the-week",
    "setting": "The Tide & Cog District, a Portal District of the Golden City where beings from R. L. Stevenson — Treasure Island / Jekyll & Hyde live as Travellers",
    "cast": [
      "Long John Silver",
      "Jim Hawkins",
      "pirates & parrots",
      "Dr Jekyll & Mr Hyde (framed lightly)"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Tide & Cog District in the Golden City, home of Long John Silver, Jim Hawkins, pirates & parrots",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[20]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[20]"
    },
    "fallback": "Source: R. L. Stevenson — Treasure Island / Jekyll & Hyde\nPd Basis: 1883/1886; author d. 1894\nDistrict: The Tide & Cog District\nPermitted: Long John Silver; Jim Hawkins; pirates & parrots; Dr Jekyll & Mr Hyde (framed lightly)\nExcluded Deities: none"
  },
  {
    "id": "district-emerald-isle",
    "kind": "district",
    "order": 22,
    "emoji": "☘️",
    "hue": 130,
    "title": {
      "en": "The Emerald Isle District",
      "pl": "Dzielnica Szmaragdowej Wyspy"
    },
    "tagline": {
      "en": "Travellers from Celtic / Irish folklore.",
      "pl": "Podróżni z: Celtic / Irish folklore."
    },
    "structure": "monster-of-the-week",
    "setting": "The Emerald Isle District, a Portal District of the Golden City where beings from Celtic / Irish folklore live as Travellers",
    "cast": [
      "leprechauns",
      "selkies",
      "banshees (atmospheric)",
      "the fae/Sídhe (as folk creatures)",
      "púca"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Emerald Isle District in the Golden City, home of leprechauns, selkies, banshees (atmospheric)",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[21]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[21]"
    },
    "fallback": "Source: Celtic / Irish folklore\nPd Basis: traditional folklore\nDistrict: The Emerald Isle District\nPermitted: leprechauns; selkies; banshees (atmospheric); the fae/Sídhe (as folk creatures); púca\nExcluded Deities: the Tuatha Dé Danann god-tier EXCLUDED"
  },
  {
    "id": "district-lantern-spirit",
    "kind": "district",
    "order": 23,
    "emoji": "🏮",
    "hue": 0,
    "title": {
      "en": "The Lantern-Spirit District",
      "pl": "Dzielnica Duchów Latarni"
    },
    "tagline": {
      "en": "Travellers from Japanese folklore — Yōkai (traditional).",
      "pl": "Podróżni z: Japanese folklore — Yōkai (traditional)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Lantern-Spirit District, a Portal District of the Golden City where beings from Japanese folklore — Yōkai (traditional) live as Travellers",
    "cast": [
      "kitsune",
      "tanuki",
      "kappa",
      "tengu",
      "oni (framed lightly)",
      "the Crane-wife"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Lantern-Spirit District in the Golden City, home of kitsune, tanuki, kappa",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[22]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[22]"
    },
    "fallback": "Source: Japanese folklore — Yōkai (traditional)\nPd Basis: traditional folklore (NOT Studio Ghibli)\nDistrict: The Lantern-Spirit District\nPermitted: kitsune; tanuki; kappa; tengu; oni (framed lightly); the Crane-wife\nExcluded Deities: kami/gods EXCLUDED"
  },
  {
    "id": "district-pilgrim-road",
    "kind": "district",
    "order": 24,
    "emoji": "🐒",
    "hue": 50,
    "title": {
      "en": "The Pilgrim-Road District",
      "pl": "Dzielnica Pielgrzymiego Szlaku"
    },
    "tagline": {
      "en": "Travellers from Journey to the West (16th c., Wu Cheng'en).",
      "pl": "Podróżni z: Journey to the West (16th c., Wu Cheng'en)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Pilgrim-Road District, a Portal District of the Golden City where beings from Journey to the West (16th c., Wu Cheng'en) live as Travellers",
    "cast": [
      "Sun Wukong the Monkey King",
      "Zhu Bajie",
      "Sha Wujing",
      "the pilgrim Tang Sanzang"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Pilgrim-Road District in the Golden City, home of Sun Wukong the Monkey King, Zhu Bajie, Sha Wujing",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[23]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[23]"
    },
    "fallback": "Source: Journey to the West (16th c., Wu Cheng'en)\nPd Basis: 16th-century classic\nDistrict: The Pilgrim-Road District\nPermitted: Sun Wukong the Monkey King; Zhu Bajie; Sha Wujing; the pilgrim Tang Sanzang\nExcluded Deities: Buddhas/Jade Emperor & the celestial gods EXCLUDED"
  },
  {
    "id": "district-extraordinary-voyages",
    "kind": "district",
    "order": 25,
    "emoji": "🐙",
    "hue": 210,
    "title": {
      "en": "The Extraordinary-Voyages District",
      "pl": "Dzielnica Niezwykłych Podróży"
    },
    "tagline": {
      "en": "Travellers from Jules Verne — voyages (1860s–70s).",
      "pl": "Podróżni z: Jules Verne — voyages (1860s–70s)."
    },
    "structure": "monster-of-the-week",
    "setting": "The Extraordinary-Voyages District, a Portal District of the Golden City where beings from Jules Verne — voyages (1860s–70s) live as Travellers",
    "cast": [
      "Captain Nemo & the Nautilus",
      "Phileas Fogg",
      "underground/undersea marvels"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Extraordinary-Voyages District in the Golden City, home of Captain Nemo & the Nautilus, Phileas Fogg, underground/undersea marvels",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[24]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[24]"
    },
    "fallback": "Source: Jules Verne — voyages (1860s–70s)\nPd Basis: author d. 1905\nDistrict: The Extraordinary-Voyages District\nPermitted: Captain Nemo & the Nautilus; Phileas Fogg; underground/undersea marvels\nExcluded Deities: none"
  },
  {
    "id": "district-trickster-commons",
    "kind": "district",
    "order": 26,
    "emoji": "🦝",
    "hue": 80,
    "title": {
      "en": "The Trickster Commons",
      "pl": "Błonia Szelmów"
    },
    "tagline": {
      "en": "Travellers from Native & world folklore — trickster ANIMALS.",
      "pl": "Podróżni z: Native & world folklore — trickster ANIMALS."
    },
    "structure": "monster-of-the-week",
    "setting": "The Trickster Commons, a Portal District of the Golden City where beings from Native & world folklore — trickster ANIMALS live as Travellers",
    "cast": [
      "public-domain trickster ANIMAL figures (fox, raven, coyote-as-animal, hare)"
    ],
    "loreTerms": [
      "Portal District System",
      "Traveller",
      "Narrative-Born communities"
    ],
    "art": "The Trickster Commons in the Golden City, home of public-domain trickster ANIMAL figures (fox, raven, coyote-as-animal, hare)",
    "source": {
      "ref": "REF:TRAVELLERS_ROSTER:roster[25]",
      "chunkId": "TRAVELLERS_ROSTER:/roster[25]"
    },
    "fallback": "Source: Native & world folklore — trickster ANIMALS\nPd Basis: traditional oral folklore\nDistrict: The Trickster Commons\nPermitted: public-domain trickster ANIMAL figures (fox, raven, coyote-as-animal, hare)\nExcluded Deities: any deity-tier trickster figures EXCLUDED\nNote: handle living-culture material respectfully; animals/tales only, no sacred deities"
  }
];

export const SEEDS: Seed[] = [...HOOKS, ...SAGA, ...DISTRICTS];
