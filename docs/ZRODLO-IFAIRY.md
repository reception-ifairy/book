# Analiza kanonu iFairy: co weszło do gry

Źródło: `agency_fairytale.md` (ok. 80 kB, listopad 2026) — dokument kanonu iFairy: gatunki opowieści,
„Filary Doskonałości” narratora-AI, wygląd i charakter iFairies, techniki iteracji, zero-shot CoT
i opis świata iFairy Universe. Dokument jest mocno powtarzalny: ta sama sekcja o iteracjach wraca
w nim sześć razy, więc unikalnej treści jest w nim może jedna piąta.

Gra **IGNIS // OS: Grimm Protocol** ma jeden świat i jednego narratora, a świat iFairy Universe
został z niej usunięty w 6.0.0 ([CHANGELOG](../CHANGELOG.md)). Z kanonu wzięliśmy więc **mechanikę
i sposób prowadzenia gracza**, a nie lore.

## Co weszło (6.1.0)

| Pomysł z kanonu | Gdzie w kanonie | Co z tego jest w grze |
|---|---|---|
| „Sposób zadawania pytań o niezrozumiałe” — narrator sam pyta, czy coś wymaga wyjaśnienia | przykłady interakcji Brzechwy przy każdej z czterech iteracji | **Panel DEBUG** pod każdą stroną: pytanie, które zadałby 12-latek, i odpowiedź Ignisa. Zwinięty domyślnie, bo w kanonie pytanie jest ofertą, a nie przerwą w opowieści |
| **Iteracja sekwencyjna** — krok po kroku, każdy krok stoi na poprzednim | „Krok 1: Iteracja Sekwencyjna”, Educational iFairies | Kształt panelu DEBUG: 2–4 kroki po jednym zdaniu, w kolejności, każdy budujący na poprzednim (`Explainer.steps`) |
| **Zero-shot CoT** — „przemyślmy to krok po kroku” przed odpowiedzią | „Zero-shot Chain of Thought (CoT)” | Sekcja `# Before you write` w prompcie: pięć kroków planu strony, rozumowanie zostaje u modelu |
| **„If you can explain it, it can exist”** | motto iFairy, „Imagine the Impossible” | Zasada domu dla własnych ruchów: ruch z uzasadnieniem działa hojniej i dostaje nagrodę, bez uzasadnienia — krzywiej i śmieszniej |
| **Iteracja warunkowa** — dalsze kroki zależą od odpowiedzi gracza | „Krok 2: Iteracja Warunkowa” | Już było: wybory forkują linię czasu, a stan (statystyki, kanon, ekwipunek) wraca do modelu w bloku `STATE` |
| Nauka przemycona w przygodzie („Transform Complex Concepts”) | Educational Enhancement | Prompt zna teraz wprost `tale.tech`, więc żart i wyjaśnienie trzymają się jednej technologii |

## Co weszło (6.2.0)

| Pomysł z kanonu | Gdzie w kanonie | Co z tego jest w grze |
|---|---|---|
| Zagadki zależne od odpowiedzi, mikstura „w odpowiedniej kolejności”, wzór do powtórzenia | „Krok 2: Iteracja Warunkowa”, „Krok 3: Iteracja Rekurencyjna”, przykłady Brzechwy | **Glitch-łamigłówki** co 3–4 strony, każda zamknięta w jednej stronie: odpowiedź jako własny ruch, podpowiedź jako rozsądny wybór, zła odpowiedź nigdy nie kończy gry |
| **Provocation of Questions**: „a co, jeśli artefakt ma ukrytą wadę?” | Filar 3 | Raz lub dwa razy na baśń zwrot akcji: ukryta wada przedmiotu, sekret pomocnika, strona historii pomijanej postaci |
| Retelling z perspektywy pomijanych postaci | „Fairy Tale Retelling” | Część tych zwrotów akcji (wilk ma swój powód, przyrodnia siostra prowadzi dziennik bugów) |

## Co świadomie odrzucone

- **Świat iFairy Universe, Rada Mędrców, laboratoria, akcelerator cząstek magii.** Usunięte w 6.0.0
  razem z Game Masterem. Wracanie do nich odwróciłoby tamtą decyzję, a Grimm Protocol ma jednego
  narratora i pięć baśni.
- **Wygląd iFairies** (rdzeń energii, kryształowe struktury, 30–40 cm, skrzydła zależne od domeny).
  Ignis ma własny, ustalony wygląd: księga-robot z ekranową twarzą i skrzydłami wróżki, opisany
  w prompcie ilustracji i w `SVGCharacter`. Dwa kanony wyglądu naraz to sprzeczne ilustracje.
- **Cztery domeny iFairies** (edukacyjna, artystyczna, techniczna, terapeutyczna) i ich „tryby
  języka”. Gra ma jeden głos i system nastrojów (`Mood`), który już robi to zadanie.
  Tryb terapeutyczny nie jest nam potrzebny: prompt ma własną, krótszą regułę na prawdziwy niepokój
  gracza (jedno zdanie o rozmowie z zaufanym dorosłym).
- **„Filary Doskonałości” i zestaw narzędzi twórcy treści** (SEO, propozycje grantów, analiza
  skuteczności, generator nagłówków). To opis asystenta do pisania treści, nie narratora gry.
- **Iteracja rekurencyjna i zagnieżdżona** jako wieloturowa mechanika (w 6.2.0 weszły tylko jako treść jednostronicowych łamigłówek). W kanonie służą one dopieszczaniu
  obrazka albo planowaniu uczty; w grze jedna tura to jedna strona i jeden ruch gracza, więc
  pętla „poprawiajmy to razem” psułaby tempo.
- **Przykłady humoru z kanonu** („skalibrowałem obwody empatii splątaniem kwantowym”). Żart ma
  trafiać do 12-latka bez przypisu — prompt Ignisa ma własną, prostszą regułę humoru.

## Gdzie to jest w kodzie

- `shared/types.ts` — `Explainer`, `Page.explainer`, `MAX_EXPLAINER_STEPS`.
- `server/story/prompts.ts` — `# Before you write`, reguła `explainer`, zasada domu przy własnych ruchach.
- `server/story/engine.ts` — pole w schemacie strony i `toExplainer()` (przycinanie, `null`).
- `src/screens/Story.tsx` — `DebugPanel`, skrót `D`, podpowiedź o zasadzie domu.
- `tests/engine.test.ts` — przycinanie panelu; `tests/grimm-golden.test.ts` — dokładna treść promptu.
