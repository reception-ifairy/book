# IGNIS // iFairy Quantum Edu-Verse

*„Jeśli potrafisz to sobie wyobrazić, to już istnieje… w jednym z wielu światów.”*

Interaktywna gra edukacyjna w klimacie cyber-magii, osadzona w **iFairy Universe**. **Ignis**, mała latająca księga-robot z ekranową twarzą i skrzydłami ze świetlistych obwodów, otwiera portale do światów, w których prawa natury działają inaczej: czas biegnie w pętlach, słowa mają masę, widać fale prawdopodobieństwa, a uczucia sterują grawitacją. Młody Odkrywca bada taki świat, a potem razem z Ignisem tłumaczy to, co odkrył, na naukę naszego świata.

Projekt opisuje dokument źródłowy [docs/QUANTUM_EDUVERSE.md](docs/QUANTUM_EDUVERSE.md) (filozofia wielu światów, model 3 faz, światy, zadania domowe, silnik emocji). Gra jest jego implementacją.

## Jak to działa

**Model 3 faz** (każdy świat to łuk nauki, a nie szyny):
1. **Wejście** (Phase I): odkrywca trafia do świata z innym prawem natury i sam je testuje. Zderzenie z oczekiwaniami (dysonans poznawczy) rodzi pytanie „jak to działa?”.
2. **Przekład** (Phase II): Ignis pomaga przełożyć dziwne prawo na prawdziwą naukę (analogie, pytania). Każde takie odkrycie trafia do **Field Guide** odkrywcy.
3. **Personalizacja** (Phase III): odkrywca buduje własny model, regułę albo wynalazek. Przez całą drogę Ignis dopasowuje się do niego: przy wahaniu proponuje prostszy świat albo inny sposób uczenia się, przy frustracji łagodnie wspiera i przypomina wcześniejszy sukces.

**Cztery siły kanonu iFairy to cztery sposoby uczenia się:** Logos (wzory i rozumowanie), Mythos (opowieści i czas), Gnosis (uczucia i empatia), Phantasia (wyobraźnia i zabawa). Każda strona daje dwie opcje (A i B) z różnych sił i zawsze opcję C, własnymi słowami. Na stronie głównej odkrywca wybiera, jak lubi się uczyć, a Ignis częściej proponuje tę drogę.

**Błąd to nowa gałąź rzeczywistości, nie porażka:** mapa linii czasu pozwala wrócić i otworzyć inną gałąź.

**Światy** (14):
- **Siedem Światów** (ścieżka etapami, po zakończeniu przycisk *Continue to Stage N*): BleepWorld (chaos i porządek), Loopia (pętle czasu i iteracja), Textosfera (słowa z masą), Probabilion (fale prawdopodobieństwa), Narramagia (opowieść buduje świat), Fraktalia (samopodobieństwo), Sympathos (uczucia sterują fizyką);
- **Cyber-Magiczne Laboratoria**: Grawi-Lab, Zakrzywiona Czytelnia Szepczących Ksiąg, Lewitas, Kraina Przewijania, Koloratura, Chrono-Wyprawy;
- **Portal Zadań Domowych**: zdjęcie strony z zeszytu albo własne słowa; Ignis prowadzi trzema poziomami pomocy (delikatna podpowiedź, wspólna konstrukcja, zabawowe przeformułowanie) i nigdy nie podaje gotowej odpowiedzi.

**iFairy Universe zostaje fundamentem:** reguły bezpieczeństwa dla dzieci, system humoru cybermagicznego, canon lock (tylko Logos, Mythos, Gnosis, Phantasia i If-AI), wygląd iFairies (blokada wizualna R6), checklista portali, Tinkermasterzy i przewodnicy głosu jako postacie, lore na żywo z cytatami w Codexie. Światy Edu-Verse są autorskie (`server/universe/seeds.ts`), a Sync zamraża każdy z nich razem z kanonem w niezmiennym snapshocie.

**Wyczyszczone w 6.0:** świat Grimm Protocol (baśnie jako zabugowany kod, 16+), 40 przygód z kanonu (haki portali, Saga If-AI, Dzielnice Podróżników) i persona Narratora-Archiwisty. Zapisane historie z tych światów zostają na dysku, ale serwer ich już nie serwuje (410).

## Gdzie jesteśmy (2026-11-06)

**Wersja 6.0.0** na gałęzi, jeszcze nie na produkcji (https://demo.ifairy.co.uk/ działa na 5.1.0).

**Po wdrożeniu koniecznie:** w panelu *iFairy Universe → Sync now*. Dopóki stary katalog nie zostanie zastąpiony, strona główna pokazuje „The portals are still closed”. Opcjonalnie w *Art kit* nowy plan i render (okładki 14 światów, ikony czterech sił, odznaki zakończeń).

**Do decyzji właściciela:**
- profil wieku: prompt i recenzja treści celują w dzieci od ok. 8 lat i młodsze nastolatki (ostrzej niż dawne 13+); oznaczenie „8+” jest na stronie głównej;
- karta wsparcia przy niepokoju dalej wskazuje Childline (UK);
- ewaluacje na żywo (`npm run eval:gm`) przepisane na światy Edu-Verse, ale jeszcze nieuruchomione na prawdziwym modelu.

**Wdrożenie:** kopia `data/`, `git pull`, `npm install`, `npm run build`, `pm2 restart demo-ifairy-book`, potem w panelu *iFairy Universe → Sync now*. Powiązane repo: [ifairy-universe](https://github.com/reception-ifairy/ifairy-universe) (kanon i API) i [ifairy-narrative-engine](https://github.com/reception-ifairy/ifairy-narrative-engine) (osobny silnik z tym samym guardem obrazów).

**Multimodalnie:**
- **Claude** pisze strukturę i narrację, a także czyta obrazy od gracza (zdjęcia zadań domowych, artefakty);
- **Gemini** albo **OpenAI** rysuje ilustracje i czyta tekst na głos (głos z przeglądarki działa bez klucza);
- przeglądarka obsługuje dyktowanie;
- **Art Kit:** Claude planuje szatę graficzną (style bible + prompty), a OpenAI ją maluje.
- **AI Game Master** (opcjonalny): kości 2d6 i reguły w kodzie jako narzędzia Claude'a; questy idą łukiem 3 faz, w Probabilionie kości to fale prawdopodobieństwa.

## Szybki start

```bash
bun install            # albo npm install
cp .env.example .env   # opcjonalnie: klucze można też wpisać w panelu admina
bun run dev            # http://localhost:3000
```

1. Otwórz `http://localhost:3000/#/admin`, wklej klucz Anthropic, kliknij **Test**, a potem **Save**.
2. Sekcja **iFairy Universe**: klucz konsumenta → *Test* → *Save* → *Sync now* → *Edu-Verse: On*.
3. Opcjonalnie dodaj klucz Gemini lub OpenAI i wybierz modele ilustracji i głosu.
4. Opcjonalnie: sekcja **Art kit**, czyli *Plan with Claude* → *Render all* → *Publish* (potrzebny klucz OpenAI).
5. Wróć na stronę główną, wpisz zmyślone imię odkrywcy, wybierz sposób uczenia się i świat.

Produkcja: `bun run build && bun run start`. Przed wdrożeniem ustaw `ADMIN_PASSWORD`.

## Sprawdzanie

```bash
bun run check   # typecheck + 82 testy (bez kluczy, na sztucznych API) + build
npm run eval:gm # ewaluacje Game Mastera na żywym modelu (klucz Anthropic, poza CI)
```

To samo uruchamia CI w GitHub Actions przy każdym pushu i PR.

## Dokumentacja

| Dokument | Zawartość |
|---|---|
| [docs/QUANTUM_EDUVERSE.md](docs/QUANTUM_EDUVERSE.md) | Dokument źródłowy projektu: filozofia, model 3 faz, światy, zastosowania |
| [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md) | Struktura repo plik po pliku, przebieg tury (diagramy), model danych, zapis danych, frontend i motyw |
| [docs/OPERATORZY.md](docs/OPERATORZY.md) | Kto co obsługuje: modele AI, gracz i sysadmin, wszystkie endpointy, zabezpieczenia, skrypty, testy, CI, zmienne środowiskowe |
| [CHANGELOG.md](CHANGELOG.md) | Wszystkie zmiany od wersji z AI Studio do obecnej |

## Stos

Node + Express · React 19 · Vite 6 · Tailwind 4 · motion · zod · `@anthropic-ai/sdk` · `@google/genai` · `openai` · Vitest.

## Styl: Cozy Workshop

Przytulny warsztat nocą: deski, kominek, lampki i śnieg, kremowe karty-naklejki z grubym konturem, komiksowe efekty („CLICK!”, „SPARK!”, „EUREKA!”). Ignis to księga-robot z ekranową twarzą, płomykiem-anteną i skrzydełkami. Tokeny motywu są w `src/index.css`, a komponenty w `src/ui.tsx`.
