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
    art: 'a snowy forest of pine trees strung with fibre-optic fairy lights, a red-hooded courier carrying a glowing parcel, a sly wolf with a hacker headset',
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
    art: 'three cartoon pigs in front of a straw hut, a stick shack and a brick server-house with blinking lights, a wolf blowing a gust full of red error icons',
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
    art: 'a gingerbread cottage with candy-cane antennas and blinking cookie lights in a snowy forest, a trail of glowing cookie crumbs',
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
      'Cinderella is a junior dev who does all the boring jobs at her step-family’s startup. The Fairy Godmother is a sketchy freelance magic contractor whose spell runs on a session token that expires at midnight. The glass slipper is a hardware 2FA key that only authenticates its owner.',
    beats: [
      'The step-family leaves for the royal hackathon ball',
      'The Fairy Godmother deploys a temporary transformation',
      'Cinderella dazzles the Prince at the ball',
      'Midnight: token expiry, the pumpkin rolls back',
      'The Prince tries the 2FA key on every foot in the kingdom',
    ],
    cast: ['Cinderella (junior dev)', 'Stepmother (CEO)', 'Stepsisters (product managers)', 'Fairy Godmother (contractor)', 'The Prince (runs the kingdom’s biggest game server)'],
    art: 'a cozy candlelit palace ballroom with garlands and a giant clock near midnight, a pumpkin-shaped hover carriage, a glowing glass-slipper USB key',
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
      'The Dragon under Wawel Hill is a rogue AI that devours every input without validation. King Krak offers half the kingdom (and free Wi-Fi for life) to whoever patches it. Skuba the cobbler is a junior pentester who builds a sheep-shaped trojan stuffed with sulfur malware.',
    beats: [
      'The dragon terrorises Kraków’s network',
      'Knights fail with brute-force attacks',
      'The cobbler crafts the sulfur sheep payload',
      'The dragon swallows the sheep and overheats',
      'The dragon drinks the Vistula trying to cool its CPU',
    ],
    cast: ['Skuba (cobbler-pentester)', 'King Krak (non-technical founder)', 'The Princess (actually the best engineer)', 'The Wawel Dragon (rogue AI)'],
    art: 'Wawel castle on a snowy hill above the Vistula, a big goofy robot dragon with server-fan wings and a pixel-screen face, a woolly sheep stitched with glowing circuitry',
  },

  // ---------- Quick cases: the same engine, a few pages each ----------
  {
    id: 'latency-race',
    format: 'quick',
    maxDepth: 5,
    minDepth: 3,
    tech: 'Latency',
    hue: 95,
    emoji: '🐢',
    title: { en: 'The Latency Race', pl: 'Wyścig z Lagiem' },
    tagline: {
      en: 'The Hare has gigabit fibre. The Tortoise has a dial-up modem and a plan. Somebody set the finish line on a server in another continent.',
      pl: 'Zając ma światłowód. Żółw ma modem i plan. Ktoś postawił metę na serwerze na innym kontynencie.',
    },
    twist:
      'The race between the Tortoise and the Hare is an online race. The Hare has blazing bandwidth but terrible ping because he keeps hopping between Wi-Fi networks and stopping to stream himself. The Tortoise has a slow, steady, wired connection with tiny latency. The race judge is a sleepy Owl who only counts packets that arrive in order.',
    beats: [
      'The Hare boasts and challenges the Tortoise',
      'The Hare dashes ahead, then stops to show off (and buffer)',
      'The Tortoise keeps a steady, wired pace',
      'The Tortoise crosses the finish line while the Hare is still reconnecting',
    ],
    cast: ['The Tortoise (wired and patient)', 'The Hare (fast but laggy streamer)', 'The Owl (race judge, counts packets)'],
    art: 'a winding forest race track lit by lanterns, a calm tortoise trailing a long glowing network cable, a speedy hare with a headset and a spinning buffering wheel above his head',
  },
  {
    id: 'false-positive',
    format: 'quick',
    maxDepth: 5,
    minDepth: 3,
    tech: 'False alarms',
    hue: 40,
    emoji: '🐑',
    title: { en: 'False Positive', pl: 'Fałszywy Alarm' },
    tagline: {
      en: 'The shepherd boy’s alarm system cried “WOLF!” forty times today. Thirty-nine were a cloud shaped like a wolf.',
      pl: 'System alarmowy pastuszka krzyknął dziś „WILK!” czterdzieści razy. Trzydzieści dziewięć razy był to obłok w kształcie wilka.',
    },
    twist:
      'The Boy Who Cried Wolf is a junior security guard whose brand-new magic alarm sends an alert for everything: clouds, sheep sneezing, his own reflection. The villagers have muted the notifications. Now a real wolf is testing the fence, and nobody reads the alerts any more. The lesson is alert fatigue and tuning an alarm so it only rings for real danger.',
    beats: [
      'The alarm rings for silly reasons and the villagers grow tired of it',
      'The villagers mute the alerts',
      'A real wolf appears',
      'Nobody comes, unless the alarm can be trusted again',
    ],
    cast: ['The Shepherd Boy (junior security guard)', 'The Villagers (notification-muters)', 'The Wolf (real, patient, polite)', 'The Sheep (dramatic)'],
    art: 'a green hillside village with a flock of fluffy sheep, a shepherd boy beside a glowing magic alarm bell covered in blinking notification bubbles, a sly wolf peeking over a stone fence',
  },
  {
    id: 'just-right-server',
    format: 'quick',
    maxDepth: 5,
    minDepth: 3,
    tech: 'Load balancing',
    hue: 270,
    emoji: '🥣',
    title: { en: 'Just Right Server', pl: 'Serwer w Sam Raz' },
    tagline: {
      en: 'One server is too hot, one too cold, one just right. Goldilocks is routing the whole forest’s traffic through the last one.',
      pl: 'Jeden serwer za gorący, drugi za zimny, trzeci w sam raz. Złotowłosa puszcza przez niego ruch całego lasu.',
    },
    twist:
      'The Three Bears run a cottage data centre with three servers: Papa Bear’s is overheating, Mama Bear’s is idle and freezing, Baby Bear’s is just right. Goldilocks, a cheerful intern, sends every request to the “just right” one until it wobbles. The fix is load balancing: sharing the work so no server is too hot or too cold.',
    beats: [
      'Goldilocks finds the empty cottage data centre',
      'She tries each server: too hot, too cold, just right',
      'She overloads the just-right server',
      'The Bears come home and find their servers in a state',
    ],
    cast: ['Goldilocks (enthusiastic intern)', 'Papa Bear (overheated server admin)', 'Mama Bear (cool-headed engineer)', 'Baby Bear (owner of the just-right server)'],
    art: 'a cozy forest cottage turned into a tiny data centre, three server racks of different sizes like porridge bowls, one steaming, one frosted, one glowing happily, a golden-haired girl with a clipboard',
  },
  {
    id: 'emperors-update',
    format: 'quick',
    maxDepth: 5,
    minDepth: 3,
    tech: 'Social engineering',
    hue: 190,
    emoji: '👑',
    title: { en: 'The Emperor’s New Update', pl: 'Nowa Aktualizacja Cesarza' },
    tagline: {
      en: 'Two travelling coders sold the Emperor an update so advanced that only clever people can see it. The progress bar is also invisible.',
      pl: 'Dwaj wędrowni programiści sprzedali Cesarzowi aktualizację tak nowoczesną, że widzą ją tylko mądrzy. Pasek postępu też jest niewidzialny.',
    },
    twist:
      'Two swindlers sell the Emperor an "invisible premium update" that only clever people can see. Every courtier pretends to see it so they won’t look silly. The Emperor plans a grand launch parade for an update that does nothing. The lesson is social engineering: tricks that work on people instead of computers, and the courage to say "I don’t see it".',
    beats: [
      'The swindlers pitch the invisible update',
      'Courtiers pretend they can see it',
      'The Emperor shows it off at a grand launch parade',
      'A child says out loud that there is nothing there',
    ],
    cast: ['The Emperor (loves shiny updates)', 'The Two Swindlers (travelling "coders")', 'The Courtiers (nodding experts)', 'The Child (honest beta tester)'],
    art: 'a sunny fairy-tale city parade with banners, a proud emperor standing beside an empty glowing display stand, two sly travelling salesmen with briefcases of sparkles, a small child pointing',
  },
];

export const getTale = (id: string) => TALES.find((t) => t.id === id);
export const formatOf = (t: Pick<Tale, 'format'>) => t.format ?? 'case';
/** The 5 main case files (the long tales). */
export const MAIN_TALES = TALES.filter((t) => formatOf(t) === 'case');
export const QUICK_TALES = TALES.filter((t) => formatOf(t) === 'quick');
