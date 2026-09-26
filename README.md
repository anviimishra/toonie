# Toonie

Talk about your day, get a comic, and print it on a little robot.

1. Record a story in the app and pick how many panels you want.
2. AI turns it into a comic.
3. The comic is sent to the robot and printed on its thermal printer automatically.

It works the other way too: record a story on the robot and it shows up as a comic in the app.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the secret keys
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command          | What it does                                       |
| ---------------- | -------------------------------------------------- |
| `npm run dev`    | Start the dev server                               |
| `npm run build`  | Production build                                   |
| `npm run check`  | Lint + typecheck + tests (run before opening a PR) |
| `npm run format` | Format all files with Prettier                     |

## Folder layout

```
src/
  app/          Pages and API routes (kept thin)
  components/   Reusable UI pieces
  features/     Logic for each feature (stories, delivery, devices)
  lib/          Shared helpers (env, supabase, ai, comic image tools)
docs/           Robot API contract
robot/          Reference Python client for the Raspberry Pi
```
