import type { Incident, Quiz } from '../shared/dailyPack';
import type { Lang } from '../shared/types';

/**
 * Hand-written daily packs, used when Claude is unavailable (no key, an outage) so the Bureau
 * never opens with an empty board. They rotate by date. Claude's fresh packs are the normal path.
 */

const q = (question: string, a: [string, string, boolean][]) => ({
  question,
  answers: a.map(([text, outcome, approved], i) => ({ letter: (['A', 'B', 'C'] as const)[i], text, outcome, approved })),
});

export const SEED_QUIZZES: Record<Lang, Quiz[]> = {
  en: [
    {
      title: 'Morning Reflex Check',
      intro: 'Good morning, Agent. Three questions, no wrong answers. Some answers are just more wrong than others.',
      questions: [
        q('A wolf in a nightcap asks for your Wi-Fi password. You…', [
          ['Tell him it’s “password”.', 'He logs in, downloads 400 GB of grandma memes and the forest router catches fire. Gently.', false],
          ['Ask him to verify his identity with a selfie.', 'He sends a selfie. It is clearly a wolf. He insists it is a filter. You are now in a three-hour argument about filters.', true],
          ['Offer him a cookie instead.', 'He accepts. It is a tracking cookie. He is now receiving ads for sheep.', false],
        ]),
        q('Your mana battery is at 3%. What do you do?', [
          ['Plug yourself into a dragon.', 'The dragon is flattered. You are now overcharged and can taste colours.', false],
          ['Switch to Low Magic Mode.', 'Your wand now only casts spells in black and white. It is very dramatic. IGNIS approves.', true],
          ['Keep going. Batteries are a social construct.', 'You reach 0% mid-spell and the frog you were turning back into a prince gets stuck as a “frince”.', false],
        ]),
        q('The Gingerbread House asks you to accept all cookies.', [
          ['Accept all. YOLO.', 'The house now knows your favourite flavour, your shoe size and your secret fear of soup.', false],
          ['Reject all and eat the door.', 'The door was load-bearing. The house leans politely to one side.', false],
          ['Open “Manage preferences”.', 'It is 412 pages long and written in icing. You read it all. You are now a legal expert in confectionery.', true],
        ]),
      ],
      verdicts: {
        A: { title: 'The Chaotic Kettle', text: 'You boil first and ask questions never. The Bureau keeps you on speed dial for emergencies and away from the kitchen.' },
        B: { title: 'The Suspicious Owl', text: 'You question everything, including this verdict. Correct. It is fake. (It is not.)' },
        C: { title: 'The Fine-Print Wizard', text: 'You read terms and conditions for fun. Villains fear you. Waiters fear you more.' },
        mixed: { title: 'The Unpredictable Toaster', text: 'Nobody, including you, knows what you will do next. Perfect field-agent material.' },
      },
    },
    {
      title: 'Pop Quiz: Fairy-Tale Tech Support',
      intro: 'The helpdesk is on fire again. Literally: the dragon works there now. Answer quickly.',
      questions: [
        q('Cinderella’s glass slipper says “Session expired”. You suggest…', [
          ['Turning it off and on again.', 'The slipper reboots into a sandal. Cinderella is thrilled: much more comfortable.', true],
          ['Updating to Glass Slipper 2.0.', 'The update is 6 GB and adds a heel-click sound pack nobody asked for.', false],
          ['Blaming the pumpkin.', 'The pumpkin files a complaint with HR. HR is also a pumpkin.', false],
        ]),
        q('Three Little Pigs want the most secure house. Which material?', [
          ['Straw, but with a really strong password.', 'The password is “straw”. The house blows away, but the password is still technically intact.', false],
          ['Bricks with two-factor doors.', 'Very secure. The pigs locked themselves out twice before lunch.', true],
          ['A cloud.', 'The house is now “in the cloud”. Specifically, a rain cloud. Everything is damp.', false],
        ]),
        q('The magic mirror keeps answering before you ask. Diagnosis?', [
          ['Autocomplete is too enthusiastic.', 'You turn it down to “polite”. The mirror now finishes only half of your sentences.', true],
          ['The mirror is haunted.', 'It is not haunted. It is offended. It sulks and shows only your left ear for a week.', false],
          ['It’s just very fast at reading minds.', 'It reads yours, sighs, and recommends a nap.', false],
        ]),
      ],
      verdicts: {
        A: { title: 'The Reboot Ranger', text: 'Your first instinct is to switch it off and on again. Annoyingly, it works 80% of the time.' },
        B: { title: 'The Overengineer', text: 'You would install a firewall on a sandwich. The sandwich has never been safer.' },
        C: { title: 'The Blame Detective', text: 'It is always the pumpkin. You may even be right.' },
        mixed: { title: 'The Helpdesk Legend', text: 'You tried everything, in random order, with confidence. That is basically IT support.' },
      },
    },
  ],
  pl: [
    {
      title: 'Poranny test refleksu',
      intro: 'Dzień dobry, Agent. Trzy pytania, żadnej złej odpowiedzi. Niektóre są po prostu gorsze od innych.',
      questions: [
        q('Wilk w szlafmycy prosi o hasło do Wi-Fi. Co robisz?', [
          ['Mówisz, że to „haslo123”.', 'Wilk loguje się, pobiera 400 GB memów z babciami, a leśny router delikatnie się zapala.', false],
          ['Prosisz o weryfikację selfie.', 'Wysyła selfie. To ewidentnie wilk. Twierdzi, że to filtr. Od trzech godzin kłócicie się o filtry.', true],
          ['Proponujesz mu ciasteczko.', 'Bierze. To ciasteczko śledzące. Wilk dostaje teraz reklamy owiec.', false],
        ]),
        q('Bateria many: 3%. Co robisz?', [
          ['Podłączasz się do smoka.', 'Smok jest zachwycony. Masz przeładowanie i czujesz smak kolorów.', false],
          ['Włączasz tryb oszczędzania magii.', 'Różdżka rzuca teraz czary tylko w czerni i bieli. Bardzo dramatycznie. Ignis zatwierdza.', true],
          ['Lecisz dalej. Baterie to umowa społeczna.', 'Bateria pada w połowie czaru i żaba w trakcie odczarowywania zostaje „królewiczabą”.', false],
        ]),
        q('Piernikowa chatka prosi o akceptację wszystkich ciasteczek.', [
          ['Akceptujesz wszystkie. Raz się żyje.', 'Chatka zna teraz twój ulubiony smak, rozmiar buta i sekretny lęk przed zupą.', false],
          ['Odrzucasz wszystkie i zjadasz drzwi.', 'Drzwi były nośne. Chatka grzecznie przechyla się na bok.', false],
          ['Klikasz „Zarządzaj preferencjami”.', 'Regulamin ma 412 stron i jest napisany lukrem. Czytasz całość. Masz teraz dyplom z prawa cukierniczego.', true],
        ]),
      ],
      verdicts: {
        A: { title: 'Chaotyczny Czajnik', text: 'Najpierw gotujesz, pytań nie zadajesz wcale. Biuro trzyma cię na szybkim wybieraniu, ale z dala od kuchni.' },
        B: { title: 'Podejrzliwa Sowa', text: 'Kwestionujesz wszystko, nawet ten werdykt. Słusznie. Jest fałszywy. (Nie jest.)' },
        C: { title: 'Czarodziej Drobnego Druku', text: 'Czytasz regulaminy dla przyjemności. Złoczyńcy się ciebie boją. Kelnerzy jeszcze bardziej.' },
        mixed: { title: 'Nieprzewidywalny Toster', text: 'Nikt, łącznie z tobą, nie wie, co zrobisz za chwilę. Idealny materiał na agenta terenowego.' },
      },
    },
    {
      title: 'Kartkówka: bajkowy helpdesk',
      intro: 'Helpdesk znów płonie. Dosłownie: smok tam teraz pracuje. Odpowiadaj szybko.',
      questions: [
        q('Szklany pantofelek Kopciuszka wyświetla „Sesja wygasła”. Proponujesz…', [
          ['Wyłączyć i włączyć.', 'Pantofelek restartuje się do klapka. Kopciuszek zachwycony: dużo wygodniej.', true],
          ['Aktualizację do Pantofelka 2.0.', 'Aktualizacja waży 6 GB i dodaje pakiet dźwięków stukania obcasem, o który nikt nie prosił.', false],
          ['Zrzucić winę na dynię.', 'Dynia składa skargę do działu kadr. Dział kadr to też dynia.', false],
        ]),
        q('Trzy Świnki chcą najbezpieczniejszy dom. Jaki materiał?', [
          ['Słoma, ale z bardzo mocnym hasłem.', 'Hasło brzmi „słoma”. Dom odlatuje, ale hasło technicznie przetrwało.', false],
          ['Cegły i drzwi z dwuetapową weryfikacją.', 'Bardzo bezpiecznie. Świnki zamknęły się na zewnątrz dwa razy przed obiadem.', true],
          ['Chmura.', 'Dom jest teraz „w chmurze”. Konkretnie w deszczowej. Wszystko jest wilgotne.', false],
        ]),
        q('Magiczne lustro odpowiada, zanim zapytasz. Diagnoza?', [
          ['Autouzupełnianie jest zbyt entuzjastyczne.', 'Skręcasz je na „uprzejme”. Lustro kończy teraz tylko połowę twoich zdań.', true],
          ['Lustro jest nawiedzone.', 'Nie jest nawiedzone. Jest obrażone. Przez tydzień pokazuje tylko twoje lewe ucho.', false],
          ['Po prostu bardzo szybko czyta w myślach.', 'Czyta twoje, wzdycha i poleca drzemkę.', false],
        ]),
      ],
      verdicts: {
        A: { title: 'Strażnik Restartu', text: 'Pierwszy odruch: wyłączyć i włączyć. Irytujące, ale działa w 80% przypadków.' },
        B: { title: 'Nadinżynier', text: 'Kanapkę też zabezpieczasz firewallem. Ta kanapka nigdy nie była bezpieczniejsza.' },
        C: { title: 'Detektyw od Winy', text: 'To zawsze dynia. Możliwe, że nawet masz rację.' },
        mixed: { title: 'Legenda Helpdesku', text: 'Próbujesz wszystkiego, w losowej kolejności, z pełnym przekonaniem. To w zasadzie jest wsparcie IT.' },
      },
    },
  ],
};

export const SEED_INCIDENTS: Record<Lang, Incident[]> = {
  en: [
    {
      title: 'The Porridge Ransom',
      tale_id: 'just-right-server',
      report:
        'Field report, 07:42. Baby Bear’s “just right” porridge server has locked itself and is demanding a ransom: one perfectly warm bowl of porridge, delivered within the hour. Papa Bear tried shouting at it. Mama Bear tried reasoning with it. Goldilocks tried to log in with “goldilocks1” and is now banned for 900 years. The server’s screen shows a single blinking spoon. IGNIS has prepared a clipboard and a strong opinion.',
      choices: [
        { label: 'Pay the ransom: cook the perfect porridge', outcome: 'You cook for 40 minutes, measure the temperature with a thermometer shaped like a bear, and serve. The server unlocks, eats the porridge, and asks for seconds. You have created a monster, but a polite one.', ending_title: 'Breakfast Negotiator', xp: 25 },
        { label: 'Restore from yesterday’s backup', outcome: 'Yesterday’s backup was taken mid-breakfast. Everything is restored, including the porridge, which is now one day old and very confident. The server is fine. The porridge is running for mayor.', ending_title: 'Backup Hero', xp: 35 },
        { label: 'Distract the server with a cat video', outcome: 'The server watches the video. Then the next one. Then 300 more. It is unlocked but will not stop recommending cats to the bears.', ending_title: 'Algorithm Tamer', xp: 15 },
      ],
      signoff: 'Case filed under “Breakfast, hostile”. Excellent work, Agent. Please wash the spoon.',
    },
    {
      title: 'The Mirror Spoiler Incident',
      tale_id: null,
      report:
        'Bureau HQ, 09:10. The Snow White magic mirror has started answering questions before anyone asks them, and now it is spoiling every fairy tale in the archive. It already told three princes how their stories end. One prince cried. One prince left a one-star review. The third prince is a frog and did not understand. The mirror is now loudly reading out the ending of the Wawel Dragon.',
      choices: [
        { label: 'Cover the mirror with a “No spoilers” towel', outcome: 'The mirror sulks behind the towel and starts spoiling things in a whisper. Slightly better. Everyone leans closer to hear, which defeats the point.', ending_title: 'Spoiler Containment', xp: 20 },
        { label: 'Install a “Spoiler warning” update', outcome: 'Now the mirror shouts “SPOILER WARNING!” for four minutes before every sentence. Nobody hears the spoilers anymore because everyone has left. Problem technically solved.', ending_title: 'Patch Master', xp: 30 },
        { label: 'Ask the mirror to spoil its own ending', outcome: 'The mirror tries, panics, and freezes in an infinite loop of “and then I… and then I…”. It reboots humble. Classic paradox play.', ending_title: 'Paradox Agent', xp: 35 },
      ],
      signoff: 'IGNIS here: I would tell you how the next case ends, but I respect you. Mostly.',
    },
  ],
  pl: [
    {
      title: 'Owsiankowy okup',
      tale_id: 'just-right-server',
      report:
        'Raport z terenu, 7:42. Serwer owsiankowy Misia, ten „w sam raz”, zablokował się i żąda okupu: jednej idealnie ciepłej miski owsianki w ciągu godziny. Tata Miś na niego krzyczał. Mama Miś próbowała z nim rozmawiać. Złotowłosa próbowała się zalogować hasłem „zlotowlosa1” i dostała bana na 900 lat. Na ekranie serwera miga samotna łyżka. Ignis przygotował podkładkę i bardzo stanowczą opinię.',
      choices: [
        { label: 'Zapłać okup: ugotuj idealną owsiankę', outcome: 'Gotujesz 40 minut, mierzysz temperaturę termometrem w kształcie misia i podajesz. Serwer się odblokowuje, zjada owsiankę i prosi o dokładkę. Właśnie powstał potwór. Na szczęście uprzejmy.', ending_title: 'Śniadaniowy Negocjator', xp: 25 },
        { label: 'Przywróć wczorajszą kopię zapasową', outcome: 'Wczorajsza kopia powstała w połowie śniadania. Wszystko wraca, łącznie z owsianką, która ma teraz jeden dzień i ogromną pewność siebie. Serwer działa. Owsianka kandyduje na burmistrza.', ending_title: 'Bohater Kopii Zapasowej', xp: 35 },
        { label: 'Odwróć uwagę serwera filmikiem z kotem', outcome: 'Serwer ogląda filmik. Potem następny. Potem 300 kolejnych. Jest odblokowany, ale nie przestaje polecać misiom kotów.', ending_title: 'Pogromca Algorytmów', xp: 15 },
      ],
      signoff: 'Sprawa zarchiwizowana jako „Śniadanie, wrogie”. Świetna robota, Agent. Proszę umyć łyżkę.',
    },
    {
      title: 'Incydent spoilerowego lustra',
      tale_id: null,
      report:
        'Centrala Biura, 9:10. Magiczne lustro Królewny Śnieżki zaczęło odpowiadać, zanim ktokolwiek zapyta, a teraz spoileruje każdą baśń w archiwum. Trzem królewiczom zdradziło już zakończenia. Jeden się popłakał. Drugi wystawił jedną gwiazdkę. Trzeci jest żabą i nie zrozumiał. Lustro właśnie głośno czyta zakończenie Smoka Wawelskiego.',
      choices: [
        { label: 'Zasłoń lustro ręcznikiem „Bez spoilerów”', outcome: 'Lustro obraża się za ręcznikiem i spoileruje teraz szeptem. Trochę lepiej. Wszyscy nachylają się, żeby usłyszeć, co mija się z celem.', ending_title: 'Kwarantanna Spoilerów', xp: 20 },
        { label: 'Zainstaluj aktualizację „Ostrzeżenie o spoilerach”', outcome: 'Lustro krzyczy teraz „UWAGA, SPOILER!” przez cztery minuty przed każdym zdaniem. Nikt już nie słyszy spoilerów, bo wszyscy wyszli. Problem technicznie rozwiązany.', ending_title: 'Mistrz Łatek', xp: 30 },
        { label: 'Poproś lustro, by zaspoilerowało własne zakończenie', outcome: 'Lustro próbuje, panikuje i zawiesza się w pętli „a potem ja… a potem ja…”. Restartuje się w pokorze. Klasyczny paradoks.', ending_title: 'Agent Paradoksu', xp: 35 },
      ],
      signoff: 'Tu Ignis: powiedziałbym ci, jak kończy się następna sprawa, ale cię szanuję. Przeważnie.',
    },
  ],
};
