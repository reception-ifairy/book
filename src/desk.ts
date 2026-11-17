import { MISSIONS, ENDING_META } from '../shared/arb';
import type { Agent } from '../shared/types';

/** Seeded PRNG (mulberry32) so the desk shows the same gossip and weather all day. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
const pickFrom = <T,>(rnd: () => number, list: T[]) => list[Math.floor(rnd() * list.length)];
const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/* ------------------------------------------------------------ Weather */

export interface Weather {
  place: string;
  icon: string;
  sky: string;
  temp: number;
  note: string;
}

const SKIES: { icon: string; sky: string; note: string }[] = [
  { icon: '☀️', sky: 'Słonecznie, kanonicznie', note: 'Idealne warunki na „i żyli długo i szczęśliwie”.' },
  { icon: '🌫️', sky: 'Mgła fabularna', note: 'Widoczność do trzeciego akapitu.' },
  { icon: '🌧️', sky: 'Deszcz przecinków', note: 'Zdania się wydłużają. Zabierz kropki.' },
  { icon: '🌈', sky: 'Tęcza (nadprogramowa)', note: 'DAM sprawdza, kto wypił eliksir kolorów.' },
  { icon: '⛈️', sky: 'Burza z piorunami Zeusa', note: 'Zeus znowu testuje nowy model piorunów.' },
  { icon: '🍍', sky: 'Przelotne ananasy', note: 'Mówią. Nie wdawaj się w dyskusję.' },
  { icon: '❄️', sky: 'Śnieg z Krainy Lodu', note: 'Królowa Śniegu twierdzi, że to nie ona.' },
  { icon: '🌬️', sky: 'Wiatr zmian w fabule', note: 'Trzymaj zakończenia oburącz.' },
  { icon: '🌙', sky: 'Wieczna noc (lokalnie)', note: 'Ktoś znowu ukradł słońce. Zgłoś na formularzu S-1.' },
];

export function weatherFor(now = new Date()): Weather[] {
  const rnd = seeded(hash(`${dayKey(now)}-${Math.floor(now.getHours() / 4)}`));
  return [
    { place: 'Kraina Baśni', base: 18 },
    { place: 'Biblioteka Zapomnianych Opowieści', base: 12 },
    { place: 'Wielkie Bajkowe Miasto', base: 21 },
  ].map(({ place, base }) => ({ place, ...pickFrom(rnd, SKIES), temp: Math.round(base + (rnd() - 0.5) * 16) }));
}

/* --------------------------------------------------------- Tempus Fugit */

export interface Countdown {
  label: string;
  ms: number;
  /** When the thing is happening right now. */
  now?: string;
}

const MEETINGS = [
  'Zebranie DKSF: „Czy Kopciuszek może mieć smartfona?” (część 14)',
  'Odprawa DIT z kotem (obecność kota nieobowiązkowa)',
  'Szkolenie BHP: bezpieczne zamykanie portali',
  'Spotkanie z Radą Nadzorczą Narracji (przełożone o sto lat)',
  'Integracja zespołu: wspólne pieczętowanie formularzy',
  'Prezentacja DAN: nowy wskaźnik spójności Wieszcz 2.0',
];

export function tempusFugit(agent: Agent, now = new Date()): { shift: Countdown; weekend: Countdown; meeting: Countdown & { title: string }; deadline: Countdown | null } {
  const shiftEnd = new Date(now);
  shiftEnd.setHours(16, 0, 0, 0);
  const day = now.getDay(); // 0 Sun … 6 Sat
  const weekendStart = new Date(now);
  weekendStart.setDate(now.getDate() + ((5 - day + 7) % 7));
  weekendStart.setHours(16, 0, 0, 0);
  const isWeekend = day === 6 || day === 0 || (day === 5 && now >= weekendStart);
  const rnd = seeded(hash(`meeting-${dayKey(now)}`));
  const meetingAt = new Date(now);
  meetingAt.setHours(9 + Math.floor(rnd() * 7), rnd() < 0.5 ? 0 : 30, 0, 0);
  if (meetingAt < now) meetingAt.setDate(meetingAt.getDate() + 1);
  return {
    shift: { label: 'Koniec zmiany', ms: shiftEnd.getTime() - now.getTime(), now: isWeekend ? 'Weekend: zmiana nie istnieje' : now >= shiftEnd ? 'Nadgodziny (niepłatne, ale pachną kawą)' : undefined },
    weekend: { label: 'Weekend', ms: weekendStart.getTime() - now.getTime(), now: isWeekend ? 'TRWA WEEKEND!' : undefined },
    meeting: { label: 'Najbliższe zebranie', ms: meetingAt.getTime() - now.getTime(), title: pickFrom(rnd, MEETINGS) },
    deadline: agent.offer ? { label: 'Termin przyjęcia misji', ms: agent.offer.expiresAt - now.getTime() } : null,
  };
}

export function formatMs(ms: number) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${d ? `${d}d ` : ''}${hh}:${mm}:${ss}`;
}

/* ------------------------------------------------- Plotkarski Telegraf */

export type TelegrafCategory = 'pilne' | 'sluzbowe' | 'spolecznosciowe' | 'postacie';

export const TELEGRAF_TABS: { id: TelegrafCategory; label: string; emoji: string }[] = [
  { id: 'pilne', label: 'Pilne Alerty', emoji: '🚨' },
  { id: 'sluzbowe', label: 'Służbowe', emoji: '📋' },
  { id: 'spolecznosciowe', label: 'Społecznościowe', emoji: '🎉' },
  { id: 'postacie', label: 'Od postaci', emoji: '💌' },
];

export interface TelegrafMessage {
  category: TelegrafCategory;
  from: string;
  text: string;
}

const POOL: Record<TelegrafCategory, [from: string, text: string][]> = {
  pilne: [
    ['DAN / Wieszcz', 'KOD PURPUROWY: wątek „Jaś i Małgosia” zaczyna brzmieć jak telenowela. Piernik w stanie krytycznym.'],
    ['Alarmy Bezpieczeństwa', 'Chochlik drukarski widziany na 4. piętrze. Nie karmić fakturami.'],
    ['DAM', 'Przekroczono dzienny limit magii o 0,4%. Wyłączcie zbędne aury.'],
    ['DKSF', 'Ktoś zmienił zakończenie „Śpiącej Królewny” na „i spała dalej”. Trwa ustalanie sprawcy.'],
    ['DITMT', 'Sieć narracyjna niestabilna. Prosimy nie otwierać więcej niż jednego portalu naraz.'],
    ['Zona Czasowych Paradoksów', 'Jutrzejszy alert został wysłany wczoraj. Prosimy o zachowanie spokoju dzisiaj.'],
  ],
  sluzbowe: [
    ['DSRK', 'Nowe szkolenie: „Walidacja formularzy dla zaawansowanych”. Zapisy na formularzu S-0 (który trzeba najpierw zwalidować).'],
    ['Logistyka', 'Orły pocztowe strajkują w czwartki. Pilną korespondencję wysyłajcie gołębiem albo portalem.'],
    ['Administracja', 'Nowy ekspres do kawy z funkcją telepatii stanął w Mrocznym Korytarzu. Prosimy nie myśleć przy nim o herbacie.'],
    ['DZLiN', 'Regulamin pracy zdalnej z wieży: zakaz spuszczania warkocza po godzinie 22.'],
    ['DATM', 'Zwrot Lampy Alladyna do magazynu przesunięty. Dżin ma zwolnienie lekarskie.'],
    ['Kot (przez Mrucz-Term)', 'Drzemka zarządu: 13:00–15:30. W tym czasie decyzje podejmuje poduszka.'],
  ],
  spolecznosciowe: [
    ['Plotkarski Telegraf', 'Podobno ktoś widział Dyrektora Naczelnego na Instagramie. Zdjęcie było prześwietlone, co pasuje do zjawy.'],
    ['Plotkarski Telegraf', 'Goblin z IT znowu chrapie na zebraniu. Petycja o zakup poduszek wyciszających ma 312 podpisów.'],
    ['Kadry', 'Wszystkiego najlepszego dla Bibliotekarki Echo! (Życzenia prosimy składać dwa razy.)'],
    ['Plotkarski Telegraf', 'Darmowa kawa z rogu Mrocznego Korytarza nadal czeka na pierwszego agenta, który zamknie sprawę przed obiadem.'],
    ['Klub Książki ARB', 'W tym miesiącu czytamy „Regulamin DKSF, tom IV”. Spoiler: wszyscy wypełniają formularz.'],
    ['Plotkarski Telegraf', 'Troll sprzątający awansował na Starszego Trolla Sprzątającego. Mop dostał przydział służbowy.'],
  ],
  postacie: [
    ['Kopciuszek', 'Czy ktoś ma ładowarkę? Mam 4% i północ za dwie godziny.'],
    ['Król Artur', 'Poszukuję króliczego wspólnika do okrągłego stołu. Wymagane: punktualność i własna marchewka.'],
    ['Smok Wawelski', 'Przypominam o wniosku w sprawie światłowodu. Pozdrawiam ogniście.'],
    ['Pinokio', 'Nie kłamię: naprawdę potrzebuję eskorty. (Nos bez zmian, możecie sprawdzić.)'],
    ['Czerwony Kapturek', 'Babcia prosi o więcej ciastek. Wilk prosi o mniej oskarżeń.'],
    ['Rumpelsztyk', 'Nie zgadniecie, jak mam na imię. Ale możecie kupić akcje.'],
    ['Wróżka Chrzestna', 'Faktura nr 7/2026 za brokat wciąż nieopłacona. Bibbidi-bobbidi-ponaglenie.'],
  ],
};

/** Today's messages: a seeded slice of each pool, plus the agent's own news. */
export function telegrafFor(agent: Agent, now = new Date()): TelegrafMessage[] {
  const rnd = seeded(hash(`${agent.id}-${dayKey(now)}`));
  const out: TelegrafMessage[] = [];
  for (const category of Object.keys(POOL) as TelegrafCategory[]) {
    const list = [...POOL[category]].sort(() => rnd() - 0.5).slice(0, 3);
    out.push(...list.map(([from, text]) => ({ category, from, text })));
  }
  const last = [...agent.history].reverse().find((h) => h.ending);
  if (last?.ending) {
    out.unshift({ category: 'spolecznosciowe', from: 'Plotkarski Telegraf', text: `Agent ${agent.codename} zamknął sprawę „${last.title}”: ${ENDING_META[last.ending].label.toLowerCase()}. ${last.ending === 'uratowana' || last.ending === 'tajne-akta' ? 'Kawa z rogu Mrocznego Korytarza czeka!' : 'DKW już ostrzy ołówki.'}` });
  }
  if (agent.offer) {
    const m = MISSIONS.find((x) => x.id === agent.offer!.missionId);
    if (m) out.unshift({ category: 'pilne', from: 'NarratoMat 5000', text: `Na Twoim biurku leży teczka „${m.title}”. Termin przyjęcia biegnie.` });
  }
  return out;
}

/** Stress colour: zen blue → amber → alarm red. */
export const stressColor = (v: number) => (v < 35 ? 'var(--color-ice)' : v < 70 ? 'var(--color-gold)' : 'var(--color-candy)');
