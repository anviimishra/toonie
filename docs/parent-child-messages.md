# Parent–child messages

## Setup and migration order

For an existing installation, do not rerun migrations already applied. Apply `20260927063038_pairing_and_delivery.sql` after the parent-child message and backend-transcription migrations, then `20260927071932_restore_auth_profiles.sql`. The latter restores the missing profile table required by the hosted signup trigger and includes that trigger in migration history. A fresh installation applies all files in `supabase/migrations` in filename order.

Enable Supabase Email/password and Anonymous Sign-Ins. Configure allowed email confirmation redirects for `/login` on each app origin. The server needs `SUPABASE_SECRET_KEY`; the browser uses only the public URL and publishable key.

## Identity and pairing

Parents authenticate by email/password. Children use an anonymous Supabase session in a separate browser storage namespace, permitting parent and child tabs on one device.

A parent saves the child avatar and requests a code from `POST /api/pairing/code`. Five-digit codes are cryptographically generated, stored as keyed hashes, expire in ten minutes, and are limited to five requests per ten minutes. Creating a new code invalidates that parent's unused codes. `POST /api/pairing/claim` requires an anonymous child session and atomically creates a pair. A used code cannot connect another child; retrying the same claim returns the same pair. Claims are limited per identity and address. Vercel's trusted forwarded address is used in production; local development shares an address limit.

`parent_child_pairs` contains the parent/child Auth IDs, child display name, and child avatar reference. Code claims never accept arbitrary user IDs. The service-only `pairing_codes` and `request_limits` tables have RLS and no browser grants. SQL functions use an empty search path and service-only execute grants.

`GET /api/pairs` uses RLS. Parents can sync a new child avatar through `PATCH /api/pairs`; the child generation route reads that saved reference server-side.

## Message data

`comic_messages` stores:

- UUID `id` reused for retries, `pair_id`, and server-derived `sender_role`.
- Grok-generated `title`, required final `transcript`, optional raw `original_transcript`.
- `comic_path`, `print_path`, optional `audio_path`, native `audio_mime_type`, and optional `audio_duration_ms`.
- `panel_count`, database `created_at`, recipient-only `read_at`, and immutable-payload `content_hash`.

Audio is sent to `/api/comics` and transcribed on the backend before drawing. Typed stories have text and no audio. The original recording is retained with the returned transcript. Browser recording uploads are capped at 3 MB.

## Upload and delivery

1. Prepare the full-color square PNG, black-and-white print PNG, and optional native recording. Compute SHA-256 and byte count for each.
2. `POST /api/messages/prepare` validates identity, pair membership, metadata, and limits. It returns private Storage signed upload tokens and an expiring, user-bound signed delivery ticket.
3. Upload directly to the private `message-media` bucket using those tokens, avoiding the application server's request-body limit. Paths are `<pair_id>/<message_id>/comic.png`, `print.png`, and optional `voice`. Existing files cannot be overwritten.
4. `POST /api/messages/send` verifies the signed ticket and downloads/checks every object's bytes and digest. Only then does it insert the message row. Retries with the same ID and exact payload are idempotent; conflicting content or sender is rejected.

Browser roles cannot insert messages directly. Participants can read only files referenced by messages visible to them. An uploaded file without a finalized message does not become visible to the recipient. Abandoned incomplete uploads currently require administrative cleanup.

## Receiving and replying

`GET /api/messages` returns up to 100 newest accessible messages with one-hour signed media URLs. Both endpoints fetch initially, refresh on Realtime events, poll every 30 seconds, and refresh on reconnect/page visibility. The receiver displays a mail indicator for unread incoming messages. Acknowledgement occurs only after the comic image loads successfully through `POST /api/messages/read`; the sender cannot mark its own message read.

The child records using tap-to-start/stop, generates with the paired child avatar, reviews the comic, and sends through the same verified delivery endpoints. The parent sees it as received, with recording playback and transcript. This browser flow does not depend on the old shared robot ID or `/api/robot-state` prototype.

## Verification

`scripts/test-message-schema.ps1` runs all migrations and 59 pgTAP assertions in an isolated Docker database. It covers participant-only access, recipient-only receipts, private storage, immutable content, code claims/expiry/retries, and rate limits.

`scripts/smoke-delivery.mjs` exercises the running application against hosted Supabase with temporary accounts and media. It verifies real Auth, code pairing, both delivery directions, exact image/audio retrieval, missing-upload rejection, retry deduplication, and receipts. It does not spend xAI image-generation credits.
