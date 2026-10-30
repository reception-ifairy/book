# IGNIS // OS: Grimm Protocol

Gra „wybierz własną przygodę” w klimacie cyber-magii. Sarkastyczna księga-robot **Ignis** opowiada klasyczne baśnie jako zabugowany kod: Czerwony Kapturek kontra atak MITM, Trzy Świnki kontra DDoS, Kopciuszek z wygasającą sesją. Każdy wybór forkuje linię czasu. Dla widzów w stylu *Ricka i Morty'ego* (16+).

**Drugi świat: iFairy Universe** (13+). Przygody z kanonu iFairy (6 haków z portali, Saga If-AI w 8 aktach, 26 Dzielnic Podróżników) opowiada Narrator-Archiwista, a treść i lore na żywo przychodzą z API iFairy Universe. Świat pojawia się na stronie głównej, gdy sysadmin go włączy i zsynchronizuje. Opcjonalnie prowadzi go **AI Game Master**: kości 2d6 i reguły działają w kodzie jako narzędzia Claude'a, model tylko wybiera regułę i opowiada wynik.

**Multimodalnie:**
- **Claude** pisze strukturę i narrację, a także rozumie obrazy dołączane przez gracza;
- **Gemini** albo **OpenAI** rysuje ilustracje i czyta tekst na głos (głos z przeglądarki działa bez klucza);
- przeglądarka obsługuje dyktowanie;
- **Art Kit:** Claude planuje całą szatę graficzną (style bible + prompty), a OpenAI ją maluje: tło, Ignisa, okładki, ikony, odznaki, logo i kartę do udostępniania.

## Szybki start

```bash
bun install            # albo npm install
cp .env.example .env   # opcjonalnie: klucze można też wpisać w panelu admina
bun run dev            # http://localhost:3000
```

1. Otwórz `http://localhost:3000/#/admin`, wklej klucz Anthropic, kliknij **Test**, a potem **Save**.
2. Opcjonalnie dodaj klucz Gemini lub OpenAI i wybierz modele ilustracji i głosu.
3. Opcjonalnie: sekcja **Art kit**, czyli *Plan with Claude* → *Render all 19* → *Publish* (potrzebny klucz OpenAI).
4. Opcjonalnie: sekcja **iFairy Universe**, czyli klucz konsumenta → *Test* → *Save* → *Sync now* → *iFairy world: On*.
5. Wróć na stronę główną, wpisz imię i wybierz baśń albo przygodę.

Produkcja: `bun run build && bun run start`. Przed wdrożeniem ustaw `ADMIN_PASSWORD`.

## Sprawdzanie

```bash
bun run check   # typecheck + 71 testów (bez kluczy, na sztucznych API) + build
npm run eval:gm # ewaluacje Game Mastera na żywym modelu (klucz Anthropic, poza CI)
```

To samo uruchamia CI w GitHub Actions przy każdym pushu i PR.

## Dokumentacja

| Dokument | Zawartość |
|---|---|
| [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md) | Struktura repo plik po pliku, przebieg tury (diagramy), model danych, zapis danych, frontend i motyw |
| [docs/OPERATORZY.md](docs/OPERATORZY.md) | Kto co obsługuje: modele AI, gracz i sysadmin, wszystkie endpointy, zabezpieczenia, skrypty, testy, CI, zmienne środowiskowe |
| [CHANGELOG.md](CHANGELOG.md) | Wszystkie zmiany od wersji z AI Studio do obecnej |

## Stos

Node + Express · React 19 · Vite 6 · Tailwind 4 · motion · zod · `@anthropic-ai/sdk` · `@google/genai` · `openai` · Vitest.

## Styl: Cozy Workshop

Przytulny warsztat nocą: deski, kominek, lampki i śnieg, kremowe karty-naklejki z grubym konturem, komiksowe efekty „ZAP!” i „BONK!”. Ignis to księga-robot z ekranową twarzą i skrzydłami wróżki. Tokeny motywu są w `src/index.css`, a komponenty w `src/ui.tsx`.
