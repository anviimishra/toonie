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

## Database

The schema lives in `supabase/migrations`. Apply it to a Supabase project once:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

That creates five tables (`capsules`, `members`, `devices`, `stories`,
`deliveries`), the `audio` and `comics` storage buckets, and publishes
`deliveries` to Realtime so a robot is notified the moment a comic is ready.

Row level security is on for every table. The server uses the secret key and
bypasses it; the browser and the robot use the publishable key and can read
only `deliveries`, which holds ids and a status but no story content.

Two clients wrap it:

| Import                                           | Key         | Use from                     |
| ------------------------------------------------ | ----------- | ---------------------------- |
| `supabaseServer()` from `@/lib/supabase/server`  | secret      | route handlers, `features/*` |
| `supabaseBrowser()` from `@/lib/supabase/client` | publishable | client components, Realtime  |

`supabaseServer()` throws if it is ever called in the browser, so the secret key
cannot leak into a bundle. After changing the schema, regenerate the types:

```bash
npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
```

`src/lib/supabase/schema.test.ts` fails if `types.ts` and the migration disagree.

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
  types/        Shared shapes for a comic (panels, print size)
docs/           Robot API contract
robot/          Reference Python client for the Raspberry Pi
```
