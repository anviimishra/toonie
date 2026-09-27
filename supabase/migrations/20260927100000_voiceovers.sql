-- Stories read aloud to the child, in the child's language, in the parent's
-- own (cloned) voice.
--
-- Consent first: a parent's voice is only cloned after they turn it on in
-- Settings (voice_consent_at). Turning it off clears voice_id; the server also
-- deletes the voice at the provider and the saved read-alouds. Children's
-- voices are never cloned.

alter table public.family_members
  add column voice_consent_at timestamptz,
  -- The provider's id for the cloned voice. Server-managed.
  add column voice_id text,
  add constraint family_members_voice_parent_only check (
    role = 'parent' or (voice_consent_at is null and voice_id is null)
  ),
  add constraint family_members_voice_needs_consent check (
    voice_id is null or voice_consent_at is not null
  );

-- One saved read-aloud per story per language: the translated text and the
-- spoken audio, so each is only generated (and paid for) once.
create table public.message_voiceovers (
  message_id uuid not null references public.comic_messages (id) on delete cascade,
  language text not null check (
    language in ('en', 'es', 'fr', 'de', 'it', 'pt', 'hi', 'zh', 'ja', 'ko', 'ar', 'ru', 'tl', 'vi')
  ),
  text text not null check (char_length(btrim(text)) between 1 and 8000),
  -- In the private message-media bucket; served to the app as a signed URL.
  audio_path text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, language)
);

alter table public.message_voiceovers enable row level security;

revoke all on public.message_voiceovers from public, anon, authenticated;
grant select on public.message_voiceovers to authenticated;
grant all on public.message_voiceovers to service_role;

-- Both people in the pair can see a story's read-alouds.
create policy message_voiceovers_participants_read on public.message_voiceovers
  for select to authenticated
  using (exists (
    select 1
    from public.comic_messages m
    join public.parent_child_pairs p on p.id = m.pair_id
    where m.id = message_id
      and (p.parent_id = (select auth.uid()) or p.child_id = (select auth.uid()))
  ));

comment on table public.message_voiceovers is
  'Translated, spoken versions of stories. Server-only writes; generated once per language.';
