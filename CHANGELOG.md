# Historia zmian

Wszystkie zmiany od pierwotnej aplikacji z Google AI Studio do obecnej gry **IGNIS // OS: Grimm Protocol**.
Wersje odpowiadają commitom na gałęzi `claude/quirky-hopper-4ii20w`.

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
