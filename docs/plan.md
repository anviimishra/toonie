# Toonie: Story → Comic → Auto-Print (Hackathon Plan)

## Pivot, 26 Sep 2026

Two things changed after the original plan, and this document has been updated
to match. The history is kept here so nobody re-litigates a settled decision.

- **No Raspberry Pi.** We have no ribbon cable for it. The demo is now **two
  screens in the same app** standing in for the two ends: a phone that sends,
  and a receiving screen that wakes up when a comic arrives. The thermal
  printer survives — it is **Bluetooth**, so whatever hosts the receiving
  screen can drive it. The print step is deliberately kept behind one seam so
  it can be a real print or an animation without the rest of the app caring.
- **xAI / Grok instead of OpenAI**, for the sponsor track credits. This costs
  us nothing: Grok covers transcription, text, and images.

The avatar is now a real feature rather than a supporting detail, because
`grok-imagine-image-2.0` takes reference images and makes it cheap.

## Context

A 36–48h hackathon. **The core loop is what matters:** someone records a story,
AI turns it into a comic, and the comic lands on the other person's screen and
prints. It works in both directions. Use cases: military families, long-distance
grandparents, classroom weekly stories.

**Repo:** `anviimishra/toonie`.

## Model choice

All of it is xAI, so there is one key and one bill.

| Job                  | Model                       | Notes                                        |
| -------------------- | --------------------------- | -------------------------------------------- |
| Speech to text       | `grok-voice-transcribe-2.0` | $0.10/hr REST                                |
| Story → panel script | `grok-4.7`                  | Returns exactly N panels, kid-safe rewrite   |
| Panel images         | `grok-imagine-image-2.0`    | $0.04/image; **takes up to 5 source images** |

That last point is what makes both character consistency and the avatar
feature work: the avatar is passed as a reference image on every panel, so the
same character shows up across the strip.

Model IDs are env-overridable (`XAI_TEXT_MODEL` and friends) so pinning a
different version is a config change, not a code change.

## The two screens

**Sender (a phone).** Recording is the front page — it is the first thing you
see, not something behind a menu.

- **Record** (home): hold to record, or type. Pick a panel count (1–6).
- **Feed**: comics received from the other end.
- **Avatar**: upload a photo and have an avatar made from it, or build one from
  presets. Used as the reference image for every panel.

**Receiver (the second screen).** Idle, it is just a face — a neon cat, asleep.
It is meant to sit there looking alive.

- A comic arrives → the cat **wakes**, the servo lifts its arm, the printer
  starts printing.
- A small button in the corner lets that person **send a story back**, which
  becomes a comic and lands in the sender's feed.

## The core loop

```
Sender: record (or type) + panel count
  → POST /api/stories
  → 1. transcribe          grok-voice-transcribe-2.0
  → 2. script: N panels {scene, caption}, kid-safe   grok-4.7
  → 3. draw N panels, avatar passed as reference     grok-imagine-image-2.0
  → 4. compose: web layout + print strip (vertical, 384px, 1-bit dithered)
  → 5. queue a delivery for the receiving screen
Receiver: wakes → servo lifts → prints → acks
```

The print strip stays vertical so any panel count prints on 58mm paper. The
server does all the image work; the printer host only sends a ready PNG.

## Hardware, and the seam around it

All that is left is a **Bluetooth thermal printer** and a **servo** for the
arm. Neither is settled, so the app must not care which exists:

- The receiving screen calls one `print(delivery)` seam. Default behaviour is
  to animate. When a real printer host is attached, the same delivery is
  picked up over the device API and printed for real.
- `robot/client.py` still applies. Nothing in it was Pi-specific — it is plain
  Python over HTTP, so it runs on a laptop. For a Bluetooth printer, the
  printer appears as a serial port, so it is a `Serial` backend rather than
  `Usb`.
- The servo needs PWM, which a laptop has no pins for. That means a small
  microcontroller over USB serial, or we drop the arm and keep the wake-up
  animation.

**If the hardware does not come together, the demo still works.** That is the
point of the seam.

## Data model (Supabase)

Current migration, already written:

- `capsules`: id, name, pair_code, auto_send
- `members`: id, capsule_id, name, role, character_preset
- `devices`: id, capsule_id, device_token, last_seen_at
- `stories`: id, capsule_id, author_member_id, source, panel_count, audio_url,
  transcript, script_json, status, comic_url, print_url
- `deliveries`: id, story_id, device_id, status, printed_at
- Buckets: `audio`, `comics`

**Still to add for the pivot** (the migration has never been applied anywhere,
so it gets amended in place rather than patched):

- Real accounts, once we move off the stubbed auth.
- `avatars`: the uploaded photo and the generated avatar image per member.

## Device API

`docs/robot-api.md` holds the contract: `register`, `inbox`,
`deliveries/:id/printed`, `stories`, `state`. It is host-agnostic — "robot"
means whatever drives the printer. It stays valid after the pivot.

## Code structure

```
src/
  app/                    routes only: thin pages + API handlers
    (app)/record, feed, avatar, stories/[id]
    receiver/             the cat screen
    api/stories, api/device/*
  components/             UI pieces
  features/               domain logic, no UI
    auth/     (stubbed now, Supabase Auth later, behind one interface)
    stories/  (createStory, pipeline orchestrator, status)
    delivery/ (queue, ack, inbox)
  lib/
    ai/  transcribe.ts, script.ts, draw.ts   # xai behind an interface
    comic/ layout.ts, compose.ts, dither.ts  # pure, unit-tested
    supabase/ server.ts, client.ts
    env.ts
  types/                  shared DTOs = the contract
robot/client.py
```

Conventions: TypeScript strict, zod on every API input, thin route handlers
calling `features/*`, pure image functions with Vitest tests, ESLint and
Prettier.

**Auth is stubbed on purpose.** It lives behind one interface so Supabase Auth
drops in later without touching the screens that use it.

## PR breakdown

Done:

1. **Scaffold** — Next.js, TS, Tailwind, lint/format, Vitest, `env.ts`
2. **Database** — migration and typed clients
3. **Robot contract** — `docs/robot-api.md` and shared DTOs _(open)_
4. **Robot client** — `robot/client.py` and a mock server _(open)_
5. **Grok provider** — this one

Next:

6. **Sender app shell** — swappable auth, login/signup, and the record screen
7. **Feed and avatar** — received comics, photo upload, preset picker
8. **Comic pipeline** — transcribe → script → draw → compose + dither
9. **Receiver screen** — the sleeping cat, wake animation, print seam, send-back
10. **Device API** — register, inbox, ack, realtime
11. **Polish** — animations, demo seed data, backup comics

**Commit/PR rules:** no co-author or session trailers, and no "generated with"
footers. PR descriptions are short and plain: what changed, why, how to test.

## Verification

- Each PR: `npm run lint`, `typecheck`, `test`, `build` all pass
- The pipeline script writes `out/web.png` and `out/print.png` for 1, 3 and 6
  panels. The print image must be 384px wide and 1-bit.
- `robot/client.py --dry-run` against `robot/mock_server.py`: a comic arrives
  and is printed once, with no double print on a repeat pass
- Phone flow: sign in → record → pick 4 panels → comic appears → the receiving
  screen wakes and prints it
