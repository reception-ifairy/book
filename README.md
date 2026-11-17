# ARB · Narratoriusz

**Agencja Ratowania Bajek: Biuro Interwencji Narracyjnej.** Gra przeglądarkowa, w której jesteś agentem terenowym ARB. NarratoMat 5000 przydziela Ci misje rzutem K20. Claude jako *Narratoriusz* prowadzi akta sprawy strona po stronie, a kości, pieczątki i XP liczy kod. Między misjami pijesz kawę z automatu w Mrocznym Korytarzu, ćwiczysz w Ośrodku Szkoleniowym DSRK, studiujesz mapę multiwersum i czytasz utajnione akta Biblioteki Nieskończonych Opowieści.

> Porządkujemy Narrację, jedna bajka na raz… po wypełnieniu formularza B-7, trzech załącznikach i pieczątce DKSF.

## Co jest w grze (zakres v1)

| Obszar | Co robi |
|---|---|
| **Rekrutacja (Formularz B-7)** | Kryptonim, sekcja DIT (6 specjalizacji: 3 geograficzne, 3 tematyczne), język akt (PL/EN). Przepustka (id agenta) pozwala wrócić na innym urządzeniu |
| **Pulpit Agenta 2.0** | Dynamiczny nagłówek (ranga, postęp XP, status „Stabilny Chaos”…), wskaźniki stresu i kofeiny (kofeina spada w czasie rzeczywistym), automat do kawy (czasem leci lawa), panele pogodowe, Zegar Tempus Fugit (koniec zmiany, weekend, zebranie, termin misji), Plotkarski Telegraf w 4 kategoriach, struktura ARB (15 departamentów), akta zamknięte |
| **NarratoMat 5000** | Punktuje misje według rangi, sekcji, historii i świeżości typu. K20: naturalne 20 daje wybór z 3 teczek, naturalne 1 to paradoks (misja spoza puli i trudniejsze DC), reszta dodaje „kaprys systemu”. Opcje: *Poproś o więcej informacji*, *Zaproponuj innego Agenta* (2 razy dziennie), *Sprawdź poziom trudności* (DC i szanse) |
| **Misje** | 18 misji w 5 typach (Eskorta, Odzyskanie Artefaktu, Dochodzenie, Interwencja Prewencyjna, Misja Specjalna). Wybory: procedura, improwizacja, dyplomacja, pieczątka DKSF (bez rzutu, 2 na misję) albo własny ruch. Ryzykowne ruchy rozstrzyga **test K20 w kodzie** (ranga, sekcja, stres, kofeina). Kot-Zastępca komentuje przez Mrucz-Term. 5 zakończeń, XP zależne od trudności |
| **Szkolenia DSRK** | 5 mini-gier: Sortowanie Magicznych Fasolek, Labirynt Biurokracji, Symulator Negocjacji ze Smokiem, Kalambury z Mimem, Alchemia dla Początkujących. Wynik 0–100 daje XP (maks. 15) i obniża stres |
| **Kartograf Narracji** | Mapa SVG 17 lokacji z warstwami (fizyczna, polityczna, zagrożeń, zasobów), filtrami (typ, poziom magii, postacie), cyklem dnia i nocy oraz migracją pegazów. Pokazuje lokalizację oferowanej misji i osobiste notatki agenta |
| **Biblioteka Nieskończonych Opowieści** | 36 wpisów w 6 kategoriach, z dostępem 0–5 zależnym od rangi (sprawdzanym na serwerze). Dział Błędów i Przekłamań, symulacje w treści wpisów, oceny i ostrzeżenia agentów |

Poza v1 (z dokumentu ARB): Kołowrotek Przeznaczenia Mark III, Plotkofon 9000 z profilami AI.

## Szybki start

```bash
bun install            # albo npm install
cp .env.example .env   # opcjonalnie: klucze można też wpisać w panelu admina
bun run dev            # http://localhost:3000
```

1. Otwórz `http://localhost:3000/#/admin`, wklej klucz Anthropic, kliknij **Test**, potem **Save**.
2. Opcjonalnie dodaj klucz Gemini lub OpenAI do ilustracji i głosu (głos przeglądarki działa bez klucza).
3. Wróć na `/`, wypełnij Formularz B-7 i uruchom NarratoMat.

Produkcja: `bun run build && bun run start`. Przed wdrożeniem ustaw `ADMIN_PASSWORD`.

## Sprawdzanie

```bash
bun run check   # typecheck + testy (sztuczne API Anthropic, bez kluczy) + build
```

To samo uruchamia CI w GitHub Actions przy każdym pushu i PR.

## Dokumentacja

| Dokument | Zawartość |
|---|---|
| [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md) | Struktura repo, przebieg tury misji, NarratoMat, K20, model danych, zapis danych |
| [docs/OPERATORZY.md](docs/OPERATORZY.md) | Modele AI, endpointy, zabezpieczenia, zmienne środowiskowe, wdrożenie |
| [CHANGELOG.md](CHANGELOG.md) | Historia zmian |

## Stos

Node + Express · React 19 · Vite 6 · Tailwind 4 · motion · zod · `@anthropic-ai/sdk` · `@google/genai` · `openai` · Vitest.
