begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users (id) values
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000004');
insert into public.parent_child_pairs (id, parent_id, child_id) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004');

create function pg_temp.send_message(msg uuid, pair uuid, sender text, voice boolean default false)
returns void language sql security invoker set search_path = '' as $$
  insert into public.comic_messages
    (id, pair_id, sender_role, title, transcript, panel_count, comic_path, print_path,
      audio_path, audio_mime_type, audio_duration_ms, original_transcript)
  values (msg, pair, sender, 'Rock Friend', 'I found a rock named Kevin.', 3,
    pair::text || '/' || msg::text || '/comic.png',
    pair::text || '/' || msg::text || '/print.png',
    case when voice then pair::text || '/' || msg::text || '/voice' end,
    case when voice then 'audio/webm;codecs=opus' end,
    case when voice then 3000 end,
    case when voice then 'I found a rock named keven.' end);
$$;

select ok((select not public from storage.buckets where id = 'message-media'), 'media bucket is private');
select ok(exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='comic_messages'), 'messages published for Realtime');
select ok((select relrowsecurity from pg_class where oid='public.parent_child_pairs'::regclass), 'pair RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.comic_messages'::regclass), 'message RLS enabled');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.parent_child_pairs), 1, 'parent sees only own pair');
select lives_ok($$select pg_temp.send_message('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','parent')$$, 'parent sends typed comic');
select lives_ok($$select pg_temp.send_message('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','parent',true)$$, 'parent sends voice, raw transcript and comic');
select throws_ok($$select pg_temp.send_message('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','child')$$, '42501', null, 'parent cannot impersonate child');
select throws_ok($$select pg_temp.send_message('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','parent')$$, '42501', null, 'parent cannot send to unrelated pair');
select throws_ok($$select pg_temp.send_message('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','parent')$$, '23505', null, 'retry ID cannot duplicate a message');
select throws_ok($$insert into public.parent_child_pairs(parent_id,child_id) values ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004')$$, '42501', null, 'clients cannot claim another child');
select throws_ok($$update public.comic_messages set title='Changed'$$, '42501', null, 'sent content immutable to clients');
select throws_ok($$delete from public.comic_messages$$, '42501', null, 'clients cannot delete messages');
update public.comic_messages set read_at=now();
select is((select count(*)::int from public.comic_messages where read_at is not null), 0, 'sender cannot acknowledge own message');

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.comic_messages), 2, 'child receives parent messages');
select lives_ok($$select pg_temp.send_message('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','child',true)$$, 'child sends voice transcript and comic back');
select throws_ok($$select pg_temp.send_message('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001','parent')$$, '42501', null, 'child cannot impersonate parent');
update public.comic_messages set read_at=now() where sender_role='parent';
select is((select count(*)::int from public.comic_messages where read_at is not null), 2, 'child acknowledges incoming messages');

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
update public.comic_messages set read_at=now() where sender_role='child';
select is((select count(*)::int from public.comic_messages where read_at is not null), 3, 'parent acknowledges child reply');

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.comic_messages), 0, 'unrelated family sees no messages');
update public.comic_messages set read_at=now();
select lives_ok($$select pg_temp.send_message('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002','parent')$$, 'other family can send within own pair');

reset role;
-- Constraint checks apply to backend/service writes too.
select throws_ok($$update public.comic_messages set transcript=null$$, '23502', null, 'text always required');
select throws_ok($$update public.comic_messages set transcript='  '$$, '23514', null, 'empty text rejected');
select throws_ok($$update public.comic_messages set title=''$$, '23514', null, 'title required');
select throws_ok($$update public.comic_messages set comic_path=null$$, '23502', null, 'comic image required');
select throws_ok($$update public.comic_messages set comic_path='other-family/comic.png'$$, '23514', null, 'cannot reference other media paths');
select throws_ok($$update public.comic_messages set panel_count=5$$, '23514', null, 'sticker panel limit enforced');
select throws_ok($$update public.comic_messages set audio_mime_type=null where audio_path is not null$$, '23514', null, 'voice media needs MIME metadata');
select throws_ok($$update public.comic_messages set audio_path=null where audio_path is not null$$, '23514', null, 'voice metadata cannot survive without voice file');
select throws_ok($$insert into public.parent_child_pairs(parent_id,child_id) values ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001')$$, '23514', null, 'pair endpoints distinct');

insert into storage.objects (bucket_id, name) select 'message-media', comic_path from public.comic_messages;
insert into storage.objects (bucket_id, name) values
 ('message-media', '20000000-0000-4000-8000-000000000001/unpublished/comic.png');
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select is((select count(*)::int from storage.objects where bucket_id='message-media'), 3, 'parent sees only own published media');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('message-media','fake')$$, '42501', null, 'client media upload requires server validation');
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000004';
select is((select count(*)::int from storage.objects where bucket_id='message-media'), 1, 'other child sees only its own media');

set local role anon;
select throws_ok($$select * from public.parent_child_pairs$$, '42501', null, 'signed-out visitors cannot read pairs');
select throws_ok($$select * from public.comic_messages$$, '42501', null, 'signed-out visitors cannot read messages');
select throws_ok($$select pg_temp.send_message('30000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000001','parent')$$, '42501', null, 'signed-out visitors cannot send');
select is((select count(*)::int from storage.objects where bucket_id='message-media'), 0, 'signed-out visitors cannot read media');
reset role;

select * from finish();
rollback;
