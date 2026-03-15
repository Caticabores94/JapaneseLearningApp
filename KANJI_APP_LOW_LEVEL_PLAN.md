# Japanese Kanji Learning App - Low-Level Implementation Plan (React)

This plan is written for a junior engineer with no prior context. It is explicit and only uses tools available on this machine. Follow steps in order. Do not skip verification steps.

## 0. Context and Goals
You are building a kanji learning app with:
- A progression from easy to complex kanji.
- Per-kanji details: meaning(s), On-yomi, Kun-yomi, radicals, example vocab.
- A WaniKani-inspired learning flow: radicals → kanji → vocab.
- SRS review with adjustable intervals (not fixed to WaniKani’s exact timing).
- Optional import of Anki `.apkg` decks to seed vocab/examples.

We will build:
- Frontend: React + Vite.
- Backend API: Node.js + Express.
- Database: SQLite (local file).

## 1. Local Code Setup (React + Express + SQLite)
Goal: Create a minimal, runnable app with a React UI and a working API.

Tasks:
1. Initialize a Vite React app at repo root:
   - Run `npm create vite@latest . -- --template react`.
2. Install dependencies:
   - Run `npm i`.
3. Add backend dependencies:
   - Run `npm i express better-sqlite3`.
4. Create folder structure:
   - `server/`
   - `server/db/`
5. Create `server/index.js`:
   - Start an Express server on port `3001`.
   - Add `GET /health` that returns `{ "ok": true }`.
6. Update Vite dev server to proxy API:
   - Edit `vite.config.js` to proxy `/api` to `http://localhost:3001`.
7. Create a minimal API route:
   - `GET /api/kanji` returns an empty list for now: `{ "items": [] }`.
8. Update `src/App.jsx` to fetch `/api/kanji` and render item count.
9. Add run scripts in `package.json`:
   - `"dev:api": "node server/index.js"`
   - `"dev:ui": "vite"`

Verification:
- Terminal 1: `npm run dev:api` → should show server listening on `3001`.
- Terminal 2: `npm run dev:ui` → should show Vite on `5173`.
- Open `http://localhost:5173` and confirm the UI renders and shows `0` items.
- Open `http://localhost:3001/health` and confirm `{ "ok": true }`.

Done when:
- Both servers run locally.
- UI successfully calls the API through the proxy.

## 2. Database Setup (SQLite)
Goal: Create a local database file and a minimal schema.

Tasks:
1. Create `server/db/schema.sql` with tables:
   - `kanji`
   - `readings`
   - `radicals`
   - `vocab`
   - `progress`
   - `review_schedule`
2. Create `server/db/init.js`:
   - Open `kanji.db` (SQLite file) in `server/db/`.
   - Execute `schema.sql` to create tables if missing.
3. Update `server/index.js` to run `init.js` on startup.

Verification:
- Start API server and confirm `kanji.db` file is created.

Done when:
- `server/db/kanji.db` exists and tables are created.

## 3. Seed Data (Minimal)
Goal: Add a tiny dataset so the UI can show real content.

Tasks:
1. Create `server/db/seed.sql` with 2 radicals, 2 kanji, 2 vocab entries, and 4 readings.
2. Create `server/db/seed.js` that inserts seed data if tables are empty.
3. Call `seed.js` from `server/index.js` after `init.js`.

Verification:
- `GET /api/kanji` returns 2 items.
- UI displays `2` items.

Done when:
- Seeded data appears in API and UI.

## 4. Core API Endpoints
Goal: Provide basic endpoints the UI needs.

Tasks:
1. Add `GET /api/kanji` (list ordered by difficulty; start with `id` order).
2. Add `GET /api/kanji/:id` returning full detail:
   - meaning(s)
   - On-yomi + Kun-yomi
   - radicals
   - example vocab
3. Add `GET /api/lessons/today`:
   - For now return 5 items from easiest.
4. Add `POST /api/reviews`:
   - Accept `{ kanjiId, result }` and store in `progress`.

Verification:
- Call each endpoint with `curl` and check JSON shape.

Done when:
- Endpoints return correct data and do not crash.

## 5. React UI Screens (Minimal)
Goal: Add simple screens to view data.

Tasks:
1. Home screen:
   - Show number of kanji available.
   - Buttons: “Start Lesson”, “Start Review”.
2. Kanji list screen:
   - List kanji with meaning and difficulty index.
3. Kanji detail screen:
   - Show meaning, readings, radicals, vocab list.
4. Lesson screen:
   - Show one kanji at a time with “Next”.
5. Review screen:
   - Prompt meaning and reading (simple text input).

Verification:
- UI loads each screen and renders data.

Done when:
- All screens render and can be navigated via basic links.

## 6. WaniKani-Inspired Gating (Semi-Strict)
Goal: Enforce radicals → kanji → vocab with a small daily buffer.

Tasks:
1. Define a simple gating rule in server logic:
   - If a kanji’s radicals are not at “Guru”, it is locked.
   - Allow a daily buffer (e.g., 3 new kanji) even if gate is not met.
2. Update `GET /api/lessons/today` to apply gating.

Verification:
- Lessons contain radicals first; kanji appear only after radicals are “Guru” or buffer is used.

Done when:
- Gating changes lesson output.

## 7. SRS Stages (Adjustable)
Goal: Implement adjustable SRS stages and intervals.

Tasks:
1. In the DB, store per-item stage and next review date.
2. Define default stage intervals in a config object in server code.
3. On `POST /api/reviews`, update stage and next review time.

Verification:
- Reviewing an item changes its stage and schedules next review.

Done when:
- Progress table updates correctly after review.

## 8. Anki `.apkg` Import (Optional)
Goal: Allow importing vocab into the DB from Anki decks.

Tasks:
1. Add a CLI script `server/anki/import.js`:
   - Accept path to `.apkg`.
   - Extract note fields for vocab and readings.
   - Ignore scheduling data.
2. Insert imported vocab into `vocab` table and link to kanji when possible.

Verification:
- Import script runs and adds rows to DB.

Done when:
- Imported vocab appears in `GET /api/kanji/:id` details.

## 9. Stabilization
Goal: Make the app stable and easy to run.

Tasks:
1. Add README at repo root with run steps.
2. Add a simple smoke test script (optional).

Done when:
- Another engineer can run it in 2 commands.

