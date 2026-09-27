-- Restore the table expected by the existing hosted Auth signup trigger.
-- display_name is nullable because anonymous child accounts have no metadata.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy profiles_read_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

-- Capture the previously dashboard-only trigger in migration history too.
-- This internal trigger needs owner privileges to write while Auth creates a user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, display_name)
select id, raw_user_meta_data ->> 'display_name' from auth.users
on conflict (id) do nothing;
commit;
