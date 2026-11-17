# Operatorzy

## Modele AI

| Rola | Dostawca | Ustawienie |
|---|---|---|
| Narratoriusz (akta misji) | Anthropic Claude, structured output | Panel → *Story engine*: model, effort, liczba stron do zakończenia (domyślnie 12) |
| Ilustracje stron | Gemini albo OpenAI | Panel → *Illustrations* (opcjonalne) |
| Głos | przeglądarka, OpenAI albo Gemini TTS | Panel → *Voice* |

Szkolenia, mapa, archiwum, NarratoMat i pulpit działają bez żadnego klucza; klucz Anthropic jest potrzebny tylko do misji.

## Endpointy

| Metoda i ścieżka | Opis |
|---|---|
| `GET /api/health`, `GET /api/config` | Stan serwera i dostępne modalności |
| `POST /api/agent` | Rekrutacja `{codename, specialization, lang}` |
| `GET /api/agent/:id` | Profil (z aktualizacją kofeiny, stresu, limitów) |
| `POST /api/agent/:id/coffee` | Automat w Mrocznym Korytarzu |
| `POST /api/agent/:id/narratomat` | Oferta misji; `{reroll:true}` = „Zaproponuj innego Agenta” |
| `POST /api/agent/:id/mission` | Przyjęcie misji z biurka (`missionId` z oferty lub alternatyw) |
| `POST /api/agent/:id/training` | Wynik szkolenia `{game, score 0–100}` |
| `POST/DELETE /api/agent/:id/notes[/:noteId]` | Notatki na mapie (maks. 30) |
| `GET /api/story/:id`, `POST /api/story/:id/act` | Akta i ruch agenta |
| `POST /api/story/:id/page/:pageId/image\|speech` | Ilustracja i głos strony |
| `GET /api/archive?agent=`, `GET /api/archive/:id?agent=` | Lista i wpis (403 powyżej poziomu dostępu) |
| `POST /api/archive/:id/comments` | Komentarz `{agentId, text ≤400, rating 1–5, warning}` |
| `/api/admin/*` | Panel: konfiguracja, test kluczy, próby na żywo |

## Zabezpieczenia

- Panel admina: `ADMIN_PASSWORD` w nagłówku `x-admin-password`; bez niego tylko localhost.
- Limity: akcje misji `limits.actionsPerMinute` na IP, biurko 120/min, dzienny budżet ilustracji.
- Jedna strona akt na raz na sprawę (409 przy równoległym ruchu); ruch tylko z bieżącej strony.
- Sekrety misji (`server/story/twists.ts`) i treść archiwum nie trafiają do bundla przeglądarki; dostęp do wpisów sprawdza serwer.
- Odmowa modelu kończy się czytelnym 422, błąd dostawcy 502.

## Zmienne środowiskowe

`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY` (klucz z panelu ma pierwszeństwo), `ADMIN_PASSWORD`, `DATA_DIR` (domyślnie `data`), `PORT` (3000), `TRUST_PROXY` (za reverse proxy).

## Skrypty

`dev`, `build`, `start`, `typecheck`, `test`, `check` (typecheck + testy + build). CI (`.github/workflows/ci.yml`) uruchamia typecheck, testy i build przy każdym pushu.

## Wdrożenie

Kopia `data/`, `git pull`, `bun install`, `bun run build`, restart procesu (`NODE_ENV=production node dist/server.cjs`). Za nginx ustaw `proxy_read_timeout` co najmniej 120 s (strona akt to jedno wywołanie modelu).
