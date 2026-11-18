# Operatorzy

Kto lub co obsługuje każdą część systemu: modele AI, ludzie, endpointy serwera, zabezpieczenia, konfiguracja i narzędzia.

---

## 1. Operatorzy AI (modalności)

| Rola | Dostawca | Domyślnie | Gdzie ustawić | Kod |
|---|---|---|---|---|
| **Struktura i narracja opowieści** | Anthropic (Claude) | `claude-opus-5-5`, effort `medium`, 12 stron do zakończenia | Panel → *Story engine* | `server/story/engine.ts`, `prompts.ts` |
| **Rozumienie obrazu** (artefakt gracza) | Anthropic (Claude) | ten sam model | zawsze włączone | `buildMessages()` |
| **Ilustracje** | Gemini **albo** OpenAI (albo wyłączone) | Gemini `gemini-3.1-flash-image-preview` | Panel → *Illustrations* | `server/media.ts`, `providers/gemini.ts`, `providers/openai.ts` |
| **Głos narratora** | przeglądarka, OpenAI TTS **albo** Gemini TTS | przeglądarka (za darmo) | Panel → *Narration voice* | `server/media.ts`, `Story.tsx` |
| **Dyktowanie ruchu** | przeglądarka (Web Speech API) | włączone, jeśli przeglądarka je obsługuje | — | `Story.tsx` → `listen()` |
| **Dyrekcja artystyczna** (plan szaty graficznej) | Anthropic (Claude) | model silnika opowieści, effort `high` | Panel → *Art kit* → krok 1 | `server/artkit/planner.ts` |
| **Szata graficzna** (19 grafik) | OpenAI Images | `gpt-image-1`, jakość `medium` | Panel → *Art kit* → krok 2 | `server/artkit/generator.ts`, `providers/openai.ts` → `openaiArt()` |

Nazwy modeli Gemini i OpenAI są domyślne, więc po dodaniu klucza wybierz właściwy model z listy pobranej w panelu.

### Claude: narrator i silnik

- **Wywołanie:** `client.beta.messages.parse` z `output_config.format` (schemat zod przez `betaZodOutputFormat`). Odpowiedź to sprawdzony JSON strony.
- **Fallback:** włączony (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). Jeśli model odmówi ze względów bezpieczeństwa, API samo ponawia zapytanie na modelu zastępczym. Na modelach bez fallbacku zapytanie po prostu idzie do wybranego modelu.
- **Cache:** prompt systemowy ma `cache_control: ephemeral`. Jest stały dla pary baśń + język, więc kolejne tury płacą za niego taniej.
- **Kontekst:** ostatnie 6 stron dosłownie, starsze jako streszczenie, do tego blok `STATE` (głębokość, statystyki, kanon, ekwipunek) i akcja gracza.
- **Ton i zasady** (`prompts.ts`):
  - **kim jest Ignis** (sekcja „Who you are"): latający robocik cybermagii wielkości dłoni — ciało ze skórzanej księgi, głowa to ekranik CRT z pikselową twarzą, przezroczyste skrzydła, płomyk zamiast anteny. Gadżet, nie wróżka: bootuje się, laguje i przegrzewa. Ten sam wygląd, co w kanonie Art Kitu i w `SVGCharacter`;
  - **rodzaj gramatyczny:** po polsku Ignis mówi o sobie zawsze w rodzaju męskim („zrobiłem", „jestem gotowy"), bo „księga" i „wróżka" ciągnęły narratora w żeńskie formy. Nie przesądza też płci gracza;
  - **running gag:** zapytany o to, czy jest chłopcem, czy dziewczynką, odpowiada tylko tyle, że czuje się kwiatkiem — bez tłumaczenia i z powrotem do baśni;
  - widownia od 12 lat: humor jak z dobrego familijnego filmu animowanego (absurd, kalambury, slapstick, proste żarty o grach i technice), Ignis droczy się z graczem po koleżeńsku, nigdy złośliwie; żadnych nazw ani postaci z istniejących serii;
  - PG: tylko kreskówkowe zagrożenie, nikt nie ginie na stronie (złoczyńcy zostają przechytrzeni, uwięzieni albo przegonieni), bez przekleństw (także bez `#$%@!`), bez romansu, używek i żartów z wyglądu;
  - zakończenie `death` to kreskówkowe „game over” z podpowiedzią, że można się cofnąć;
  - 3 wybory (rozsądny, chaos, głupi) i czasem `sudo`;
  - **glitch-łamigłówki** co 3–4 strony (warunek, kolejność, pętla, logika „kto co robi”), rozwiązywalne ze wskazówek w narracji: odpowiedź wpisuje się jako własny ruch, rozsądna opcja to podpowiedź, zła odpowiedź daje drugą szansę i nigdy nie kończy gry, panel DEBUG nie zdradza rozwiązania; raz lub dwa razy na baśń zwrot akcji „a co jeśli”;
  - **plan strony przed pisaniem** (zero-shot CoT): co zmienia ruch gracza → najzabawniejsza logiczna konsekwencja → który kanoniczny moment jest blisko → czego gracz może nie rozumieć z technologii tej baśni → trzy naprawdę różne wybory. Samo rozumowanie nie trafia do gracza, tylko pola schematu;
  - **panel DEBUG** (`explainer`): pytanie, które zadałby 12-latek, i 2–4 kroki wyjaśnienia prawdziwej technologii tej strony (`tale.tech`), w języku opowieści. Technologia jest prawdziwa, nawet gdy baśń nie jest: model ma nie zmyślać, a przy trudnym temacie wyjaśnić mniejszy kawałek;
  - **zasada domu „jak wyjaśnisz, to zaistnieje”:** własny ruch z uzasadnieniem (choćby absurdalnym) działa hojniej i dostaje nagrodę, a narracja nazywa przyjętą część wyjaśnienia; ruch bez uzasadnienia też się udaje, ale krzywiej i śmieszniej;
  - próby jailbreaka kończą się żartobliwą, nieszkodliwą karą w fabule (np. gracz na stronę zmienia się w żabę), prośby nieodpowiednie dla 12-latka narrator zamienia w coś zabawnego, a gdy słowa gracza brzmią na prawdziwy niepokój, jednym zdaniem zachęca do rozmowy z zaufanym dorosłym.
- **Błędy:**
  - odmowa → 422 „IGNIS refused…”;
  - ucięta albo niepoprawna strona → 502;
  - błędy SDK zamieniają się w czytelne komunikaty („Anthropic rejected the API key.” itd.).

### Ilustracje i głos

- **Prompt ilustracji:** stały styl (`IMAGE_STYLE`: cartoonowy warsztat, gruby kontur, płaskie cieniowanie, roboty z ekranowymi twarzami), do tego scenografia baśni (`tale.art`) i opis sceny od Claude.
- **Spójność postaci:** Gemini dostaje pierwszą ilustrację z danej ścieżki jako obraz referencyjny.
- **Cache i odporność:** gotowy obraz i nagranie zapisują się przy stronie i nie są generowane drugi raz. Równoległe prośby o ten sam obraz łączą się w jedną.
- **Brak klucza** zwraca 503 z instrukcją. **Błąd dostawcy** zwraca 502 z krótkim komunikatem „Gemini: …” / „OpenAI: …”.

### Art Kit: Claude planuje, OpenAI maluje

- **Claude (dyrektor artystyczny)** dostaje opis gry i grupy docelowej, paletę obecnego interfejsu, kanoniczny wygląd Ignisa oraz 19 slotów z briefem, miejscem użycia, rozmiarem i informacją o przezroczystości. Do tego notatki sysadmina.
  - Zwraca *style bible* i prompt oraz tekst alternatywny dla każdego slotu.
  - Działa na streamingu (długa odpowiedź), z ustrukturyzowanym wyjściem i fallbackiem przy odmowie.
- **OpenAI** renderuje każdy slot osobno, w kolejce w tle (3 naraz).
  - Prompt składa się ze style bible, promptu slotu i ograniczeń technicznych.
  - Modele GPT Image dostają dokładny rozmiar, jakość i przezroczyste tło; DALL·E 3 najbliższy obsługiwany rozmiar.
  - Błąd jednego obrazu (np. filtr bezpieczeństwa) oznacza tylko ten slot jako „Failed” z czytelnym komunikatem.
- **Koszt:** pełny render to 19 wywołań API obrazów. Pojedynczy slot można wygenerować ponownie osobno. Art kit nie wlicza się do dziennego budżetu ilustracji graczy, bo to akcja sysadmina.

---

## 2. Operatorzy ludzie

### Gracz
- Wybiera baśń, imię („debugger name”) i język opowieści (PL/EN). Interfejs jest po angielsku.
- Gra wyborami albo własnym ruchem: do 280 znaków, dyktowaniem albo obrazem do 5 MB (zmniejszanym w przeglądarce do 1024 px). Własny ruch opłaca się uzasadnić: „jak wyjaśnisz, to zaistnieje”.
- Może rozwinąć panel **DEBUG** pod stroną (klawisz `D`) i przeczytać krok po kroku, jak działa prawdziwa technologia z tej strony.
- Może cofać się i forkować z mapy linii czasu, włączać czytanie na głos, kopiować kartę linii czasu i włączać lub wyłączać śnieg.
- Nie ma konta. Rozgrywki pamięta jego przeglądarka (lista ID), a treść historii jest na serwerze.

### Sysadmin (`/#/admin`)
- **Dostęp:**
  - jeśli ustawione jest `ADMIN_PASSWORD`, każde zapytanie wymaga nagłówka `x-admin-password` (porównanie odporne na ataki czasowe);
  - bez hasła panel odpowiada **tylko z localhosta**.
- **Klucze:**
  - wklej, kliknij *Test* (pobiera listę modeli bez zapisywania klucza), potem *Save*;
  - klucz zapisany w panelu ma pierwszeństwo przed zmienną środowiskową, a usunięcie go przywraca zmienną;
  - klucze nigdy nie wracają w całości, tylko w formie `sk-ant…abcd`.
- **Role:** model i effort Claude, liczba stron do zakończenia, dostawca i model ilustracji, dostawca, model i głos TTS.
- **Testy na żywo:** prawdziwe wywołanie z zapisaną konfiguracją. Claude odpowiada zdaniem, ilustracja się wyświetla, a głos odtwarza.
- **Limity:** akcje na minutę na gracza i ilustracje dziennie dla wszystkich graczy.
- **Art kit:**
  1. notatki dla Claude, potem *Plan with Claude*;
  2. przegląd style bible;
  3. model i jakość OpenAI (zapisywane z konfiguracją);
  4. *Render all 19* albo *Render missing*;
  5. poprawki promptów i ponowny render pojedynczych slotów;
  6. *Publish* (gracze widzą grafiki) albo *Back to built-in look*.

---

## 3. Operatorzy serwera (endpointy)

**API gry** (`server/routes.ts`). Limit to „akcje na minutę” ustawiane w panelu (domyślnie 12, liczone per IP).

| Metoda i ścieżka | Limit | Co robi |
|---|---|---|
| `GET /api/health` | — | Stan serwera i czas działania |
| `GET /api/config` | — | Które modalności działają (`storyReady`, `image`, `tts`, `vision`) |
| `GET /api/tales` | — | Katalog baśni (bez promptów i kanonicznych momentów) |
| `POST /api/story` | ✓ | Nowa historia `{taleId, lang, heroName}` → pierwsza strona od Claude |
| `GET /api/story/:id` | — | Pełna historia |
| `POST /api/story/:id/act` | ✓ + blokada | `{pageId, choiceId}` albo `{pageId, custom?, image?}` → nowa strona |
| `POST /api/story/:id/goto` | — | Cofnięcie do strony (następny ruch tworzy fork) |
| `POST /api/story/:id/page/:pageId/image` | ✓ + budżet | Ilustracja strony (z cache albo generowana) |
| `POST /api/story/:id/page/:pageId/speech` | ✓ | Nagranie strony albo `null` (wtedy czyta przeglądarka) |
| `GET /media/...` | — | Zapisane obrazy i nagrania |
| `GET /api/artkit` | — | Opublikowany art kit: `{version, assets: {slot: url}, alt}` |
| `GET /artkit/...` | — | Grafiki art kitu (cache na rok, nazwy unikalne) |
| `GET /favicon.png`, `GET /og.png` | — | Przekierowanie na znak marki / kartę do udostępniania (404 bez publikacji) |

**API admina** (`server/admin.ts`, za autoryzacją):

| Metoda i ścieżka | Co robi |
|---|---|
| `GET /api/admin/config` | Konfiguracja + status kluczy (źródło, maska) + czy panel ma hasło |
| `PUT /api/admin/config` | Zapis ról i limitów; każda sekcja i każde pole są opcjonalne i scalają się z zapisaną konfiguracją. `keys.{provider}`: tekst zapisuje klucz, `null` go usuwa |
| `POST /api/admin/providers/:provider/models` | Test klucza (z formularza albo zapisanego) i lista modeli z tagami `text` / `image` / `tts` |
| `POST /api/admin/probe/:role` | Test na żywo: `story`, `image` albo `tts` |
| `GET /api/admin/artkit` | Sloty, plan, stan każdego obrazu, ustawienia, gotowość kluczy |
| `POST /api/admin/artkit/plan` | Plan od Claude `{notes?}` (jeden naraz, 409 jeśli trwa) |
| `PUT /api/admin/artkit/plan/:slot` | Edycja promptu i alt jednego slotu |
| `POST /api/admin/artkit/generate` | Render `{slots?}`: wszystkie albo wybrane (409, jeśli render trwa; 503 bez klucza OpenAI) |
| `POST /api/admin/artkit/publish` | Publikuje gotowe grafiki (wersja +1) |
| `DELETE /api/admin/artkit/published` | Powrót do wbudowanego wyglądu |

**Kody błędów:** 400 zły input · 401/403 brak dostępu · 404 brak zasobu · 409 konflikt (koniec historii, brak many, strona w trakcie pisania) · 413 za duże zapytanie · 422 odmowa modelu · 429 limit · 502 błąd dostawcy · 503 brak klucza albo modalność wyłączona.

### Zabezpieczenia w skrócie
- **Stan i walidacja:** stan gry wyłącznie po stronie serwera, a każde wejście walidowane przez zod.
- **Ochrona przed nadużyciem i kosztami:** limit zapytań, dzienny budżet ilustracji (nieudane się nie liczą), blokada równoległych akcji na historii.
- **Klucze:** plik z prawami 600, zawsze maskowane w odpowiedziach. Panel admina chroni hasło albo dostęp tylko z localhosta.
- **Ścieżki plików:** ID historii jest walidowane, a pliki mediów nie wyjdą poza `DATA_DIR/media`.
- **Konfiguracja:** każda sekcja `config.json` jest sprawdzana osobno, więc jedno złe pole resetuje tylko swoją sekcję, nigdy zapisanych kluczy.
- **Nagłówki:** `nosniff`, `Referrer-Policy`, bez `X-Powered-By`. Błędy zawsze w JSON.

---

## 4. Deweloper: skrypty, testy, CI

| Skrypt | Działanie |
|---|---|
| `bun run dev` | Serwer z Vite (hot reload) na `PORT` (3000) |
| `bun run build` | Frontend do `dist/` + serwer do `dist/server.cjs` |
| `bun run start` | Produkcyjnie: `NODE_ENV=production node dist/server.cjs` |
| `bun run typecheck` | `tsc --noEmit` (ścisły: brak nieużywanych zmiennych i parametrów) |
| `bun run test` / `test:watch` | Vitest |
| `bun run check` | Typecheck + testy + build: to samo, co robi CI |

**Testy** (`tests/`, 40 testów):
- `engine.test.ts`:
  - normalizacja wartości spoza listy;
  - przycinanie statystyk i kanonu;
  - koszt `sudo`;
  - limit ekwipunku i artefakty;
  - `toExplainer`: przycinanie kroków panelu DEBUG (najwyżej 4, bez pustych) i `null`, gdy nie ma czego pokazać;
  - zakończenia;
  - `pathTo`;
  - budowa kontekstu (okno 6 stron, streszczenie, obraz przed tekstem).
- `config.test.ts`: maskowanie kluczy, pierwszeństwo klucza z panelu, prawa 600 pliku, walidacja.
- `providers.test.ts`: czyszczenie błędów Google / OpenAI.
- `api.test.ts` (integracyjne, sztuczny serwer Anthropic przez `ANTHROPIC_BASE_URL`):
  - pełna rozgrywka z forkiem;
  - kształt zapytania do Claude (fallback, structured output, cache, język);
  - błędy wejścia, `sudo` bez many i koniec historii;
  - blokada równoległych akcji i limit zapytań;
  - brak klucza dla ilustracji;
  - maskowanie i usuwanie kluczy;
  - hasło admina i test na żywo.

- `grimm-golden.test.ts`: dokładne body zapytań Grimm do Claude (start, wybór, własny ruch) porównane z `tests/fixtures/grimm-requests.json`. Celową zmianę w Grimm zatwierdza się przez `UPDATE_GOLDEN=1`.
- `config-load.test.ts`: zły `config.json` resetuje tylko swoją sekcję i zachowuje klucze; sekcje usuniętego świata iFairy (`universe`, `gm`) znikają.
- `artkit.test.ts` (sztuczne API Anthropic ze streamingiem i sztuczne API OpenAI):
  - plan pokrywa wszystkie sloty i odrzuca złe kolory;
  - składanie promptów (karta Ignisa tylko tam, gdzie Ignis; napisy tylko w karcie do udostępniania);
  - edycja promptu;
  - render z poprawnym rozmiarem i tłem, błąd jednego slotu i ponowny render;
  - publikacja, pliki, favicon i karta do udostępniania;
  - cofnięcie publikacji;
  - brak klucza OpenAI.

**CI** (`.github/workflows/ci.yml`): na każdy push do `main` i `claude/**` oraz każdy PR uruchamia bun install, typecheck, testy i build. Nie potrzebuje żadnych kluczy.

---

## 5. Zmienne środowiskowe

| Zmienna | Wymagana | Opis |
|---|---|---|
| `ANTHROPIC_API_KEY` | tak* | Klucz do Claude (*albo ustawiony w panelu) |
| `GEMINI_API_KEY` | nie | Ilustracje i/lub głos przez Gemini |
| `OPENAI_API_KEY` | nie | Ilustracje i/lub głos przez OpenAI |
| `ADMIN_PASSWORD` | nie | Stare hasło panelu, używane tylko bez `T1000_DATABASE_URL`. Bez obu panel działa tylko z localhosta |
| `DATA_DIR` | nie | Katalog danych (domyślnie `data`) |
| `PORT` | nie | Port HTTP (domyślnie 3000) |
| `TRUST_PROXY` | nie | Za proxy / Cloud Run (np. `1`), żeby limit widział prawdziwe IP |
| `NODE_ENV` | nie | `production` serwuje `dist/` (ustawia to skrypt `start`) |
| `DISABLE_HMR` | nie | Ustawiana przez AI Studio, wyłącza hot reload |
| `ANTHROPIC_BASE_URL` | nie | Inny adres API Anthropic (używane w testach) |
| `T1000_DATABASE_URL` | zalecana | Konto MariaDB `ignis_book` z dostępem tylko do tabel `t1000.ignis_*`. Włącza logowanie loginem i hasłem (sekcja 6) |
| `IGNIS_T1000_SECRET` | nie | 32 bajty hex. Szyfruje klucze API w `t1000.ignis_api_keys`. **Bez niego zapisane klucze są nie do odczytania** |

## 6. Magazyn w bazie t1000

Od 6.2.1 projekt ma własne tabele we wspólnej bazie MariaDB `t1000` (tej samej, w której panel T1000 trzyma `panel_users`, `tc_*`, `gr_*`, `diag_*`). Prefiks `ignis_` oddziela je od tabel panelu.

| Tabela | Co zawiera |
|---|---|
| `ignis_admins` | Konta admina gry. Na start jedno: `superadmin` (rola `superadmin`) z hashem scrypt hasła `ADMIN_PASSWORD`, nigdy z samym hasłem |
| `ignis_api_keys` | Klucze dostawców (`anthropic`, `gemini`, `openai`) zaszyfrowane AES-256-GCM kluczem `IGNIS_T1000_SECRET`; nazwa dostawcy jest AAD, a `key_hint` to 4 ostatnie znaki do rozpoznania klucza |

- **Schemat:** `db/t1000/001_ignis_storage.sql` (`CREATE TABLE IF NOT EXISTS`, można uruchamiać wielokrotnie): `mysql t1000 < db/t1000/001_ignis_storage.sql`.
- **Zapis i odświeżenie:** `node scripts/t1000-seed.mjs | mysql t1000`. Skrypt czyta `ADMIN_PASSWORD`, klucze z `data/config.json` (a gdy ich brak, z `.env`) i wypisuje SQL z samym hashem i szyfrogramem. Upsert, więc po zmianie klucza w panelu wystarczy uruchomić go ponownie.
- **Sprawdzenie:** `node scripts/t1000-seed.mjs --verify` odszyfrowuje wiersze i porównuje je z obecnymi wartościami. Nie wypisuje żadnego sekretu.
- **Konto aplikacji:** `ignis_book@localhost` ma tylko `SELECT, INSERT, UPDATE, DELETE` na dwóch tabelach `ignis_*`; reszta bazy `t1000` jest dla niego zamknięta.
- **Logowanie do panelu (od 6.3.0) idzie przez `ignis_admins`:** login + hasło, sesja 12 h w pamięci serwera. `ADMIN_PASSWORD` jest używane tylko wtedy, gdy nie ma `T1000_DATABASE_URL`.
- **Ustawianie hasła przy starcie:** gdy superadmin nie ma hasła, serwer przy uruchomieniu tworzy jednorazowy kod (24 h) w logu PM2 i w `data/admin-setup-code.txt` (0600). Panel prosi o kod, login i nowe hasło; po użyciu kod i plik znikają.
- **Zapomniane hasło:** `npm run admin:reset` → `pm2 restart demo-ifairy-book` → `cat data/admin-setup-code.txt` → `/#/admin`. Reset czyści tylko hasło, login zostaje.
- **Klucze API to na razie magazyn, nie źródło prawdy:** gra dalej czyta je z `data/config.json` i `.env`. Zmiana klucza w panelu gry nie trafia sama do bazy: trzeba ponownie uruchomić `npm run t1000:seed -- | mysql t1000` (albo `node scripts/t1000-seed.mjs | mysql t1000`).
- **Kopie:** baza `t1000` jest w nocnych kopiach MariaDB serwera. Szyfrogram bez `IGNIS_T1000_SECRET` jest bezużyteczny, więc sekret trzeba przechowywać razem z kopią `.env`.

### Postacie (od 6.4.0)

Model postaci jest zgodny z ARB (szkielet: [postacie.sql](postacie.sql); wdrożenie ARB: `arb_narratoriusz.character_*`). Jedna postać to wiersz rejestru i warstwy połączone jej `id`:

| Tabela | Co zawiera |
|---|---|
| `ignis_characters` | Rejestr: `slug`, `name` (pl), `name_en`, przydomek, rola, rodzaj (`postac`/`grupa`/`istota`/`obiekt`), `tale_id` z `shared/tales.ts` (NULL dla narratora), `arb_character_id` |
| `ignis_character_dna` | Kim jest i co pamięta: gatunek, temat, profil emocji, `dna_json.arb_character_v1` (pragnienie, potrzeba, ślepa plamka, stałe fakty, rekwizyty, prawa świata, łuk) |
| `ignis_character_personas` | Jak mówi, w trybie `grimm`: opis, powitanie, prompt odgrywania (generowany ze wzoru szkieletu), `interaction_style.arb_voice_v1` |
| `ignis_character_retellings` | Komiczna scena do zagrania: absurdalna reguła, przygotowanie, eskalacja, puenta, granica humoru, wybory A/B/C |
| `ignis_character_relationships` | Kto z kim i jakie jest między nimi napięcie |

- **Źródło treści:** `db/t1000/characters.grimm.json`. Zmiana postaci = edycja tego pliku, `npm test` (sprawdza kontrakty), potem `npm run -s t1000:characters | mysql t1000`. Serwer wczyta zmiany w ciągu 10 minut albo po restarcie.
- **Schemat:** `mysql t1000 < db/t1000/002_ignis_characters.sql` (można uruchamiać wielokrotnie; nadaje `ignis_book` tylko `SELECT`).
- **W grze:** prompt baśni dostaje sekcję `# Characters` (pragnienie, ślepa plamka, stałe fakty, rekwizyty, głos, reakcja pod presją) i opcjonalną scenę z aktywnego retellingu tej baśni. Narrator Ignis jest w bazie dla porządku, ale do promptu nie trafia: opisuje go sekcja „Who you are”. Bez bazy sekcji nie ma i gra działa jak wcześniej.
- **Zgodność z ARB:** te same kolumny i gałęzie JSON, więc zapytania ARB działają po zmianie prefiksu. Odpowiedniki w ARB: Kapturek 28, Wilk 29, Babcia 30, Gajowy 31, Kopciuszek 20, Książę 21, Macocha 22, Wróżka Chrzestna 23, Smok 24, Skuba 25 (u nich Szewczyk Dratewka), Król Krak 26.
