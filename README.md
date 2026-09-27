# Toonie

Record or type a story, preview a Grok-generated comic starring your saved avatar, and send it to your child's connected browser.

## Demo setup

1. Install dependencies, copy `.env.example` to `.env.local`, and fill in the Supabase and xAI keys. Keep secret keys server-only.
2. Apply migrations in filename order. Existing installations with the two message migrations applied need only `supabase/migrations/20260927063038_pairing_and_delivery.sql`.
3. Enable Email/password and Anonymous Sign-Ins in Supabase Authentication. If email confirmation is enabled, confirm the signup email before signing in. Configure Supabase's Site URL and allowed redirect URLs for your deployed origin and `http://localhost:3000/login`.
4. Run `npm run dev` and open http://localhost:3000/start.
5. Choose Parent, create an account/sign in, and save your own avatar and the child's avatar in Me. In Settings, enter the child's name and generate a five-digit code.
6. Open the Child path on the receiving browser and enter the code within ten minutes. Parent and child use separate sessions, so two tabs on the same browser also work.
7. On the parent side, record (tap to start/stop) or type, make a sticker, review it, select the child, and send. The child receives a mail indicator and opens the actual comic, transcript, and optional recording.
8. The child can tap the face to record, tap again to stop, preview their generated comic, then send a reply to the parent feed.

The database stores the generated title, required transcript, optional original speech transcript, native recording, and paths to the color comic and black-and-white print image. Transcription happens on the backend. Sending succeeds only after every file is uploaded and verified. Failed sends can be retried with the same message ID.

## Comics and printing

New comics are square compositions for 2″ × 2″ stickers, with 1–4 panels (3 by default). They remain colored in the browser and use minimal lettering; the story text is shown separately. The shared prompt is in `src/lib/ai/prompts.ts`. The saved avatar reference is supplied for every image. AI output can vary, so both sides preview before sending.

Black-and-white print PNGs are 1200×1200 masters. HelloBlink printer transport, native resolution, and physical output still need hardware testing; the app does not send directly to the printer.

Parent drafts and avatars remain browser-local. Completed messages and their media are in Supabase and available on connected devices. The paired child's avatar reference is stored with the pair; use Settings → sync avatar after changing it. Keep the child page open while generating/reviewing an unsent reply. Recording uploads are limited to 3 MB for the hosted request limit.

## Backend

See [the messaging contract](docs/parent-child-messages.md). The active browser flow uses `parent_child_pairs`, `comic_messages`, private `message-media` storage, and two service-only pairing/rate-limit tables. Earlier capsule/device tables remain for the separate robot prototype.

Each API verifies the Supabase user. Reads and read receipts use participant-scoped RLS. Writes use server authorization and signed upload tickets. The child uses anonymous Auth, not an email account. Clearing its browser session requires another pairing code. Five-digit codes expire after ten minutes and can be claimed once; attempts are rate-limited.

Realtime refreshes the feed, with polling every 30 seconds and refresh on reconnect/visibility as fallback. Signed media URLs last one hour and are renewed when the inbox reloads.

Set the same `.env.example` variables in your deployment. Configure sufficient function duration for comic generation (`maxDuration = 300`); provider/network errors appear in the preview workflow. The app needs outbound access to Supabase and xAI. Production email redirects must use the production origin.

## Checks

- `npm run check`: lint, TypeScript, and unit tests.
- `npm run build`: production build.
- `powershell -File scripts/test-message-schema.ps1`: isolated Docker Postgres/pgTAP migration and authorization tests.
- `node --env-file=.env.local scripts/smoke-delivery.mjs`: live Auth, pairing, upload, delivery in both directions, and read-receipt smoke test against the running app. Creates temporary users and files, then removes them. Set `SMOKE_BASE_URL` to test another app origin connected to the same Supabase project.
