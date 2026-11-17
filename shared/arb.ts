/**
 * Agencja Ratowania Bajek: the static catalogue shared by the server and the browser.
 * Ranks, DIT sections, departments, mission types and templates, the multiverse map and
 * the training mini-games. Everything here is game data, not secrets.
 */

/* ------------------------------------------------------------------ Ranks */

export interface Rank {
  id: string;
  name: string;
  minXp: number;
  /** Archive clearance level this rank opens (0..5). */
  clearance: number;
}

export const RANKS: Rank[] = [
  { id: 'stazysta', name: 'Stażysta Okresu Próbnego', minXp: 0, clearance: 0 },
  { id: 'mlodszy', name: 'Młodszy Agent Terenowy', minXp: 120, clearance: 1 },
  { id: 'agent', name: 'Agent Terenowy', minXp: 350, clearance: 2 },
  { id: 'starszy', name: 'Starszy Agent Interwencji', minXp: 800, clearance: 3 },
  { id: 'specjalny', name: 'Agent Specjalny DIT', minXp: 1600, clearance: 4 },
  { id: 'legenda', name: 'Legenda Narracyjnego Porządku', minXp: 3000, clearance: 5 },
];

export function rankOf(xp: number) {
  let index = 0;
  RANKS.forEach((r, i) => {
    if (xp >= r.minXp) index = i;
  });
  const rank = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  const progress = next ? (xp - rank.minXp) / (next.minXp - rank.minXp) : 1;
  return { rank, index, next, progress };
}

/* ------------------------------------------------------- DIT sections */

export const SPECIALIZATIONS = [
  { id: 'europa', name: 'Baśnie Europejskie', kind: 'geo', emoji: '🏰' },
  { id: 'azja', name: 'Mitologie Azjatyckie', kind: 'geo', emoji: '🐉' },
  { id: 'ameryka', name: 'Legendy Ameryki Południowej', kind: 'geo', emoji: '🌿' },
  { id: 'magia', name: 'Zagrożenia Magiczne', kind: 'theme', emoji: '✨' },
  { id: 'czas', name: 'Anomalie Czasoprzestrzenne', kind: 'theme', emoji: '⏳' },
  { id: 'moral', name: 'Kryzysy Moralne', kind: 'theme', emoji: '⚖️' },
] as const;
export type SpecializationId = (typeof SPECIALIZATIONS)[number]['id'];
export const SPECIALIZATION_IDS = SPECIALIZATIONS.map((s) => s.id) as [SpecializationId, ...SpecializationId[]];
export const specialization = (id: string) => SPECIALIZATIONS.find((s) => s.id === id);

/* --------------------------------------------------------- Departments */

export type DepartmentGroup = 'dyrekcja' | 'operacyjne' | 'wsparcia' | 'kontroli';

export interface Department {
  id: string;
  short: string;
  name: string;
  group: DepartmentGroup;
  desc: string;
}

export const DEPARTMENTS: Department[] = [
  { id: 'dn', short: 'DN', name: 'Dyrektor Naczelny', group: 'dyrekcja', desc: 'Rzadka zjawa. Instrukcje przekazuje przez kota. Podobno woli seriale z magicznym popcornem.' },
  { id: 'kot', short: 'Kot', name: 'Zastępca Dyrektora (Kot)', group: 'dyrekcja', desc: 'Decyduje o drzemkach i dostawach tuńczyka. Mruknięcia tłumaczy AI Mrucz-Term; każda pomyłka to dzień wyjaśnień.' },
  { id: 'rnn', short: 'RNN', name: 'Rada Nadzorcza Narracji', group: 'dyrekcja', desc: 'Muza Opowieści, Pierwszy Narrator i inni. Zbiera się raz na sto lat, jeśli ktoś znajdzie wolny termin.' },
  { id: 'dit', short: 'DIT', name: 'Departament Interwencji Terenowych', group: 'operacyjne', desc: 'Największy i najbardziej chaotyczny dział. Agenci wychodzą z pękiem formularzy, magicznym plecakiem i co najmniej jednym otwartym portalem.' },
  { id: 'dan', short: 'DAN', name: 'Departament Analiz Narracyjnych', group: 'operacyjne', desc: 'Mózg operacji. Superkomputer „Wieszcz” liczy Wskaźniki Spójności, Prognozy Paradoksów i Alerty Chaosu.' },
  { id: 'dzp', short: 'DZP', name: 'Departament Zarządzania Postaciami', group: 'operacyjne', desc: 'Negocjatorzy i mediatorzy. Programy „Złoczyńca na dietę moralną” i castingi na nowe bajkowe talenty.' },
  { id: 'datm', short: 'DATM', name: 'Departament Artefaktów i Technologii Magicznej', group: 'operacyjne', desc: 'Magazyn i laboratorium: Złote Runo, Pióro Gryfa, selfie-laska do zaklęć i eliksiry opóźniające poniedziałek.' },
  { id: 'dbr', short: 'DBR', name: 'Departament Badań i Rozwoju', group: 'wsparcia', desc: 'Nowe formuły i badania wpływu fluktuacji magicznej na ceny kawy.' },
  { id: 'dsrk', short: 'DSRK', name: 'Departament Szkoleń i Rozwoju Kadr', group: 'wsparcia', desc: 'Od rękodzieła runicznego po zaawansowaną walidację formularzy. Prowadzi Ośrodek Szkoleniowy.' },
  { id: 'dzlin', short: 'DZLiN', name: 'Zasoby Ludzkie i Nieludzkie', group: 'wsparcia', desc: 'Rekrutacja trolli sprzątających i negocjacje z centaurami z HR.' },
  { id: 'dlitm', short: 'DLiTM', name: 'Departament Logistyki', group: 'wsparcia', desc: 'Portale, orły pocztowe i dostawy pizzy międzywymiarowej.' },
  { id: 'ditmt', short: 'DITMT', name: 'IT i Magii Technicznej', group: 'wsparcia', desc: 'Utrzymuje sieć narracyjną i łapie chochliki w kablach. Ma chrapiącego goblina.' },
  { id: 'dksf', short: 'DKSF', name: 'Kontroli Spójności Fabularnej', group: 'kontroli', desc: '„Doktorzy aberracji”. Nakładają kary za odstępstwa od kanonu i wydają Pieczątki.' },
  { id: 'dkw', short: 'DKW', name: 'Kontroli Wewnętrznej', group: 'kontroli', desc: 'Inwigilacja, raporty i pułapki na niepoprawne dokumenty. Tu trafiają nieudane sprawy.' },
  { id: 'dam', short: 'DAM', name: 'Audytu Magicznego', group: 'kontroli', desc: 'Kontrolują przepływ magii, oszczędzają prąd i czarną herbatę.' },
];

/* --------------------------------------------- Mission types & choices */

export const MISSION_TYPES = {
  eskorta: { name: 'Eskorta', emoji: '🛡️', desc: 'Dowieź postać na miejsce w jednym kawałku i w zgodzie z kanonem.' },
  odzyskanie: { name: 'Odzyskanie Artefaktu', emoji: '🏺', desc: 'Artefakt zniknął, zmienił właściciela albo został przerobiony na dywanik.' },
  dochodzenie: { name: 'Dochodzenie', emoji: '🔎', desc: 'Ktoś coś zrobił. Ustal kto, zanim DKSF ustali, że to Ty.' },
  prewencja: { name: 'Interwencja Prewencyjna', emoji: '🚧', desc: 'Powstrzymaj katastrofę fabularną, zanim się wydarzy.' },
  specjalna: { name: 'Misja Specjalna', emoji: '🌀', desc: 'Portale, wymiary, mówiące ananasy. Wszystko, czego nie ma w regulaminie.' },
} as const;
export type MissionTypeId = keyof typeof MISSION_TYPES;
export const MISSION_TYPE_IDS = Object.keys(MISSION_TYPES) as MissionTypeId[];

/** How an agent can act on a mission page. */
export const CHOICE_KINDS = ['procedura', 'improwizacja', 'dyplomacja', 'pieczatka'] as const;
export type ChoiceKind = (typeof CHOICE_KINDS)[number];

export const CHOICE_META: Record<ChoiceKind | 'custom', { label: string; desc: string; bonus: number }> = {
  procedura: { label: 'Procedura', desc: 'Zgodnie z regulaminem. Bezpiecznie i nudno.', bonus: 2 },
  improwizacja: { label: 'Improwizacja', desc: 'Szybko, odważnie, z ryzykiem paradoksu.', bonus: 0 },
  dyplomacja: { label: 'Dyplomacja', desc: 'Rozmowa, mediacja, przekupstwo ciasteczkiem.', bonus: 1 },
  pieczatka: { label: 'Pieczątka DKSF', desc: 'Urzędowo zatwierdzone. Bez rzutu, kosztuje 1 pieczątkę.', bonus: 0 },
  custom: { label: 'Własny ruch', desc: 'Twoje słowa. Zawsze z testem K20.', bonus: 0 },
};

export const ENDING_TYPES = ['uratowana', 'z-przypisami', 'tajne-akta', 'paradoks', 'przekazana-dkw'] as const;
export type EndingType = (typeof ENDING_TYPES)[number];

export const ENDING_META: Record<EndingType, { label: string; xpFactor: number; tone: 'ok' | 'warn' | 'danger' | 'ember' }> = {
  uratowana: { label: 'Bajka uratowana', xpFactor: 1, tone: 'ok' },
  'tajne-akta': { label: 'Tajne akta', xpFactor: 1.2, tone: 'warn' },
  'z-przypisami': { label: 'Uratowana z przypisami', xpFactor: 0.6, tone: 'ember' },
  paradoks: { label: 'Paradoks', xpFactor: 0.3, tone: 'danger' },
  'przekazana-dkw': { label: 'Sprawa przekazana do DKW', xpFactor: 0.15, tone: 'danger' },
};

/** XP for finishing a mission of this difficulty with this ending. */
export const missionXp = (difficulty: number, ending: EndingType) => Math.round((40 + 20 * difficulty) * ENDING_META[ending].xpFactor);

/** K20 difficulty class of a mission's tests. */
export const dcFor = (difficulty: number, paradox = false) => 8 + difficulty * 2 + (paradox ? 2 : 0);

/* ------------------------------------------------------- Multiverse map */

export type Terrain = 'las' | 'gory' | 'woda' | 'miasto' | 'pustka' | 'rowniny';
export type LocationKind = 'siedziba' | 'miasto' | 'kraina' | 'biblioteka' | 'anomalia' | 'twierdza' | 'wymiar';

export const FACTIONS = {
  arb: { name: 'Agencja Ratowania Bajek', color: '#f4c84a' },
  korona: { name: 'Królestwa Baśni', color: '#d8423b' },
  krasnoludy: { name: 'Gildia Krasnoludów i Goblinów', color: '#b07a3a' },
  elfy: { name: 'Rada Elfów', color: '#3f9f5f' },
  smoki: { name: 'Wolne Smoki', color: '#ff7a2f' },
  dalekie: { name: 'Dalekie Mitologie', color: '#3f8fd8' },
  nieznane: { name: 'Nieskatalogowane', color: '#8b63e6' },
} as const;
export type FactionId = keyof typeof FACTIONS;

export interface MapLocation {
  id: string;
  name: string;
  kind: LocationKind;
  region: SpecializationId | 'centrum' | 'wymiary';
  /** Position on the 1000 × 640 map. */
  x: number;
  y: number;
  terrain: Terrain;
  /** 1..5 */
  magic: number;
  /** 0..5 */
  threat: number;
  faction: FactionId;
  resources: string[];
  characters: string[];
  desc: string;
}

export const LOCATIONS: MapLocation[] = [
  { id: 'siedziba', name: 'Siedziba ARB', kind: 'siedziba', region: 'centrum', x: 500, y: 300, terrain: 'miasto', magic: 3, threat: 1, faction: 'arb', resources: ['kawa', 'formularze', 'pieczątki'], characters: ['Kot (Zastępca Dyrektora)', 'Mrucz-Term'], desc: 'Biurowiec o zmiennej liczbie pięter. Automat do kawy w Mrocznym Korytarzu wydaje czasem lawę.' },
  { id: 'miasto', name: 'Wielkie Bajkowe Miasto', kind: 'miasto', region: 'centrum', x: 590, y: 360, terrain: 'miasto', magic: 3, threat: 2, faction: 'korona', resources: ['złoto', 'plotki', 'pizza międzywymiarowa'], characters: ['Pinokio', 'Kopciuszek', 'Kot w Butach'], desc: 'Stolica wszystkich bajek. Tramwaje jeżdżą tu według zakończeń, nie rozkładu.' },
  { id: 'biblioteka', name: 'Biblioteka Zapomnianych Opowieści', kind: 'biblioteka', region: 'centrum', x: 430, y: 220, terrain: 'gory', magic: 5, threat: 2, faction: 'arb', resources: ['atrament', 'zapomniane wątki'], characters: ['Bibliotekarka Echo'], desc: 'Regały sięgają w głąb czasu. Książki, których nikt nie czyta, zaczynają pisać się same.' },
  { id: 'las', name: 'Zaczarowany Las', kind: 'kraina', region: 'europa', x: 250, y: 260, terrain: 'las', magic: 4, threat: 3, faction: 'korona', resources: ['pył wróżek', 'grzyby'], characters: ['Czerwony Kapturek', 'Babcia', 'Wilk (na terapii)'], desc: 'Ścieżki zmieniają się, gdy nikt nie patrzy. Wilk chodzi na terapię w czwartki.' },
  { id: 'kopalnie', name: 'Kopalnie Krasnoludów', kind: 'twierdza', region: 'europa', x: 170, y: 150, terrain: 'gory', magic: 2, threat: 3, faction: 'krasnoludy', resources: ['diamenty', 'babeczki', 'kapitał wysokiego ryzyka'], characters: ['Siedmiu Krasnoludków', 'Gobliny związkowe'], desc: 'Siedmiu Krasnoludków dzieli kopalnię z goblinami. Spór o podział trwa od trzech zakończeń.' },
  { id: 'palac', name: 'Pałac Kopciuszka', kind: 'miasto', region: 'europa', x: 300, y: 380, terrain: 'rowniny', magic: 3, threat: 2, faction: 'korona', resources: ['szklane pantofelki', 'dynie'], characters: ['Kopciuszek', 'Książę', 'Wróżka Chrzestna'], desc: 'O północy wszystko wraca do formy dyni, łącznie z ładowarkami.' },
  { id: 'wawel', name: 'Wzgórze Wawelskie', kind: 'twierdza', region: 'europa', x: 360, y: 120, terrain: 'gory', magic: 4, threat: 4, faction: 'smoki', resources: ['siarka', 'światłowód (planowany)'], characters: ['Smok Wawelski', 'Szewczyk Dratewka'], desc: 'Smok domaga się światłowodu 10 Tb/s. Dział Negocjacji z Istotami Odradzającymi Się ma tu stałą rezerwację.' },
  { id: 'kolchida', name: 'Kolchida', kind: 'kraina', region: 'europa', x: 420, y: 470, terrain: 'woda', magic: 4, threat: 3, faction: 'smoki', resources: ['złote runo', 'wełna'], characters: ['Jazon', 'Smok-strażnik'], desc: 'Tu wisiało Złote Runo. Teraz wisi tylko tabliczka „Zaraz wracam”.' },
  { id: 'gora-kwiatow', name: 'Góra Kwiatów i Owoców', kind: 'kraina', region: 'azja', x: 820, y: 180, terrain: 'gory', magic: 5, threat: 3, faction: 'dalekie', resources: ['brzoskwinie nieśmiertelności', 'kostury'], characters: ['Sun Wukong', 'Małpy-podwładne'], desc: 'Królestwo Małpiego Króla. Każda małpa ma tu tytuł i nikt nie ma biurka.' },
  { id: 'palac-smoczego-krola', name: 'Pałac Smoczego Króla', kind: 'twierdza', region: 'azja', x: 880, y: 400, terrain: 'woda', magic: 5, threat: 2, faction: 'dalekie', resources: ['perły', 'pudełka z czasem'], characters: ['Urashima Tarō', 'Otohime', 'Żółw'], desc: 'Pod morzem dzień trwa tu trzysta lat. DLiTM zabrania otwierania pudełek na miejscu.' },
  { id: 'baszta-lampy', name: 'Bazar Lamp', kind: 'miasto', region: 'azja', x: 720, y: 290, terrain: 'pustka', magic: 4, threat: 3, faction: 'dalekie', resources: ['lampy', 'dywany latające'], characters: ['Alladyn', 'Dżin (na urlopie)'], desc: 'Każda lampa jest tu „oryginalna”. Dżin ma status nieodpowiadającego.' },
  { id: 'eldorado', name: 'El Dorado', kind: 'miasto', region: 'ameryka', x: 200, y: 520, terrain: 'las', magic: 4, threat: 3, faction: 'dalekie', resources: ['złoto', 'mapy (fałszywe)'], characters: ['Złoty Wódz', 'Konkwistadorzy-turyści'], desc: 'Miasto, które znajduje się tylko na mapach, których nikt nie narysował. Na razie.' },
  { id: 'dzungla', name: 'Dżungla Curupiry', kind: 'kraina', region: 'ameryka', x: 110, y: 420, terrain: 'las', magic: 4, threat: 4, faction: 'elfy', resources: ['zioła', 'ślady (odwrócone)'], characters: ['Curupira', 'Boto'], desc: 'Strażnik lasu chodzi stopami do tyłu, więc każdy pościg kończy się w punkcie wyjścia.' },
  { id: 'zona', name: 'Zona Czasowych Paradoksów', kind: 'anomalia', region: 'wymiary', x: 640, y: 90, terrain: 'pustka', magic: 5, threat: 5, faction: 'nieznane', resources: ['wczorajsze jutra', 'chronony'], characters: ['Sfinks (dwa egzemplarze)'], desc: 'Tu wczoraj zdarza się po jutrze. Zegarki zostawiamy w szatni.' },
  { id: 'sluchawki', name: 'Wymiar Zagubionych Słuchawek', kind: 'wymiar', region: 'wymiary', x: 940, y: 70, terrain: 'pustka', magic: 3, threat: 1, faction: 'nieznane', resources: ['słuchawki', 'skarpetki (pojedyncze)'], characters: ['Strażnik Zgub'], desc: 'Wszystko, co kiedykolwiek zginęło w kieszeni. Słuchawki są splątane kwantowo i fizycznie.' },
  { id: 'absurd', name: 'Wymiar Absurdu', kind: 'wymiar', region: 'wymiary', x: 760, y: 560, terrain: 'pustka', magic: 5, threat: 4, faction: 'nieznane', resources: ['mówiące ananasy', 'tęcza w płynie'], characters: ['Ananas Prorok'], desc: 'Prognoza: deszcz mówiących ananasów z przejaśnieniami.' },
  { id: 'elfy', name: 'Dolina Rady Elfów', kind: 'kraina', region: 'europa', x: 120, y: 280, terrain: 'las', magic: 4, threat: 2, faction: 'elfy', resources: ['transparenty', 'pieśni protestacyjne'], characters: ['Rada Elfów', 'Księżniczki (w ochronie)'], desc: 'Elfy protestują. Nikt nie pamięta przeciwko czemu, ale transparenty są piękne.' },
];
export const locationOf = (id: string) => LOCATIONS.find((l) => l.id === id);

/** The pegasus migration loop drawn on the map (weather simulation). */
export const PEGASUS_ROUTE: [number, number][] = [
  [170, 150], [360, 120], [640, 90], [820, 180], [880, 400], [760, 560], [420, 470], [200, 520], [110, 420], [120, 280], [170, 150],
];

/* ------------------------------------------------------ Mission catalogue */

export interface Mission {
  id: string;
  type: MissionTypeId;
  title: string;
  /** The tale or myth it is set in. */
  tale: string;
  brief: string;
  /** "Poproś o więcej informacji": the longer briefing. */
  details: string;
  region: SpecializationId;
  theme: SpecializationId;
  locationId: string;
  /** 1..5 */
  difficulty: number;
  /** Lowest rank index NarratoMat will give this to. */
  minRank: number;
  cast: string[];
  /** Forms the agent must file along the way. */
  forms: string[];
  /** Visual setting added to every illustration of this mission. */
  art: string;
}

export const MISSIONS: Mission[] = [
  {
    id: 'pinokio-konferencja', type: 'eskorta', title: 'Prawda w eskorcie', tale: 'Pinokio', region: 'europa', theme: 'moral', locationId: 'miasto', difficulty: 1, minRank: 0,
    brief: 'Dowieź Pinokia na konferencję „Prawda Narracyjna” jako prelegenta.',
    details: 'Pinokio ma wygłosić referat otwierający. Każde kłamstwo wydłuża mu nos, a sala ma niski sufit. Organizatorzy proszą o eskortę i zakaz pytań z sali.',
    cast: ['Pinokio', 'Dżepetto', 'Świerszcz (rzecznik prasowy)', 'Lis i Kot (bileterzy)'], forms: ['B-7', 'Z-12 (zgoda na przewóz drewna)'],
    art: 'a grand conference hall in a fairy-tale city, wooden puppet speaker, low ornate ceiling',
  },
  {
    id: 'runo-dywanik', type: 'odzyskanie', title: 'Runo na podłodze', tale: 'Złote Runo', region: 'europa', theme: 'magia', locationId: 'kolchida', difficulty: 2, minRank: 0,
    brief: 'Złote Runo przerobiono na dywanik. Odzyskaj je, zanim ktoś na nim stanie w butach.',
    details: 'Smok-kleptoman z Kolchidy urządza legowisko w stylu skandynawskim. Runo leży przy kominku. Jazon czeka na zwrot z umową najmu.',
    cast: ['Smok-kleptoman', 'Jazon', 'Medea (konsultantka)'], forms: ['B-7', 'A-3 (protokół odzyskania artefaktu)'],
    art: 'a cozy dragon lair decorated like a Scandinavian living room, golden fleece rug by the fireplace',
  },
  {
    id: 'krasnoludki-znikniecie', type: 'dochodzenie', title: 'Siedmiu minus siedmiu', tale: 'Królewna Śnieżka', region: 'europa', theme: 'moral', locationId: 'kopalnie', difficulty: 3, minRank: 1,
    brief: 'Zniknęło Siedmiu Krasnoludków. Wojna domowa czy spisek Królowej?',
    details: 'Kopalnia stoi, kilofy wiszą. Na stole siedem niedojedzonych babeczek. Królowa ma alibi z lustra, a gobliny z kopalni obok nagle mają nowe kaski.',
    cast: ['Królewna Śnieżka', 'Zła Królowa', 'Lustro (świadek)', 'Gobliny związkowe'], forms: ['B-7', 'D-4 (protokół przesłuchania lustra)'],
    art: 'an abandoned dwarf mine kitchen, seven half-eaten cupcakes, hanging pickaxes, lantern light',
  },
  {
    id: 'rumpel-gielda', type: 'prewencja', title: 'Imię na giełdzie', tale: 'Rumpelsztyk', region: 'europa', theme: 'magia', locationId: 'miasto', difficulty: 3, minRank: 1,
    brief: 'Powstrzymaj Rumpelsztyka przed podpisaniem umowy z demonami giełdowymi.',
    details: 'Rumpelsztyk chce wprowadzić swoje imię na giełdę jako aktywo niematerialne. Demony giełdowe obiecują hossę. Jeśli imię stanie się publiczne, cała baśń traci zakończenie.',
    cast: ['Rumpelsztyk', 'Demony giełdowe', 'Królowa-młynarzówna'], forms: ['B-7', 'G-1 (wniosek o wstrzymanie notowań)'],
    art: 'a gothic stock exchange trading floor with small horned demons and glowing ticker boards',
  },
  {
    id: 'ananasy-portal', type: 'specjalna', title: 'Prognoza: ananasy', tale: 'Wymiar Absurdu', region: 'europa', theme: 'czas', locationId: 'absurd', difficulty: 4, minRank: 2,
    brief: 'Zamknij portal do Wymiaru Absurdu przed deszczem mówiących ananasów.',
    details: 'Portal otworzył się w parku miejskim. Pierwsze ananasy już spadły i zaczęły udzielać rad życiowych. DAN prognozuje ulewę w ciągu trzech stron.',
    cast: ['Ananas Prorok', 'Strażnik portalu (śpi)', 'Tłum gapiów'], forms: ['B-7', 'P-9 (zgłoszenie portalu)', 'P-9a (zamknięcie portalu)'],
    art: 'a swirling purple portal above a city park, raining talking pineapples with tiny faces',
  },
  {
    id: 'kopciuszek-smartfon', type: 'odzyskanie', title: 'Zgubiony o północy', tale: 'Kopciuszek', region: 'europa', theme: 'czas', locationId: 'palac', difficulty: 2, minRank: 0,
    brief: 'Kopciuszek zgubił smartfona zamiast pantofelka. Odzyskaj go, zanim książę zacznie szukać właścicielki po odcisku palca.',
    details: 'Smartfon z obiektywem 24 Mpx leży gdzieś w pałacu. Bateria 4%. O północy zamieni się w dynię razem z galerią zdjęć.',
    cast: ['Kopciuszek', 'Książę', 'Macocha', 'Wróżka Chrzestna'], forms: ['B-7', 'K-1 (zgłoszenie zguby nie-kanonicznej)'],
    art: 'a glittering palace ballroom staircase at midnight, a smartphone glowing on the steps',
  },
  {
    id: 'smok-swiatlowod', type: 'prewencja', title: 'Dziesięć terabitów siarki', tale: 'Smok Wawelski', region: 'europa', theme: 'moral', locationId: 'wawel', difficulty: 2, minRank: 0,
    brief: 'Smok Wawelski żąda światłowodu 10 Tb/s. Wynegocjuj kompromis, zanim zje negocjatora.',
    details: 'Smok grozi strajkiem odradzania się. Szewczyk Dratewka szykuje barana z siarką „na wszelki wypadek”. Dział Negocjacji z Istotami Odradzającymi Się prosi o wsparcie.',
    cast: ['Smok Wawelski', 'Szewczyk Dratewka', 'Król Krak', 'Technik od światłowodów'], forms: ['B-7', 'N-2 (protokół negocjacji z istotą odradzającą się)'],
    art: 'a dragon cave under a castle hill, the dragon holding a fiber-optic cable, network router glowing',
  },
  {
    id: 'kapturek-ciastka', type: 'dochodzenie', title: 'Ciastka babci', tale: 'Czerwony Kapturek', region: 'europa', theme: 'moral', locationId: 'las', difficulty: 1, minRank: 0,
    brief: 'Ustal, dlaczego Czerwony Kapturek wciąż je ciastka babci, zanim do niej dotrze.',
    details: 'Wskaźnik Spójności spada przy każdym zjedzonym ciastku. Wilk twierdzi, że nic nie wie, bo jest na terapii. Koszyk jest coraz lżejszy.',
    cast: ['Czerwony Kapturek', 'Wilk (na terapii)', 'Babcia', 'Gajowy'], forms: ['B-7', 'C-0 (inwentaryzacja koszyka)'],
    art: 'a winding enchanted forest path, girl in red hood with a picnic basket, nervous wolf behind a tree',
  },
  {
    id: 'wrozki-strajk', type: 'prewencja', title: 'Brokat wstrzymany', tale: 'Wróżki (wszystkie)', region: 'europa', theme: 'magia', locationId: 'miasto', difficulty: 2, minRank: 0,
    brief: 'Wróżki odmawiają posypywania brokatem, dopóki rachunki nie zostaną zapłacone w terminie.',
    details: 'Bez brokatu nie działa żadne „i żyli długo i szczęśliwie”. Księgowość ARB twierdzi, że faktury zjadł chochlik drukarski.',
    cast: ['Wróżka Chrzestna (przewodnicząca)', 'Chochlik drukarski', 'Księgowa ARB'], forms: ['B-7', 'F-5 (reklamacja faktury magicznej)'],
    art: 'fairies with picket signs in a city square, piles of unpaid glittering invoices, a tiny ink imp',
  },
  {
    id: 'elfy-ksiezniczki', type: 'eskorta', title: 'Księżniczki przez protest', tale: 'Bajki o księżniczkach', region: 'europa', theme: 'moral', locationId: 'elfy', difficulty: 2, minRank: 0,
    brief: 'Przeprowadź trzy księżniczki przez protest elfów na bal w sąsiedniej bajce.',
    details: 'Elfy blokują jedyną drogę. Księżniczki mają suknie z trenami po dziesięć metrów. Nikt nie wie, czego elfy chcą.',
    cast: ['Trzy księżniczki', 'Rada Elfów', 'Kuczer (zrzędzi)'], forms: ['B-7', 'E-3 (zgłoszenie zgromadzenia magicznego)'],
    art: 'elves with beautiful protest banners blocking a forest road, princesses in long gowns in a carriage',
  },
  {
    id: 'krasnoludy-gobliny', type: 'dochodzenie', title: 'Podział kopalni', tale: 'Krasnoludy i Gobliny', region: 'europa', theme: 'moral', locationId: 'kopalnie', difficulty: 3, minRank: 1,
    brief: 'Zmediuj spór krasnoludów z goblinami o podział kopalni, zanim ktoś wezwie trolla-arbitra.',
    details: 'Granica w kopalni przesuwa się każdej nocy o trzy metry. Obie strony oskarżają się o kradzież korytarzy.',
    cast: ['Krasnolud Brygadzista', 'Goblinia Przewodnicząca Związku', 'Troll-arbiter (drzemie)'], forms: ['B-7', 'M-8 (protokół mediacji)'],
    art: 'a split underground mine, dwarves on one side, goblins on the other, a chalk border line',
  },
  {
    id: 'tecza-eliksiry', type: 'specjalna', title: 'Wylewająca się tęcza', tale: 'Eliksiry Kolorów', region: 'azja', theme: 'magia', locationId: 'zona', difficulty: 4, minRank: 2,
    brief: 'Zapobiegnij globalnemu rozlewaniu się tęczy po nadmiernym spożyciu eliksirów kolorów.',
    details: 'Tęcza przelewa się przez granice bajek. Czarno-białe opowieści zaczynają być w technikolorze i nikt nie wie, jak to cofnąć.',
    cast: ['Alchemik-hobbysta', 'Kolorowe gnomy', 'Czarno-biały Rycerz (w szoku)'], forms: ['B-7', 'L-6 (zgłoszenie wycieku magicznego)', 'L-6b (sprzątanie)'],
    art: 'a liquid rainbow overflowing from a cauldron and flooding a black-and-white storybook village',
  },
  {
    id: 'sfinks-paradoks', type: 'specjalna', title: 'Sfinks i Sfinks', tale: 'Zagadka Sfinksa', region: 'azja', theme: 'czas', locationId: 'zona', difficulty: 5, minRank: 3,
    brief: 'Sfinks spotkał samego siebie w Zonie Czasowych Paradoksów. Rozdziel ich, zanim zadadzą sobie zagadkę.',
    details: 'Jeśli jeden Sfinks zada drugiemu zagadkę, a ten jej nie rozwiąże, zje sam siebie. DAN ocenia ryzyko paradoksu na 97%.',
    cast: ['Sfinks z wczoraj', 'Sfinks z jutra', 'Edyp (spóźniony)'], forms: ['B-7', 'T-0 (zgłoszenie paradoksu)', 'T-0/2 (rozdzielenie egzemplarzy)'],
    art: 'two identical sphinxes facing each other in a desert where clocks melt and the sky runs backward',
  },
  {
    id: 'wukong-kostur', type: 'odzyskanie', title: 'Kostur w kieszeni', tale: 'Podróż na Zachód', region: 'azja', theme: 'magia', locationId: 'gora-kwiatow', difficulty: 3, minRank: 1,
    brief: 'Kostur Sun Wukonga zmniejszył się do rozmiaru igły i zniknął. Odzyskaj go.',
    details: 'Małpi Król twierdzi, że schował go za uchem. Za uchem jest tylko długopis ARB. Małpy-podwładne mają nagle nowe wykałaczki.',
    cast: ['Sun Wukong', 'Małpy-podwładne', 'Mnich Tang (medytuje)'], forms: ['B-7', 'A-3 (protokół odzyskania artefaktu)'],
    art: 'a mountain of flowers and fruit, a mischievous monkey king, tiny monkeys holding toothpicks',
  },
  {
    id: 'urashima-pudelko', type: 'eskorta', title: 'Trzysta lat spóźnienia', tale: 'Urashima Tarō', region: 'azja', theme: 'czas', locationId: 'palac-smoczego-krola', difficulty: 4, minRank: 2,
    brief: 'Eskortuj Urashimę z Pałacu Smoczego Króla do domu tak, żeby wrócił przed upływem trzystu lat.',
    details: 'Żółw-przewoźnik ma przerwę. Urashima ma w rękach pudełko, którego nie wolno otworzyć. Czas w pałacu płynie po swojemu.',
    cast: ['Urashima Tarō', 'Otohime', 'Żółw (na przerwie)'], forms: ['B-7', 'T-3 (przewóz międzyczasowy)'],
    art: 'an undersea dragon palace of coral and pearls, a fisherman holding a lacquered box, a sleepy turtle',
  },
  {
    id: 'lampa-dzin', type: 'dochodzenie', title: 'Dżin nieodpowiadający', tale: 'Alladyn', region: 'azja', theme: 'magia', locationId: 'baszta-lampy', difficulty: 3, minRank: 1,
    brief: 'Dżin z Lampy Alladyna nie odpowiada od tygodnia. Ustal, czy to urlop, porwanie, czy podróbka lampy.',
    details: 'Na Bazarze Lamp sprzedają sto identycznych lamp. Alladyn potarł już czterdzieści. Jedna zaczęła mruczeć.',
    cast: ['Alladyn', 'Handlarz lamp', 'Dywan (świadek)'], forms: ['B-7', 'D-4 (protokół przesłuchania przedmiotu)'],
    art: 'a busy bazaar full of identical golden lamps, a flying carpet as a nervous witness',
  },
  {
    id: 'eldorado-mapa', type: 'prewencja', title: 'Mapa, której nie było', tale: 'El Dorado', region: 'ameryka', theme: 'moral', locationId: 'eldorado', difficulty: 3, minRank: 1,
    brief: 'Ktoś narysował mapę do El Dorado. Zniszcz ją, zanim miasto zacznie istnieć na serio.',
    details: 'El Dorado istnieje tylko dlatego, że nikt go nie znalazł. Konkwistadorzy-turyści już kupują bilety.',
    cast: ['Złoty Wódz', 'Kartograf-amator', 'Konkwistadorzy-turyści'], forms: ['B-7', 'G-7 (zgłoszenie mapy nielegalnej)'],
    art: 'a golden city half-materialized in a misty jungle, an old treasure map glowing',
  },
  {
    id: 'curupira-tropy', type: 'eskorta', title: 'Tropy do tyłu', tale: 'Curupira', region: 'ameryka', theme: 'magia', locationId: 'dzungla', difficulty: 3, minRank: 1,
    brief: 'Przeprowadź zespół DBR przez Dżunglę Curupiry, nie gubiąc nikogo w odwróconych śladach.',
    details: 'Curupira chroni las, chodząc stopami do tyłu. Naukowcy DBR chcą zmierzyć poziom magii i nie wierzą w strażnika.',
    cast: ['Curupira', 'Naukowcy DBR', 'Boto (przewodnik, niewiarygodny)'], forms: ['B-7', 'R-2 (pozwolenie na badania w lesie chronionym)'],
    art: 'a dense Amazon jungle, a red-haired forest guardian with backward feet, scientists with clipboards',
  },
];
export const missionOf = (id: string) => MISSIONS.find((m) => m.id === id);

/* ------------------------------------------------------- Training games */

export const MINI_GAMES = [
  { id: 'fasolki', name: 'Sortowanie Magicznych Fasolek', skill: 'Refleks i spostrzegawczość', emoji: '🫘', desc: 'Fasolki wpadają do sortowni. Reguły zmieniają się w trakcie, jak w każdym regulaminie.' },
  { id: 'labirynt', name: 'Labirynt Biurokracji', skill: 'Cierpliwość i planowanie', emoji: '🗂️', desc: 'Zbierz formularz, załączniki i pieczątkę, zanim zamkną okienko.' },
  { id: 'smok', name: 'Symulator Negocjacji ze Smokiem', skill: 'Dyplomacja i psychologia', emoji: '🐲', desc: 'Smok ma cierpliwość i nastrój. Ty masz osiem rund i komplet argumentów.' },
  { id: 'kalambury', name: 'Kalambury z Mimem Zaczarowanym', skill: 'Kreatywność i znajomość świata', emoji: '🎭', desc: 'Mim pokazuje baśń w emoji. Zgadnij, zanim zacznie pokazywać rękami.' },
  { id: 'alchemia', name: 'Alchemia dla Początkujących', skill: 'Logika i eksperymentowanie', emoji: '⚗️', desc: 'Odgadnij przepis z czterech składników po bąblach w kociołku.' },
] as const;
export type MiniGameId = (typeof MINI_GAMES)[number]['id'];
export const MINI_GAME_IDS = MINI_GAMES.map((g) => g.id) as [MiniGameId, ...MiniGameId[]];

/** XP for one training session, from a 0..100 score. A new best adds a bonus. */
export const trainingXp = (score: number, newBest: boolean) => Math.min(15, Math.round(Math.max(0, Math.min(100, score)) / 10) + (newBest ? 5 : 0));

/* ---------------------------------------------------- Dashboard helpers */

/** Coffee drains 1 point per 6 minutes of real time. */
export const coffeeNow = (coffee: number, coffeeAt: number, now = Date.now()) => Math.max(0, Math.round(coffee - (now - coffeeAt) / 360_000));

/** The status line in the dashboard header, from stress and coffee. */
export function agentStatus(stress: number, coffee: number): { label: string; tone: 'ok' | 'warn' | 'danger' } {
  if (stress >= 80) return { label: 'Alarm! Zbliża się deadline FZIN!', tone: 'danger' };
  if (coffee <= 10) return { label: 'Krytyczny niedobór kofeiny', tone: 'danger' };
  if (stress >= 50) return { label: 'Kontrolowana panika', tone: 'warn' };
  if (coffee >= 80) return { label: 'Nadmiernie skofeinowany', tone: 'warn' };
  return { label: 'Stabilny Chaos', tone: 'ok' };
}
