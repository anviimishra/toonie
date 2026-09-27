-- Minimal two-way messaging, independent of the older capsule/robot prototype.
-- Pair creation is server-only after a verified pairing flow. Both endpoints
-- must have a Supabase Auth identity (a child device may use anonymous Auth).
create table public.parent_child_pairs (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint parent_child_pairs_distinct check (parent_id <> child_id),
  constraint parent_child_pairs_unique unique (parent_id, child_id)
);

create index parent_child_pairs_child_idx on public.parent_child_pairs (child_id);

-- A row represents a finished, sent comic. Generation drafts stay local.
-- The opposite endpoint in the pair is always the recipient.
create table public.comic_messages (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.parent_child_pairs (id) on delete cascade,
  sender_role text not null check (sender_role in ('parent', 'child')),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  transcript text not null check (char_length(btrim(transcript)) between 1 and 4000),
  original_transcript text,
  comic_path text not null,
  print_path text,
  audio_path text,
  audio_mime_type text,
  audio_duration_ms integer check (audio_duration_ms >= 0),
  panel_count smallint not null check (panel_count between 1 and 4),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  -- Paths refer to the private message-media bucket, never expiring URLs.
  -- Constrain them to this message so a sender cannot reference another
  -- family's objects and thereby expose them through the read policy.
  constraint comic_messages_comic_path check (
    comic_path = pair_id::text || '/' || id::text || '/comic.png'
  ),
  constraint comic_messages_print_path check (
    print_path is null or print_path = pair_id::text || '/' || id::text || '/print.png'
  ),
  constraint comic_messages_audio_path check (
    audio_path is null or audio_path = pair_id::text || '/' || id::text || '/voice'
  ),
  constraint comic_messages_audio_metadata check (
    (audio_path is null and audio_mime_type is null and audio_duration_ms is null
      and original_transcript is null)
    or (audio_path is not null and audio_mime_type is not null
      and audio_mime_type like 'audio/%')
  )
);

create index comic_messages_pair_created_idx
  on public.comic_messages (pair_id, created_at desc, id);
create index comic_messages_unread_idx
  on public.comic_messages (pair_id, sender_role, created_at)
  where read_at is null;

alter table public.parent_child_pairs enable row level security;
alter table public.comic_messages enable row level security;

-- Explicit grants work both with old and new Supabase Data API defaults.
revoke all on public.parent_child_pairs, public.comic_messages from public, anon, authenticated;
grant select on public.parent_child_pairs to authenticated;
grant select, insert on public.comic_messages to authenticated;
grant update (read_at) on public.comic_messages to authenticated;
grant all on public.parent_child_pairs, public.comic_messages to service_role;

create policy pair_participants_read on public.parent_child_pairs
  for select to authenticated
  using (parent_id = (select auth.uid()) or child_id = (select auth.uid()));

create policy message_participants_read on public.comic_messages
  for select to authenticated
  using (exists (
    select 1 from public.parent_child_pairs p where p.id = pair_id
      and (p.parent_id = (select auth.uid()) or p.child_id = (select auth.uid()))
  ));

create policy message_sender_insert on public.comic_messages
  for insert to authenticated
  with check (read_at is null and exists (
    select 1 from public.parent_child_pairs p where p.id = pair_id and (
      (sender_role = 'parent' and p.parent_id = (select auth.uid())) or
      (sender_role = 'child' and p.child_id = (select auth.uid()))
    )
  ));

-- Only the recipient can acknowledge. Column grants prevent editing content,
-- changing the pair, or impersonating the other endpoint after insertion.
create policy message_recipient_acknowledge on public.comic_messages
  for update to authenticated
  using (exists (
    select 1 from public.parent_child_pairs p where p.id = pair_id and (
      (sender_role = 'parent' and p.child_id = (select auth.uid())) or
      (sender_role = 'child' and p.parent_id = (select auth.uid()))
    )
  ))
  with check (exists (
    select 1 from public.parent_child_pairs p where p.id = pair_id and (
      (sender_role = 'parent' and p.child_id = (select auth.uid())) or
      (sender_role = 'child' and p.parent_id = (select auth.uid()))
    )
  ));

-- Upload using the server key after verifying the authenticated sender and
-- pair. Do not replace existing objects on retries. Publish the message only
-- after every required upload succeeds. Clients can read only published files.
insert into storage.buckets (id, name, public)
values ('message-media', 'message-media', false);

create policy message_participants_read_media on storage.objects
  for select to authenticated
  using (bucket_id = 'message-media' and exists (
    select 1 from public.comic_messages m
    where name in (m.comic_path, m.print_path, m.audio_path)
  ));

-- RLS also scopes Realtime events to the authenticated participants.
alter publication supabase_realtime add table public.comic_messages;

comment on table public.parent_child_pairs is
  'Verified parent/child Auth identities. Pair creation and changes are server-only.';
comment on table public.comic_messages is
  'Finished comics in either direction. The opposite endpoint in pair_id is the recipient.';
