# Toonie

Record or type a story, preview a Grok-generated comic starring your saved avatar, and send it to your child's connected browser.

## Demo setup

1. Install dependencies, copy `.env.example` to `.env.local`, and fill in the Supabase and xAI keys. Keep secret keys server-only.
2. Apply migrations in filename order. Existing installations with the two message migrations applied need `supabase/migrations/20260927063038_pairing_and_delivery.sql`, followed by `20260927071932_restore_auth_profiles.sql` to restore the table expected by the signup trigger. Then apply `20260927080245_comic_jobs_and_thumbnails.sql` for saved generation and separate thumbnails, then `20260927083604_separate_reading_and_sticker.sql` for jobs containing both editions, then `20260927090000_family_members.sql`, `20260927100000_voiceovers.sql` and `20260927110000_one_child_per_parent.sql`.
3. Enable Email/password and Anonymous Sign-Ins in Supabase Authentication. If email confirmation is enabled, confirm the signup email before signing in. Configure Supabase's Site URL and allowed redirect URLs for your deployed origin and `http://localhost:3000/login`.
4. Run `npm run dev` and open http://localhost:3000/start.
5. Choose Parent, create an account/sign in, and save your own avatar and the child's avatar in Me. In Settings, enter the child's name and generate a five-digit code.
6. Open the Child path on the receiving browser and enter the code within ten minutes. Parent and child use separate sessions, so two tabs on the same browser also work.
7. On the parent side, record (tap to start/stop) or type, make a sticker, review it, select the child, and send. The child receives a mail indicator and opens the actual comic, transcript, and optional recording.
8. The child can tap the face to record, tap again to stop, preview their generated comic, then send a reply to the parent feed.

The database stores the generated title, required transcript, optional original speech transcript, native recording, and paths to the color comic and black-and-white print image. Transcription happens on the backend. Sending succeeds only after every file is uploaded and verified. Failed sends can be retried with the same message ID.

## Comics and printing

Parent stories and child replies both generate one captioned 3-4-panel sticker comic (3 by default). Its artwork supplies the feed thumbnail, the full comic and the black-and-white print file. Scripts use `grok-4.20-0309-non-reasoning`, which returns in a few seconds; `grok-4.7` took 45-100 seconds and timed out. The separate six-panel reading comic is switched off in `src/app/api/comics/route.ts` but its code remains. Words are rendered by the app for reliable legibility. The shared prompts are in `src/lib/ai/prompts.ts`, and the saved avatar reference is supplied for every image. Parents preview before sending; child replies go to the parent feed as soon as they are drawn.

Each parent has one child. Once connected, Settings offers a new code instead of a name field: entering it on another device moves the existing pair there, keeping its comics and disconnecting the old device. Remove child deletes the pair, its comics and their media. A faint icon in the top-right of the child screen signs that device out.

Black-and-white print PNGs are 1200×1200 masters. A lifted-midtones ordered halftone retains detail in dark skin and clothing instead of turning all dark colors solid black; the color artwork keeps the original skin tone. HelloBlink printer transport, native resolution, and physical output still need hardware testing; the app does not send directly to the printer.

Avatars and parent draft caches remain browser-local. Accepted generation jobs, source recordings, progress, and finished panel images are saved privately in Supabase. Completed messages and their media are in Supabase and available on connected devices. The paired child's avatar reference is stored with the pair; use Settings → sync avatar after changing it. After the story upload is accepted, both sides can navigate away or close the page and return to the saved result. The parent feed shows a generation/ready notice. Recording uploads are limited to 3 MB for the hosted request limit.

## Backend

See [the messaging contract](docs/parent-child-messages.md). The active browser flow uses `parent_child_pairs`, `comic_messages`, private `message-media` storage, service-only pairing/rate-limit tables, `comic_jobs`, and private `comic-drafts` storage. Earlier capsule/device tables remain for the separate robot prototype.

Each API verifies the Supabase user. Reads and read receipts use participant-scoped RLS. Writes use server authorization and signed upload tickets. The child uses anonymous Auth, not an email account. Clearing its browser session requires another pairing code. Five-digit codes expire after ten minutes and can be claimed once; attempts are rate-limited.

Realtime refreshes the feed, with polling every 30 seconds and refresh on reconnect/visibility as fallback. Signed media URLs last one hour and are renewed when the inbox reloads.

Set the same `.env.example` variables in your deployment. Configure sufficient function duration for comic generation (`maxDuration = 300`); provider/network errors appear in the preview workflow. The app needs outbound access to Supabase and xAI. Production email redirects must use the production origin.

## Checks

- `npm run check`: lint, TypeScript, and unit tests.
- `npm run build`: production build.
- `powershell -File scripts/test-message-schema.ps1`: isolated Docker Postgres/pgTAP migration and authorization tests.
- `node --env-file=.env.local scripts/smoke-delivery.mjs`: live Auth, pairing, upload, delivery in both directions, and read-receipt smoke test against the running app. Creates temporary users and files, then removes them. Set `SMOKE_BASE_URL` to test another app origin connected to the same Supabase project.

## Background generation

The browser posts to `/api/comics?background=1` and receives HTTP 202 after the job and source recording are saved. Next.js `after()` runs the provider pipeline without keeping the browser connection open. `/api/comic-jobs` restores the authenticated owner's one pending job; panel images are uploaded as they finish. No fabricated progress percentage is shown. A successful result is reviewed before it is sent.

The host must support Next.js `after()` and the configured 300-second function duration (Vercel or a persistent Next server). This is not an external retry queue: server termination or timeout is reported as an interrupted job after six minutes, and the user can retry. Unsent drafts and archived job media currently require administrative retention/cleanup. Existing sent comics keep their original rendition; generate a new comic to get captions and the new print conversion.

`node --env-file=.env.local scripts/smoke-background.mjs` tests real Grok background generation with a synthetic avatar and temporary user, then cleans up. It consumes provider credits: six reading images plus three sticker images by default. `SMOKE_PANELS=4` selects a four-panel sticker.

For demos, disabling **Confirm email** in Supabase Authentication > Providers > Email lets email/password signups receive a session immediately without confirmation emails. App pairing and generation rate limits remain independent.
