-- One child device per parent. A new code moves the parent's existing pair to
-- the device that claims it, so comics, family settings and voiceovers (all
-- keyed by pair_id) stay put and the old device loses access. Parents who
-- already have several pairs keep them; new codes reuse the newest one.
create or replace function public.claim_child_code(p_hash text, p_child uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare code public.pairing_codes; paired uuid; current_child uuid;
begin
  -- Serialize claims from one device as well as concurrent claims of one code.
  perform pg_advisory_xact_lock(hashtextextended(p_child::text, 0));
  select * into code from public.pairing_codes where code_hash = p_hash for update;
  if not found or code.expires_at <= now() or code.parent_id = p_child then
    raise exception 'Code is invalid or expired';
  end if;
  if code.claimed_child_id = p_child then return code.pair_id; end if;
  if code.claimed_child_id is not null then
    raise exception 'Code already used or device already paired';
  end if;
  select id, child_id into paired, current_child from public.parent_child_pairs
    where parent_id = code.parent_id order by created_at desc limit 1 for update;
  if exists(select 1 from public.parent_child_pairs
            where child_id = p_child and id is distinct from paired) then
    raise exception 'Code already used or device already paired';
  end if;
  if paired is null then
    insert into public.parent_child_pairs(parent_id, child_id, child_name, child_avatar_reference)
    values (code.parent_id, p_child, code.child_name, code.child_avatar_reference)
    returning id into paired;
  else
    update public.parent_child_pairs
      set child_id = p_child, child_name = code.child_name,
          child_avatar_reference = code.child_avatar_reference
      where id = paired;
  end if;
  update public.pairing_codes set claimed_child_id = p_child, pair_id = paired where code_hash = p_hash;
  return paired;
end;
$$;
revoke all on function public.claim_child_code(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_child_code(text, uuid) to service_role;
