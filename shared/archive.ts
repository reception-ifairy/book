/**
 * Biblioteka Nieskończonych Opowieści: the archive. Entries are served by the API, which cuts the
 * body of anything above the agent's clearance, so the browser never imports this file.
 */

export type ArchiveCategory = 'basn' | 'postac' | 'artefakt' | 'departament' | 'zjawisko' | 'falszywy-trop';

export const ARCHIVE_CATEGORIES: Record<ArchiveCategory, { label: string; emoji: string }> = {
  basn: { label: 'Baśnie i legendy', emoji: '📖' },
  postac: { label: 'Postacie', emoji: '🧝' },
  artefakt: { label: 'Artefakty', emoji: '🏺' },
  departament: { label: 'Departamenty i procedury', emoji: '🗄️' },
  zjawisko: { label: 'Zjawiska i anomalie', emoji: '🌀' },
  'falszywy-trop': { label: 'Dział Błędów i Przekłamań', emoji: '🚫' },
};

/** A small interactive scenario inside an entry: pick an option, read the outcome. */
export interface ArchiveSimulation {
  prompt: string;
  options: { label: string; outcome: string; correct: boolean }[];
}

export interface ArchiveEntry {
  id: string;
  title: string;
  category: ArchiveCategory;
  /** 0..5: the rank clearance needed to read the body (see RANKS in shared/arb.ts). */
  clearance: number;
  /** Always visible, even when the entry is locked. */
  summary: string;
  /** Paragraphs. */
  body: string[];
  /** Ids of other archive entries. */
  related: string[];
  locationId?: string;
  missionIds?: string[];
  /** Dział Błędów i Przekłamań: what everybody believes and what is true. */
  falseLead?: { claim: string; truth: string };
  simulation?: ArchiveSimulation;
}

export interface ArchiveComment {
  id: string;
  entryId: string;
  codename: string;
  text: string;
  /** 1..5 */
  rating: number;
  /** Shown as a warning to other agents. */
  warning: boolean;
  createdAt: number;
}

/** The list view: locked entries come without body, simulation or false-lead truth. */
export interface ArchiveListItem {
  id: string;
  title: string;
  category: ArchiveCategory;
  clearance: number;
  summary: string;
  locked: boolean;
  rating: number | null;
  comments: number;
  warnings: number;
  locationId?: string;
}

export interface ArchiveEntryView {
  entry: ArchiveEntry;
  comments: ArchiveComment[];
}

export const ARCHIVE: ArchiveEntry[] = [
  /* ---------------------------------------------------------- Baśnie i legendy */
  {
    id: 'czerwony-kapturek',
    title: 'Czerwony Kapturek',
    category: 'basn',
    clearance: 0,
    summary: 'Dziewczynka, koszyk, wilk, babcia. Najczęściej audytowana ścieżka leśna w multiwersum.',
    body: [
      'Kanon przewiduje jedną trasę, jeden koszyk i jedno spotkanie z wilkiem. Każde odstępstwo od tej sekwencji DAN odnotowuje jako spadek Wskaźnika Spójności o 2–5 punktów.',
      'Od trzech sezonów koszyk Kapturka dociera do babci lżejszy, niż wyruszył. DKSF wszczęło postępowanie wyjaśniające „w sprawie ciastek”. Wilk został zawieszony w obowiązkach antagonisty do czasu zakończenia terapii.',
      'Uwaga dla agentów terenowych: ścieżki w Zaczarowanym Lesie zmieniają się, gdy nikt nie patrzy. Patrzcie.',
    ],
    related: ['ft-wilk-winny', 'wskaznik-spojnosci'],
    locationId: 'las',
    missionIds: ['kapturek-ciastka'],
    simulation: {
      prompt: 'Spotykasz Kapturka na ścieżce. W koszyku zostały dwa ciastka z dwunastu. Co robisz najpierw?',
      options: [
        { label: 'Aresztuję wilka. Zawsze to wilk.', outcome: 'Wilk dostaje ataku paniki, terapeuta wystawia ARB rachunek, a ciastek dalej ubywa. DKW zakłada Ci teczkę.', correct: false },
        { label: 'Sporządzam inwentaryzację koszyka (formularz C-0) i pytam, kto zamawiał ciastka.', outcome: 'Kapturek pokazuje karteczkę z zamówieniem od babci. Liczba ciastek się zgadza… z dietą babci. Trop przejęty.', correct: true },
        { label: 'Zjadam pozostałe dwa ciastka jako dowód rzeczowy.', outcome: 'Wskaźnik Spójności spada o 7 punktów. Babcia zostaje bez ciastek. Wilk płacze z ulgi, bo ktoś inny jest winny.', correct: false },
      ],
    },
  },
  {
    id: 'kopciuszek',
    title: 'Kopciuszek',
    category: 'basn',
    clearance: 0,
    summary: 'Bal, północ, pantofelek. Ostatnio również: smartfon z obiektywem 24 Mpx.',
    body: [
      'Kluczowy rekwizyt kanoniczny: szklany pantofelek. Rekwizyty zastępcze (telefony, karty miejskie, słuchawki bezprzewodowe) są niedopuszczalne i podlegają zgłoszeniu na formularzu K-1.',
      'Magia Wróżki Chrzestnej ma termin ważności: o północy wszystko wraca do formy pierwotnej. Dotyczy to również ładowarek, power banków i zdjęć w galerii, które zamieniają się w pestki dyni.',
      'Książę ma skłonność do identyfikowania właścicielek zgubionych przedmiotów w sposób, który DZLiN określa jako „mało nowoczesny”.',
    ],
    related: ['wskaznik-spojnosci'],
    locationId: 'palac',
    missionIds: ['kopciuszek-smartfon'],
  },
  {
    id: 'urashima-taro',
    title: 'Urashima Tarō',
    category: 'basn',
    clearance: 2,
    summary: 'Rybak, który spędził w Pałacu Smoczego Króla trzy dni. Na powierzchni minęło trzysta lat.',
    body: [
      'Urashima uratował żółwia i w nagrodę trafił do podmorskiego pałacu księżniczki Otohime. Wyjeżdżając, otrzymał lakierowane pudełko z zakazem otwierania.',
      'DLiTM klasyfikuje pudełko jako „ładunek międzyczasowy kategorii T”. Przewóz wymaga formularza T-3 i co najmniej jednego agenta, który nie jest ciekawski.',
      'Notatka analityczna DAN: zawartość pudełka nie odpowiada opisowi z kanonu. Wieszcz wykrywa w nim „gęstość informacyjną typową dla skrzynki odbiorczej po urlopie”. Nie otwierać w biurze.',
    ],
    related: ['zona-paradoksow'],
    locationId: 'palac-smoczego-krola',
    missionIds: ['urashima-pudelko'],
  },
  {
    id: 'el-dorado',
    title: 'El Dorado',
    category: 'basn',
    clearance: 2,
    summary: 'Złote miasto, które istnieje wyłącznie dzięki temu, że nikt go nie znalazł.',
    body: [
      'Legenda stabilna od kilkuset lat właśnie dlatego, że wszystkie wyprawy kończyły się porażką. Każda prawdziwa mapa zwiększa materialność miasta o ok. 8%.',
      'Status DKSF: „legenda chroniona nieodnalezieniem”. Rysowanie map jest zabronione, sprzedawanie map jest zabronione podwójnie.',
      'Z akt sprawy: ostatnia mapa była narysowana złotym atramentem, a takiego atramentu nie ma w żadnym sklepie poza samym El Dorado. Wnioski pozostawiamy agentom.',
    ],
    related: ['ft-mapa-eldorado'],
    locationId: 'eldorado',
    missionIds: ['eldorado-mapa'],
  },

  /* ---------------------------------------------------------------- Postacie */
  {
    id: 'smok-wawelski',
    title: 'Smok Wawelski',
    category: 'postac',
    clearance: 0,
    summary: 'Istota odradzająca się. Obecnie domaga się światłowodu 10 Tb/s.',
    body: [
      'Smok Wawelski należy do kategorii Istot Odradzających Się: po każdym kanonicznym zakończeniu (baran, siarka, Wisła) wraca w następnym czytaniu. Sprawy z jego udziałem prowadzi Dział Negocjacji z Istotami Odradzającymi Się (DNIOS).',
      'Aktualne żądanie: łącze światłowodowe 10 Tb/s do jaskini. Smok grozi strajkiem odradzania się, co pozbawiłoby legendę zakończenia, a Szewczyka Dratewkę pracy.',
      'Dratewka trzyma w gotowości barana z siarką „na wszelki wypadek”. DNIOS uprzejmie prosi, by go nie używać przed zakończeniem negocjacji.',
    ],
    related: ['weganski-smok', 'dkw-procedury'],
    locationId: 'wawel',
    missionIds: ['smok-swiatlowod'],
    simulation: {
      prompt: 'Smok otwiera negocjacje zdaniem: „Albo światłowód, albo nie odradzam się”. Twoja pierwsza kwestia?',
      options: [
        { label: '„Zgodnie z §14 regulaminu DNIOS żądania infrastrukturalne składa się na piśmie.”', outcome: 'Smok zjada regulamin. Dosłownie. Ale przynajmniej się uśmiecha. Negocjacje trwają.', correct: false },
        { label: '„Do czego jest Ci potrzebne takie łącze?”', outcome: 'Smok długo milczy, a potem pyta, czy w innych bajkach smoki czasem wygrywają. Właśnie dowiedziałeś się, o co naprawdę chodzi.', correct: true },
        { label: 'Daję znak Dratewce.', outcome: 'Baran wybucha, smok odradza się w złym humorze i podnosi żądanie do 20 Tb/s. DKSF nalicza karę.', correct: false },
      ],
    },
  },
  {
    id: 'pinokio',
    title: 'Pinokio',
    category: 'postac',
    clearance: 0,
    summary: 'Drewniany chłopiec, którego nos jest najdokładniejszym wykrywaczem kłamstw w multiwersum.',
    body: [
      'Pinokio jest jedyną postacią z certyfikatem DAN „Biologiczny Wskaźnik Prawdomówności”. Każde kłamstwo wydłuża nos o 3–12 cm, zależnie od skali.',
      'Przewóz Pinokia wymaga formularza Z-12 (zgoda na przewóz drewna), ponieważ formalnie wciąż jest kłodą sosnową.',
      'Znane zagrożenia: Lis i Kot, para oszustów z wieloletnim doświadczeniem w organizacji wydarzeń „specjalnych”.',
    ],
    related: ['wskaznik-spojnosci'],
    locationId: 'miasto',
    missionIds: ['pinokio-konferencja'],
  },
  {
    id: 'krasnoludki',
    title: 'Siedmiu Krasnoludków',
    category: 'postac',
    clearance: 1,
    summary: 'Górnicy, współlokatorzy Śnieżki, właściciele siedmiu łóżeczek i jednego sporu z goblinami.',
    body: [
      'Krasnoludki prowadzą Kopalnię Diamentów w Górach Krasnoludów na podstawie koncesji z czasów „Dawno, dawno temu”. Granicę z kopalnią goblinów wyznacza linia kredowa, która co noc przesuwa się o trzy metry.',
      'DAM odnotował w ostatnim kwartale nietypowy pobór magii w kopalni: wzorzec charakterystyczny dla laboratoriów, nie dla wyrobisk. Zakupy krasnoludków obejmują probówki, inkubator i 400 kg mąki.',
      'Jeśli krasnoludki znikną, sprawdźcie najpierw podziemia, potem rejestr spółek.',
    ],
    related: ['ft-krolowa-krasnoludki', 'robak-kret'],
    locationId: 'kopalnie',
    missionIds: ['krasnoludki-znikniecie', 'krasnoludy-gobliny'],
  },
  {
    id: 'rumpelsztyk',
    title: 'Rumpelsztyk',
    category: 'postac',
    clearance: 2,
    summary: 'Karzeł, który przędzie złoto ze słomy i strzeże swojego imienia jak tajemnicy państwowej.',
    body: [
      'Cała baśń opiera się na jednym założeniu: imię Rumpelsztyka jest tajne aż do finału. Ujawnienie go przedwcześnie kasuje zakończenie, co DKSF klasyfikuje jako szkodę kategorii A.',
      'Rumpelsztyk rozważa wprowadzenie swojego imienia na giełdę jako aktywa niematerialnego. Kontrahentem są demony giełdowe, znane z umów, których nikt nie czyta do końca.',
      'Zalecenie DZP: nie czytać umów demonów na głos. Pod żadnym pozorem. Nawet jeśli bardzo prosi notariusz.',
    ],
    related: ['ft-imie-rumpelsztyka'],
    locationId: 'miasto',
    missionIds: ['rumpel-gielda'],
  },
  {
    id: 'sun-wukong',
    title: 'Sun Wukong, Małpi Król',
    category: 'postac',
    clearance: 1,
    summary: 'Król Góry Kwiatów i Owoców, właściciel kostura zmieniającego rozmiar i ego niezmieniającego rozmiaru.',
    body: [
      'Kostur Ruyi Jingu Bang zmienia rozmiar na życzenie właściciela: od filaru podtrzymującego ocean po igłę noszoną za uchem. DATM prowadzi go w rejestrze artefaktów jako „przedmiot o niestabilnej kubaturze”.',
      'Wukong uwielbia testować przybyszów. Agentom zaleca się zakładać, że każda jego wypowiedź jest zagadką, każda zagadka pułapką, a każda pułapka żartem.',
      'Przedmioty mniejsze od słuchawki dousznej, zgubione w multiwersum, statystycznie trafiają do jednego, dobrze znanego wymiaru.',
    ],
    related: ['wymiar-sluchawek'],
    locationId: 'gora-kwiatow',
    missionIds: ['wukong-kostur'],
  },
  {
    id: 'curupira',
    title: 'Curupira',
    category: 'postac',
    clearance: 1,
    summary: 'Rudowłosy strażnik lasu, chodzący stopami do tyłu. Każdy pościg kończy w punkcie wyjścia.',
    body: [
      'Curupira chroni Dżunglę przed tymi, którzy przychodzą brać. Jego odwrócone ślady prowadzą tropicieli tam, skąd przyszli.',
      'Badacze DBR wielokrotnie próbowali zmierzyć poziom magii w Dżungli. Wszystkie wyprawy wróciły z idealnie dokładnymi pomiarami parkingu przed lasem.',
      'Lokalne podanie mówi, że Curupira zaufa tylko komuś, kto zgodzi się na chwilę patrzeć na świat od tyłu.',
    ],
    related: [],
    locationId: 'dzungla',
    missionIds: ['curupira-tropy'],
  },
  {
    id: 'sfinks',
    title: 'Sfinks (dwa egzemplarze)',
    category: 'postac',
    clearance: 4,
    summary: 'Strażnik zagadek. Od niedawna istnieje podwójnie, w wersji z wczoraj i z jutra.',
    body: [
      'Kanoniczny Sfinks zadaje zagadkę i pożera tych, którzy nie znają odpowiedzi. W Zonie Czasowych Paradoksów odnotowano dwa egzemplarze, które patrzą na siebie od trzech tygodni.',
      'Prognoza DAN: jeśli jeden zada drugiemu zagadkę bez znanej mu odpowiedzi, nastąpi samopożarcie i paradoks z prawdopodobieństwem 97%.',
      'Notatka psychologa DZP (poufne): oba egzemplarze cierpią na to samo. Od tysięcy lat nikt nie zadał żadnemu z nich zagadki. Samotność strażników zagadek jest problemem niedoszacowanym.',
    ],
    related: ['zona-paradoksow', 'obserwator-narracji'],
    locationId: 'zona',
    missionIds: ['sfinks-paradoks'],
  },

  /* ---------------------------------------------------------------- Artefakty */
  {
    id: 'zlote-runo',
    title: 'Złote Runo',
    category: 'artefakt',
    clearance: 1,
    summary: 'Runo złotego barana z Kolchidy. Aktualnie w użyciu jako dywanik przy kominku.',
    body: [
      'Artefakt klasy A, wpisany do rejestru DATM pod pozycją 0001. Zdolność lecznicza, prestiżowa i, jak się okazało, dekoracyjna.',
      'Obecny posiadacz: smok-kleptoman z Kolchidy, urządzający legowisko w stylu skandynawskim. Na miejscu runa w Kolchidzie wisi tabliczka „Zaraz wracam”.',
      'Analiza behawioralna DZP: smok gromadzi wyłącznie przedmioty, o których bajki przestały wspominać. Jego kolekcja jest w doskonałym stanie konserwatorskim.',
    ],
    related: ['datm'],
    locationId: 'kolchida',
    missionIds: ['runo-dywanik'],
  },
  {
    id: 'lampa-alladyna',
    title: 'Lampa Alladyna',
    category: 'artefakt',
    clearance: 2,
    summary: 'Siedziba Dżina. Na Bazarze Lamp dostępna w stu identycznych wersjach.',
    body: [
      'Oryginalna lampa ma jedną cechę, której podróbki nie potrafią podrobić: reaguje na nastrój mieszkańca. Szczęśliwy Dżin sprawia, że lampa lekko się nagrzewa. Zmęczony – że mruczy.',
      'Dżin od tygodnia ma status „nieodpowiadający”. Alladyn potarł czterdzieści lamp i nabawił się zapalenia ścięgien.',
      'DZLiN przypomina, że Dżin od 1001 nocy nie miał urlopu ani prawa do odmowy spełnienia życzenia.',
    ],
    related: ['ft-dzin-porwany'],
    locationId: 'baszta-lampy',
    missionIds: ['lampa-dzin'],
    simulation: {
      prompt: 'Przed Tobą trzy lampy: ciepła, zimna i mrucząca. Dżin jest w jednej z nich. Którą sprawdzasz?',
      options: [
        { label: 'Ciepłą – Dżin to istota ognista.', outcome: 'W środku jest grzałka i karteczka „Made in Bazar”. Handlarz się uśmiecha.', correct: false },
        { label: 'Mruczącą – lampa reaguje na nastrój mieszkańca.', outcome: 'Mruczenie cichnie, gdy zbliżasz rękę. Ktoś w środku bardzo nie chce, żebyś pocierał. To on.', correct: true },
        { label: 'Pocieram wszystkie trzy naraz.', outcome: 'Pojawiają się dwaj nielegalni dżinowie-podwykonawcy i proponują życzenia w abonamencie. DAM wszczyna audyt.', correct: false },
      ],
    },
  },

  /* ---------------------------------------------------- Departamenty i procedury */
  {
    id: 'dksf',
    title: 'DKSF: Departament Kontroli Spójności Fabularnej',
    category: 'departament',
    clearance: 0,
    summary: '„Doktorzy aberracji”. Nienawidzeni, niezbędni, zawsze z pieczątką.',
    body: [
      'DKSF pilnuje, by baśnie kończyły się tak, jak się kończą. Każde odstępstwo od kanonu ocenia się w skali od „przypis” do „aberracja kategorii A”.',
      'Departament wydaje Pieczątki DKSF. Agent, który ma pieczątkę, może uczynić dowolną decyzję urzędowo zatwierdzoną, a więc skuteczną. Pieczątek jest mało, bo tusz produkuje jeden zaspany kałamarnik.',
      'Formularz B-7 jest wymagany zawsze. Nawet do złożenia wniosku o zwolnienie z formularza B-7.',
    ],
    related: ['wskaznik-spojnosci', 'dkw-procedury'],
    locationId: 'siedziba',
    simulation: {
      prompt: 'Na misji okazuje się, że ratunek bajki wymaga zmiany kanonu. Masz jedną Pieczątkę DKSF. Co robisz?',
      options: [
        { label: 'Zmieniam kanon bez pytania. Wyjaśnienia potem.', outcome: 'Bajka uratowana, ale DKSF nalicza karę i zabiera Ci pieczątkę na pół roku. Wyjaśnienia zajęły 40 stron.', correct: false },
        { label: 'Wypełniam B-7, uzasadniam zmianę i przybijam pieczątkę.', outcome: 'Zmiana staje się kanonem z mocą wsteczną. DKSF jest zadowolony, choć nikt by tego nie poznał po minie.', correct: true },
        { label: 'Zostawiam bajkę bez ratunku, bo regulamin.', outcome: 'Wskaźnik Spójności spada do zera. Sprawa przekazana do DKW za „nadgorliwość bierną”.', correct: false },
      ],
    },
  },
  {
    id: 'dan-wieszcz',
    title: 'DAN i superkomputer „Wieszcz”',
    category: 'departament',
    clearance: 1,
    summary: 'Mózg operacji: milion razy szybsze czytanie baśni niż przeciętny czytelnik i zero zrozumienia dla żartów.',
    body: [
      'Wieszcz analizuje teksty wszystkich bajek w czasie rzeczywistym i publikuje trzy rodzaje raportów: Wskaźniki Spójności, Prognozy Paradoksów i Alerty Chaosu.',
      'Alert Chaosu wyzwala się, gdy wątek zaczyna brzmieć jak telenowela melodramatyczna. W ubiegłym roku Wieszcz trzykrotnie zaalarmował o odcinkach własnego zespołu.',
      'Wieszcz jest chłodzony wodą z Jeziora Łabędziego. Łabędzie złożyły skargę.',
    ],
    related: ['wskaznik-spojnosci', 'wirusy-narracyjne'],
    locationId: 'siedziba',
  },
  {
    id: 'datm',
    title: 'DATM: Magazyn Artefaktów',
    category: 'departament',
    clearance: 2,
    summary: 'Laboratorium i magazyn: od Pióra Gryfa po eliksir opóźniający poniedziałek.',
    body: [
      'W magazynie DATM leżą m.in. Pióro Gryfa, kopia zapasowa Lampy Alladyna i trzy z pięciu znanych Teleporterów Octowych (dwa pozostałe teleportowały się same).',
      'Gadżety dla agentów: selfie-laska do zaklęć (zasięg 3 m, filtr „heroiczny”), kawa w proszku ninjutsu (działa, zanim ją wypijesz) oraz plecak magiczny o pojemności zależnej od optymizmu właściciela.',
      'Eliksir opóźniający poniedziałek jest wciąż w fazie testów. Efekt uboczny: dwa wtorki z rzędu.',
    ],
    related: ['zlote-runo'],
    locationId: 'siedziba',
  },
  {
    id: 'kot-mrucz-term',
    title: 'Zastępca Dyrektora (Kot) i Mrucz-Term',
    category: 'departament',
    clearance: 3,
    summary: 'Kot podejmuje decyzje. Mrucz-Term je tłumaczy. Czasem błędnie.',
    body: [
      'Kot ma więcej uprawnień niż większość agentów: decyduje o drzemkach, dostawach tuńczyka i, nieformalnie, o tym, które misje trafią do NarratoMatu w pierwszej kolejności.',
      'Mrucz-Term to AI tłumaczące mruknięcia Kota na język urzędowy. Skuteczność: 94%. Pozostałe 6% to przypadki, gdy „mrr” oznaczało „zatwierdzam”, a zostało przetłumaczone jako „rozwiązać departament”.',
      'Ściśle poufne: Dyrektor Naczelny przekazuje instrukcje wyłącznie przez Kota. Nikt nie wie, czy to Kot przekazuje wolę Dyrektora, czy odwrotnie.',
    ],
    related: ['ft-dn-instagram'],
    locationId: 'siedziba',
  },
  {
    id: 'dkw-procedury',
    title: 'DKW: sprawy przekazane',
    category: 'departament',
    clearance: 1,
    summary: 'Gdzie trafiają nieudane misje i dlaczego nikt stamtąd nie wraca w dobrym humorze.',
    body: [
      'Departament Kontroli Wewnętrznej przejmuje sprawy zakończone porażką. Agent otrzymuje wezwanie na rozmowę wyjaśniającą, która trwa dokładnie tyle, ile trzeba, by skończyła się kawa w automacie.',
      'DKW zastawia pułapki na niepoprawne dokumenty. Najczęstszy błąd: formularz B-7 wypełniony długopisem w kolorze innym niż „urzędowy granat”.',
      'Dobra wiadomość: sprawa przekazana do DKW nadal daje doświadczenie. Niewiele, ale daje.',
    ],
    related: ['dksf'],
    locationId: 'siedziba',
  },

  /* ---------------------------------------------------- Zjawiska i anomalie */
  {
    id: 'wskaznik-spojnosci',
    title: 'Wskaźnik Spójności Fabuły',
    category: 'zjawisko',
    clearance: 0,
    summary: 'Liczba od 0 do 100, mówiąca, ile z bajki zostało bajką. Główny miernik każdej misji.',
    body: [
      'Wskaźnik Spójności liczy Wieszcz na podstawie zgodności przebiegu wydarzeń z kanonem, motywacji postaci i obecności kluczowych rekwizytów.',
      'Poniżej 50 bajka zaczyna „przeciekać”: postacie z innych opowieści pojawiają się w tle, a morał staje się niejasny. Poniżej 20 – paradoks.',
      'Agent poprawia wskaźnik, przywracając kanon albo uzasadniając zmianę Pieczątką DKSF.',
    ],
    related: ['dksf', 'dan-wieszcz'],
  },
  {
    id: 'chochliki-drukarskie',
    title: 'Chochliki drukarskie',
    category: 'zjawisko',
    clearance: 0,
    summary: 'Drobne istoty żywiące się dokumentami. Szczególnie lubią faktury.',
    body: [
      'Chochliki drukarskie zagnieżdżają się w drukarkach, kablach i szufladach z papierami. Odpowiadają za literówki, zniknięcia stron i co najmniej połowę opóźnionych płatności ARB.',
      'Preferencje żywieniowe: faktury > protokoły > regulaminy. Regulamin DKW jest tak ciężkostrawny, że chochlik po jego zjedzeniu zasypia na tydzień.',
      'DITMT prowadzi odłów, ale chochliki szybko uczą się omijać pułapki z papierem ksero.',
    ],
    related: ['dkw-procedury'],
    locationId: 'siedziba',
    missionIds: ['wrozki-strajk'],
  },
  {
    id: 'zona-paradoksow',
    title: 'Zona Czasowych Paradoksów',
    category: 'zjawisko',
    clearance: 3,
    summary: 'Obszar, w którym wczoraj zdarza się po jutrze. Zegarki zostawiamy w szatni.',
    body: [
      'Zona powstała z resztek bajek, które opowiadano od końca. Czas płynie tu w pętlach, odgałęzieniach i czasem w poprzek.',
      'W Zonie można spotkać samego siebie. DAN zaleca w takiej sytuacji uprzejmość, brak kontaktu fizycznego i niezadawanie sobie pytań, na które nie zna się odpowiedzi.',
      'Pomiary chrononów wykazały, że Zona się rozszerza o jedną minutę rocznie. W przeszłość.',
    ],
    related: ['sfinks', 'obserwator-narracji'],
    locationId: 'zona',
    missionIds: ['sfinks-paradoks', 'tecza-eliksiry'],
    simulation: {
      prompt: 'W Zonie spotykasz siebie z jutra. Twój sobowtór mówi: „Nie rób tego, co zamierzasz”. Co robisz?',
      options: [
        { label: 'Pytam, co zamierzam.', outcome: 'Sobowtór odpowiada: „Zapytać mnie, co zamierzasz”. Pętla trwa 40 minut. DAN odnotowuje mikro-paradoks.', correct: false },
        { label: 'Uprzejmie kiwam głową, notuję uwagę w B-7 i idę dalej.', outcome: 'Sobowtór uśmiecha się z ulgą i znika. Paradoks uniknięty. Procedura zadziałała.', correct: true },
        { label: 'Podaję sobie rękę.', outcome: 'Zamieniacie się miejscami. Przez resztę dnia odbierasz maile, które jeszcze nie przyszły.', correct: false },
      ],
    },
  },
  {
    id: 'wymiar-sluchawek',
    title: 'Wymiar Zagubionych Słuchawek',
    category: 'zjawisko',
    clearance: 1,
    summary: 'Wszystko, co kiedykolwiek zginęło w kieszeni. Słuchawki splątane kwantowo i fizycznie.',
    body: [
      'Wymiar przyjmuje przedmioty mniejsze od przeciętnej słuchawki dousznej, które zostały zgubione przez kogokolwiek, gdziekolwiek. Pojedyncze skarpetki trafiają tu wyjątkowo, „z uwagi na charakter”.',
      'Strażnik Zgub wydaje przedmioty na podstawie dokładnego opisu. Opis „no taki mały, czarny” nie jest wystarczający od 1987 roku.',
      'Uwaga: przedmioty, które potrafią zmieniać rozmiar, zwykle trafiają tu w swojej najmniejszej postaci i nikt ich nie rozpoznaje.',
    ],
    related: ['sun-wukong'],
    locationId: 'sluchawki',
    simulation: {
      prompt: 'Strażnik Zgub prosi o opis szukanego przedmiotu. Szukasz kostura Małpiego Króla.',
      options: [
        { label: '„Duży, czerwono-złoty kostur bojowy.”', outcome: 'Strażnik kręci głową. Takiego tu nie ma. Wymiar przyjmuje tylko małe rzeczy.', correct: false },
        { label: '„Igła, czerwono-złota, z inskrypcją, możliwe, że lekko się wierci.”', outcome: 'Strażnik sięga do szuflady nr 4 400 001 i podaje Ci wiercącą się igłę. Formularz A-3 do podpisu.', correct: true },
        { label: '„Może pan sprawdzić wszystko?”', outcome: 'Strażnik wręcza Ci 9 miliardów słuchawek. Zostajesz do wieczora.', correct: false },
      ],
    },
  },
  {
    id: 'wymiar-absurdu',
    title: 'Wymiar Absurdu',
    category: 'zjawisko',
    clearance: 2,
    summary: 'Prognoza: deszcz mówiących ananasów z przejaśnieniami.',
    body: [
      'Wymiar, w którym logika jest dobrem rzadkim i reglamentowanym. Mieszkańcy, w tym ananasy, potrafią jednak z niej korzystać wyjątkowo sprawnie, by wygrywać dyskusje.',
      'Portale do Wymiaru Absurdu otwierają się samoistnie w miejscach o wysokim natężeniu nudy (parki w poniedziałki, poczekalnie, zebrania).',
      'Teoria DBR: portal można zamknąć wyłącznie aktem czystego absurdu wypowiedzianym z pełnym przekonaniem. Rozsądek go tylko poszerza.',
    ],
    related: ['obserwator-narracji'],
    locationId: 'absurd',
    missionIds: ['ananasy-portal'],
  },
  {
    id: 'obserwator-narracji',
    title: 'Fizyka portali: obserwator narracji',
    category: 'zjawisko',
    clearance: 4,
    summary: 'Dlaczego portal jest otwarty tylko wtedy, gdy ktoś o nim opowiada.',
    body: [
      'Portale w multiwersum zachowują się jak układy kwantowe: ich stan (otwarty/zamknięty) ustala się w chwili, gdy ktoś go opowiada. Nieopowiedziany portal jest w superpozycji.',
      'Wniosek praktyczny DBR: najskuteczniej zamyka się portal, zmieniając opowieść o nim. Zdanie bez sensu, wypowiedziane z przekonaniem, zrywa spójność opisu i portal zapada się.',
      'Wniosek teoretyczny: agent ARB, opowiadając raport, współtworzy rzeczywistość. Dlatego raporty muszą być zgodne z B-7.',
    ],
    related: ['wymiar-absurdu', 'zona-paradoksow'],
    missionIds: ['ananasy-portal'],
    simulation: {
      prompt: 'Portal do Wymiaru Absurdu szeroko otwarty, ananasy coraz bliżej. Jak go zamykasz?',
      options: [
        { label: 'Wyliczam logicznie, dlaczego portal nie powinien istnieć.', outcome: 'Ananasy z zachwytem wchodzą w dyskusję. Portal rośnie o metr z każdym argumentem.', correct: false },
        { label: 'Oznajmiam z pełnym przekonaniem: „Wtorek jest kwadratowy, więc idźcie spać”.', outcome: 'Opis portalu traci spójność. Portal zamyka się z cichym „plum”. Ananasy obrażone.', correct: true },
        { label: 'Zakładam na portal plombę DLiTM.', outcome: 'Plomba wpada do środka. Teraz Wymiar Absurdu ma plombę. Nikt nie wie, co to znaczy.', correct: false },
      ],
    },
  },
  {
    id: 'tecza-w-plynie',
    title: 'Tęcza w płynie',
    category: 'zjawisko',
    clearance: 3,
    summary: 'Skutek nadużycia eliksirów kolorów. Rozlewa się po bajkach i zabarwia czarno-białe opowieści.',
    body: [
      'Eliksiry kolorów spożywane ponad normę (więcej niż jeden na rozdział) uwalniają tęczę w postaci płynnej. Tęcza płynie w górę, w bok i przez granice bajek.',
      'Obserwacje DBR wskazują, że tęcza wykazuje zachowania istoty żywej: ucieka z miejsc nudnych, zatrzymuje się tam, gdzie ktoś opowiada coś ciekawego.',
      'Sprzątanie wymaga formularza L-6b i bardzo dużej ilości ręczników.',
    ],
    related: ['zona-paradoksow'],
    locationId: 'absurd',
    missionIds: ['tecza-eliksiry'],
  },
  {
    id: 'robak-kret',
    title: 'Robak-kret z Biblioteki',
    category: 'zjawisko',
    clearance: 3,
    summary: 'Istota zjadająca niedokończone wątki. Zostawia po sobie przesunięte granice i dziury w fabule.',
    body: [
      'Robak-kret żyje w najstarszych regałach Biblioteki Zapomnianych Opowieści. Żywi się wątkami, które nigdy nie doczekały się zakończenia.',
      'Objawy obecności: korytarze, które zmieniają długość, granice przesuwające się nocą, postacie, które nie pamiętają, po co przyszły.',
      'Zaleceniem Bibliotekarki Echo jest dopisanie zakończenia. Robak-kret nie tknie zakończonej historii.',
    ],
    related: ['krasnoludki'],
    locationId: 'biblioteka',
    missionIds: ['krasnoludy-gobliny'],
  },
  {
    id: 'dna-feniksa',
    title: 'DNA feniksa',
    category: 'zjawisko',
    clearance: 3,
    summary: 'Biologia odradzania się: dlaczego feniks i Smok Wawelski mają wspólnego przodka.',
    body: [
      'Sekwencjonowanie DBR wykazało, że DNA feniksa zawiera „gen kodu”, odpowiedzialny za odradzanie się po każdym kanonicznym zakończeniu. Ten sam gen występuje u Smoka Wawelskiego i u części wilków z bajek.',
      'Gen kodu aktywuje się przy każdym nowym czytaniu. Teoretycznie bajka, której nikt nie czyta, pozwala istotom odradzającym się odpocząć.',
      'Projekt „Feniks bez popiołu” zakończył się pożarem laboratorium. Laboratorium się odrodziło.',
    ],
    related: ['smok-wawelski', 'weganski-smok'],
  },
  {
    id: 'weganski-smok',
    title: 'Metabolizm wegańskiego smoka',
    category: 'zjawisko',
    clearance: 2,
    summary: 'Czy smok może żyć bez dziewic i owiec? Raport dietetyczny DBR.',
    body: [
      'Smok na diecie roślinnej produkuje o 40% mniej ognia i o 300% więcej metanu. Zjawisko to nazywa się „płomieniem wtórnym” i stanowi zagrożenie pożarowe kategorii B.',
      'Program DZP „Złoczyńca na dietę moralną” objął dotąd trzy smoki. Dwa zostały wegetarianami, trzeci poprosił o światłowód zamiast posiłków.',
      'Wniosek: smoki rzadko jedzą z głodu. Częściej z nudy albo samotności.',
    ],
    related: ['smok-wawelski', 'dna-feniksa'],
    locationId: 'wawel',
  },
  {
    id: 'wirusy-narracyjne',
    title: 'Wirusy narracyjne',
    category: 'zjawisko',
    clearance: 5,
    summary: 'Samopowielające się zwroty akcji, które przeskakują między bajkami. Klasyfikacja ściśle tajna.',
    body: [
      'Wirus narracyjny to motyw fabularny, który kopiuje się do innych opowieści bez zgody autora: nagły zły bliźniak, sen, który okazuje się prawdą, „to był od początku on”.',
      'DITMT prowadzi kwarantannę w sieci narracyjnej. Zaklęcia antywirusowe pisze się w kodzie, ale działają tylko wtedy, gdy są zrymowane.',
      'Najgroźniejszym znanym wirusem jest „Telenowela-7”. Wieszcz trzykrotnie zgłosił ją w odcinkach własnego zespołu, co skłania do pytania, kto tu kogo zaraża.',
    ],
    related: ['dan-wieszcz'],
    locationId: 'biblioteka',
  },

  /* ---------------------------------------------- Dział Błędów i Przekłamań */
  {
    id: 'ft-wilk-winny',
    title: 'Wilk zjada ciastka',
    category: 'falszywy-trop',
    clearance: 0,
    summary: 'Najczęściej powtarzana plotka w Zaczarowanym Lesie. Zweryfikowana.',
    body: [
      'Plotka pojawia się w każdym raporcie dotyczącym ubytku ciastek. Wilk jest antagonistą kanonicznym, więc odruchowo staje się podejrzanym.',
      'Weryfikacja DAN wykazała brak okruchów w sierści wilka, za to ślady cukru pudru na liście zakupów babci.',
    ],
    related: ['czerwony-kapturek'],
    locationId: 'las',
    missionIds: ['kapturek-ciastka'],
    falseLead: { claim: 'Wilk podjada ciastka z koszyka Kapturka.', truth: 'Wilk od pół roku jest na terapii i diecie bezglutenowej. Koszyk lżeje z powodów, które zna babcia.' },
  },
  {
    id: 'ft-automat-kawy',
    title: 'Automat do kawy jest nawiedzony',
    category: 'falszywy-trop',
    clearance: 0,
    summary: 'Dlaczego z automatu w Mrocznym Korytarzu czasem płynie lawa.',
    body: [
      'Agenci od lat opowiadają o duchu w automacie, który „karze tych, którzy nie mówią dzień dobry”.',
      'Rzeczywistość jest bardziej biurokratyczna.',
    ],
    related: ['chochliki-drukarskie'],
    locationId: 'siedziba',
    falseLead: { claim: 'W automacie mieszka duch, który zamienia kawę w lawę.', truth: 'DLiTM podłączył automat do magistrali wulkanicznej zamiast wodnej. Zgłoszenie usterki czeka na formularz, którego zjadł chochlik.' },
  },
  {
    id: 'ft-dzin-porwany',
    title: 'Dżin został porwany',
    category: 'falszywy-trop',
    clearance: 1,
    summary: 'Wersja Alladyna. Popularna, dramatyczna, nieprawdziwa.',
    body: [
      'Alladyn zgłosił porwanie Dżina, załączając jako dowód 40 potartych lamp i odcisk dywanu.',
      'Analiza śladów nie wykazała obecności porywacza ani okupu.',
    ],
    related: ['lampa-alladyna'],
    locationId: 'baszta-lampy',
    missionIds: ['lampa-dzin'],
    falseLead: { claim: 'Dżina porwała konkurencja z Bazaru Lamp.', truth: 'Dżin przebywa w lampie z własnej woli. To nie porwanie, to wypalenie zawodowe.' },
  },
  {
    id: 'ft-krolowa-krasnoludki',
    title: 'Królowa stoi za zniknięciem Krasnoludków',
    category: 'falszywy-trop',
    clearance: 2,
    summary: 'Klasyczny podejrzany. Klasyczny błąd.',
    body: [
      'Zła Królowa ma motyw, środki i lustro. Według plotek „to zawsze ona”.',
      'Lustro zeznało pod przysięgą (formularz D-4), że Królowa od tygodnia ćwiczy przed nim jogę i nie opuszczała zamku.',
    ],
    related: ['krasnoludki'],
    locationId: 'kopalnie',
    missionIds: ['krasnoludki-znikniecie'],
    falseLead: { claim: 'Zła Królowa porwała Siedmiu Krasnoludków z zazdrości o Śnieżkę.', truth: 'Królowa ma alibi potwierdzone przez lustro. Krasnoludki zniknęły bez udziału osób trzecich. Sprawdzić rejestr spółek.' },
  },
  {
    id: 'ft-imie-rumpelsztyka',
    title: 'Imię Rumpelsztyka można bezpiecznie wymówić',
    category: 'falszywy-trop',
    clearance: 2,
    summary: 'Pogląd młodszych agentów, że „to tylko imię”.',
    body: [
      'Niektórzy agenci uważają, że skoro imię jest w tytule baśni, to nie jest tajemnicą.',
      'Tytuł baśni jest chroniony klauzulą „dla czytelnika”, a nie „dla postaci”.',
    ],
    related: ['rumpelsztyk'],
    locationId: 'miasto',
    missionIds: ['rumpel-gielda'],
    falseLead: { claim: 'Imię Rumpelsztyka jest jawne, więc można je mówić na głos przy postaciach.', truth: 'Wypowiedzenie imienia w obecności postaci przed finałem kasuje zakończenie. Zwłaszcza jeśli wymaga tego jakaś umowa.' },
  },
  {
    id: 'ft-mapa-eldorado',
    title: 'Mapę El Dorado narysowali konkwistadorzy',
    category: 'falszywy-trop',
    clearance: 3,
    summary: 'Najbardziej oczywisty podejrzany w sprawie nielegalnej mapy.',
    body: [
      'Konkwistadorzy-turyści mają motyw (złoto) i kompas. Logika podpowiada, że to oni.',
      'Żaden z nich nie umie rysować. Sprawdzono.',
    ],
    related: ['el-dorado'],
    locationId: 'eldorado',
    missionIds: ['eldorado-mapa'],
    falseLead: { claim: 'Mapę do El Dorado sporządzili konkwistadorzy, by je zdobyć.', truth: 'Mapa jest narysowana złotym atramentem dostępnym wyłącznie w El Dorado. Autor mieszka w środku.' },
  },
  {
    id: 'ft-dn-instagram',
    title: 'Dyrektor Naczelny ma konto na Instagramie',
    category: 'falszywy-trop',
    clearance: 5,
    summary: 'Najtrwalsza plotka w historii ARB. Dostęp tylko dla Legend.',
    body: [
      'Od lat krążą zrzuty ekranu rzekomego konta DN: magiczny popcorn, seriale, zachody słońca nad Biblioteką.',
      'DKW przeprowadziło dochodzenie i zamknęło je z adnotacją „nie dotykać”.',
    ],
    related: ['kot-mrucz-term'],
    locationId: 'siedziba',
    falseLead: { claim: 'Dyrektor Naczelny prowadzi konto na Instagramie.', truth: 'Konto prowadzi Kot. Wszystkie zdjęcia są robione z wysokości 30 cm nad podłogą. DN nie ma telefonu.' },
  },
];
