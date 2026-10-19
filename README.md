# IGNIS // OS: Grimm Protocol

A choose-your-own-story game: a sarcastic cyber-grimoire retells classic fairy tales as buggy legacy code. Every choice forks the timeline.

## How the models split the work

| Modality | Provider | What it does |
|---|---|---|
| Story structure and narration | **Anthropic (Claude)** | Writes each page as validated JSON: narration, IGNIS's quip, mood, 3–4 typed choices (sane / chaos / dumb / sudo), stat and canon changes, inventory, endings, a running summary and an illustration brief. |
| Vision (input) | Anthropic (Claude) | Players can attach a photo or sketch as an in-story "artifact". |
| Illustrations | Gemini or OpenAI (admin choice) | Renders each page from Claude's brief with a fixed art style; Gemini also gets the run's first image as a character reference. |
| Narration voice | Browser, OpenAI TTS or Gemini TTS (admin choice) | Reads the page and quip aloud. |
| Voice input | Browser speech recognition | Dictate a custom move. |

## Run it

```bash
bun install          # or npm install
cp .env.example .env # optional: keys can also be set in the admin panel
bun run dev          # http://localhost:3000
```

Open `http://localhost:3000/#/admin` to paste keys, test them, fetch each provider's model list, pick models per modality, and run live story / image / voice tests.

- Without `ADMIN_PASSWORD` the admin panel only answers from localhost. Set it before deploying.
- Keys saved in the panel live in `data/config.json` (mode 600, gitignored) and take precedence over environment variables.
- Stories and generated media are stored under `data/` (`DATA_DIR` to move it).

## Design: Ember Grimoire

A warm, editorial dark theme: the story reads like a book (Fraunces serif, drop caps, 68-character lines), the interface behaves like a modern app (Geist / Geist Mono). IGNIS's ember orange is the only loud color; choice types have their own quiet accents (sane, chaos, dumb, sudo). Tokens live in `@theme` in `src/index.css`; shared components in `src/ui.tsx`.

Keyboard: `1`–`4` choose, `/` write your own move, `M` timeline, `V` read aloud, `Space` skip the text animation.

## Layout

```
shared/        types and the fairy tale catalog (used by server and client)
server/        config, admin and game routes, provider adapters, story engine
src/screens/   Home (tale picker), Story (reader + timeline drawer), Admin console
src/ui.tsx     design-system components (buttons, meters, drawer, toasts)
```
