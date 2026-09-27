# Toonie

Talk about your day, get a comic, and print it on a little robot.

1. Record a story in the app and pick how many panels you want.
2. AI turns it into a comic.
3. Review the completed comic, then choose **Send to my feed** to keep it as a sent comic.

The current testing flow stores avatars, previews and sent comics in this browser.
Receiving on another device and robot delivery are future integrations; the received
feed entries are still examples.

## Comic creation

Save an avatar in **Me** first. Built avatars use the exact displayed drawing as
an image reference; photo avatars are drawn by Grok and the saved drawing becomes
the reference. Record or type a story, select 1–4 panels (3 by default), and choose
**Make my sticker**. With voice, tap to start and stop, then choose **Make my sticker**. The original
recording is sent to `/api/comics`; the backend transcribes it before scripting and drawing. The loading screen reports scripting and
completed panel counts. Review the full comic before sending, or draw again.

Each new comic is one square composition for a 2″ × 2″ sticker. Three panels use
two squares on top and a wide ending below; four use a 2×2 grid. Artwork remains
in colour in the app. There are no printed captions; the transcript remains under
**Your original story**. **Black-and-white print preview** is optional and uses
the same conversion as **Download black-and-white print PNG**.

The PNG is a 1200×1200 square master with margins. Select 2″ × 2″ in the printer
workflow; physical output and resampling still need testing on the HelloBlink
thermal hardware. Its native dot width/protocol have not been established, so the
app does not send directly to that printer yet. Existing older comics retain their
original layout.

Speech-to-text is reused from `origin/anvii-child-mode` at `aa0321e`:
`src/lib/ai/transcribe.ts` and `POST /api/transcribe`. It uses only AI environment
settings, includes a request timeout, and avoids logging story transcripts. The
comic API's audio path uses this same service; the receiving UI was not merged.

`XAI_API_KEY` in `.env.local` is read only by server routes. The optional model
overrides are documented in `.env.example`. The development server needs outbound
HTTPS access to `api.x.ai`. Supabase is not required for this local testing flow.

The shared template lives in `src/lib/ai/prompts.ts`: a visual story script,
exact panel count, warm flat-colour cartoon art based on the existing feed, no
generated lettering, and the same saved avatar reference for every image edit.
Sticker captions are forced empty. Image generation can still vary; the preview
lets you check the result before approving it. A failed panel blocks completion.

Completed previews and sent comics are stored in IndexedDB with embedded images,
so they survive refreshes without depending on temporary image URLs. This storage
is specific to the browser and origin (`localhost` and `127.0.0.1` are separate).
Keep the page open during generation. Sending here does not deliver to another
person or print anything yet.

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

### Delivery handoff after the receiver merge

Parent flow stays `/welcome` → `/start` → `/login` → `/`; child flow stays `/start` → `/face`. Both recorders use tap to start and tap to stop. Auth is still the demo adapter. The merged robot state hook references `/api/robot-state`, which has not yet been implemented; its mail flag does not carry a comic.

Parent generation saves the original Blob before uploading it to the comic endpoint. The backend returns the speech transcript with the comic. Generated previews retain that source with the final edited transcript and Grok-generated title. Sending atomically saves the local feed entry and prepared media. Playback is available in preview and sent detail. Old comics cannot recover audio that was never saved.

The backend integration seam is `getSubmissionFormData(id)` in `src/features/stories/storage.ts`. It returns `metadata` (versioned JSON: clientStoryId, title, transcript, originalTranscript, source, audioDurationMs, MIME types, panelCount, createdAt), `comic_image` (color PNG), `print_image` (black-and-white PNG), and optional `audio` (original recording, native MIME). Typed stories have no audio. Files persist locally in IndexedDB; clearing browser storage removes them. This does not upload or mark a remote delivery successful.

Once the schema lands: use authenticated server identity and an authorized parent/child pairing; upload the media to private storage; store their paths with title/transcript and delivery status; use clientStoryId for retry deduplication. Publish a ready comic only after uploads succeed. The child must query its pending comics initially and on reconnect, subscribe to changes, open the actual comic on mail tap, and acknowledge only after successful display. Do not rely on the shared `default` robot ID or a boolean mail flag to identify a recipient or comic. Keep remote upload/delivery status distinct from the existing local sent feed.
