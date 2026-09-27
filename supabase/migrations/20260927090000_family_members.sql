-- Per-person settings for each parent/child pair: the language they use and
-- the avatar that stars in their comics.
--
-- The parent and the child are on different tablets, and the child's tablet
-- has no settings screen. So these live here, not in each browser: the parent
-- edits both rows from Settings, and either tablet reads them.
--
-- One row per (pair, role). Writes are server-only (after /api/family checks
-- the caller is the pair's parent), like every other change to a pair.

create table public.family_members (
  pair_id uuid not null references public.parent_child_pairs (id) on delete cascade,
  role text not null check (role in ('parent', 'child')),
  -- ISO 639-1; keep in step with LANGUAGES in src/features/settings/languages.ts.
  language text not null default 'en' check (
    language in ('en', 'es', 'fr', 'de', 'it', 'pt', 'hi', 'zh', 'ja', 'ko', 'ar', 'ru', 'tl', 'vi')
  ),
  -- The image sent to the image model as the character reference. Inline
  -- raster only, the same rule the API enforces (src/lib/ai/reference.ts).
  avatar_reference text check (
    avatar_reference is null
    or (
      char_length(avatar_reference) <= 8000000
      and avatar_reference ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$'
    )
  ),
  -- The builder recipe (skin, hair, ...), so the avatar can be re-edited on
  -- another device. Null for photo avatars.
  avatar_config jsonb check (avatar_config is null or jsonb_typeof(avatar_config) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (pair_id, role)
);

create function public.family_members_touch() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger family_members_set_updated_at
  before update on public.family_members
  for each row execute function public.family_members_touch();

-- Every pair gets both rows as soon as it exists, carrying over the child
-- avatar that came in with the pairing code.
create function public.family_members_for_new_pair() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.family_members (pair_id, role, avatar_reference)
  values (new.id, 'parent', null), (new.id, 'child', new.child_avatar_reference)
  on conflict (pair_id, role) do nothing;
  return new;
end;
$$;

create trigger parent_child_pairs_family_members
  after insert on public.parent_child_pairs
  for each row execute function public.family_members_for_new_pair();

-- Pairs made before this migration.
insert into public.family_members (pair_id, role, avatar_reference)
select id, 'parent', null from public.parent_child_pairs
union all
select id, 'child', child_avatar_reference from public.parent_child_pairs
on conflict (pair_id, role) do nothing;

alter table public.family_members enable row level security;

revoke all on public.family_members from public, anon, authenticated;
grant select on public.family_members to authenticated;
grant all on public.family_members to service_role;
revoke all on function public.family_members_touch(), public.family_members_for_new_pair()
  from public, anon, authenticated;

-- Both tablets in a pair can read both people's settings.
create policy family_members_participants_read on public.family_members
  for select to authenticated
  using (exists (
    select 1 from public.parent_child_pairs p where p.id = pair_id
      and (p.parent_id = (select auth.uid()) or p.child_id = (select auth.uid()))
  ));

-- So the child's tablet picks up a new avatar or language without a reload.
alter publication supabase_realtime add table public.family_members;

comment on table public.family_members is
  'Language and avatar for the parent and the child of each pair. Server-only writes.';
