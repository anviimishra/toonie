begin;
alter table public.comic_messages add column thumbnail_path text
  check (thumbnail_path is null or thumbnail_path = pair_id::text || '/' || id::text || '/thumbnail.png');
drop policy message_participants_read_media on storage.objects;
create policy message_participants_read_media on storage.objects for select to authenticated
  using (bucket_id = 'message-media' and exists (
    select 1 from public.comic_messages m where name in (m.comic_path, m.print_path, m.audio_path, m.thumbnail_path)
  ));
create table public.comic_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('working', 'ready', 'failed')),
  stage text not null,
  drawn integer not null default 0,
  panel_count integer not null check (panel_count between 1 and 4),
  result jsonb,
  audio_path text,
  audio_type text,
  audio_duration_ms integer,
  original_transcript text,
  error text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index comic_jobs_user_idx on public.comic_jobs(user_id, created_at desc);
create unique index comic_jobs_one_pending on public.comic_jobs(user_id) where not archived;
alter table public.comic_jobs enable row level security;
revoke all on public.comic_jobs from public, anon, authenticated;
grant all on public.comic_jobs to service_role;
-- Only owner-checked server routes can access unfinished stories or issue signed URLs.
insert into storage.buckets(id,name,public) values ('comic-drafts','comic-drafts',false);
commit;
