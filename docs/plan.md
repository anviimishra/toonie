# Toonie: Story → Comic → Auto-Print (Hackathon Plan)

## Context

This is a 36–48h hackathon. **The core loop is what matters:** someone records a story in the app, AI turns it into a comic, and the comic is automatically sent to a Raspberry Pi robot that prints it on a thermal printer. It also works in reverse: a story recorded on the robot becomes a comic in the app. The avatar is a small supporting detail, not a feature. Use cases: military families, long-distance grandparents, classroom weekly stories.

**Repo:** the team repo is `anviimishra/toonie` (DJ is a collaborator), not `Capsulate`. I tried to attach it to this session with push access, but the permission check denied it. DJ needs to approve that before coding starts, and then all work happens there.

## Model choice (unbiased)

- **Images: OpenAI `gpt-image-1`**, using your free credits. It's the best at keeping the same character across panels, because it accepts a reference image. Claude can't make images, so the drawing step isn't me either way. Open-source FLUX via Hugging Face is free, but its character consistency is weak and the free tier gets rate-limited mid-demo. I'll keep it as a swappable fallback behind the same interface.
- **Speech-to-text:** OpenAI `gpt-4o-mini-transcribe`.
- **Story → panel script:** `gpt-4o-mini`. That's one key and one bill; Claude would work equally well here, and swapping is a one-file change.

## The core loop

```
App: record (or type) story + pick panel count (1–6)
  → POST /api/stories
  → 1. transcribe
  → 2. script: LLM returns exactly N panels {scene, caption} (kid-safe rewrite)
  → 3. draw N panels in parallel (gpt-image-1, simple character ref)
  → 4. compose: web layout (grid adapts to N) + print strip (vertical, 384px wide, 1-bit dithered)
  → 5. auto-send: story marked "queued" for the capsule's robot (a toggle, default ON)
Robot: sees queued story → downloads print PNG → prints → acks
```

- The **print strip is vertical**, so any panel count prints cleanly on 58mm thermal paper. The server does all the image work, and the Pi only sends a ready PNG to the printer.
- **Character:** a lightweight preset picker (6–8 cute presets plus a name, and optionally a hair or glasses color) lives in the join step, not on its own screen. It's used as the reference image for panels.

## Robot delivery: polling vs push (the optimization question)

Honest answer: **plain fixed polling works, but isn't the optimal choice.** At a 5s interval a robot makes about 17k requests a day, and most return nothing. That's harmless at hackathon scale, but wasteful.

**Plan:** push first, with a cheap poll as a safety net.

- **Primary: Supabase Realtime.** The Pi subscribes (Python `realtime` client) to inserts or updates on `deliveries` for its capsule, so a comic prints the instant it's ready with zero wasted requests.
- **Fallback: adaptive polling** of `GET /api/device/inbox`: every 60s when idle, and every 3s for a few minutes after a story is created. Flaky hackathon WiFi drops websockets, and this guarantees nothing is missed.
- Both paths call the same `inbox` → print → `ack` flow, so printing logic exists once. `ack` is idempotent, so a double notification never double-prints.

## Data model (Supabase, your key goes in `.env.local`, never committed)

- `capsules`: id, name, pair_code, auto_send (bool)
- `members`: id, capsule_id, name, role, character_preset
- `devices`: id, capsule_id, device_token, last_seen_at
- `stories`: id, capsule_id, author_member_id, source (`app`|`robot`), panel_count, audio_url, transcript, script_json, status (`transcribing|scripting|drawing|ready|failed`), comic_url, print_url
- `deliveries`: id, story_id, device_id, status (`queued|printed`), printed_at
- Buckets: `audio`, `comics`

For Supabase I need the **project URL, anon key, and service role key**. They go in env vars or the environment's secrets, never in chat or git.

## Robot API contract (`docs/robot-api.md`, handed to the Pi team first)

| Method | Path                                                   | Purpose                                                           |
| ------ | ------------------------------------------------------ | ----------------------------------------------------------------- |
| POST   | `/api/device/register` `{pair_code}`                   | → `{device_id, device_token, realtime: {url, anon_key, channel}}` |
| GET    | `/api/device/inbox`                                    | queued deliveries `[{delivery_id, title, print_url, width:384}]`  |
| POST   | `/api/device/deliveries/:id/printed`                   | ack (idempotent)                                                  |
| POST   | `/api/device/stories` (multipart audio, `panel_count`) | robot → app story                                                 |
| GET    | `/api/device/state`                                    | eye state: `idle\|listening\|thinking\|excited`                   |

It ships with `robot/client.py` (a realtime subscribe, a fallback poll, and print via `python-escpos`, plus `--dry-run` to save PNGs instead of printing) and a `/robot` simulator page so the demo works even without hardware. Note: there's no "Pi 7"; the contract works on a Pi 4 or 5.

## Code structure (modular, component-based)

```
src/
  app/                    # routes only: thin pages + API handlers
    (app)/record, stories/[id], capsule, join
    api/stories, api/device/*
  components/             # UI: RecordButton, PanelCountPicker, ComicViewer, StoryStatus, CharacterPicker, RobotEyes
  features/               # domain logic per feature, no UI
    stories/  (createStory, pipeline orchestrator, status)
    delivery/ (queue, ack, inbox)
    devices/  (register, auth middleware)
  lib/
    ai/  transcribe.ts, script.ts, draw/{index,openai,hf}.ts   # provider interfaces
    comic/ layout.ts, compose.ts, dither.ts                   # pure functions, unit-tested
    supabase/ server.ts, client.ts
    env.ts (zod-validated env)
  types/ (shared DTOs = the contract)
robot/client.py
docs/robot-api.md
```

Conventions: TypeScript strict, zod on every API input, thin route handlers that call `features/*`, pure image functions with Vitest tests, ESLint and Prettier.

## PR breakdown (small, reviewable, merged in order)

1. **Scaffold:** Next.js + TS + Tailwind + lint/format + Vitest + `env.ts` + `.env.example`
2. **Database:** Supabase migration + typed clients
3. **Robot contract:** `docs/robot-api.md` + shared types (unblocks the Pi team early)
4. **Comic pipeline:** transcribe → script (N panels) → draw → compose + print dither, with tests and `scripts/test-pipeline.ts`
5. **Record flow:** join/character picker, record + panel count, story page with live status and comic viewer
6. **Device API + auto-send:** register, inbox, ack, deliveries, realtime channel
7. **Robot client + simulator:** `robot/client.py`, `/robot` page with eyes
8. **Reverse direction:** robot audio → comic in app
9. **Polish:** animations, capsule timeline, demo seed data, backup comics

**Commit/PR rules:** no co-author or session trailers, and no "generated with" footers. PR descriptions are short and in plain language: what changed, why, and how to test (2–5 bullets).

## Verification

- Each PR: `npm run lint`, `typecheck`, `test`, `build` all pass
- The pipeline script writes `out/web.png` + `out/print.png` for panel counts 1, 3, and 6. Check that the print image is 384px wide and 1-bit.
- A curl walkthrough of `/api/device/*`; `robot/client.py --dry-run` receives a comic through realtime, and again with realtime disabled (poll fallback), with no double print
- Playwright phone flow: join → record/type → pick 4 panels → comic appears → simulator auto-prints it
