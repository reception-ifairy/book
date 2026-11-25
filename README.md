# ARB · Arcane Rescue Bureau

> Old tales. Enchanted code. Hilarious side effects.

Interaktywna gra „wybierz własną przygodę” w klimacie **cyber-magii** dla graczy **od 12 lat**. Ktoś zaczarował fabułę baśni z Domeny Publicznej: pantofelek Kopciuszka śledzi nie tego tancerza, a chatka Baby Jagi wybiera „malowniczą trasę” do własnych drzwi. Gracz jest **agentem Arcane Rescue Bureau (ARB)**. Wchodzi w baśń, bada, co się zepsuło, i decyduje, co dalej: naprawia opowieść, przekręca ją albo psuje ją pięknie. Każdy wybór rozgałęzia linię czasu.

Obok agenta jest **IGNIS**, jego asystent terenowy: latający robocik z ekranikiem CRT zamiast twarzy, ciałem-latarnią pełną wirującej magii, skrzydłami ważki i płomykiem-anteną. Ignis prowadzi narrację, komentuje i ma zdanie o wszystkim.

**To jest główne repozytorium projektu** (`reception-ifairy/arcaneagency`, gałąź `main`). Wcześniejsza historia powstawała w `reception-ifairy/book` i jest tu zachowana w całości.

**Na żywo:** https://demo.ifairy.co.uk/

---

## Spis treści

1. [Jak się gra](#jak-się-gra)
2. [Co jest w środku](#co-jest-w-środku)
3. [Panel admina (`/#/admin`)](#panel-admina-admin)
4. [Szybki start](#szybki-start)
5. [Zmienne środowiskowe](#zmienne-środowiskowe)
6. [Baza t1000](#baza-t1000)
7. [Skrypty, testy i CI](#skrypty-testy-i-ci)
8. [Wdrożenie na produkcji](#wdrożenie-na-produkcji)
9. [Jak dodać coś nowego](#jak-dodać-coś-nowego)
10. [Struktura repozytorium](#struktura-repozytorium)
11. [Bezpieczeństwo](#bezpieczeństwo)
12. [Dokumentacja](#dokumentacja)

---

## Jak się gra

1. **Dołączasz do Biura:** na stronie głównej wpisujesz **kryptonim** i język opowieści (angielski albo polski). Nie ma e-maila ani hasła: dostajesz **klucz agenta** (`ARB-XXXX-XXXX-XXXX-XXXX`), który jest twoim loginem na każdym urządzeniu. Zapisujesz go (kopiuj albo pobierz jako `.txt`). Wrócić możesz przez „I have an agent key”.
2. **Pulpit agenta** (`#/` po zalogowaniu):
   - **legitymacja agenta:** kryptonim, ranga, poziom, pasek XP, seria dni, XP dzisiaj, zamknięte sprawy, znalezione zakończenia;
   - **Today at the Bureau:** trzy krótkie formaty dnia (niżej) i glitch dnia;
   - **Daily ops:** zadania dnia, liczone i wypłacane przez serwer;
   - **Main case files:** 5 długich spraw (8–12 stron);
   - **Quick cases:** 4 szybkie sprawy (3–5 stron);
   - **Open cases:** wznawianie rozpoczętych spraw;
   - **Endings archive:** 9 baśni × 5 typów zakończeń;
   - **XP log** i tabela „How to earn XP”.
3. **Sprawy.** Główne akta to pięć baśni:

   | Sprawa | Co się zepsuło |
   |---|---|
   | **Little Red Packet** | Czerwony Kapturek kontra atak man-in-the-middle |
   | **Three Little Firewalls** | Trzy Świnki kontra DDoS |
   | **Hansel & Gretel & Cookies** | Ciasteczka śledzące i piernikowy honeypot |
   | **Cinderella: Session Expired** | O północy wygasa token sesji |
   | **The Wawel Dragon Exploit** | Szewczyk-pentester, owca-trojan i smok bez walidacji danych |

   **Szybkie sprawy** to te same zasady w 3–5 stronach:

   | Szybka sprawa | O czym |
   |---|---|
   | **The Latency Race** | Żółw i Zając jako wyścig z lagiem (opóźnienie, ping) |
   | **False Positive** | Chłopiec, który wołał „wilk”, jako alarm, który krzyczy za często |
   | **Just Right Server** | Złotowłosa i trzy serwery: równoważenie obciążenia |
   | **The Emperor’s New Update** | Nowe szaty cesarza jako niewidzialna aktualizacja (socjotechnika) |

4. **Każda strona** to narracja Ignisa, ilustracja (opcjonalnie), czytanie na głos (opcjonalnie) i wybory:
   - **Sane** (rozsądny), **Chaos** (szalony), **Dumb** (oczywiście głupi), **sudo** (łamanie zasad);
   - **własny ruch:** tekst, dyktowanie, a nawet dołączony obrazek, który Claude zobaczy. Zasada domu: **„jak wyjaśnisz, to zaistnieje”**, czyli ruch z uzasadnieniem działa mocniej.
5. Wskaźniki (kanon, karma, mana itp.) zmieniają się z każdą decyzją. Historia kończy się jednym z zakończeń: **kanonicznym, przekręconym, przeklętym, sekretnym** albo *garbage collected*.
6. Można cofnąć się do dowolnej strony. Następny ruch tworzy nową gałąź na **mapie linii czasu**.
7. **Panel DEBUG** pod stroną (klawisz `D`): Ignis na chwilę wychodzi z baśni i wyjaśnia prawdziwą technologię, na której stoi ta scena.

### Formaty dnia (nowe co dzień, raz dziennie)

| Format | Czas | Jak działa | XP |
|---|---|---|---|
| **Quiz ABC** | ~1 min | 3 absurdalne pytania, każda odpowiedź A/B/C kończy się puentą; jedna jest „zatwierdzona przez Biuro”. Na koniec werdykt: zabawny profil agenta | 5–15 za odpowiedź + 10 za ukończenie |
| **Incydent dnia** | ~2 min | Raport z baśni w tarapatach, 3 sposoby reakcji, konsekwencja, odznaka i komentarz Ignisa | 15–35 |
| **Przesłuchanie** | ~5 min | Podejrzany dnia z Domeny Publicznej (Wilk, Wielki Zły Wilk, Czarownica, Macocha, Smok). 6 pytań, Ignis ocenia każde, licznik prawdy rośnie za sprytne pytania | 20 + połowa prawdy |

Quiz i incydent pisze **Claude raz dziennie** dla każdego języka (z glitchem dnia w tle). Admin może je poprawić albo wygenerować od nowa. Bez klucza wchodzi ręcznie napisany zapas.

### XP i rangi

Serwer liczy XP i każda nagroda płaci tylko raz (strona, zakończenie, zadanie, odpowiedź). Rangi:

Rookie (0) → Junior Patcher (100) → Field Debugger (300) → Spell Auditor (700) → Senior Fixer (1300) → Chief of Glitches (2200) → Archmage of Patches (3500) → Legend of the Public Domain (5500).

Pełna tabela nagród jest w `shared/xp.ts` i na pulpicie („How to earn XP”). Za awans gra pokazuje komiksową kartę „PROMOTED!”, a za każdą nagrodę wyskakuje „+XP”.

Ton: jak w dobrym familijnym filmie animowanym. Absurd, kalambury, slapstick i proste żarty o grach i technice. Bez przemocy na serio, bez przekleństw i bez złośliwości wobec gracza.

---

## Co jest w środku

**Modele AI:**
- **Claude** (Anthropic) pisze każdą stronę jako uporządkowany JSON: narrację, wybory, zmiany wskaźników, zakończenia i opis ilustracji. Rozumie też obrazki dołączane przez gracza. Prompt systemowy jest cache'owany.
- **Gemini albo OpenAI** rysuje ilustracje stron i czyta tekst na głos. Głos przeglądarki działa bez żadnego klucza.
- **Art Kit:** Claude planuje całą szatę graficzną (style bible i prompt dla każdego slotu), a OpenAI ją maluje. Grafiki z Ignisem powstają na wzór jednego obrazu referencyjnego, więc Ignis wszędzie wygląda tak samo.

**Świat:**
- **Rejestr postaci** w bazie t1000, w modelu zgodnym z ARB (DNA, persona, retelling, relacje). Gra wstrzykuje do promptu postacie danej baśni, więc mają stałe fakty i rozpoznawalne głosy.
- **Daily ops:** pula zadań i glitchy rotuje codziennie (dzień liczony według czasu warszawskiego). Admin może też ręcznie zaplanować konkretny dzień.

**Wygląd** (ustawiany w panelu, sekcja *Branding*):
- **Motywy:**
  - *Cozy Workshop*: drewniane biuro nocą, kominek, lampki, śnieg.
  - *Cyber-Magic Nebula*: kosmiczne niebo, mgławice, tęczowy łuk, złoty księżyc, neonowy róż i cyjan.
- **Style kart:**
  - *Paper sticker*: kremowy papier z grubym konturem.
  - *Holo tech*: ciemne szkło, neonowa ramka, narożniki HUD, scanlines.
- **Własne logo, karta do udostępniania i kolory.** Serwer wpisuje branding do `index.html`, więc strona od pierwszej klatki ma właściwą nazwę i wygląd.

**Stos:** Node + Express · React 19 · Vite · Tailwind 4 · motion · zod · `@anthropic-ai/sdk` · `@google/genai` · `openai` · mysql2 (MariaDB) · Vitest · bun (lockfile).

---

## Panel admina (`/#/admin`)

**Logowanie:**
- Z bazą t1000 logujesz się **loginem i hasłem** z tabeli `ignis_admins`. Przy pierwszym uruchomieniu serwer zapisuje jednorazowy kod konfiguracji.
- Bez bazy panel używa `ADMIN_PASSWORD`, a bez hasła odpowiada tylko z localhosta.

| Sekcja | Co robi |
|---|---|
| **API keys** | Klucze Anthropic, Gemini i OpenAI: *Test* (lista modeli bez zapisu), potem *Save*. Klucz z panelu wygrywa ze zmienną środowiskową; klucze nie wracają do przeglądarki w całości |
| **Story engine** | Model i effort Claude'a, liczba stron do zakończenia, test na żywo |
| **Illustrations** | Dostawca i model ilustracji, test na żywo |
| **Voice** | Dostawca, model i głos czytania na głos |
| **Branding** | Nazwa, skrót, tagline, opis, logo, karta do udostępniania, motyw, styl kart, kolory; podgląd na żywo przed zapisem |
| **Art kit** | *Plan with Claude* → przegląd style bible → render wszystkich lub brakujących slotów → poprawki promptów → *Publish* (albo powrót do wbudowanego wyglądu) |
| **Daily ops** | Pula zadań i glitchy, dzisiejsza tablica, ręczne planowanie dni; quiz i incydent dnia (podgląd, edycja JSON, *Regenerate with Claude*) oraz podejrzany dnia |
| **Limits** | Akcje na minutę na gracza i ilustracje dziennie dla wszystkich |

Na górze panelu karty statusu pokazują stan kluczy, liczbę postaci załadowanych z t1000 i liczbę agentów (wszystkich i aktywnych dziś).

**Zapomniane hasło:**
1. `npm run admin:reset`
2. `pm2 restart demo-ifairy-book`
3. Odczytaj kod: `cat data/admin-setup-code.txt`
4. Wejdź na `/#/admin` i ustaw nowe hasło. Haseł nie zapisuj w notatkach ani w rozmowach z AI.

---

## Szybki start

```bash
bun install              # albo npm install
cp .env.example .env     # klucze można też wpisać później w panelu admina
bun run dev              # http://localhost:3000
```

1. Otwórz `http://localhost:3000/#/admin`. Lokalnie, bez hasła i bazy, panel działa z localhosta.
2. Wklej klucz Anthropic, kliknij **Test**, potem **Save**.
3. Opcjonalnie dodaj klucz Gemini lub OpenAI dla ilustracji i głosu.
4. Opcjonalnie w sekcji **Art kit** kliknij *Plan with Claude* → *Render all* → *Publish* (potrzebny klucz OpenAI).
5. Wróć na stronę główną, dołącz do Biura (kryptonim), zapisz klucz agenta i otwórz sprawę z pulpitu. Lokalnie, bez bazy, agenci żyją w pamięci serwera.

**Build produkcyjny:** `bun run build && bun run start`. Serwer serwuje `dist/` i wpisuje branding do `index.html`.

---

## Zmienne środowiskowe

| Zmienna | Wymagana | Opis |
|---|---|---|
| `ANTHROPIC_API_KEY` | tak* | Klucz do Claude'a (*albo ustawiony w panelu) |
| `GEMINI_API_KEY` | nie | Ilustracje i/lub głos przez Gemini |
| `OPENAI_API_KEY` | nie | Ilustracje, głos i Art Kit przez OpenAI |
| `T1000_DATABASE_URL` | zalecana | Konto MariaDB z dostępem tylko do tabel `t1000.ignis_*`. Włącza logowanie loginem i hasłem, rejestr postaci i Daily ops |
| `IGNIS_T1000_SECRET` | nie | 32 bajty hex (`openssl rand -hex 32`). Szyfruje klucze API w bazie. **Bez niego zapisane klucze są nie do odczytania** |
| `ADMIN_PASSWORD` | nie | Stare hasło panelu, używane tylko bez `T1000_DATABASE_URL` |
| `DATA_DIR` | nie | Katalog danych: konfiguracja, historie, media, Art Kit, branding (domyślnie `data`) |
| `PORT` | nie | Port HTTP (domyślnie 3000; produkcja 8803) |
| `TRUST_PROXY` | nie | Za reverse proxy (np. `1`), żeby limity widziały prawdziwe IP |

Pełna lista: [docs/OPERATORZY.md](docs/OPERATORZY.md#5-zmienne-środowiskowe).

---

## Baza t1000

MariaDB `t1000`, tabele z prefiksem `ignis_*`. Pliki SQL są w `db/t1000/`.

| Plik | Tabele |
|---|---|
| `001_ignis_storage.sql` | `ignis_admins` (superadmin, hasła scrypt), `ignis_api_keys` (klucze szyfrowane) |
| `002_ignis_characters.sql` | `ignis_characters`, `_dna`, `_personas`, `_retellings`, `_relationships` (model zgodny z ARB) |
| `003_ignis_daily.sql` | `ignis_quests`, `ignis_glitches`, `ignis_daily` (plan dni) |
| `004_ignis_agents.sql` | `ignis_agents` (agenci: kryptonim, tag, hash klucza, XP, seria), `ignis_agent_xp` (dziennik XP, każda nagroda raz), `ignis_agent_cases` (indeks spraw agenta), `ignis_agent_daily` (quiz, incydent, przesłuchanie agenta), `ignis_daily_packs` (quiz i incydent dnia) |

**Zasiewanie danych** (skrypty wypisują SQL, który przekazujesz do `mysql`):

```bash
mysql t1000 < db/t1000/001_ignis_storage.sql   # i kolejne pliki DDL
npm run t1000:seed        | mysql t1000          # superadmin i klucze z config.json
npm run t1000:characters  | mysql t1000          # postacie z db/t1000/characters.grimm.json
npm run t1000:daily       | mysql t1000          # zadania i glitche z db/t1000/daily.seed.json
```

Serwer odświeża postacie co 10 minut, a tablicę Daily ops co 5 minut. Quiz i incydent dnia pisze przy pierwszym wejściu albo kilka minut po północy. Bez bazy gra działa dalej, ale bez postaci i Daily ops, a agenci i XP żyją wtedy tylko w pamięci serwera (znikają po restarcie; to tryb do lokalnego developmentu).

---

## Skrypty, testy i CI

| Polecenie | Co robi |
|---|---|
| `bun run dev` | Serwer deweloperski z Vite (hot reload) |
| `bun run build` | Frontend do `dist/` i serwer do `dist/server.cjs` |
| `bun run start` | Produkcja (`NODE_ENV=production`) |
| `bun run typecheck` | TypeScript bez emisji |
| `bun run test` | Vitest: wszystkie testy na sztucznych API, bez kluczy |
| `bun run check` | Typecheck, testy i build w jednym |
| `npm run admin:reset` | Unieważnia hasło superadmina i tworzy nowy kod konfiguracji |

Test `grimm-golden` pilnuje dokładnych zapytań do Claude'a. Po zamierzonej zmianie promptu odśwież go poleceniem `UPDATE_GOLDEN=1 npx vitest run tests/grimm-golden.test.ts`.

**CI** (`.github/workflows/ci.yml`) uruchamia `bun install --frozen-lockfile`, typecheck, testy i build przy każdym pushu na `main` i `claude/**` oraz przy każdym PR.

**Sposób pracy:**
1. Gałąź `claude/<temat>` → PR → zielone CI → merge do `main`.
2. Potem wdrożenie (sekcja niżej).
3. Nie buduj niescalonej gałęzi w katalogu produkcyjnym: pm2 serwuje `dist/` właśnie stamtąd.

---

## Wdrożenie na produkcji

| | |
|---|---|
| Serwer | `/var/www/demo.ifairy.co.uk` |
| Proces | PM2 `demo-ifairy-book` (`dist/server.cjs`), port 8803, za nginx |
| Dane | `data/` (poza repozytorium): `config.json`, historie, media, `artkit/`, `branding/` |

**Kroki:**

```bash
git pull
tar czf /root/backups/demo.ifairy.co.uk/data-$(date +%Y%m%d-%H%M%S).tgz data   # kopia danych
npx -y bun@1.3.14 install --frozen-lockfile
npm run build
pm2 restart demo-ifairy-book --update-env
curl -s https://demo.ifairy.co.uk/api/health
```

Gdy wydanie dodaje plik w `db/t1000/` (np. `004_ignis_agents.sql` w 7.0.0), przed restartem zrób kopię bazy (`mysqldump t1000 > …`) i wykonaj `mysql t1000 < db/t1000/<plik>.sql`. Pliki DDL tworzą tylko to, czego brakuje, więc można je puszczać ponownie.

---

## Jak dodać coś nowego

Projekt jest przygotowany pod kolejne aktualizacje. Każdy rodzaj treści ma jedno miejsce:

| Chcesz dodać | Gdzie | Uwagi |
|---|---|---|
| **Szybką sprawę** | `shared/tales.ts`, wpis z `format: 'quick'`, `maxDepth`, `minDepth` | Pojawia się sama na pulpicie i w archiwum zakończeń; XP za zakończenie liczy `XP.endingQuick` |
| **Główną sprawę** | `shared/tales.ts` (bez `format`) | Dodaj obsadę w `db/t1000/characters.grimm.json` i slot okładki w `shared/artkit.ts` |
| **Nowy format dnia** | wpis w `shared/activities.ts`, ekran w `src/screens/`, trasy obok `server/dailyPack.ts` | Kafelek na pulpicie powstaje z rejestru; XP wypłacaj przez `Gains.add(ref, …)` z unikalnym `ref` |
| **Regułę XP** | `shared/xp.ts` (`XP`, `XP_RULES`) | Tabela „How to earn XP” czyta to samo |
| **Rangę** | `RANKS` w `shared/xp.ts` | Progi rosnąco |
| **Podejrzanego** | `SUSPECTS` w `shared/suspects.ts` | Głos bierze się z rejestru postaci (po `taleId` i `nameEn`) |
| **Zapasowy quiz/incydent** | `server/dailyPackSeeds.ts` | Używane, gdy Claude jest niedostępny |

---

## Struktura repozytorium

```
server.ts               start: Vite (dev) albo dist/ z brandingiem w index.html (prod)
server/
  app.ts                aplikacja Express (nagłówki, trasy, błędy JSON)
  routes.ts             API gry: historie, ruchy, ilustracje, głos (z właścicielem sprawy i XP)
  agents/               agenci: magazyn (MariaDB / pamięć), klucz agenta i pulpit, naliczanie XP
  dailyPack.ts          quiz i incydent dnia: generowanie przez Claude, zapas, API gracza i admina
  dailyPackSeeds.ts     ręcznie napisany zapas quizów i incydentów (PL/EN)
  interrogation.ts      przesłuchanie dnia
  admin.ts              API panelu (za logowaniem)
  adminAuth.ts          logowanie z t1000, sesje, jednorazowy kod konfiguracji
  branding.ts           branding: zapis, wgrywanie obrazów, index.html, favicon / og
  daily.ts              Daily ops: tablica dnia, rotacja, API
  db.ts                 pula połączeń MariaDB t1000
  config.ts             konfiguracja i klucze w data/config.json
  media.ts              ilustracje i głos (Gemini / OpenAI)
  story/                silnik opowieści: prompty, wywołania Claude'a, postacie, zapis historii
  artkit/               Art Kit: planer (Claude), generator (OpenAI), magazyn, trasy
  providers/            klienci Anthropic, Gemini, OpenAI
shared/                 typy i dane wspólne: baśnie i szybkie sprawy, XP i rangi, agenci, aktywności, podejrzani, quiz/incydent, Art Kit, branding, Daily ops
src/
  agent.ts              zalogowany agent (klucz w przeglądarce), pulpit, wyskakujące „+XP”
  screens/              Home (strona dla gości / pulpit), Dashboard, Quiz, Incident, Interrogation, AgentKey, Story, Admin i panele admina
  components/           SVGCharacter (Ignis), TaleCard, DailyOps, agent/ (JoinCard, TopBar, XpPops, AgentScreen), efekty, mapa linii czasu
  ui.tsx                przyciski, odznaki, wskaźniki, toasty, logo
  index.css             motywy, karty, animacje
db/t1000/               DDL i dane do zasiania bazy
scripts/                admin:reset i skrypty zasiewające t1000
tests/                  Vitest + sztuczne API Anthropic i OpenAI
docs/                   dokumentacja szczegółowa
```

---

## Bezpieczeństwo

- Klucze API nigdy nie wracają do przeglądarki w całości. W bazie są szyfrowane (`IGNIS_T1000_SECRET`).
- Agenci nie podają e-maila ani hasła. Serwer trzyma tylko hash SHA-256 klucza agenta (80 losowych bitów); zakładanie profili i logowanie kluczem mają limity prób.
- Sprawę agenta może czytać każdy z linkiem, ale grać w nią (ruchy, cofanie, ilustracje, głos) tylko jej agent.
- Hasła admina to hashe scrypt. Sesje trwają 12 godzin, logowanie ma limit prób, a porównania są odporne na ataki czasowe.
- Konto bazy aplikacji ma dostęp tylko do tabel `ignis_*`; tabele postaci tylko do odczytu.
- Wgrywane obrazy (logo, karta) muszą być PNG, JPEG lub WebP, sprawdzane po bajtach. SVG jest odrzucane.
- Limity: akcje na minutę na IP i dzienny budżet ilustracji.
- Sekrety (`.env`, `data/`) są poza repozytorium.

---

## Dokumentacja

| Dokument | Zawartość |
|---|---|
| [docs/OPERATORZY.md](docs/OPERATORZY.md) | Modele AI, gracz i sysadmin, wszystkie endpointy, zabezpieczenia, skrypty, CI, zmienne środowiskowe, baza t1000 |
| [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md) | Struktura plik po pliku, przebieg tury, model danych, frontend i motyw |
| [docs/postacie.sql](docs/postacie.sql) | Szkielet modelu postaci ARB (DNA, persona, retelling) |
| [docs/ZRODLO-IFAIRY.md](docs/ZRODLO-IFAIRY.md) | Archiwalna analiza dawnego kanonu iFairy |
| [CHANGELOG.md](CHANGELOG.md) | Historia zmian od pierwszej wersji |
