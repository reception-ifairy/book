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

### Ilustracje i głos

- **Prompt ilustracji:** stały styl (`IMAGE_STYLE`: cartoonowy warsztat, gruby kontur, płaskie cieniowanie, roboty z ekranowymi twarzami), do tego scenografia baśni (`tale.art`) i opis sceny od Claude.
- **Spójność postaci:** Gemini dostaje pierwszą ilustrację z danej ścieżki jako obraz referencyjny.
- **Cache i odporność:** gotowy obraz i nagranie zapisują się przy stronie i nie są generowane drugi raz. Równoległe prośby o ten sam obraz łączą się w jedną.
- **Brak klucza** zwraca 503 z instrukcją. **Błąd dostawcy** zwraca 502 z krótkim komunikatem „Gemini: …” / „OpenAI: …”.

---

## 2. Operatorzy ludzie

### Gracz
- Wybiera baśń, imię („debugger handle”) i język opowieści (PL/EN). Interfejs jest po angielsku.
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

**API admina** (`server/admin.ts`, za autoryzacją):

| Metoda i ścieżka | Co robi |
|---|---|
| `GET /api/admin/config` | Konfiguracja + status kluczy (źródło, maska) + czy panel ma hasło |
| `PUT /api/admin/config` | Zapis ról i limitów. `keys.{provider}`: tekst zapisuje klucz, `null` go usuwa |
| `POST /api/admin/providers/:provider/models` | Test klucza (z formularza albo zapisanego) i lista modeli z tagami `text` / `image` / `tts` |
| `POST /api/admin/probe/:role` | Test na żywo: `story`, `image` albo `tts` |

**Kody błędów:** 400 zły input · 401/403 brak dostępu · 404 brak zasobu · 409 konflikt (koniec historii, brak many, strona w trakcie pisania) · 413 za duże zapytanie · 422 odmowa modelu · 429 limit · 502 błąd dostawcy · 503 brak klucza albo modalność wyłączona.

### Zabezpieczenia w skrócie
- **Stan i walidacja:** stan gry wyłącznie po stronie serwera, a każde wejście walidowane przez zod.
- **Ochrona przed nadużyciem i kosztami:** limit zapytań, dzienny budżet ilustracji (nieudane się nie liczą), blokada równoległych akcji na historii.
- **Klucze:** plik z prawami 600, zawsze maskowane w odpowiedziach. Panel admina chroni hasło albo dostęp tylko z localhosta.
- **Ścieżki plików:** ID historii jest walidowane, a pliki mediów nie wyjdą poza `DATA_DIR/media`.
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

**Testy** (`tests/`, 28 testów):
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
