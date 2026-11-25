import type { Lang } from './types';

/**
 * Interrogation room: one suspect of the day, chosen by the date. Each suspect has a secret the agent
 * tries to get out of them, an alibi they hide behind and tells that give them away.
 * Voices come from the character registry (matched by tale and English name) when it is loaded.
 */
export interface Suspect {
  id: string;
  taleId: string;
  /** Matches name_en in the character registry. */
  nameEn: string;
  name: Record<Lang, string>;
  emoji: string;
  charge: Record<Lang, string>;
  /** What they really did. The model reveals it only bit by bit. */
  secret: string;
  alibi: string;
  tells: string[];
}

export const SUSPECTS: Suspect[] = [
  {
    id: 'wolf-mitm',
    taleId: 'red-hood',
    nameEn: 'The Wolf',
    name: { en: 'The Wolf', pl: 'Wilk' },
    emoji: '🐺',
    charge: { en: 'Impersonating Grandma’s server and intercepting a basket of encrypted muffins.', pl: 'Podszywanie się pod serwer Babci i przechwycenie koszyka zaszyfrowanych babeczek.' },
    secret: 'He set up a fake "Grandma" Wi-Fi hotspot in the forest, read the packets Red sent, and only wanted the muffin recipe for his own baking channel.',
    alibi: 'He claims he was at a "forest networking event" and that his giant ears are for "better customer support".',
    tells: ['his certificate is signed "Totally Grandma"', 'he knows the muffin flavour nobody told him', 'he keeps saying "what big ports I have"'],
  },
  {
    id: 'big-bad-botnet',
    taleId: 'three-pigs',
    nameEn: 'Big Bad Wolf',
    name: { en: 'Big Bad Wolf', pl: 'Wielki Zły Wilk' },
    emoji: '🌪️',
    charge: { en: 'Huffing, puffing and flooding two pig servers with a botnet of very small sheep.', pl: 'Dmuchanie, chuchanie i zalanie dwóch świńskich serwerów botnetem bardzo małych owiec.' },
    secret: 'His "huff and puff" is a botnet of 3,000 smart kettles he hacked by trying the password "password". He gets out of breath because he still does the huffing manually for dramatic effect.',
    alibi: 'He says he has asthma and was only "testing the wind resistance" of the houses for an insurance company.',
    tells: ['his pockets whistle like kettles', 'he calls the brick house "a hard target"', 'he gets suspiciously specific about bandwidth'],
  },
  {
    id: 'witch-cookies',
    taleId: 'hansel-gretel',
    nameEn: 'The Witch',
    name: { en: 'The Witch', pl: 'Czarownica' },
    emoji: '🍪',
    charge: { en: 'Running a gingerbread house that collects tracking cookies from every child who nibbles it.', pl: 'Prowadzenie piernikowej chatki, która zbiera ciasteczka śledzące od każdego dziecka, które ją nadgryzie.' },
    secret: 'Every gingerbread tile records who bit it and sells the list of favourite flavours to the Candy Advertising Guild. The breadcrumb trail was her own tracking pixels.',
    alibi: 'She insists she runs a "free community bakery" and the cookies are "just for personalisation, dear".',
    tells: ['she knows your favourite flavour before you say it', 'her oven has a "data processing" sticker', 'she refuses to show the privacy policy (it is written in icing and very long)'],
  },
  {
    id: 'stepmother-session',
    taleId: 'cinderella',
    nameEn: 'The Stepmother',
    name: { en: 'The Stepmother', pl: 'Macocha' },
    emoji: '🕛',
    charge: { en: 'Hijacking Cinderella’s ball session and changing the palace password at 11:59 pm.', pl: 'Przejęcie sesji Kopciuszka na balu i zmiana hasła do pałacu o 23:59.' },
    secret: 'She copied Cinderella’s session token from the glass slipper while "helping" to polish it, so her daughters could log in to the ball as Cinderella. The midnight curse was just the token expiring.',
    alibi: 'She claims she was at home all night "doing the accounts" and has never touched a slipper in her life.',
    tells: ['she has glitter from the slipper on her gloves', 'she uses the word "token" a little too comfortably', 'her daughters both wear a size-36 glass slipper badge'],
  },
  {
    id: 'wawel-dragon',
    taleId: 'wawel-dragon',
    nameEn: 'The Wawel Dragon',
    name: { en: 'The Wawel Dragon', pl: 'Smok Wawelski' },
    emoji: '🐉',
    charge: { en: 'Swallowing every input in Kraków without checking it, including one very suspicious sheep.', pl: 'Połykanie każdego wejścia w Krakowie bez sprawdzania, łącznie z jedną bardzo podejrzaną owcą.' },
    secret: 'He has no input validation at all: he ate the sheep, three tax forms and a Wi-Fi router because they "looked like snacks". He drank the Vistula not because of sulfur but because he swallowed an overclocking spell by accident.',
    alibi: 'He says he is "on a diet" and the sheep "walked in by itself".',
    tells: ['he burps error messages', 'there is wool stuck in his fan vents', 'he answers questions before you finish asking them (no validation)'],
  },
];

/** The same suspect all day for everyone, changing every day. */
export function suspectOfDay(day: string): Suspect {
  let h = 2166136261;
  for (const ch of `${day}#suspect`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return SUSPECTS[(h >>> 0) % SUSPECTS.length];
}

export const MAX_QUESTIONS = 6;
