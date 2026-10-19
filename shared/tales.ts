import type { Tale } from './types';

export const TALES: Tale[] = [
  {
    id: 'red-hood',
    tech: 'Man-in-the-middle',
    hue: 8,
    emoji: '🐺',
    title: { en: 'Little Red Packet', pl: 'Czerwony Pakiecik' },
    tagline: {
      en: 'Deliver an encrypted payload to Grandma’s server. The wolf has a suspiciously large SSL certificate.',
      pl: 'Dostarcz zaszyfrowany pakiet na serwer Babci. Wilk ma podejrzanie duży certyfikat SSL.',
    },
    twist:
      'Red Riding Hood is a courier carrying an encrypted data packet through the Dark Forest Network to Grandma’s legacy server. The Wolf is a man-in-the-middle attacker who spoofs Grandma’s identity. The Woodcutter is an overworked sysadmin.',
    beats: [
      'Mother hands over the packet with a warning: stay on the encrypted path',
      'The Wolf intercepts and suggests an "unsecured shortcut"',
      'The Wolf reaches Grandma’s server first and spoofs her',
      '"What big ports you have, Grandma"',
      'The sysadmin arrives (or does not)',
    ],
    cast: ['Red (courier)', 'Mother (paranoid security officer)', 'The Wolf (MITM attacker)', 'Grandma (legacy server, runs on Windows XP)', 'The Woodcutter (sysadmin)'],
    art: 'dark neon forest made of fibre-optic trees, red hooded courier, glowing data packets',
  },
  {
    id: 'three-pigs',
    tech: 'DDoS',
    hue: 330,
    emoji: '🐷',
    title: { en: 'Three Little Firewalls', pl: 'Trzy Małe Firewalle' },
    tagline: {
      en: '“I’ll huff and I’ll puff and I’ll DDoS your house down.”',
      pl: '„Dmuchnę, chuchnę i zDDoSuję ci chatkę.”',
    },
    twist:
      'Three pig siblings each build a home server with a different security tier: straw (no password), sticks (password "password123"), bricks (zero-trust architecture, very annoying to use). The Big Bad Wolf runs a botnet and huffs and puffs as a DDoS.',
    beats: [
      'The pigs leave home and pick their security budgets',
      'The Wolf takes down the straw server',
      'The Wolf brute-forces the stick server',
      'Everyone flees into the brick server',
      'The Wolf tries the chimney exploit',
    ],
    cast: ['Pig #1 (vibe coder)', 'Pig #2 (copy-pastes from forums)', 'Pig #3 (security paranoid)', 'Big Bad Wolf (botnet operator)'],
    art: 'three cartoon pigs with glowing server-racks for houses, a wolf exhaling a storm of red packets',
  },
  {
    id: 'hansel-gretel',
    tech: 'Tracking cookies',
    hue: 32,
    emoji: '🍪',
    title: { en: 'Hansel & Gretel & Cookies', pl: 'Jaś, Małgosia i Ciasteczka' },
    tagline: {
      en: 'The breadcrumbs were tracking cookies all along. The gingerbread house is a honeypot.',
      pl: 'Okruszki to były ciasteczka śledzące. Piernikowa chatka to honeypot.',
    },
    twist:
      'Hansel and Gretel leave tracking cookies instead of breadcrumbs, but an ad-blocking bird eats them. The gingerbread house is a honeypot run by a Witch who harvests user data and fattens profiles for targeted ads.',
    beats: [
      'The siblings are abandoned in the forest after a budget cut',
      'The cookie trail gets eaten',
      'They find an irresistibly free gingerbread house',
      'The Witch locks Hansel in a cage and starts profiling him',
      'Gretel and the oven',
    ],
    cast: ['Hansel', 'Gretel (the actually competent one)', 'The Witch (data broker)', 'The ad-blocking bird'],
    art: 'neon gingerbread house dripping holographic icing, cookie crumbs glowing like tracking pixels',
  },
  {
    id: 'cinderella',
    tech: 'Session expiry',
    hue: 265,
    emoji: '👠',
    title: { en: 'Cinderella: Session Expired', pl: 'Kopciuszek: Sesja Wygasła' },
    tagline: {
      en: 'At midnight the auth token expires. The glass slipper is a hardware 2FA key.',
      pl: 'O północy wygasa token. Kryształowy pantofelek to klucz sprzętowy 2FA.',
    },
    twist:
      'Cinderella is a junior dev doing unpaid overtime for her step-family’s startup. The Fairy Godmother is a sketchy freelance magic contractor whose spell runs on a session token that expires at midnight. The glass slipper is a hardware 2FA key that only authenticates its owner.',
    beats: [
      'The step-family leaves for the royal hackathon ball',
      'The Fairy Godmother deploys a temporary transformation',
      'Cinderella dazzles the Prince at the ball',
      'Midnight: token expiry, the pumpkin rolls back',
      'The Prince tries the 2FA key on every foot in the kingdom',
    ],
    cast: ['Cinderella (junior dev)', 'Stepmother (CEO)', 'Stepsisters (product managers)', 'Fairy Godmother (contractor)', 'The Prince (venture capitalist)'],
    art: 'cyber palace ballroom with holographic chandeliers, a pumpkin-shaped hover car, a glowing glass slipper USB key',
  },
  {
    id: 'wawel-dragon',
    tech: 'Trojan payload',
    hue: 150,
    emoji: '🐉',
    title: { en: 'The Wawel Dragon Exploit', pl: 'Exploit Smoka Wawelskiego' },
    tagline: {
      en: 'A cobbler-pentester, a sheep-shaped trojan, and a dragon with zero input validation.',
      pl: 'Szewczyk-pentester, trojan w kształcie owcy i smok bez walidacji danych wejściowych.',
    },
    twist:
      'The Dragon under Wawel Hill is a rogue AI that devours every input without validation. King Krak offers his daughter’s hand (and equity) to whoever patches it. Skuba the cobbler is a junior pentester who builds a sheep-shaped trojan stuffed with sulfur malware.',
    beats: [
      'The dragon terrorises Kraków’s network',
      'Knights fail with brute-force attacks',
      'The cobbler crafts the sulfur sheep payload',
      'The dragon swallows the sheep and overheats',
      'The dragon drinks the Vistula trying to cool its CPU',
    ],
    cast: ['Skuba (cobbler-pentester)', 'King Krak (non-technical founder)', 'The Princess (actually the best engineer)', 'The Wawel Dragon (rogue AI)'],
    art: 'neon Kraków skyline and Wawel castle, a giant cybernetic dragon with server-fan wings, a sheep with glowing circuitry',
  },
];

export const getTale = (id: string) => TALES.find((t) => t.id === id);
