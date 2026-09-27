-- Server-only pairing codes and durable attempt limits. Existing messages stay intact.
alter table public.parent_child_pairs
  add column child_name text not null default 'Child' check (char_length(child_name) between 1 and 60),
  add column child_avatar_reference text;
alter table public.comic_messages add column content_hash text;
-- Ready messages must go through server upload verification.
revoke insert on public.comic_messages from authenticated;

create table public.pairing_codes (
  code_hash text primary key,
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_name text not null,
  child_avatar_reference text not null,
  expires_at timestamptz not null default now() + interval '10 minutes',
  claimed_child_id uuid references auth.users(id) on delete cascade,
  pair_id uuid references public.parent_child_pairs(id) on delete cascade
);
create index pairing_codes_parent_idx on public.pairing_codes(parent_id);
create index pairing_codes_expiry_idx on public.pairing_codes(expires_at);
create index pairing_codes_child_idx on public.pairing_codes(claimed_child_id);
create index pairing_codes_pair_idx on public.pairing_codes(pair_id);

create table public.request_limits (
  key text primary key,
  started_at timestamptz not null default now(),
  attempts integer not null default 1
);
alter table public.pairing_codes enable row level security;
alter table public.request_limits enable row level security;
create index request_limits_started_idx on public.request_limits(started_at);
revoke all on public.pairing_codes, public.request_limits from public, anon, authenticated;
grant all on public.pairing_codes, public.request_limits to service_role;

create function public.consume_request_limit(p_key text, p_max integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  delete from public.request_limits where started_at < now() - interval '1 day';
  insert into public.request_limits(key) values (p_key)
  on conflict (key) do update set
    attempts = case when request_limits.started_at < now() - interval '10 minutes' then 1 else request_limits.attempts + 1 end,
    started_at = case when request_limits.started_at < now() - interval '10 minutes' then now() else request_limits.started_at end
  returning attempts into n;
  return n <= p_max;
end;
$$;

create function public.claim_child_code(p_hash text, p_child uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare code public.pairing_codes; paired uuid;
begin
  -- Serialize claims from one device as well as concurrent claims of one code.
  perform pg_advisory_xact_lock(hashtextextended(p_child::text, 0));
  select * into code from public.pairing_codes where code_hash = p_hash for update;
  if not found or code.expires_at <= now() or code.parent_id = p_child then
    raise exception 'Code is invalid or expired';
  end if;
  if code.claimed_child_id = p_child then return code.pair_id; end if;
  if code.claimed_child_id is not null or exists(select 1 from public.parent_child_pairs where child_id = p_child) then
    raise exception 'Code already used or device already paired';
  end if;
  insert into public.parent_child_pairs(parent_id, child_id, child_name, child_avatar_reference)
  values (code.parent_id, p_child, code.child_name, code.child_avatar_reference)
  returning id into paired;
  update public.pairing_codes set claimed_child_id = p_child, pair_id = paired where code_hash = p_hash;
  return paired;
end;
$$;
revoke all on function public.consume_request_limit(text, integer), public.claim_child_code(text, uuid) from public, anon, authenticated;
grant execute on function public.consume_request_limit(text, integer), public.claim_child_code(text, uuid) to service_role;
