import type { AdventureKind, AdventureStructure } from '../../shared/universe';
import type { Lang } from '../../shared/types';

/**
 * The worlds of the iFairy Quantum Edu-Verse, authored from docs/QUANTUM_EDUVERSE.md. A world is
 * not a canon node: its law, experience and learning outcomes live here. Sync freezes each one into
 * a snapshot together with the canon it is told in (narration rules, safety, humour, what an iFairy
 * is and looks like, the portal checklist and the canon iFairies the Game Master may voice).
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
  /** Canon terms (from the lore whitelist) that seed the live lore lookups. */
  loreTerms: string[];
  art: string;
  /** The dominant law of nature in this world (Phase I: what the explorer meets and tests). */
  law: string;
  /** What happens there: the activity and experience. */
  experience: string;
  /** Where the law lands in our world's science (Phase II: what the explorer translates it into). */
  translation: string;
  /** The deeper learning outcomes the world is built for. */
  outcomes: string[];
  /** Authored Game Master secrets: which cast member holds it and the trust needed to share it. */
  secrets?: { npc: string; text: string; trust: number }[];
}

/** Canon NPCs every Game Master world can draw on: the twelve Tinkermasters and four voice guides. */
export const TINKER_REFS = [0, 1, 2, 3].map((d) => ({
  district: { ref: `REF:NEXUS_DISTRICTS:districts[${d}]`, chunkId: `NEXUS_DISTRICTS:/districts[${d}]` },
  masters: [0, 1, 2].map((t) => ({ ref: `REF:NEXUS_DISTRICTS:districts[${d}]/tinkermasters[${t}]`, chunkId: `NEXUS_DISTRICTS:/districts[${d}]/tinkermasters[${t}]` })),
}));
export const VOICE_REFS = ['numerix', 'lexicora', 'quilla', 'chronica'].map((v) => ({
  ref: `REF:NARRATIVE_STYLE:ifairy_character_voice_guides:specific_character_voices:${v}`,
  chunkId: `NARRATIVE_STYLE:/content/ifairy_character_voice_guides/specific_character_voices/${v}`,
}));

function physicalForm(sec: string) {
  const path = `canonical_volume/books/BOOK_10B_PHYSIOLOGY_AND_NATURE/chapters/CH_10B_01_PHYSICAL_FORM/sections/${sec}`;
  return { ref: `REF:SPECIES_IFAIRY:${path}`, chunkId: `SPECIES_IFAIRY:/${path}` };
}

/**
 * The canon the narrator follows, fetched once per sync and quoted in every system prompt. The
 * narrator's own persona (the Archivist) is left out on purpose: IGNIS tells the Edu-Verse.
 */
export const CORE_REFS: { ref: string; chunkId: string }[] = [
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
    // What an iFairy is and what one looks like (canon R6 visual lock), so narration follows the canon.
    { ref: 'REF:GLOSSARY:terms[8]', chunkId: 'GLOSSARY:/terms[8]' },
    ...[
      'SEC_10B_01_01_core_nature',
      'SEC_10B_01_02_body_structure/canonical_data/the_aperture',
      'SEC_10B_01_02_body_structure/canonical_data/three_material_rule',
      'SEC_10B_01_03_wings/canonical_data/structure',
      'SEC_10B_01_04_face_and_eyes/canonical_data/visor_specification',
      'SEC_10B_01_04_face_and_eyes/canonical_data/eye_specification',
      'SEC_10B_01_04_face_and_eyes/canonical_data/resonance_antennae',
      'SEC_10B_01_06_visual_identity_and_gender_neutrality',
    ].map(physicalForm),
  ]);

/** The exact text image prompts prepend when an iFairy is in the picture (canon R6 §6). */
export const IMAGE_LOCK_REF = physicalForm('SEC_10B_01_06_visual_identity_and_gender_neutrality/canonical_data/image_guard_rule');

/** The chunk holding the portal consistency checklist: every Edu-Verse world is reached through a portal. */
export const PORTALS_ROOT = { ref: 'REF:PORTALS_AND_GUARDIANS:story_hooks', chunkId: 'PORTALS_AND_GUARDIANS:/' };

/** A cast entry is "Name, who they are"; the name is what NPC ids, lore lookups and the Codex use. */
export const castName = (who: string) => who.split(/,\s+/)[0].trim();

type Body = Omit<Seed, 'id' | 'kind' | 'order' | 'structure'>;
const world = (order: number, id: string, b: Body): Seed => ({ id: `world-${id}`, kind: 'world', order, structure: 'three-phase', ...b });
const lab = (order: number, id: string, b: Body): Seed => ({ id: `lab-${id}`, kind: 'lab', order, structure: 'three-phase', ...b });

/** The Seven Worlds, walked in order as a path (Exemplary Quantum Edu-Magic Timelines). */
const WORLDS: Seed[] = [
  world(1, 'bleepworld', {
    emoji: '🌪️', hue: 285,
    title: { en: 'BleepWorld', pl: 'BlipŚwiat' },
    tagline: {
      en: 'Utter chaos: things blink in and out at random. Find the patterns and build little pockets of order.',
      pl: 'Totalny chaos: rzeczy migają i znikają losowo. Znajdź wzory i zbuduj małe kieszonki porządku.',
    },
    setting: 'BleepWorld, an Edu-Verse world where nothing has decided what it is yet',
    cast: ['Blip and Blop, twin Bleeplings who swap colours whenever they sneeze', 'the Sorting Wind, a gust that tidies only what it understands'],
    loreTerms: ['Logos', 'cybermagic', 'Narrative Portals'],
    art: 'a candy-coloured landscape where floating objects, musical notes and shapes blink in and out at random, with a few neatly sorted piles glowing calmly',
    law: 'The Principle of Utter Chaos: at first everything is random. Objects, sounds, colours and even ideas appear and disappear unpredictably.',
    experience: 'Guided by IGNIS, the explorer looks for patterns in the noise, invents sorting systems ("things that float", "things that sing", "ideas that feel warm") and builds small pockets of order. Every rule they invent calms a corner of BleepWorld, and sometimes makes it delightfully stranger.',
    translation: 'How scientists and librarians classify the world (living things into groups, books on shelves, data into tables), the difference between randomness, probability and order, and noticing how we ourselves look for patterns.',
    outcomes: ['critical thinking', 'data analysis', 'pattern recognition', 'developing classification systems', 'probability versus order', 'metacognition'],
    secrets: [{ npc: 'Blip and Blop, twin Bleeplings who swap colours whenever they sneeze', trust: 1, text: 'BleepWorld is not truly random: everything that hums arrives in threes. Spotting that hidden rule is the key to the calmest pocket of order.' }],
  }),
  world(2, 'loopia', {
    emoji: '🔁', hue: 200,
    title: { en: 'Loopia', pl: 'Pętlandia' },
    tagline: {
      en: 'Time runs in loops. The challenge resets, but you keep what you learned, and each loop something changes.',
      pl: 'Czas biegnie w pętlach. Wyzwanie się resetuje, ale ty pamiętasz, czego się nauczyłeś, a w każdej pętli coś się zmienia.',
    },
    setting: 'Loopia, an Edu-Verse world where every morning comes back, slightly different',
    cast: ['the Loopkeeper, a patient clockwork tortoise who has seen every morning ten thousand times', 'Crow-Again, a rooster who crows a slightly different song every loop'],
    loreTerms: ['Mythos', 'cybermagic'],
    art: 'a garden maze under a sky with a giant gentle clock, faint glowing footprints from earlier loops on the paths',
    law: 'Time operates in repeating, modifiable loops: a challenge resets if it is not solved, but the explorer keeps what they learned, and with each loop subtle parts of the challenge change.',
    experience: 'The explorer faces a challenge (a maze garden, a riddle bridge, a stubborn gate) that resets when unsolved. IGNIS helps them keep a loop journal of what changed between loops and adapt their strategy, so every "failed" loop becomes data.',
    translation: 'Feedback loops and iteration in science and engineering (try, test, improve), how errors carry information, and why practice and patience build skill.',
    outcomes: ['reflection', 'iterative problem-solving', 'error analysis and correction', 'understanding feedback loops', 'resilience and patience'],
    secrets: [{ npc: 'the Loopkeeper, a patient clockwork tortoise who has seen every morning ten thousand times', trust: 2, text: 'The loop is not a trap but a practice room: it opens for good when the explorer solves the challenge in a way no earlier loop tried.' }],
  }),
  world(3, 'textosfera', {
    emoji: '🔤', hue: 30,
    title: { en: 'Textosfera', pl: 'Tekstosfera' },
    tagline: {
      en: 'Words have weight and shape. A poem builds bridges, an angry word drops a heavy cloud.',
      pl: 'Słowa mają masę i kształt. Wiersz buduje mosty, a gniewne słowo zrzuca ciężką chmurę.',
    },
    setting: 'Textosfera, an Edu-Verse world built out of words',
    cast: ['Lexi Brickwright, a word-brick architect who builds only with adjectives', 'Grumblecloud, a storm cloud made of one word someone said in anger'],
    loreTerms: ['Narrative DNA', 'Gnosis'],
    art: 'a city of shimmering letters where sentences form bridges and towers, a heavy dark word-cloud drifting over glowing word-brick houses',
    law: 'Thoughts and spoken words have tangible mass and form: a powerful poem erects shimmering structures, an angry word causes a tremor or a heavy dark cloud, and arguments are built from word-bricks.',
    experience: 'IGNIS helps the explorer sculpt with language: build a bridge out of a well-made sentence, lift a heavy cloud with kind words, and debate Lexi Brickwright by physically building an argument that stands.',
    translation: 'How language affects people (feelings, decisions, trust), what makes an argument strong or weak, rhetoric and persuasion, and how poets choose words for their weight.',
    outcomes: ['the power and impact of language', 'rhetoric and persuasive communication', 'emotional intelligence', 'the weight of arguments'],
    secrets: [{ npc: 'Grumblecloud, a storm cloud made of one word someone said in anger', trust: 2, text: 'The heaviest cloud over Textosfera is one sad word that nobody ever answered; answering it kindly makes it rain flower petals.' }],
  }),
  world(4, 'probabilion', {
    emoji: '🎲', hue: 160,
    title: { en: 'Probabilion', pl: 'Prawdopodobilion' },
    tagline: {
      en: 'Every event shows its probability waves before it happens. Plant idea-seeds and learn to read the odds.',
      pl: 'Każde zdarzenie pokazuje swoje fale prawdopodobieństwa, zanim nastąpi. Posiej ziarna idei i naucz się czytać szanse.',
    },
    setting: 'Probabilion, an Edu-Verse world where you can see what might happen',
    cast: ['Professor Maybe, a wobbly wave-creature who answers every question with a percentage', 'the Seedfield, idea-seeds that sprout or sleep by chance'],
    loreTerms: ['Logos', 'Etherium'],
    art: 'a meadow under shimmering rainbow probability waves rising from every seed, some waves bright and tall, others faint',
    law: 'All events are governed by visible probability waves: before any action the explorer sees shimmering waves of possible outcomes, brighter for the more likely ones.',
    experience: 'The explorer plants idea-seeds whose sprouting is genuinely chance, reads the waves, repeats experiments many times, discovers that "likely" is not "certain", and learns to plan for uncertainty.',
    translation: 'Probability and statistics in our world (dice, coin tosses, weather forecasts, medicine trials), why scientists repeat experiments, risk, and the difference between randomness and determinism.',
    outcomes: ['an intuitive grasp of statistics and probability', 'experimental design', 'risk assessment', 'randomness versus determinism', 'managing expectations'],
    secrets: [{ npc: 'Professor Maybe, a wobbly wave-creature who answers every question with a percentage', trust: 1, text: 'The brightest wave does not always happen, but the Professor keeps a tally book proving that over a hundred tries the waves always tell the truth.' }],
  }),
  world(5, 'narramagia', {
    emoji: '🪶', hue: 330,
    title: { en: 'Narramagia', pl: 'Narramagia' },
    tagline: {
      en: 'The story builds reality. Whatever you write with the StoryWeaver’s Quill, the world becomes.',
      pl: 'Opowieść buduje rzeczywistość. Cokolwiek napiszesz Piórem Tkacza Opowieści, świat się tym staje.',
    },
    setting: 'Narramagia, an Edu-Verse world that sketches itself as it is told',
    cast: ['the StoryWeaver’s Quill, a feather pen with strong opinions about commas', 'Sir Plotsworth, a hero who appears when written and keeps asking for a motivation'],
    loreTerms: ['Mythos', 'Story Genome'],
    art: 'a landscape drawing itself into being from glowing ink lines that flow from a giant feather quill, half-drawn mountains and a half-written castle',
    law: 'The narrative actively constructs reality: whatever the explorer writes, draws or narrates with the StoryWeaver’s Quill, the environment conforms to.',
    experience: 'The explorer writes their way through the adventure while IGNIS acts as a narrative editor, suggesting plot devices and character arcs. The world takes every sentence literally, so causes always have effects, and characters written into the story have feelings of their own.',
    translation: 'Narrative structure (beginning, conflict, climax, resolution), cause and effect, character motivation, and the responsibility of storytellers toward the characters and people they write about.',
    outcomes: ['mastery of narrative structure', 'complex cause and effect', 'creative writing', 'character development', 'agency and consequence', 'storytelling ethics'],
    secrets: [{ npc: 'the StoryWeaver’s Quill, a feather pen with strong opinions about commas', trust: 2, text: 'The Quill can only write what the explorer truly imagines: the blurry patches of Narramagia sharpen the moment the explorer adds one concrete detail.' }],
  }),
  world(6, 'fraktalia', {
    emoji: '❄️', hue: 185,
    title: { en: 'Fraktalia', pl: 'Fraktalia' },
    tagline: {
      en: 'As above, so below: a dewdrop holds a galaxy. Zoom in, zoom out, find the same pattern everywhere.',
      pl: 'Jak w górze, tak w dole: kropla rosy mieści galaktykę. Przybliżaj, oddalaj i wszędzie znajdź ten sam wzór.',
    },
    setting: 'Fraktalia, an Edu-Verse world nested inside itself',
    cast: ['Fern-of-Ferns, a fern made of smaller ferns, very polite at every size', 'Flake, a snowflake cartographer who maps coastlines that never end'],
    loreTerms: ['Logos', 'Great Weave'],
    art: 'a dreamlike landscape of fern-shaped trees made of smaller ferns, a dewdrop holding a tiny galaxy, branching lightning mirrored in crystal paths',
    law: 'Self-similarity across all scales, as above, so below: a dewdrop contains a swirling galaxy, the branching of a lightning strike mirrors the paths inside a thought-crystal.',
    experience: 'The explorer zooms in and out of nested realities, finds the same pattern at every size, and discovers how tiny patterns build big structures and big ones echo in tiny ones.',
    translation: 'Fractals in our world (ferns, snowflakes, coastlines, rivers, trees, lungs and lightning), geometry and repetition, systems thinking and scale.',
    outcomes: ['patterns and fractals', 'geometry', 'systems thinking', 'interconnectedness', 'scale invariance', 'appreciating beauty in mathematical structures'],
    secrets: [{ npc: 'Fern-of-Ferns, a fern made of smaller ferns, very polite at every size', trust: 2, text: 'Fraktalia has one place where the pattern breaks; it is the doorway home, found by counting how many times the pattern repeats before it stops.' }],
  }),
  world(7, 'sympathos', {
    emoji: '💞', hue: 345,
    title: { en: 'Sympathos', pl: 'Sympatos' },
    tagline: {
      en: 'Feelings set the laws of physics. Joy makes things float; worry makes the path steep.',
      pl: 'Uczucia ustalają prawa fizyki. Radość sprawia, że rzeczy unoszą się w powietrzu, a zmartwienie robi ścieżkę stromą.',
    },
    setting: 'Sympathos, an Edu-Verse world that feels along with everyone in it',
    cast: ['Mopple, a cloud-sheep whose wool turns heavy when it worries', 'the Weatherheart, a hill that rumbles when anyone near it is upset'],
    loreTerms: ['Gnosis', 'Empathia', 'Inner Harmony'],
    art: 'a soft pastel valley where flowers bloom and float upward around a happy creature, while a distant path turns gently steep under a small grey cloud',
    law: 'Emotions directly dictate local physical laws: a burst of joy makes flowers bloom and gravity lighten, frustration makes the path thorny and steep, calm makes the ground steady.',
    experience: 'IGNIS helps the explorer notice and name feelings, in themselves and in the creatures around them, and navigate the emo-physical shifts: steadying the rumbling Weatherheart with slow breaths, lightening Mopple’s worried wool with empathy. No feeling is ever wrong here; every feeling simply has its own physics.',
    translation: 'Emotional intelligence in our world: how feelings show in the body (heartbeat, breathing, muscles), naming emotions, empathy, calming strategies and resolving conflicts kindly.',
    outcomes: ['emotional intelligence', 'emotional regulation', 'empathy', 'the mind-body connection', 'conflict resolution through emotional awareness'],
    secrets: [{ npc: 'Mopple, a cloud-sheep whose wool turns heavy when it worries', trust: 1, text: 'Mopple is not sad, only worried about being left behind at the next portal; a promise to walk on together makes its wool light as foam.' }],
  }),
];

/** Single-portal experiments: the Cyber-Magical Engines and the other learning dimensions of the framework. */
const LABS: Seed[] = [
  lab(1, 'gravi-lab', {
    emoji: '🪐', hue: 230,
    title: { en: 'The Gravi-Lab of Zero-G Epiphanies', pl: 'Grawi-Lab Olśnień w Nieważkości' },
    tagline: {
      en: 'Gravity tunes like a radio dial. Lift a hippo-sized rock, set little moons in orbit.',
      pl: 'Grawitację stroi się jak radio. Podnieś skałę wielkości hipopotama, wprowadź małe księżyce na orbitę.',
    },
    setting: 'The Gravi-Lab, a round laboratory floating between portals',
    cast: ['Atomia, an iFairy lab mentor whose experiments go cheerfully wrong', 'Boulderloon, a hippo-sized balloon-rock that weighs less than a feather'],
    loreTerms: ['Logos', 'Etherium', 'cybermagic'],
    art: 'a bright round laboratory with a giant gravity dial, objects floating at different heights, small moons orbiting a glowing gravity well',
    law: 'Gravity can be tuned like a radio dial: stronger, weaker, sideways, or sculpted into wells.',
    experience: 'The explorer lifts enormous but low-mass objects, crosses obstacle courses where gravity changes direction, and sculpts gravity wells to set little moons in orbit. Atomia and IGNIS are research partners who prompt questions and help put the observed principles into words.',
    translation: 'Mass versus weight, inertia and force, why the Moon orbits the Earth, and how astronauts move in orbit.',
    outcomes: ['mass, inertia and force', 'weight versus mass', 'orbits and planetary motion', 'observation and experiment'],
    secrets: [{ npc: 'Atomia, an iFairy lab mentor whose experiments go cheerfully wrong', trust: 2, text: 'The dial never changes how much stuff anything is made of, only how hard the world pulls on it: the balloon-rock is the clue that mass and weight are different things.' }],
  }),
  lab(2, 'whispering-tomes', {
    emoji: '📚', hue: 45,
    title: { en: 'The Curved Reading Room of Whispering Tomes', pl: 'Zakrzywiona Czytelnia Szepczących Ksiąg' },
    tagline: {
      en: 'Space curves around knowledge. The books are alive, whisper questions and rearrange around your curiosity.',
      pl: 'Przestrzeń zakrzywia się wokół wiedzy. Księgi żyją, szepczą pytania i układają się według twojej ciekawości.',
    },
    setting: 'The Curved Reading Room, a library where spacetime bends around the books',
    cast: ['Encyclopaedia Blush, a shy encyclopaedia that blushes in alphabetical order', 'Page-Turner, a picture book that insists the reader is in the wrong chapter'],
    loreTerms: ['Holographic Memory', 'Data Crystals', 'Mythos'],
    art: 'a cosy circular library whose floor and shelves curve upward like the inside of a wave, books fluttering like birds and whispering',
    law: 'Spacetime is warped around knowledge: books are living entities whose pages ripple with untold stories; they whisper questions, challenge interpretations and rearrange their contents around the reader’s curiosity.',
    experience: 'The explorer literally walks through a story’s plot twists as the room reconfigures around them, and answers the books’ questions with questions of their own.',
    translation: 'How stories are built (setting, characters, problem, twist, resolution), reading for meaning, asking questions of a text, and how one story looks different from different perspectives.',
    outcomes: ['reading comprehension', 'narrative structure', 'interpretation and perspective', 'asking good questions'],
    secrets: [{ npc: 'Encyclopaedia Blush, a shy encyclopaedia that blushes in alphabetical order', trust: 1, text: 'Every book in the room shares one hidden question, and the room straightens out when the explorer asks it aloud: "What would happen if…?"' }],
  }),
  lab(3, 'levitas', {
    emoji: '🎈', hue: 95,
    title: { en: 'Levitas', pl: 'Lewitas' },
    tagline: {
      en: 'Inverse gravity: the more meaningful an idea, the higher it lifts you. Kindness or a shiny pebble?',
      pl: 'Odwrócona grawitacja: im ważniejsza myśl, tym wyżej cię unosi. Życzliwość czy błyszczący kamyk?',
    },
    setting: 'Levitas, an archipelago of floating islands held up by ideas',
    cast: ['Captain Updraft, a hot-air-balloon fish', 'Glint, a shiny pebble, very proud of being shiny and very sad that it cannot fly'],
    loreTerms: ['Phantasia', 'Gnosis'],
    art: 'a sky archipelago of floating islands, ideas drawn as glowing balloons lifting little explorers, a sulking shiny pebble on the ground',
    law: 'Inverse gravity and conceptual buoyancy: the heavier or more profound a thought or idea, the more it makes the explorer, and the objects tied to it, float.',
    experience: 'IGNIS sets up experiments such as: "We have three ideas here: kindness, a shiny pebble and the theory of relativity. Which one lifts us highest in this world, and why?" The explorer tests ideas like balloons and argues for their answers.',
    translation: 'Real lift and buoyancy (Archimedes in water, hot-air balloons, how a wing lifts an aeroplane) and what makes an idea weighty: value, meaning and significance.',
    outcomes: ['buoyancy and lift', 'comparing value and significance', 'reasoning about why'],
    secrets: [{ npc: 'Glint, a shiny pebble, very proud of being shiny and very sad that it cannot fly', trust: 1, text: 'In Levitas a thing lifts when someone cares about it: the pebble rises the moment the explorer tells it why it matters.' }],
  }),
  lab(4, 'rewind-realm', {
    emoji: '⏪', hue: 260,
    title: { en: 'The Rewind Realm', pl: 'Kraina Przewijania' },
    tagline: {
      en: 'Time flows backwards: consequences come first. Walk back moment by moment to find the first domino.',
      pl: 'Czas płynie wstecz: najpierw skutki. Cofaj się chwila po chwili, by znaleźć pierwsze domino.',
    },
    setting: 'The Rewind Realm, a little town where rain falls upwards',
    cast: ['Tock, a clock that ticks backwards and says goodbye when it arrives', 'the Echo-Caves, where yesterday’s footsteps still walk'],
    loreTerms: ['Mythos', 'Tempora'],
    art: 'a town where rain falls upward and spilled milk leaps back into cups, a long line of dominoes standing back up',
    law: 'Retrograde time: time flows backward, so the explorer witnesses the consequences of an event before exploring its causes.',
    experience: 'The explorer arrives at an outcome first (a toppled tower of blocks, a soggy picnic, a garden gone wild) and journeys backwards with IGNIS, moment by moment, through the Echo-Caves of Past Actions, to uncover the choices that led to it and the first domino that fell.',
    translation: 'Cause and effect in our forward-flowing timeline, reasoning backwards from evidence like a detective, an archaeologist or a scientist, and taking responsibility for choices.',
    outcomes: ['cause and effect', 'reasoning from evidence', 'historical causality', 'responsibility for choices'],
    secrets: [{ npc: 'Tock, a clock that ticks backwards and says goodbye when it arrives', trust: 2, text: 'The first domino was not knocked over by anyone: it was a tiny kindness that set off a chain of happy hurry. Finding it turns the Realm forwards again.' }],
  }),
  lab(5, 'coloratura', {
    emoji: '🎨', hue: 15,
    title: { en: 'Coloratura', pl: 'Koloratura' },
    tagline: {
      en: 'Maths as symphonies of colour and sound: adding makes chords, fractions sing in harmony.',
      pl: 'Matematyka jako symfonie barw i dźwięków: dodawanie tworzy akordy, ułamki śpiewają w harmonii.',
    },
    setting: 'Coloratura, a concert-hall world where numbers are music',
    cast: ['Maestro Fraction, a conductor whose baton splits into equal parts', 'the Number Choir, numbers who each sing only their own note'],
    loreTerms: ['Logos', 'Phantasia'],
    art: 'a concert hall of floating colour waves and glowing musical notes arranged like fraction bars, a conductor’s baton splitting into equal parts',
    law: 'Mathematical operations are expressed not as symbols but as evolving symphonies of colour and sound: adding is a chord, dividing splits a melody into equal phrases, fractions are harmonies.',
    experience: 'The explorer composes and decodes colour-music with Maestro Fraction: halving a melody, building chords that add up, finding two different songs that are secretly the same number.',
    translation: 'Fractions, ratios and equivalence, multiplication as rhythm, and the real maths inside music (an octave is a 2:1 ratio).',
    outcomes: ['fractions and ratios', 'arithmetic as patterns', 'the maths inside music', 'multiple representations of one idea'],
    secrets: [{ npc: 'Maestro Fraction, a conductor whose baton splits into equal parts', trust: 1, text: 'Every melody in Coloratura can be written two ways, and the hall only applauds when the explorer finds the second one: one half and two quarters sing the very same note.' }],
  }),
  lab(6, 'chrono-voyages', {
    emoji: '🏛️', hue: 55,
    title: { en: 'Chrono-Voyages', pl: 'Chrono-Wyprawy' },
    tagline: {
      en: 'History as a place you can visit: step into a living reconstruction of the past and ask it why.',
      pl: 'Historia jako miejsce, które można odwiedzić: wejdź do żywej rekonstrukcji przeszłości i zapytaj ją: dlaczego?',
    },
    setting: 'The Holographic Memory District of the Golden City, where living reconstructions of our world’s past are opened for explorers',
    cast: ['Historica, an iFairy guide who appears as a living embodiment of each era', 'Footnote, a sentient museum label who knows everything but only says it in footnotes'],
    loreTerms: ['Holographic Memory', 'Mythos', 'Tempora'],
    art: 'a softly glowing holographic reconstruction of a historical hall, translucent people of the past, documents unfolding layers of context when touched',
    law: 'History is a spatio-temporal experience: the explorer steps into an interactive holographic reconstruction of a real moment from our world’s past, where artefacts are sentient and "What If?" branches are safely sandboxed.',
    experience: 'With Historica, the explorer chooses an era (or IGNIS offers one that fits their interests), touches documents and artefacts to reveal layers of context and different perspectives, talks with the people of the time, and may open a sandboxed "What If?" branch to see why things happened as they did. Real history stays true: every what-if is clearly labelled as imagined and closed again, and hard parts of history are told honestly but gently, never graphically.',
    translation: 'Historical thinking: primary sources, perspective and bias, cause and consequence across time, and empathy for people who lived then.',
    outcomes: ['history as lived experience', 'multiple perspectives', 'working with primary sources', 'cause and consequence', 'historical empathy'],
    secrets: [{ npc: 'Footnote, a sentient museum label who knows everything but only says it in footnotes', trust: 2, text: 'Every reconstruction holds one ordinary person nobody wrote about; listening to them shows the moment from a perspective the history books missed.' }],
  }),
];

/** Homework becomes a supported exploration instead of a solitary struggle. */
const HOMEWORK: Seed = {
  id: 'homework-portal', kind: 'homework', order: 1, structure: 'homework',
  emoji: '📸', hue: 135,
  title: { en: 'The Homework Portal', pl: 'Portal Zadań Domowych' },
  tagline: {
    en: 'Bring a real task: a photo of the page or your own words. IGNIS guides, you solve.',
    pl: 'Przynieś prawdziwe zadanie: zdjęcie strony albo własne słowa. IGNIS prowadzi, ty rozwiązujesz.',
  },
  setting: 'A cosy desk under a lamp, where a homework page opens into a small portal world',
  cast: ['the Puzzle-Lantern, which glows brighter the closer the explorer gets', 'the Task-Sprite, a tiny creature made of the homework’s own question'],
  loreTerms: ['cybermagic', 'Logos'],
  art: 'a cosy desk under a warm lamp where a homework page glows and opens into a small portal world, pencils floating like little rockets',
  law: 'A real school task becomes a quest: the portal turns the explorer’s homework into a small world whose law is the task’s own idea.',
  experience: 'The explorer brings a real task, as a photo of the notebook or textbook page (the picture button) or in their own words. IGNIS recognises the topic and the exact question, then explains and guides rather than handing over the answer, with tiered support: (1) Gentle Nudge, a hint that unlocks the next step; (2) Collaborative Construction, the explorer says the next step and IGNIS helps write it down, as a team; (3) Playful Reframing, the problem turned into a game, such as ingredients for a Potion Master’s recipe. Understanding is checked by asking the explorer to explain a step back in their own words.',
  translation: 'The concept behind the task itself, linked back to the explorer’s schoolwork.',
  outcomes: ['the concept behind the task', 'step-by-step reasoning', 'confidence with difficult problems', 'asking for help well'],
};

export const SEEDS: Seed[] = [...WORLDS, ...LABS, HOMEWORK];
