# IGNIS // OS: Grimm Protocol

Gra „wybierz własną przygodę” w klimacie cyber-magii. Sarkastyczna księga-robot **Ignis** opowiada klasyczne baśnie jako zabugowany kod: Czerwony Kapturek kontra atak MITM, Trzy Świnki kontra DDoS, Kopciuszek z wygasającą sesją. Każdy wybór forkuje linię czasu. Dla widzów w stylu *Ricka i Morty'ego* (16+).

**Multimodalnie:**
- **Claude** pisze strukturę i narrację, a także rozumie obrazy dołączane przez gracza;
- **Gemini** albo **OpenAI** rysuje ilustracje i czyta tekst na głos (głos z przeglądarki działa bez klucza);
- przeglądarka obsługuje dyktowanie.

## Szybki start

```bash
bun install            # albo npm install
cp .env.example .env   # opcjonalnie: klucze można też wpisać w panelu admina
bun run dev            # http://localhost:3000
```

1. Otwórz `http://localhost:3000/#/admin`, wklej klucz Anthropic, kliknij **Test**, a potem **Save**.
2. Opcjonalnie dodaj klucz Gemini lub OpenAI i wybierz modele ilustracji i głosu.
3. Wróć na stronę główną, wpisz imię i wybierz baśń.

Produkcja: `bun run build && bun run start`. Przed wdrożeniem ustaw `ADMIN_PASSWORD`.

## Sprawdzanie

```bash
bun run check   # typecheck + 28 testów (bez kluczy, na sztucznym API) + build
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
