-- Toonie initial schema: capsules, members, devices, stories, deliveries.
--
-- Shape follows docs/plan.md. Two rules drive the design:
--   1. The server (secret key) does all reads and writes that touch content.
--      It bypasses RLS, so app code is not limited by the policies below.
--   2. A robot subscribes to `deliveries` over Realtime using the *publishable*
--      key, so that one table needs an anon-readable policy. It holds only
--      opaque ids and a status -- never a transcript or an image URL -- so a
--      leaked publishable key reveals nothing about a family's stories.

-- ---------------------------------------------------------------- enums

create type story_source as enum ('app', 'robot');

create type story_status as enum (
  'transcribing',
  'scripting',
  'drawing',
  'ready',
  'failed'
);

create type delivery_status as enum ('queued', 'printed');

-- --------------------------------------------------------------- tables

-- A capsule is one shared space (a family, a classroom). `pair_code` is what
-- someone types to join, and what a robot posts to register itself.
create table capsules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pair_code text not null unique,
  auto_send boolean not null default true,
  created_at timestamptz not null default now()
);

-- `character_preset` is the key of one of the 6-8 cute presets, used as the
-- reference image so a member looks the same in every panel.
create table members (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references capsules (id) on delete cascade,
  name text not null,
  role text,
  character_preset text,
  created_at timestamptz not null default now()
);

-- One row per Raspberry Pi. `device_token` is the bearer token the Pi sends on
-- every /api/device/* call, so it is unique and never exposed to the browser.
create table devices (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references capsules (id) on delete cascade,
  device_token text not null unique,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table stories (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references capsules (id) on delete cascade,
  -- Keep the story if the member is removed; authorship is a nicety.
  author_member_id uuid references members (id) on delete set null,
  source story_source not null default 'app',
  -- The UI offers 1-6 panels; the DB refuses anything else.
  panel_count integer not null check (panel_count between 1 and 6),
  audio_url text,
  transcript text,
  script_json jsonb,
  status story_status not null default 'transcribing',
  comic_url text,
  print_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per (story, robot). The unique constraint is what makes delivery
-- idempotent: a retried queue attempt cannot create a second row, so a
-- duplicate Realtime event can never cause a second print.
create table deliveries (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories (id) on delete cascade,
  device_id uuid not null references devices (id) on delete cascade,
  status delivery_status not null default 'queued',
  printed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint deliveries_story_device_key unique (story_id, device_id)
);

-- -------------------------------------------------------------- indexes

-- GET /api/device/inbox: "queued deliveries for this robot".
create index deliveries_device_queued_idx
  on deliveries (device_id, status);

-- The capsule timeline, newest story first.
create index stories_capsule_created_idx
  on stories (capsule_id, created_at desc);

create index members_capsule_idx on members (capsule_id);
create index devices_capsule_idx on devices (capsule_id);
create index deliveries_story_idx on deliveries (story_id);

-- ------------------------------------------------------- updated_at

-- `stories.status` moves through the pipeline, so keep updated_at honest.
create function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger stories_set_updated_at
  before update on stories
  for each row
  execute function set_updated_at();

-- ------------------------------------------------------------------ RLS

-- Every table is RLS-enabled. With no policy attached, a table is readable
-- only by the server's secret key, which bypasses RLS entirely. That is the
-- default we want for anything holding a child's voice, words, or pictures.
alter table capsules enable row level security;
alter table members enable row level security;
alter table devices enable row level security;
alter table stories enable row level security;
alter table deliveries enable row level security;

-- The one exception, for the Realtime path described at the top of this file.
-- HARDENING: scope this to a single device by minting a per-device JWT at
-- /api/device/register and comparing device_id to a claim on that token.
-- Left open here because a hackathon robot authenticates with the shared
-- publishable key, and the row itself carries no story content.
create policy deliveries_anon_read on deliveries
  for select
  to anon
  using (true);

-- Realtime only publishes tables added to this publication.
alter publication supabase_realtime add table deliveries;

-- -------------------------------------------------------------- storage

-- `audio` stays private: raw recordings are fetched server-side with the
-- secret key. `comics` is public so a robot can GET a print PNG directly and
-- a browser can render it without a signed URL round-trip.
insert into storage.buckets (id, name, public)
values
  ('audio', 'audio', false),
  ('comics', 'comics', true)
on conflict (id) do nothing;
