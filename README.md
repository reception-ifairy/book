# IGNIS // OS: Grimm Protocol

Gra „wybierz własną przygodę” w klimacie cyber-magii dla graczy **od 12 lat**. Zadziorna księga-robot **Ignis** opowiada klasyczne baśnie jako zabugowany kod: Czerwony Kapturek kontra atak MITM, Trzy Świnki kontra DDoS, Kopciuszek z wygasającą sesją. Każdy wybór forkuje linię czasu. Humor jak z dobrego familijnego filmu animowanego: absurd, kalambury, slapstick i proste żarty o grach i technice. Bez przemocy na serio, bez przekleństw, bez złośliwości wobec gracza.

## Gdzie jesteśmy (2026-11-17)

**Na żywo:** https://demo.ifairy.co.uk/ · PM2 `demo-ifairy-book` na porcie 8803 za nginx · dane w `/var/www/demo.ifairy.co.uk/data/` (konfiguracja, klucze, historie).

**Wersja 6.2.0:** jeden świat, Grimm Protocol (5 baśni, narrator Ignis, 12+), z glitch-łamigłówkami, panelem DEBUG i zasadą „jak wyjaśnisz, to zaistnieje”. Świat iFairy Universe, AI Game Master i połączenie z API Universe zostały usunięte w 6.0.0. Dokładne zapytania do Claude'a pilnuje test `grimm-golden`.

**Co nowego w 6.1.1:** Ignis to **cybermagiczny robocik ze skrzydłami**, a nie dawna wróżka — po polsku mówi o sobie w rodzaju męskim („zrobiłem", „jestem gotowy"), a zapytany, czy jest chłopcem, czy dziewczynką, odpowiada niezmiennie, że **czuje się kwiatkiem**.

**Co nowego w 6.1.0:** pod każdą stroną jest zwijany **panel DEBUG** (klawisz `D`) — Ignis wychodzi na chwilę z baśni i tłumaczy krok po kroku prawdziwą technologię, na której ta strona stoi (atak MITM, DDoS, ciasteczka śledzące, wygasła sesja, trojan). Obowiązuje też zasada domu **„jak wyjaśnisz, to zaistnieje”**: własny ruch z uzasadnieniem działa mocniej niż ruch bez niego.

**Panel admina i magazyn t1000:** do `/#/admin` loguje się loginem i hasłem z MariaDB `t1000` (tabela `ignis_admins`); są tam też zaszyfrowane klucze API i **rejestr 23 postaci** (model ARB, plik źródłowy `db/t1000/characters.grimm.json`), z którego gra bierze głosy i fakty postaci (opis w [docs/OPERATORZY.md](docs/OPERATORZY.md#6-magazyn-w-bazie-t1000)). **Zapomniane hasło:** `npm run admin:reset`, `pm2 restart demo-ifairy-book`, kod z `cat data/admin-setup-code.txt`, potem `/#/admin`.

**Otwarte sprawy:**
- **Ilustracje są wyłączone na produkcji:** dostawca to Gemini, a `GEMINI_API_KEY` jest pusty.

**Wdrożenie:** kopia `data/`, `git pull`, `npm install`, `npm run build`, `pm2 restart demo-ifairy-book`.

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
4. Wróć na stronę główną, wpisz imię i wybierz baśń.

Produkcja: `bun run build && bun run start`. Przed wdrożeniem ustaw `ADMIN_PASSWORD`.

## Sprawdzanie

```bash
bun run check   # typecheck + 40 testów (bez kluczy, na sztucznych API) + build
```

To samo uruchamia CI w GitHub Actions przy każdym pushu i PR.

## Dokumentacja

| Dokument | Zawartość |
|---|---|
| [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md) | Struktura repo plik po pliku, przebieg tury (diagramy), model danych, zapis danych, frontend i motyw |
| [docs/OPERATORZY.md](docs/OPERATORZY.md) | Kto co obsługuje: modele AI, gracz i sysadmin, wszystkie endpointy, zabezpieczenia, skrypty, testy, CI, zmienne środowiskowe |
| [docs/ZRODLO-IFAIRY.md](docs/ZRODLO-IFAIRY.md) | Analiza dokumentu kanonu iFairy: co weszło do gry, co odrzucone i dlaczego |
| [CHANGELOG.md](CHANGELOG.md) | Wszystkie zmiany od wersji z AI Studio do obecnej |

## Stos

Node + Express · React 19 · Vite 6 · Tailwind 4 · motion · zod · `@anthropic-ai/sdk` · `@google/genai` · `openai` · Vitest.

## Styl: Cozy Workshop

Przytulny warsztat nocą: deski, kominek, lampki i śnieg, kremowe karty-naklejki z grubym konturem, komiksowe efekty „ZAP!” i „BONK!”. Ignis to księga-robot z ekranową twarzą i skrzydłami wróżki. Tokeny motywu są w `src/index.css`, a komponenty w `src/ui.tsx`.
