# Parent–child messages

Two new tables handle both directions. They are independent of the older `capsules`, `stories`, `deliveries`, and `robot_states` prototype, so this migration does not replace existing data or change the current browser flow.

| Table | Purpose | Main fields |
| --- | --- | --- |
| `parent_child_pairs` | Connect one parent identity to one child identity | `id`, `parent_id`, `child_id`, `created_at` |
| `comic_messages` | Store a completed message in either direction | `id`, `pair_id`, `sender_role`, `title`, `transcript`, `comic_path`, optional `audio_path`, `created_at`, `read_at` |

`parent_id` and `child_id` reference Supabase `auth.users`. A child device can use a Supabase anonymous Auth session, so the child does not need an email/password screen. The current demo login and role-selection screen do **not** create these identities yet. Each pair has two distinct identities. Multiple verified pairs can share a parent or child; `pair_id` selects the intended relationship, and the opposite endpoint is the recipient.

Pair creation is server-only after confirming the pairing. For an initial demo, provision the two real Auth identities and insert their pair through a trusted server/admin connection. Never allow a client to supply arbitrary user IDs and claim a relationship. Re-pairing creates a new pair; do not change endpoints of a pair that already has messages.

## Message fields

- `id`: UUID; reuse the parent's existing `clientStoryId` on retries. A primary key prevents duplicate messages. A child creates its UUID once before sending.
- `pair_id`: the selected parent–child relationship.
- `sender_role`: `parent` or `child`. The database checks that the session belongs to that endpoint. No separate child-message table is needed.
- `title`: required Grok-generated title, 1–80 characters.
- `transcript`: required text, 1–4,000 characters, whether typed or transcribed. This is the final text used to generate the comic.
- `original_transcript`: optional unedited speech-to-text output for a voice message.
- `comic_path`: required full-color PNG path.
- `print_path`: optional black-and-white PNG path.
- `audio_path`: optional original recording path; null for a typed message.
- `audio_mime_type`: required when audio exists; preserve the recording's native type, including codec parameters.
- `audio_duration_ms`: optional duration; null when no audio exists.
- `panel_count`: 1–4.
- `created_at`: timestamp supplied by the database by default.
- `read_at`: initially null. Only the recipient can change this field; sent content cannot be edited by clients.

## Files and sending

Files belong in the private `message-media` bucket. Store paths in the database, not base64 or expiring signed URLs:

```text
<pair_id>/<message_id>/comic.png
<pair_id>/<message_id>/print.png     (optional)
<pair_id>/<message_id>/voice         (optional, native audio Content-Type)
```

The schema enforces these paths so a message cannot point to another family's media. File uploads are server-only. Authenticated participants can read only files referenced by messages they can read, including through short-lived signed URLs. There is no public access to the new bucket.

The comic PR provides `getSubmissionFormData(id)` in `src/features/stories/storage.ts`. Map its fields as follows:

| Prepared payload | Database/storage |
| --- | --- |
| `metadata.clientStoryId` | `comic_messages.id` |
| `metadata.title`, `metadata.transcript` | `title`, `transcript` |
| `metadata.originalTranscript` | `original_transcript` for voice; otherwise null |
| `metadata.audioMimeType`, `metadata.audioDurationMs` | `audio_mime_type`, `audio_duration_ms` |
| `metadata.panelCount` | `panel_count` |
| `comic_image` | upload to `comic.png`; save `comic_path` |
| `print_image` | upload to `print.png`; save `print_path` |
| optional `audio` | upload to `voice` with native Content-Type; save `audio_path` |

The future send endpoint should:

1. Verify the Supabase session and selected pair; derive `sender_role` from that session rather than trusting the submitted role.
2. Validate the payload and upload all required files. Keep the service key server-side. Use `upsert: false`; retries must verify existing files rather than overwrite a sent comic.
3. Insert the completed `comic_messages` row only after every required upload succeeds. If a repeated ID already exists, verify that it belongs to the same sender/pair and treat the matching submission as already sent. A changed story gets a new ID.
4. Report success only after that row exists. Clean up orphan uploads after failures through a server-side maintenance process.

The child uses precisely the same route and fields after transcription and comic generation. Its sender role is `child`, and the pair determines the parent target.

## Receiving

Fetch messages for the selected pair on initial load and after reconnect. For the parent's inbox filter `sender_role = 'child'`; for the child's inbox filter `sender_role = 'parent'`. Order by `created_at` and `id`; filter `read_at is null` for pending mail.

Subscribe to `postgres_changes` for `comic_messages` with `pair_id=eq.<pair_id>`. The migration adds the table to the Realtime publication; RLS still controls which events a session may receive. Treat notifications as a reason to refresh the inbox, not as the only source of messages. Display the comic and voice playback, then set `read_at` after successful display. Do not use the shared `default` robot ID or the boolean mail flag to identify a message.

## Validation and application

Migration: `supabase/migrations/20260927053235_parent_child_messages.sql`.

With Docker running, execute `./scripts/test-message-schema.ps1` from PowerShell. It creates a disposable, network-isolated PostgreSQL container, runs the migrations, and runs 37 pgTAP assertions for both sending directions, data requirements, retry IDs, media privacy, and participant permissions. Storage API tables are represented by a minimal fixture; this test does not exercise Storage HTTP uploads or Realtime WebSocket delivery.

The same test SQL is in `supabase/tests/parent_child_messages.test.sql` for a complete local Supabase stack. It rolls back its fixture data. The hosted migration must be applied through an authenticated Supabase management connection, after checking migration history and table/bucket name conflicts. This commit does not wire the app's Send button or child robot to the database.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
