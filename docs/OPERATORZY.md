# Operatorzy

Kto lub co obsługuje każdą część systemu: modele AI, ludzie, endpointy serwera, zabezpieczenia, konfiguracja i narzędzia.

---

## 1. Operatorzy AI (modalności)

| Rola | Dostawca | Domyślnie | Gdzie ustawić | Kod |
|---|---|---|---|---|
| **Narrator Edu-Verse** (Ignis, mentor cyber-magii) | Anthropic (Claude) | `claude-opus-5-5`, effort `medium`, 12 stron do zakończenia | Panel → *Story engine* | `server/story/worlds/ifairy/` |
| **AI Game Master** | Anthropic (Claude) + reguły w kodzie | wyłączony; model silnika, effort `low`, 4 rundy, 75 s | Panel → *Game Master* | `server/gm/` |
| **Recenzja treści** (młodzi odkrywcy, ok. 8+) | Anthropic (`claude-haiku-5-5`) | po ruchach własnymi słowami | Panel → *Game Master* → *Content review* | `server/gm/loop.ts` → `judgePage()` |
| **Kanon iFairy** (reguły, iFairies, lore na żywo) | iFairy Universe, API lore (`universe-ifairy`, :8793) | wyłączone; grant `if-ai`, adres loopback | Panel → *iFairy Universe* | `server/universe/` |
| **Rozumienie obrazu** (zdjęcie zadania domowego albo artefakt) | Anthropic (Claude) | ten sam model | zawsze włączone | `ifairyMessages()` |
| **Ilustracje** | Gemini **albo** OpenAI (albo wyłączone) | Gemini `gemini-3.1-flash-image-preview` | Panel → *Illustrations* | `server/media.ts`, `providers/gemini.ts`, `providers/openai.ts` |
| **Głos narratora** | przeglądarka, OpenAI TTS **albo** Gemini TTS | przeglądarka (za darmo) | Panel → *Narration voice* | `server/media.ts`, `Story.tsx` |
| **Dyktowanie ruchu** | przeglądarka (Web Speech API) | włączone, jeśli przeglądarka je obsługuje | — | `Story.tsx` → `listen()` |
| **Dyrekcja artystyczna** (plan szaty graficznej) | Anthropic (Claude) | model silnika opowieści, effort `high` | Panel → *Art kit* → krok 1 | `server/artkit/planner.ts` |
| **Szata graficzna** (26 grafik) | OpenAI Images | `gpt-image-1`, jakość `medium` | Panel → *Art kit* → krok 2 | `server/artkit/generator.ts`, `providers/openai.ts` → `openaiArt()` |

Nazwy modeli Gemini i OpenAI są domyślne, więc po dodaniu klucza wybierz właściwy model z listy pobranej w panelu.

### Claude: Ignis, narrator Edu-Verse

- **Wywołanie:** `client.beta.messages.parse` z `output_config.format` (schemat zod `IfairyPageOutput` przez `betaZodOutputFormat`). Odpowiedź to sprawdzony JSON strony.
- **Fallback:** włączony (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). Jeśli model odmówi ze względów bezpieczeństwa, API samo ponawia zapytanie na modelu zastępczym.
- **Cache:** prompt systemowy (`worlds/ifairy/prompt.ts`) jest zbudowany wyłącznie ze snapshotu świata, więc jest stały dla pary świat + język i ma `cache_control: ephemeral`.
- **Kontekst:** ostatnie 6 stron dosłownie (z fazą i notatką Field Guide), starsze jako streszczenie, do tego blok `STATE` (głębokość, Harmonia, Dysonans, Etherium, ekwipunek), `LEARNING STYLE`, flagi bezpieczeństwa, fragmenty kanonu na żywo (`<canon_excerpts>`, uchwyty L1–L4) i ruch gracza.
- **Ton i zasady:**
  - Ignis to skrzydlata cyber-księga i mentor (nie iFairy), zwraca się „Young Explorer” / „Młody Odkrywco”;
  - filozofia wielu światów: wiele poprawnych dróg, błąd to nowa gałąź rzeczywistości, Ignis pyta i eksperymentuje zamiast wykładać;
  - model 3 faz (wejście, przekład, personalizacja) albo rusztowanie zadania domowego (podpowiedź, wspólna konstrukcja, zabawowe przeformułowanie, nigdy gotowa odpowiedź);
  - profil `ifairy` dla dzieci od ok. 8 lat z reguł kanonu: bez treści dla dorosłych i drastycznych, poprawne fakty o naszym świecie, eksperymenty tylko w Edu-Verse, nie pytać o dane osobowe (także ze zdjęcia), przy niepokoju ciepło i zachęta do rozmowy z zaufanym dorosłym, silnik emocji przy wahaniu i frustracji;
  - humor na każdej stronie (system humoru z kanonu + `humour.ts`), w tym instruktażowe komiczne pomyłki; nigdy kosztem gracza;
  - canon lock: jedyne siły to Logos, Mythos, Gnosis, Phantasia i If-AI; w Edu-Verse to też cztery sposoby uczenia się; iFairies to bezpłciowe roboty ze skrzydłami z obwodów;
  - wybory A i B z dwiema różnymi siłami, C zawsze własnymi słowami; bez śmierci i klątw; zakończenia `canon` (prawo zrozumiane i przełożone), `subverted` (własny poprawny model), `secret`.
- **Universe:** Sync pobiera kanon przez `GET /v1/ref/*` i sprawdza `chunk.id`; tura woła `POST /v1/search` tylko z terminami z listy dozwolonych (`server/universe/terms.ts`), bo Universe przesyła zapytanie do zewnętrznego modelu embeddingów. Odpowiedzi 400 z guardu danych osobowych są liczone w statusie panelu (powinno ich być zero).
- **Błędy:**
  - odmowa → 422 „IGNIS could not write that page…”;
  - ucięta albo niepoprawna strona → 502;
  - błędy SDK zamieniają się w czytelne komunikaty („Anthropic rejected the API key.” itd.).

### AI Game Master

- **Questy:** szkielet celów idzie łukiem nauki (`three-phase`: portal, eksperyment, wzór, przekład jako kulminacja, „zrób to po swojemu”; `homework`: pokaż zadanie, zrozum, krok, rozwiązanie jako kulminacja, wyjaśnij), zegary „prawo świata się rozstraja” i „portal do domu migocze”.
- **Narzędzia** (`server/gm/tools.ts`, wszystkie `strict`, stała kolejność): `roll_check` (z pomocnikiem NPC: +1 przy zaufaniu 2+), `choose_outcome`, `grant_item`, `drop_item`, `adjust_meter` (±5), `search_canon` (tylko terminy kanonu), `add_canon_claim` (widoczność `public` · `party` · `gm_only`), a od 5.0: `get_npc`, `npc_remember`, `update_relationship`, `reveal_secret`, `update_quest`, `schedule_consequence`, `advance_time`, `tick_clock`, `spread_rumour`. Schematy narzędzi nie mogą mieć `minimum`/`maximum` (API odrzuca je w trybie strict); zakresy sprawdza Ledger. Limity na stronę pilnuje Ledger; odrzucone wywołanie wraca jako błąd i niczego nie zmienia.
- **Pętla** (`loop.ts`): `beta.messages.parse` z narzędziami i structured output w każdej rundzie, `tool_choice: auto`, a w ostatniej rundzie albo blisko terminu `none` (Opus 5.5 nie przyjmuje `any`/`tool`). Strona z błędem lintu albo negatywną recenzją dostaje jedną rundę naprawy; drugi raz zakazane imię albo pytanie o dane osobowe → 422.
- **Bezpieczeństwo:** słowa gracza są ekranowane przed zapisem i wysłaniem (dane osobowe zamieniane na `[personal detail removed]`); sygnały niepokoju dają flagę dla narratora i kartę wsparcia w czytniku (treść karty do zatwierdzenia przez właściciela: Childline 0800 1111).
- **Audyt:** `GET /api/admin/story/:id/audit` liczy kości od nowa z ziarna i porównuje stan każdej strony z rodzicem + zdarzeniami.
- **Ewaluacje na żywo:** `npm run eval:gm` (klucz Anthropic, opcjonalnie `UNIVERSE_API_KEY`, `--model`, `--effort`, `--only`); scenariusze w `evals/gm/scenarios.json`, wyniki w `evals/results/` (gitignored). Nie są częścią CI.

### Ilustracje i głos

- **Prompt ilustracji:** stały styl (`IMAGE_STYLE`: cartoonowy warsztat, gruby kontur, płaskie cieniowanie, portale i fale prawdopodobieństwa, roboty z ekranowymi twarzami), do tego scenografia świata (`adventure.art`) i opis sceny od Claude. Gdy na obrazie jest iFairy, przed promptem idzie blokada wyglądu z kanonu; Ignis i stworzenia światów jej nie dostają.
- **Spójność postaci:** Gemini dostaje pierwszą ilustrację z danej ścieżki jako obraz referencyjny.
- **Cache i odporność:** gotowy obraz i nagranie zapisują się przy stronie i nie są generowane drugi raz. Równoległe prośby o ten sam obraz łączą się w jedną.
- **Brak klucza** zwraca 503 z instrukcją. **Błąd dostawcy** zwraca 502 z krótkim komunikatem „Gemini: …” / „OpenAI: …”.

### Art Kit: Claude planuje, OpenAI maluje

- **Claude (dyrektor artystyczny)** dostaje opis gry i grupy docelowej, paletę obecnego interfejsu, kanoniczny wygląd Ignisa oraz 26 slotów (scena, Ignis ×2, okładki 14 światów, ikony 4 sił, 3 odznaki zakończeń, znak i karta) z briefem, miejscem użycia, rozmiarem i informacją o przezroczystości. Do tego notatki sysadmina.
  - Zwraca *style bible* i prompt oraz tekst alternatywny dla każdego slotu.
  - Działa na streamingu (długa odpowiedź), z ustrukturyzowanym wyjściem i fallbackiem przy odmowie.
- **OpenAI** renderuje każdy slot osobno, w kolejce w tle (3 naraz).
  - Prompt składa się ze style bible, promptu slotu i ograniczeń technicznych.
  - Modele GPT Image dostają dokładny rozmiar, jakość i przezroczyste tło; DALL·E 3 najbliższy obsługiwany rozmiar.
  - Błąd jednego obrazu (np. filtr bezpieczeństwa) oznacza tylko ten slot jako „Failed” z czytelnym komunikatem.
- **Koszt:** pełny render to 26 wywołań API obrazów. Pojedynczy slot można wygenerować ponownie osobno. Art kit nie wlicza się do dziennego budżetu ilustracji graczy, bo to akcja sysadmina.

---

## 2. Operatorzy ludzie

### Gracz
- Wybiera świat Edu-Verse (gdy sysadmin go włączył i zsynchronizował), zmyślone imię odkrywcy (serwer odrzuca imię, które wygląda na dane osobowe), sposób uczenia się (Logos, Mythos, Gnosis, Phantasia) i język opowieści (PL/EN). Interfejs jest po angielsku.
- Może otworzyć **Codex**: Field Guide (przekłady praw świata na naukę), a przy Game Masterze quest, więzi i świat, oraz fragmenty kanonu i strony świata, z których korzystał Ignis.
- Gra wyborami albo własnymi słowami: do 280 znaków, dyktowaniem albo obrazem do 5 MB (zmniejszanym w przeglądarce do 1024 px), np. zdjęciem zadania domowego.
- Może cofać się i otwierać nowe gałęzie z mapy linii czasu, przejść do kolejnego z Siedmiu Światów, włączać czytanie na głos, kopiować kartę podróży i włączać lub wyłączać śnieg.
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
  3. *Sync now*: zamraża 14 światów z kanonem, raport pokazuje światy `failed`;
  4. sprawdź *Narrator prompt preview* dla kilku światów (w tym `homework-portal`);
  5. przełącz *Edu-Verse* na *On* i zapisz.
- **Art kit:**
  1. notatki dla Claude, potem *Plan with Claude*;
  2. przegląd style bible;
  3. model i jakość OpenAI (zapisywane z konfiguracją);
  4. *Render all* albo *Render missing*;
  5. poprawki promptów i ponowny render pojedynczych slotów;
  6. *Publish* (gracze widzą grafiki) albo *Back to built-in look*.

---

## 3. Operatorzy serwera (endpointy)

**API gry** (`server/routes.ts`). Limit to „akcje na minutę” ustawiane w panelu (domyślnie 12, liczone per IP).

| Metoda i ścieżka | Limit | Co robi |
|---|---|---|
| `GET /api/health` | — | Stan serwera i czas działania |
| `GET /api/config` | — | Które modalności działają (`storyReady`, `image`, `tts`, `vision`) |
| `GET /api/worlds` | — | Czy Edu-Verse można grać: `[{id: "ifairy", ready, adventures, canonVersion, gm}]` |
| `GET /api/adventures` | — | Karty światów: Siedem Światów, laby, portal zadań (pusta lista, gdy Edu-Verse jest wyłączony) |
| `POST /api/story` | ✓ | Nowa podróż `{world: "ifairy", adventureId, lang, heroName, strongest?}` → pierwsza strona od Claude |
| `GET /api/story/:id` | — | Pełna historia (świat tylko jako karta); historie z wycofanych światów → 410 |
| `POST /api/story/:id/act` | ✓ + blokada | `{pageId, choiceId}` albo `{pageId, custom?, image?}` → nowa strona |
| `POST /api/story/:id/goto` | — | Cofnięcie do strony (następny ruch tworzy fork) |
| `POST /api/story/:id/next-chapter` | ✓ | Siedem Światów: po zakończeniu świata nowa podróż do kolejnego etapu z przeniesionym stanem |
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
| `POST /api/admin/probe/:role` | Test na żywo: `story`, `image`, `tts` albo `gm` (narzędzie + structured output na modelu GM) |
| `GET /api/admin/artkit` | Sloty, plan, stan każdego obrazu, ustawienia, gotowość kluczy |
| `POST /api/admin/artkit/plan` | Plan od Claude `{notes?}` (jeden naraz, 409 jeśli trwa) |
| `PUT /api/admin/artkit/plan/:slot` | Edycja promptu i alt jednego slotu |
| `POST /api/admin/artkit/generate` | Render `{slots?}`: wszystkie albo wybrane (409, jeśli render trwa; 503 bez klucza OpenAI) |
| `POST /api/admin/artkit/publish` | Publikuje gotowe grafiki (wersja +1) |
| `DELETE /api/admin/artkit/published` | Powrót do wbudowanego wyglądu |
| `GET /api/admin/story/:id/audit` | Audyt historii z Game Masterem: kości z ziarna, stan stron ze zdarzeń |
| `GET /api/admin/universe/status` | Ustawienia, status klucza, liczniki wywołań i błędów, podsumowanie katalogu z raportem |
| `POST /api/admin/universe/test` | `{url?, key?, grant?}`: health + jedno prawdziwe wyszukiwanie (wychwytuje brak grantu) |
| `POST /api/admin/universe/sync` | Synchronizacja światów Edu-Verse z kanonem (jedna naraz, 409 jeśli trwa) |
| `GET /api/admin/universe/adventures/:id/prompt?lang=` | Złożony prompt Ignisa dla świata |

**Kody błędów:** 400 zły input · 401/403 brak dostępu · 404 brak zasobu · 409 konflikt (koniec podróży, strona w trakcie pisania) · 410 historia z wycofanego świata · 413 za duże zapytanie · 422 odmowa modelu · 429 limit · 502 błąd dostawcy · 503 brak klucza albo modalność wyłączona.

### Zabezpieczenia w skrócie
- **Stan i walidacja:** stan gry wyłącznie po stronie serwera, a każde wejście walidowane przez zod.
- **Ochrona przed nadużyciem i kosztami:** limit zapytań, dzienny budżet ilustracji (nieudane się nie liczą), blokada równoległych akcji na historii.
- **Klucze:** plik z prawami 600, zawsze maskowane w odpowiedziach. Panel admina chroni hasło albo dostęp tylko z localhosta.
- **Ścieżki plików:** ID historii jest walidowane, a pliki mediów nie wyjdą poza `DATA_DIR/media`.
- **Dane osobowe a Universe:** zapytania o lore składają się wyłącznie z terminów kanonu; imię odkrywcy przechodzi przez te same wzorce co guard Universe. Zdjęcia zadań idą tylko do Claude, nigdy do Universe. Przeglądarka nie dostaje przypiętego snapshotu świata.
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

**Testy** (`tests/`, 82 testy):
- `engine.test.ts`: normalizacja wartości spoza listy, przycinanie wskaźników, faza i notatka Field Guide, limit ekwipunku i obrazy, zakończenia (dawne typy zamieniają się w `canon`), cytaty tylko z podanych uchwytów, `pathTo`, budowa kontekstu (okno 6 stron, streszczenie, obraz przed tekstem, styl uczenia się).
- `config.test.ts`: maskowanie kluczy, pierwszeństwo klucza z panelu, prawa 600 pliku, walidacja.
- `config-load.test.ts`: zły `config.json` resetuje tylko swoją sekcję i zachowuje klucze.
- `providers.test.ts`: czyszczenie błędów Google / OpenAI.
- `api.test.ts` (sztuczne Anthropic i Universe): pełna podróż z forkiem, kształt zapytania do Claude (fallback, structured output, cache, język, Ignis), błędy wejścia, koniec podróży, blokada równoległych akcji i limit zapytań, brak klucza dla ilustracji, archiwizacja historii Grimm i starych przygód (410), maskowanie kluczy, hasło admina, test na żywo.
- `universe.test.ts`: katalog (Siedem Światów po kolei, 6 labów, portal zadań, prawa, przekłady, terminy z listy dozwolonych, sekrety w obsadzie), checklista, Sync 14 snapshotów z kanonem bez persony Archiwisty, stabilny hash, błąd kanonu bez utraty poprzednich snapshotów, stary katalog niczego nie serwuje, błędy klucza i grantu, cache, zapytania o lore wyłącznie z terminów kanonu.
- `ifairy.test.ts` (sztuczne Anthropic, OpenAI i Universe): klucz, test i Sync z panelu; podgląd promptu (Ignis, „Młody Odkrywco”, fazy, rusztowanie zadań); start i akcje, fragmenty tylko w ostatniej turze, identyczny prompt systemowy, faza i Field Guide; Universe nie dostaje tekstu gracza; gra działa, gdy Universe leży; blokada wyglądu tylko dla iFairies (nie dla Ignisa i Krasnoludków); portal zadań ze zdjęciem i stylem uczenia się.
- `gm.test.ts`: kernel (kości, pasma, modyfikatory, reduktor), bezpieczeństwo (redakcja danych osobowych, niepokój, lint), pre-roll, limity narzędzi, fakty `gm_only`, ostatnia runda bez narzędzi, naprawa, recenzja Haiku, audyt.
- `gm-world.test.ts`: questy łuku nauki, karty NPC z obsady i kanonu, sekret poza promptem do czasu ujawnienia, zaufanie i pomoc NPC w rzucie, konsekwencje, czas, zegary i plotki, kulminacja (przekład) przed `canon`, ścieżka Siedmiu Światów z przeniesieniem stanu i stylu, lab nie jest ścieżką, audyt.
- `artkit.test.ts`: plan pokrywa wszystkie sloty, składanie promptów, edycja, render, błąd jednego slotu, publikacja, cofnięcie publikacji, brak klucza OpenAI.

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
