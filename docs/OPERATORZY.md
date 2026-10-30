# Operatorzy

Kto lub co obsługuje każdą część systemu: modele AI, ludzie, endpointy serwera, zabezpieczenia, konfiguracja i narzędzia.

---

## 1. Operatorzy AI (modalności)

| Rola | Dostawca | Domyślnie | Gdzie ustawić | Kod |
|---|---|---|---|---|
| **Struktura i narracja opowieści** | Anthropic (Claude) | `claude-opus-5-5`, effort `medium`, 12 stron do zakończenia | Panel → *Story engine* | `server/story/engine.ts`, `prompts.ts` |
| **Narrator świata iFairy** (Architectus Magnus Realitas) | Anthropic (Claude) | ten sam model i effort | Panel → *Story engine* | `server/story/worlds/ifairy/` |
| **Kanon iFairy** (przygody i lore na żywo) | iFairy Universe, API lore (`universe-ifairy`, :8793) | wyłączone; grant `if-ai`, adres loopback | Panel → *iFairy Universe* | `server/universe/` |
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
  - humor dla 16+ w duchu „Ricka i Morty'ego”, ale bez nazw i postaci z serialu;
  - PG-13, przekleństwa wyłącznie jako `#$%@!`;
  - 3 wybory (rozsądny, chaos, głupi) i czasem `sudo`;
  - próby jailbreaka zostają obśmiane w fabule.
- **Błędy:**
  - odmowa → 422 „IGNIS refused…”;
  - ucięta albo niepoprawna strona → 502;
  - błędy SDK zamieniają się w czytelne komunikaty („Anthropic rejected the API key.” itd.).

### Narrator świata iFairy i Universe

- **To samo wywołanie co Grimm** (parse + structured output, fallback, cache), ale z innym schematem strony (`IfairyPageOutput`) i promptem zbudowanym wyłącznie ze snapshotu przygody.
- **Profil treści `ifairy-13plus`** wzięty z kanonu (`NARRATIVE_STYLE:safety*`): bez treści dla dorosłych i drastycznych, konflikt zawsze rozwiązany konstruktywnie, Void tylko jako zamknięta przeszłość, nigdy nie kpić z gracza, nie pytać o dane osobowe, przy niepokoju gracza ciepło i zachęta do rozmowy z zaufanym dorosłym. Próby jailbreaka narrator łagodnie zawraca do historii (bez wyśmiewania, w przeciwieństwie do Ignisa).
- **Canon lock:** jedyne siły to Logos, Mythos, Gnosis, Phantasia i If-AI; żadnych bogów; iFairies to bezpłciowe roboty ze skrzydłami cybermagii (też w promptach ilustracji); tylko postacie z domeny publicznej.
- **Wybory:** A i B z przypisaną siłą, C to zawsze „własnymi słowami” (pole własnego ruchu). Bez śmierci i klątw.
- **Universe:** Sync pobiera przygody przez `GET /v1/ref/*` i sprawdza `chunk.id`; tura woła `POST /v1/search` tylko z terminami z listy dozwolonych (`server/universe/terms.ts`), bo Universe przesyła zapytanie do zewnętrznego modelu embeddingów. Odpowiedzi 400 z guardu danych osobowych są liczone w statusie panelu (powinno ich być zero).
- **Odmowa** → 422 „The Archive could not write that page…”.

### Ilustracje i głos

- **Prompt ilustracji:** stały styl (`IMAGE_STYLE`: cartoonowy warsztat, gruby kontur, płaskie cieniowanie, roboty z ekranowymi twarzami), do tego scenografia baśni (`tale.art`) albo przygody iFairy (`adventure.art` + zasada wyglądu iFairies z kanonu) i opis sceny od Claude.
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
- Wybiera świat (gdy iFairy jest włączone), baśń albo przygodę, imię („debugger handle” albo zmyślone „Architect name”, które serwer odrzuca, jeśli wygląda na dane osobowe) i język opowieści (PL/EN). Interfejs jest po angielsku.
- W świecie iFairy może otworzyć **Codex**: fragmenty kanonu, z których narrator korzystał na tej ścieżce, z ich REF.
- Gra wyborami albo własnym ruchem: do 280 znaków, dyktowaniem albo obrazem do 5 MB (zmniejszanym w przeglądarce do 1024 px).
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
- **iFairy Universe:**
  1. w T1000 → Universe Connections zarejestruj konsumenta (grant `book-gm`, a bez niego `if-ai`; host pin `127.0.0.1`) i skopiuj klucz `uapi_…`;
  2. wklej klucz, *Test* (health + prawdziwe wyszukiwanie z grantem), *Save*;
  3. *Sync now*: raport pokazuje przygody `failed` i `seed-only`;
  4. sprawdź *Narrator prompt preview* dla kilku przygód;
  5. przełącz *iFairy world* na *On* i zapisz.
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
| `GET /api/worlds` | — | Które światy można grać: `grimm`, `ifairy` (z liczbą przygód i wersją kanonu) |
| `GET /api/adventures` | — | Karty przygód iFairy (pusta lista, gdy świat jest wyłączony) |
| `POST /api/story` | ✓ | Nowa historia `{taleId, lang, heroName}` albo `{world: "ifairy", adventureId, lang, heroName}` → pierwsza strona od Claude |
| `GET /api/story/:id` | — | Pełna historia (w iFairy przygoda tylko jako karta) |
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
| `PUT /api/admin/config` | Zapis ról i limitów; każda sekcja i każde pole są opcjonalne i scalają się z zapisaną konfiguracją. `keys.{provider}` (także `universe`): tekst zapisuje klucz, `null` go usuwa |
| `POST /api/admin/providers/:provider/models` | Test klucza (z formularza albo zapisanego) i lista modeli z tagami `text` / `image` / `tts` |
| `POST /api/admin/probe/:role` | Test na żywo: `story`, `image` albo `tts` |
| `GET /api/admin/artkit` | Sloty, plan, stan każdego obrazu, ustawienia, gotowość kluczy |
| `POST /api/admin/artkit/plan` | Plan od Claude `{notes?}` (jeden naraz, 409 jeśli trwa) |
| `PUT /api/admin/artkit/plan/:slot` | Edycja promptu i alt jednego slotu |
| `POST /api/admin/artkit/generate` | Render `{slots?}`: wszystkie albo wybrane (409, jeśli render trwa; 503 bez klucza OpenAI) |
| `POST /api/admin/artkit/publish` | Publikuje gotowe grafiki (wersja +1) |
| `DELETE /api/admin/artkit/published` | Powrót do wbudowanego wyglądu |
| `GET /api/admin/universe/status` | Ustawienia, status klucza, liczniki wywołań i błędów, podsumowanie katalogu z raportem |
| `POST /api/admin/universe/test` | `{url?, key?, grant?}`: health + jedno prawdziwe wyszukiwanie (wychwytuje brak grantu) |
| `POST /api/admin/universe/sync` | Synchronizacja katalogu przygód (jedna naraz, 409 jeśli trwa) |
| `GET /api/admin/universe/adventures/:id/prompt?lang=` | Złożony prompt narratora dla przygody |

**Kody błędów:** 400 zły input · 401/403 brak dostępu · 404 brak zasobu · 409 konflikt (koniec historii, brak many, strona w trakcie pisania) · 413 za duże zapytanie · 422 odmowa modelu · 429 limit · 502 błąd dostawcy · 503 brak klucza albo modalność wyłączona.

### Zabezpieczenia w skrócie
- **Stan i walidacja:** stan gry wyłącznie po stronie serwera, a każde wejście walidowane przez zod.
- **Ochrona przed nadużyciem i kosztami:** limit zapytań, dzienny budżet ilustracji (nieudane się nie liczą), blokada równoległych akcji na historii.
- **Klucze:** plik z prawami 600, zawsze maskowane w odpowiedziach. Panel admina chroni hasło albo dostęp tylko z localhosta.
- **Ścieżki plików:** ID historii jest walidowane, a pliki mediów nie wyjdą poza `DATA_DIR/media`.
- **Dane osobowe a Universe:** zapytania o lore składają się wyłącznie z terminów kanonu; imię bohatera iFairy przechodzi przez te same wzorce co guard Universe. Przeglądarka nie dostaje przypiętego snapshotu przygody.
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

**Testy** (`tests/`, 57 testów):
- `engine.test.ts`:
  - normalizacja wartości spoza listy;
  - przycinanie statystyk i kanonu;
  - koszt `sudo`;
  - limit ekwipunku i artefakty;
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
- `config-load.test.ts`: zły `config.json` resetuje tylko swoją sekcję i zachowuje klucze.
- `universe.test.ts` (sztuczne API Universe z tymi samymi wzorcami danych osobowych):
  - cięcie haków i checklisty z kanonu;
  - Sync: 40 snapshotów, `seed-only` dla nieindeksowanych dzielnic, stabilny hash, błąd przy chybionym REF bez utraty poprzedniego snapshotu;
  - błędy klucza i grantu, cache i degradacja do zera fragmentów;
  - zapytania o lore wyłącznie z terminów kanonu.
- `ifairy.test.ts` (sztuczne API Anthropic, OpenAI i Universe):
  - klucz, test i Sync z panelu; zapis innych sekcji nie kasuje ustawień Universe;
  - start i akcje: prompt Archiwisty, fragmenty tylko w ostatniej turze, identyczny prompt systemowy przez całą historię, cytaty w `lore`;
  - Universe nie dostaje tekstu gracza; gra działa, gdy Universe leży;
  - ilustracja z zasadą wyglądu iFairies; odrzucenie prawdziwego imienia; limity strony iFairy;
  - historie sprzed 4.3 grają jako Grimm.
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
| `ADMIN_PASSWORD` | zalecana | Hasło panelu. Bez niego panel działa tylko z localhosta |
| `DATA_DIR` | nie | Katalog danych (domyślnie `data`) |
| `PORT` | nie | Port HTTP (domyślnie 3000) |
| `TRUST_PROXY` | nie | Za proxy / Cloud Run (np. `1`), żeby limit widział prawdziwe IP |
| `NODE_ENV` | nie | `production` serwuje `dist/` (ustawia to skrypt `start`) |
| `DISABLE_HMR` | nie | Ustawiana przez AI Studio, wyłącza hot reload |
| `ANTHROPIC_BASE_URL` | nie | Inny adres API Anthropic (używane w testach) |
| `UNIVERSE_API_KEY` | nie | Klucz konsumenta iFairy Universe (`uapi_…`), jeśli nie zapisano go w panelu |
| `UNIVERSE_API_URL` | nie | Domyślny adres API Universe (domyślnie `http://127.0.0.1:8793`); panel może go nadpisać |
