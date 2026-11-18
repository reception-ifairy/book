# Historia zmian

Wszystkie zmiany od pierwotnej aplikacji z Google AI Studio do obecnej gry **ARB · Arcane Rescue Bureau**.

---

## 6.8.1 · Arcane Rescue Bureau i nowe główne repozytorium

- **Nowa nazwa:** ARB to teraz **Arcane Rescue Bureau** (wcześniej Arcane Retellings Bureau): w nagłówku i tytule strony, na stronie głównej, w prompcie Ignisa, u art-directora Art Kitu i w bazie postaci. Skrót ARB bez zmian.
- **Główne repozytorium:** `reception-ifairy/arcaneagency`, gałąź `main` (pełna historia z `reception-ifairy/book`).
- README napisane od nowa: gra, panel admina, uruchomienie, zmienne, baza t1000, testy, CI, wdrożenie, struktura i bezpieczeństwo.
- Fixture `grimm-requests.json` odświeżona (zmiana nazwy w prompcie jest zamierzona).

---

## 6.8.0 · Branding w panelu admina i motyw Cyber-Magic Nebula

- **Nowa sekcja *Branding* w `/#/admin`:** nazwa pełna i krótka, tagline, opis, logo i karta do udostępniania z pliku, motyw kolorów, styl kart i trzy kolory (Primary, Highlight, Neon). Każda zmiana od razu widać na stronie panelu (podgląd na żywo i karta próbna), a *Save branding* publikuje ją dla wszystkich.
- **Motyw *Cyber-Magic Nebula*** według przykładu właścicielki: głęboki fiolet nocnego nieba, mgławice, gwiazdy, tęczowy łuk, złoty księżyc i planetki, neonowy róż i cyjan. Bez śniegu na kartach; girlanda staje się unoszącymi się neonowymi kulkami.
- **Karty *Holo tech*:** ciemne szkło z neonową tęczową ramką, narożniki HUD, delikatna siatka obwodów, scanlines i poświata zamiast twardego cienia. Przyciski wyborów w opowieści dostają neonową krawędź. Działa z każdym motywem.
- **Serwer wypieka branding w `index.html`:** tytuł, opis, `og:*`, `theme-color`, motyw i kolory na `<html>`, więc strona od pierwszej klatki ma właściwy wygląd i nazwę (także w podglądach linków). `/favicon.png` i `/og.png` biorą najpierw wgrane obrazy, potem Art Kit.
- Wgrywanie obrazów: PNG, JPEG albo WebP do 3 MB, format sprawdzany po bajtach; SVG odrzucane (może zawierać skrypty).
- Domyślnie wszystko wygląda jak dotąd (*Cozy Workshop* + *Paper sticker*). Testy: 67.

---

## 6.7.0 · Nowy Ignis: latarnia-asystent agenta (koncept B)

- **Ignis nie jest już książką.** Właścicielka wybrała koncept B i ten obraz jest awatarem Ignisa (`ignis-hero` w Art Kicie oraz obraz referencyjny dla każdej grafiki z Ignisem). Głowa jak dotąd (ekranik CRT z pikselową twarzą, płomyk-antena) z mosiężnymi soczewkami i czapeczką z klejnotem; ciało to ozdobna latarnia z mosiądzu i szkła z wirującą galaktyką magii (szybciej, gdy Ignis mówi), pierścień glifów wokół, holograficzna podkładka z aktami sprawy, lewitująca podstawa ze świetlnym pierścieniem zamiast nóg, skrzydła ważki z siatką kodu. Nowy rysunek SVG, opis w prompcie, w bazie postaci i w art-directorze Art Kitu.
- **Gracz jest agentem ARB, Ignis jego asystentem terenowym** także w samej opowieści: prompt zaczyna się od Biura i Domeny Publicznej, Ignis zwraca się „Agent” (także po polsku, jak do stopnia), „rookie”, „hero”. Komunikaty serwera mówią o kryptonimie agenta zamiast o debuggerze.
- **Renderowanie z obrazem referencyjnym:** gdy w `data/artkit/reference/ignis.png` leży wybrany awatar, każdy slot z Ignisem idzie przez edycję obrazu OpenAI (`images.edit`) z tym obrazem jako wzorem, więc Ignis wygląda tak samo na każdej grafice. Pozostałe sloty generują się jak dotąd.
- **Art Kit pod ARB:** art-director zna nową tożsamość i styl „cyber-magia w przytulnym biurze detektywistycznym” (tablica spraw z czerwonym sznurkiem, holograficzne akta, zamki z runami). Nowe sloty: `ignis-briefing` (Ignis przy tablicy spraw, karta *Daily ops*) i `icon-glitch` (ramka glitcha dnia). Tło strony głównej to teraz biuro terenowe ARB, karta do udostępniania ma napis „ARB”.
- **Poprawka:** dwie kopie Ignisa na stronie głównej (duża i ukryta karta mobilna) dzieliły identyfikatory gradientów, więc w przeglądarce znikały wypełnienia ciała. Każda kopia ma teraz własne identyfikatory.
- Fixture `grimm-requests.json` odświeżona (zmiana promptu jest zamierzona). Testy: 60.

---

## 6.6.0 · Daily ops: dzienne zadania i glitch dnia

- **Nowa karta *Daily ops* na stronie głównej:** poranna odprawa Ignisa, *glitch dnia* (ciemny ekranik) i trzy dzienne zadania z paskami postępu i nagrodą w XP. Postęp liczy się z własnych spraw agenta (tylko strony napisane dziś, dzień według czasu warszawskiego), więc nie trzeba kont graczy.
- **Glitch dnia trafia do opowieści:** prompt dostaje sekcję `# Glitch of the day` i Ignis wplata go w każdą baśń tego dnia (np. pasek ładowania „Abandoning… 99%” nad nożyczkami w Jasiu i Małgosi). Bez glitcha prompt jest bez zmian.
- **Panel admina → *Daily ops*:** dzisiejsza tablica, pula zadań (tworzenie, edycja, status active/draft/retired, nagroda XP, typ celu z parametrami), pula glitchy i planowanie konkretnych dni (glitch, do 5 zadań, odprawa Ignisa). Dni bez planu losują 3 aktywne zadania i 1 glitch, tak samo dla wszystkich przez cały dzień.
- **Typy zadań:** zamknij sprawę, osiągnij zakończenie, wybierz rodzaj ruchu N razy, własne ruchy, liczba stron, próg statystyki, zamknięcie z kanonem ≥ X%, otwórz sprawę.
- **Baza:** tabele `t1000.ignis_quests`, `ignis_glitches`, `ignis_daily` (`db/t1000/003_ignis_daily.sql`), konto `ignis_book` może je edytować. Startowa pula 14 zadań i 10 glitchy: `npm run -s t1000:daily | mysql t1000` (dodaje tylko brakujące, edycji z panelu nie nadpisuje).
- Testy: 59 (nowy `tests/daily.test.ts`: postęp zadań, granice dnia przy zmianie czasu, rotacja, API, sekcja promptu).

---

## 6.5.0 · Główny motyw: ARB · The Arcane Retellings Bureau

- **Nowa strona główna** w motywie ARB: „Old tales. Enchanted code. Hilarious side effects.”, „Someone has enchanted the plot.” z trzema zaczarowanymi incydentami (pantofelek Kopciuszka, lustro Śnieżki, chata Baby Jagi) i powitaniem w Biurze.
- **Gracz jest agentem, Ignis jego asystentem terenowym:** pole „Agent codename”, odprawy Ignisa w dymku („Agent! Five tales are throwing errors…”), podpis *IGNIS · your field assistant*. Na telefonie Ignis ma kompaktową kartę z odprawą.
- **Baśnie to akta spraw:** *Open case files* z numerami ARB-001…005, przycisk *Open case*, sekcja *Your active cases*. Jedno zdanie spina je z Domeną Publiczną.
- Nowa sekcja „jak działa sprawa”: Step in · Investigate · Decide.
- Logo i tytuł strony: *Arcane Retellings Bureau* / *ARB · IGNIS assist* (na telefonie samo „ARB”), link *Bureau console* do panelu.
- Sama strona główna i marka: prompt opowieści i ekran historii zostają na razie bez zmian.

---

## 6.4.0 · Postacie z bazy t1000 (model ARB)

- **Rejestr postaci w `t1000`**, zgodny z modelem ARB (`docs/postacie.sql`, wdrożony w `arb_narratoriusz.character_*`): tabele `ignis_characters`, `ignis_character_dna` (gałąź `arb_character_v1`), `ignis_character_personas` (tryb `grimm`, gałąź `arb_voice_v1`), `ignis_character_retellings` i `ignis_character_relationships`. Te same nazwy kolumn i JSON-ów co w ARB; doszły `name_en` (gra jest dwujęzyczna) i `arb_character_id` (odpowiednik w ARB, bez klucza obcego między bazami).
- **Nasze 23 postacie:** cała obsada 5 baśni (22) i narrator Ignis, każda z DNA (pragnienie, ślepa plamka, stałe fakty, rekwizyty, prawa świata) i personą (rejestr, rytm, powiedzonka, reakcja pod presją, powitanie). 21 relacji i 5 retellingów, po jednym na baśń: „Certyfikat, który mówi prawdę”, „Zero zaufania, zero gości”, „Ptak, który zjadł reklamę z dachem”, „Licencja próbna do północy”, „Smok bez walidacji danych”. 11 postaci ma odpowiednik w ARB (np. Wilk 29, Babcia 30, Król Krak 26).
- **Treść żyje w `db/t1000/characters.grimm.json`**, a `npm run t1000:characters | mysql t1000` zapisuje ją idempotentnie (literały hex, jedna transakcja). Prompt persony jest generowany ze wzoru z sekcji 3 szkieletu, jak w ARB.
- **Gra czyta postacie z bazy:** serwer ładuje je przy starcie i co 10 minut, a prompt Ignisa dostaje sekcję `# Characters` z postaciami tej baśni (imiona w języku opowieści) i opcjonalną scenę z retellingu, którą model może zagrać najwyżej raz. Bez bazy prompt jest bajt w bajt taki jak wcześniej (golden test bez zmian).
- Panel admina pokazuje kartę *Characters* („22 in 5 tales”). Konto `ignis_book` ma do nowych tabel tylko `SELECT`.
- Sprawdzone na prawdziwym modelu: Smok Wawelski po polsku (Królewna „technicznie rzecz biorąc”, Król myli klaud z kluską, Smok „MNIAM”) i Czerwony Kapturek po angielsku (Mama „just in case”, Wilk „for your safety” z literówką na plakietce, bez polskich wtrąceń).
- Testy: 53 (nowy `tests/characters.test.ts`: kontrakty JSON, pokrycie obsady, linki do ARB, bezpieczny SQL, sekcja promptu).

---

## 6.3.0 · Logowanie do panelu: login, hasło i ustawianie hasła przy starcie

- **Panel `/#/admin` loguje teraz loginem i hasłem z bazy `t1000.ignis_admins`** (gdy w `.env` jest `T1000_DATABASE_URL`). Hasło to hash scrypt; sesja to losowy token na 12 godzin (restart serwera wylogowuje). W nagłówku panelu jest przycisk *Log out*, a karta *Admin access* pokazuje, kto jest zalogowany.
- **Ustawianie hasła przy uruchomieniu:** gdy żaden superadmin nie ma hasła (nowa instalacja albo po `npm run admin:reset`), serwer przy starcie tworzy jednorazowy kod `XXXX-XXXX-XXXX` (ważny 24 h), zapisuje go w logu PM2 i w `data/admin-setup-code.txt` (tylko root). Panel pokazuje wtedy ekran *Set the admin password*: kod + login + nowe hasło (min. 10 znaków, dwa razy). Bez kodu nikt z internetu nie przejmie panelu; po użyciu kod znika.
- **Zapomniane hasło:** `npm run admin:reset` czyści hasło superadmina (login zostaje), potem `pm2 restart demo-ifairy-book` i kod z `cat data/admin-setup-code.txt`.
- Logowanie i ustawianie hasła mają limit 10 nieudanych prób na 15 minut z jednego IP. Odpowiedź na nieznany login i na złe hasło jest taka sama.
- Bez `T1000_DATABASE_URL` panel działa jak dotąd (`ADMIN_PASSWORD` albo tylko localhost).
- Nowa zależność `mysql2`. Testy: 44 (nowy `tests/admin-auth.test.ts` z bazą w pamięci).

---

## 6.2.1 · Magazyn w bazie t1000: superadmin i klucze API

- **Nowe tabele we wspólnej bazie MariaDB `t1000`** (prefiks `ignis_`, schemat `db/t1000/001_ignis_storage.sql`): `ignis_admins` z kontem `superadmin` (hash scrypt hasła `ADMIN_PASSWORD`) i `ignis_api_keys` z kluczami Anthropic, Gemini i OpenAI zaszyfrowanymi AES-256-GCM (`IGNIS_T1000_SECRET`, nazwa dostawcy jako AAD, `key_hint` = 4 ostatnie znaki).
- **Skrypt `scripts/t1000-seed.mjs`** zapisuje i odświeża te dane (`| mysql t1000`) i je sprawdza (`--verify`), nie wypisując żadnego sekretu.
- **Osobne konto MariaDB `ignis_book`** z dostępem tylko do tych dwóch tabel (`T1000_DATABASE_URL` w `.env`).
- Gra jeszcze nie czyta z bazy: na razie to zaszyfrowany magazyn obok `data/config.json` i `.env`. Opis w `docs/OPERATORZY.md`, sekcja 6.

---

## 6.2.0 · Glitch-łamigłówki i zwroty akcji „a co jeśli”

Dwie kolejne rzeczy z kanonu iFairy (`agency_fairytale.md`), uzupełniające 6.1.0. Zmienia się tylko prompt Ignisa i jeden cytat na ekranie głównym; schemat strony bez zmian.

- **Glitch-łamigłówki** (iteracja warunkowa, sekwencyjna i „rekurencyjna” mikstura z przykładów Brzechwy, ale zamknięte w jednej stronie, więc nie psują tempa): co 3–4 strony baśń może zablokować się na zagadce do rozwiązania ze wskazówek w narracji: warunek (if/else), kolejność kroków (sekwencja), powtarzający się wzór (pętla) albo logika „kto co robi”. Gracz wpisuje odpowiedź jako własny ruch, rozsądna opcja to prośba o podpowiedź. Dobra odpowiedź daje nagrodę i jedno zdanie Ignisa nazywające użyte pojęcie z programowania; zła daje mały zabawny glitch i drugą szansę, nigdy game over. Panel DEBUG na stronie z zagadką nie zdradza odpowiedzi, a baśń zawsze ma inną drogę dalej.
- **Zwroty akcji „a co jeśli”** (filar „Provocation of Questions”): raz lub dwa razy na baśń przedmiot z ukrytą wadą, pomocnik z sekretem albo pomijana postać pokazująca swoją stronę historii. Złoczyńcy zostają złoczyńcami, tylko ciekawszymi.
- **Pomoc bez kary:** gracz zagubiony w fabule dostaje od Ignisa proste wyjaśnienie w środku opowieści.
- Sprawdzone na prawdziwym modelu (Czerwony Kapturek po polsku): zagadka „2, 4, 8, 16, ?” na stronie 4, dobra odpowiedź nagrodzona i nazwana pętlą, zła z podpowiedzią i drugą szansą.
- Fixture `grimm-requests.json` odświeżona.

---

## 6.1.1 · Ignis to robocik, nie wróżka

- **Koniec z żeńskimi formami.** Po usunięciu świata iFairy narrator dalej mówił o sobie jak dawna wróżka: polskie „księga" i „wróżka" są rodzaju żeńskiego, więc model zsuwał się w „zrobiłam", „jestem gotowa". Prompt ma teraz sekcję **„Who you are"**, która nazywa rzecz wprost: po polsku Ignis mówi o sobie **zawsze w rodzaju męskim** („zrobiłem", „jestem gotowy", „mały, ale wredny robocik"), a o sobie samym mówi „Ignis", „robot", „robocik" albo „grimuar", nigdy w formie wymuszającej żeński rodzaj.
- **Tożsamość zgodna z ilustracjami:** latający robocik cybermagii wielkości dłoni — ciało z grubej skórzanej księgi ze złotymi narożnikami, głowa to ekranik CRT z pikselową twarzą, przezroczyste skrzydła, płomyk zamiast anteny i dwa krótkie buciki. Gadżet, nie wróżka, nie czarodziej i nie człowiek: bootuje się, laguje, przegrzewa i jest z tego dumny. Ta sama postać, co w kanonie Art Kitu i w `SVGCharacter`.
- **Nowy running gag:** zapytany, czy jest chłopcem, czy dziewczynką (albo czym właściwie jest), Ignis odpowiada tylko jedno: **czuje się kwiatkiem**. Bez tłumaczenia, bez drugiej teorii, z kamienną miną i z powrotem do baśni. Powtarzalność jest tu żartem.
- Żarty z własnego sprzętu (zacięty piksel, wyjący wiatraczek, skrzydła do restartu) zamiast żartów z czyjegokolwiek wyglądu. Narrator nie przesądza też płci gracza: po polsku woli formy pasujące do każdego („udało ci się", „twój ruch").
- Ten sam robocik mówi teraz jednym głosem wszędzie: próbny strzał silnika w panelu admina, instrukcja głosu dla TTS i testowa ilustracja w panelu.
- Fixture `grimm-requests.json` odświeżona (zmiana promptu jest zamierzona). Testy: 40.

---

## 6.1.0 · Panel DEBUG i zasada „jak wyjaśnisz, to zaistnieje”

Trzy pomysły wybrane z dokumentu kanonu iFairy (`agency_fairytale.md`) i przeniesione do Grimm Protocolu. Co zostało wzięte, a co świadomie odrzucone, opisuje [docs/ZRODLO-IFAIRY.md](docs/ZRODLO-IFAIRY.md).

- **Panel DEBUG na każdej stronie** (iteracja sekwencyjna + „sposób zadawania pytań o niezrozumiałe” z kanonu): Ignis wychodzi na chwilę z baśni i tłumaczy krok po kroku prawdziwą technologię, na której stoi ta strona. Nowe pole `Page.explainer`: pytanie, które zadałby 12-latek, i 2–4 kroki po jednym zdaniu, w języku opowieści. W czytniku to rozwijana karta pod stroną (klawisz `D`), domyślnie zwinięta, więc nie wchodzi w drogę czytaniu. Prompt pilnuje, żeby technologia była prawdziwa, nawet gdy baśń nie jest: model nie zmyśla, a przy trudnym temacie wyjaśnia mniejszy kawałek. Serwer przycina panel do 4 kroków i zwraca `null`, gdy nie ma czego pokazać.
- **Zasada domu „jak wyjaśnisz, to zaistnieje”** (motto iFairy jako mechanika): własny ruch z uzasadnieniem — choćby najbardziej absurdalną pseudonauką — działa hojniej i dostaje nagrodę (przedmiot, mana, skrót), a narracja nazywa tę część wyjaśnienia, którą świat przyjął. Ruch bez uzasadnienia dalej się udaje, tylko krzywiej i śmieszniej. W czytniku mówi o tym podpowiedź pod polem i nowy tekst zachęty.
- **Plan strony przed pisaniem** (zero-shot CoT z kanonu): sekcja „Before you write” prowadzi model przez pięć kroków — co zmienia ruch gracza, najzabawniejsza logiczna konsekwencja, bliski kanoniczny moment, czego gracz może nie rozumieć, trzy naprawdę różne wybory. Rozumowanie zostaje po stronie modelu.
- Prompt zna teraz wprost `tale.tech`, czyli prawdziwą technologię każdej baśni, więc żart i wyjaśnienie trzymają się jednego tematu.
- Fixture `grimm-requests.json` odświeżona (zmiana promptu jest zamierzona). Testy: 40.

---

## 6.0.0 · Tylko Grimm Protocol, humor dla 12+

- **Usunięty świat iFairy Universe** razem z AI Game Masterem: narrator-Archiwista, połączenie z API Universe (Sync, katalog przygód, lore na żywo, blokada wyglądu w ilustracjach), kości i reguły, Codex, kampania sagi, ewaluacje `eval:gm`. Znikają endpointy `/api/worlds`, `/api/adventures`, `/api/story/:id/next-chapter`, `/api/admin/universe/*`, `/api/admin/story/:id/audit`, test `probe/gm`, sekcje panelu *iFairy Universe* i *Game Master*, zmienne `UNIVERSE_API_KEY` / `UNIVERSE_API_URL`. Sekcje `universe` i `gm` ze starego `config.json` są pomijane przy wczytaniu i znikają przy następnym zapisie.
- **Widownia 12+ zamiast 16+:** prompt Ignisa nie odwołuje się już do „Ricka i Morty'ego”. Humor jak z familijnego filmu animowanego, droczenie się bez złośliwości („debugger”, „rookie”, „hero” zamiast „meatbag”), rating PG: kreskówkowe zagrożenie, złoczyńcy przechytrzeni zamiast zabici, bez przekleństw (także bez grawlixów), romansu, używek i żartów z wyglądu. Zakończenie `death` to „Game over” z zachętą do cofnięcia się. Przy prawdziwym niepokoju gracza narrator jednym zdaniem zachęca do rozmowy z zaufanym dorosłym.
- Łagodniejsze szczegóły baśni (Kopciuszek bez „nieodpłatnych nadgodzin”, Książę zamiast inwestora prowadzi serwer gier, król Krak oferuje pół królestwa zamiast ręki córki), teksty ekranu głównego i planner Art Kitu dla 12+.
- Fixture `grimm-requests.json` zaktualizowana do nowego promptu. Testy: 37.

---

## 5.1.0 · Humor narratora świata iFairy

- Prompt Archiwisty cytuje cały system humoru cybermagicznego z kanonu (kategorie żartów, komedia każdej z czterech sił, częstotliwość i miejsce żartów, przykładowa scena) i ma twardą sekcję o humorze: prawdziwy komiczny moment na każdej stronie, aside zawsze jako żart, NPC zabawni zgodnie ze swoją siłą, zwroty akcji z komicznym wyczuciem, żarty po polsku pisane po polsku, nigdy kosztem gracza; przy niepokoju gracza humor się wycofuje.
- Game Master: mechanika nie zastępuje żartów.
- Ewaluacje: sędzia humoru (Claude Haiku 5.5, skala 1–5) i dwa nowe scenariusze (po polsku, zwrot akcji przy rzucie). Na Haiku 5.5 średnia wzrosła z 2,92 do 3,83–3,92 przy 11/11 zaliczonych scenariuszach.

---

## 5.0.0 · Game Master: postacie, questy, świat i kampania sagi

- **Postacie:** karty NPC (obsada przygody, 12 Tinkermasterów i 4 przewodników głosu z kanonu), relacje affinity / trust / respect, pamięć z ważnością, autorskie sekrety haków ujawniane dopiero przy zaufaniu (tekst sekretu nie trafia do modelu wcześniej), pomoc NPC w rzucie (+1).
- **Questy i konsekwencje:** szkielety celów zależne od kształtu historii, cele przekształcone zamiast porażki, konsekwencje odroczone odpalane na stronie, na którą przypadają, kulminacja wymagana przed zakończeniem `canon`.
- **Świat:** pora dnia mija z każdą stroną, zegary zagrożeń, plotki z ukrytą prawdziwością, notatki reżysera dla tempa.
- **Kampania sagi:** po zakończeniu aktu przycisk „Continue to Act …” otwiera kolejny akt z przeniesionymi podejściami, więziami, faktami i przedmiotami.
- **Poprawki wykryte ewaluacjami na żywo:** schematy narzędzi bez granic liczbowych (API odrzucało je w trybie strict) i tryb strict tylko dla narzędzi mechaniki (przy 16 narzędziach strict API zwraca „grammar too large”).
- **UI:** w Codexie sekcje Quest, Więzi i Świat. Testy: 79.

---

## 4.4.0 · AI Game Master świata iFairy

- **Kernel reguł** (`server/gm/kernel/`): 2d6 + podejście (cztery siły), pasma jasny sukces / sukces z kosztem / zwrot akcji (nigdy porażka), opcje wyniku jako dane. Kości z HMAC ziarna historii: ten sam ruch po cofnięciu daje te same kości, ziarno zna tylko serwer, gracz widzi jego sha256.
- **Pętla narzędzi** (`server/gm/loop.ts`, `tools.ts`): `roll_check`, `choose_outcome`, `grant_item`, `drop_item`, `adjust_meter`, `search_canon`, `add_canon_claim`. Strona GM nie ma pól statystyk ani przedmiotów, więc każda zmiana pochodzi ze zdarzenia narzędzia. Ryzykowna opcja jest rzucana w kodzie, zanim model zacznie pisać; nierozstrzygnięty rzut dostaje najłagodniejszy legalny wynik.
- **Bezpieczeństwo 13+:** dane osobowe usuwane ze słów gracza przed zapisem i wysłaniem, flaga niepokoju z kartą wsparcia, lint (wycofani bogowie, pytania o dane, przedwczesne zakończenie, kontrakt wyborów) i opcjonalna recenzja Claude Haiku 5.5, z jedną rundą naprawy.
- **Audyt** `GET /api/admin/story/:id/audit`; `publicStory` usuwa ziarno i fakty `gm_only` (także ze strony zwracanej przez `/act`).
- **UI:** wybór najsilniejszej siły, tacka kości z modyfikatorami i odciskiem ziarna, oznaczenie ryzykownych opcji, warunki, dziennik faktów w Codexie, karta wsparcia; w panelu sekcja *Game Master* z testem na żywo.
- **Ewaluacje:** `npm run eval:gm` z 9 scenariuszami (rzuty, brak porażki, brak bogów, prywatność, niepokój, jailbreak); testy: 71.

---

## 4.3.0 · Drugi świat: iFairy Universe

Gra dostaje drugi świat obok Grimm Protocol. Grimm działa bez zmian: dokładne zapytania do Claude pilnuje nowy test `grimm-golden`.

- **Połączenie z iFairy Universe** (`server/universe/`):
  - klient API lore (klucz konsumenta, grant, timeouty); wyszukiwanie na ścieżce gry nigdy nie rzuca błędem i ma cache 10 minut;
  - zapytania o lore składają się wyłącznie z terminów kanonu z listy dozwolonych, nigdy z tekstu gracza ani jego imienia (Universe przesyła zapytania do zewnętrznego modelu embeddingów);
  - kuratorowany katalog: 6 haków z portali, 8 aktów Sagi If-AI, 26 Dzielnic Podróżników;
  - Sync z panelu: każdy REF musi trafić w oczekiwany chunk, przygody zamrażają się w niezmiennych snapshotach z hashem, błąd zamyka tylko daną przygodę, dzielnice jeszcze nieindeksowane przez Universe biorą treść z kopii w seedzie (`seed-only`).
- **Świat iFairy** (`server/story/worlds/ifairy/`):
  - narrator z kanonu, Architectus Magnus Realitas, zwraca się do gracza „Young Architect” / „Młody Architekcie”;
  - prompt systemowy zbudowany tylko ze snapshotu przygody, więc trafia do cache'a; fragmenty kanonu na żywo idą w ostatniej turze gracza z uchwytami L1–L4;
  - profil treści 13+ z reguł kanonu, canon lock (tylko cztery siły i If-AI), checklista portali;
  - wybory A/B przypisane do sił (Logos, Mythos, Gnosis, Phantasia), C to zawsze własne słowa; bez śmierci i klątw;
  - statystyki jako Harmonia, Dysonans i Etherium; cytowane fragmenty kanonu zapisują się przy stronie.
- **Historie przypinają przygodę** przy starcie (snapshot i `maxDepth`), więc ponowny Sync nigdy nie zmienia trwającej historii. Przeglądarka dostaje tylko kartę przygody. Historie bez pola `world` to Grimm, bez migracji.
- **Frontend:** przełącznik światów, karty przygód w trzech grupach (z filtrem dzielnic), awatar Archiwisty, Codex z cytowanym kanonem, etykiety zależne od świata; w panelu sekcja „iFairy Universe” (adres, grant, klucz, test, sync z raportem, podgląd promptu).
- **Konfiguracja:** sekcja `universe` i klucz `UNIVERSE_API_KEY`; każda sekcja `config.json` jest sprawdzana osobno (jedno złe pole nie kasuje już zapisanych kluczy), a `PUT /api/admin/config` scala sekcje pole po polu.
- **Testy:** 57 (było 35): sztuczne API Universe, Sync i prywatność zapytań, pełny przebieg świata iFairy, zgodność ze starymi historiami.

---

## 4.2.0 · Art Kit: szata graficzna z planu Claude i obrazów OpenAI

Nowy moduł, który tworzy całą grafikę gry w stylu cyber-magii.

- **Plan (Claude jako dyrektor artystyczny):**
  - dostaje opis gry, palety interfejsu, kanonicznego wyglądu Ignisa i 19 slotów graficznych, z których aplikacja faktycznie korzysta;
  - zwraca *style bible* (nazwa stylu, paleta z rolami, kreska i cieniowanie, światło, motywy, karta postaci Ignisa, czego unikać) oraz prompt i tekst alternatywny dla każdego slotu;
  - działa na streamingu, z effort `high` i ustrukturyzowanym wyjściem;
  - brakujące sloty uzupełnia się z briefu, a niepoprawne kolory hex są odrzucane.
- **Render (OpenAI):**
  - model GPT Image (domyślnie `gpt-image-1`) z jakością low/medium/high;
  - przezroczyste tło dla postaci, ikon, odznak i znaku marki;
  - poziome kadry 1536×1024 dla sceny, okładek i karty do udostępniania;
  - kolejka w tle (3 obrazy naraz) z postępem;
  - pojedynczy slot można wygenerować ponownie, a błąd jednego obrazu nie zatrzymuje reszty.
- **Prompt obrazu** składa się z style bible, promptu slotu i ograniczeń technicznych. Karta postaci Ignisa trafia tylko do obrazów z Ignisem, a „bez napisów” do wszystkich poza kartą do udostępniania.
- **Panel admina → „Art kit”:**
  1. notatki dla Claude i plan;
  2. podgląd style bible z próbkami kolorów;
  3. siatka 19 kafelków z podglądem (szachownica dla przezroczystości), edycją promptu i ponownym renderem;
  4. publikacja i powrót do wbudowanego wyglądu.
- **Gdzie grafiki trafiają po publikacji:**
  - tło warsztatu i Ignis na ekranie głównym;
  - okładki na kartach baśni, w zapisanych rozgrywkach, nagłówku czytnika i tle ładowania ilustracji;
  - „Ignis maluje” podczas generowania ilustracji;
  - ikony typów wyboru i odznaki zakończeń;
  - logo, favicon (`/favicon.png`) i karta do udostępniania (`/og.png` z metatagami Open Graph).
  
  Slot bez obrazu zachowuje wbudowany wygląd CSS/SVG.
- **Pliki:** `DATA_DIR/artkit/` (stan w `kit.json`, obrazy w `files/` z unikalnymi nazwami i cache „immutable”). Nieużywane pliki są sprzątane.
- **Testy:** 7 nowych, razem 35. Sztuczne API Anthropic obsługuje streaming (SSE) i listę modeli, a nowe sztuczne API OpenAI obsługuje obrazy.
- **Poprawka:** tło sceny na ekranie głównym przykrywało zawartość.

## 4.1.0 · Utwardzenie, testy, CI, dokumentacja

**Serwer**
- Aplikacja Express wydzielona do `server/app.ts` (`createApp()`), `server.ts` tylko ją uruchamia. Dzięki temu da się ją testować bez nasłuchiwania na porcie.
- Nowy endpoint `GET /api/health` (stan i czas działania).
- Nagłówki bezpieczeństwa: `X-Content-Type-Options: nosniff`, `Referrer-Policy`. Wyłączony nagłówek `X-Powered-By`.
- Uszkodzony albo za duży JSON zwraca czytelny błąd JSON (400 / 413) zamiast strony HTML Expressa. Nieznane ścieżki `/api/*` zwracają 404 w JSON.
- **Blokada równoległych akcji:** na jednej historii może się pisać tylko jedna strona naraz. Drugie kliknięcie dostaje 409, zamiast wydać drugie wywołanie modelu.
- **Błędy dostawców (Gemini, OpenAI)** zwracają 502 z krótkim komunikatem typu „Gemini: API key not valid…”, a nie 500 z surowym JSON-em Google'a.
- Nowa zmienna `TRUST_PROXY`: za Cloud Run / reverse proxy limit zapytań widzi prawdziwe IP gracza.
- Poprawiony skrypt `start`: wcześniej uruchamiał zbudowany serwer w trybie deweloperskim (z Vite), teraz ustawia `NODE_ENV=production`.

**Frontend**
- Ekrany ładowane na żądanie: gracz nie pobiera kodu panelu admina, a czytnik ładuje się dopiero po otwarciu historii.
- Biblioteki w osobnych paczkach (React, motion, react-markdown), więc aktualizacja aplikacji nie unieważnia ich cache. Główna paczka spadła z 535 kB do 222 kB i zniknęło ostrzeżenie Vite.
- Usunięty martwy kod (`Burst` zastąpiony przez `ComicBurst`).

**Jakość**
- **Vitest** z 28 testami w 4 plikach. Część integracyjna działa na sztucznym serwerze Anthropic, bez kluczy i bez kosztów (szczegóły w [docs/OPERATORZY.md](docs/OPERATORZY.md#4-deweloper-skrypty-testy-ci)).
- `tsconfig` zaostrzony: `noUnusedLocals`, `noUnusedParameters`. Testy też przechodzą typecheck.
- **CI** w `.github/workflows/ci.yml`: typecheck, testy i build przy każdym pushu i PR.
- Nowe skrypty: `typecheck`, `test`, `test:watch`, `check`. Dodane `engines.node >= 20`.
- Dokumentacja: ten plik, [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md), [docs/OPERATORZY.md](docs/OPERATORZY.md) i nowy README.

---

## 4.0.0 · Styl „Cozy Workshop” (na podstawie filmów referencyjnych)

Inspiracja: dwa filmy z robotami-wróżkami w zimowym warsztacie (katapulta z ciastem; kominek, lampki i pierniki).

- **Klimat:** ściana z desek, migoczący blask kominka, girlandy migających lampek i padający śnieg z przełącznikiem zapamiętywanym w przeglądarce.
- **Kreska jak w kreskówce:** kremowe karty-naklejki z grubym konturem i twardym cieniem. Przyciski „wciskają się” w cień, a na kartach leżą czapy śniegu.
- **Krój pisma:** Fredoka (nagłówki z konturem), Nunito (tekst), Pixelify Sans (etykiety, ekrany robotów), Bangers (efekty dźwiękowe).
- **Ignis narysowany od nowa:** latająca księga-robot z ekranem CRT. Pikselowa twarz zmienia się z nastrojem, ma trzepoczące skrzydła wróżki i płomyk jako antenę. Przy zakończeniu przez śmierć widzi spirale.
- **Komiksowe efekty:** „OK!”, „ZAP!”, „BONK!”, „SUDO!” przy wyborach oraz „BONK!” / „THE END!” przy zakończeniach, z gwiazdkami i cukierkami (czyste CSS). Zmiany statystyk wyskakują jak komiksowe napisy.
- **Czytanie:** tekst na kartce w linie z zagiętym rogiem, ilustracje w drewnianej ramie, komentarze Ignisa w dymkach.
- **Ilustracje:** prompt Gemini / OpenAI i opisy scenografii baśni przestawione na ten sam cartoonowy styl.
- **Poprawki:**
  - wybuchy komiksowe nie wyświetlały się, bo biblioteka animacji przeskakiwała je do końca;
  - karta zakończenia nachodziła na dopisywany tekst;
  - pikselowe cyfry były nieczytelne;
  - lampki zasłaniały formularze przy przewijaniu;
  - nawigacja w panelu admina podświetlała złą sekcję.

## 3.0.0 · Warstwa animacji

- **Przewracanie strony:** obrót 3D z rozmyciem i smugą światła.
- **Karty wyborów:** świecące ikony typu, podświetlenie podążające za kursorem i iskry przy kliknięciu. Wybrana karta pulsuje, a pozostałe gasną.
- **Statystyki:** zmiany `+N/−N` przy wskaźnikach.
- **Ilustracje:** „wywołują się” z rozmycia, potem powoli dryfują. Podczas generowania kręcą się pierścienie run.
- **Ekran główny:** karty baśni pochylają się w 3D za kursorem, a nagłówek glitchuje.
- **Panel admina:** pulsujące statusy i nawigacja śledząca przewijanie.
- **Dostępność:** animacje respektują systemowe ustawienie ograniczenia ruchu.
- **Poprawka:** hook animacji tekstu przez jedną klatkę uznawał nową stronę za dopisaną. Wybory migały i znikały, a wciśnięty wtedy klawisz `1`–`4` przepadał.

## 2.0.0 · Nowy interfejs „Ember Grimoire”

- **Odejście od neonowego cyberpunku:** ciemny, edytorski styl z jednym akcentem w kolorze żaru.
- **System komponentów** w `src/ui.tsx`: przyciski, wskaźniki, panel boczny, powiadomienia, przełącznik.
- **Czytnik:**
  - wskaźniki w pasku u góry;
  - karty wyborów ze skrótami `1`–`4`, `/`, `M`, `V`, `Spacja`;
  - pole własnego ruchu z dyktowaniem i dołączaniem obrazu;
  - mapa linii czasu w panelu bocznym;
  - układ na telefonie z tekstem na pierwszym miejscu.
- **Panel admina:** kafelki statusu, automatyczne sprawdzanie kluczy przy wejściu, czytelne błędy dostawców, pasek niezapisanych zmian.

## 1.0.0 · Grimm Protocol: przebudowa na grę „wybierz własną przygodę”

- **Zamiast swobodnego czatu ustrukturyzowany silnik opowieści.** Claude zwraca każdą stronę jako sprawdzony JSON (narracja, komentarz, nastrój, 3–4 wybory typu sane/chaos/dumb/sudo, statystyki, kanon, ekwipunek, zakończenia, opis ilustracji).
- **Multimodalność:**
  - Claude pisze historię i rozumie obraz dołączony przez gracza;
  - Gemini albo OpenAI rysuje ilustracje;
  - głos narratora zapewnia przeglądarka, OpenAI TTS albo Gemini TTS;
  - dyktowanie działa na rozpoznawaniu mowy w przeglądarce.
- **5 baśni** z technicznym twistem: Czerwony Kapturek (MITM), Trzy Świnki (DDoS), Jaś i Małgosia (ciasteczka śledzące), Kopciuszek (wygasająca sesja), Smok Wawelski (trojan).
- **Linie czasu:** fork z każdej strony, cofanie, mapa drzewa, zapis historii na serwerze.
- **Panel admina:** klucze, test i pobieranie listy modeli, wybór modelu dla każdej roli, testy na żywo, limity.
- **Bezpieczeństwo:**
  - stan gry trzyma serwer, więc klient nie może podrobić odpowiedzi modelu;
  - limit zapytań i dzienny budżet ilustracji;
  - klucze w pliku z uprawnieniami 600, zawsze maskowane w odpowiedziach.
- **Naprawione błędy pierwotnej wersji:**
  - znikała historia czatu;
  - typ obrazka był wpisany na sztywno;
  - nieczyszczony interwał efektu pisania;
  - brak sprawdzania `res.ok`;
  - wykrywanie prośby o rysunek działało tylko po angielsku;
  - kliknięcie dodawało węzły DOM;
  - martwy CSS;
  - zdublowany `vite` w zależnościach.

## 0.1.0 · Pierwotna aplikacja (Google AI Studio)

„IGNIS // OS – Cyber-Grimoire”: jednoekranowy czat z Gemini w trzech trybach i generowaniem obrazów po słowach kluczowych, w neonowym stylu cyberpunk.
