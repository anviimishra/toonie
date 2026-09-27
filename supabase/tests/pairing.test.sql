begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id) values
('40000000-0000-4000-8000-000000000001'),
('40000000-0000-4000-8000-000000000002'),
('40000000-0000-4000-8000-000000000003');
insert into public.pairing_codes(code_hash,parent_id,child_name,child_avatar_reference,expires_at) values
('valid','40000000-0000-4000-8000-000000000001','Test child','data:image/png;base64,YQ==',now()+interval '10 minutes'),
('expired','40000000-0000-4000-8000-000000000001','Test child','data:image/png;base64,YQ==',now()-interval '1 minute');
set local role authenticated;
select throws_ok($$select * from public.pairing_codes$$,'42501',null,'clients cannot enumerate codes');
select throws_ok($$select public.claim_child_code('valid','40000000-0000-4000-8000-000000000002')$$,'42501',null,'clients cannot bypass pairing API');
select throws_ok($$select public.consume_request_limit('bypass',5)$$,'42501',null,'clients cannot reset rate limits');
select ok(not has_table_privilege('authenticated','public.comic_messages','INSERT'),'messages require server finalization');
set local role service_role;
select throws_ok($$select public.claim_child_code('expired','40000000-0000-4000-8000-000000000002')$$,'P0001',null,'expired codes rejected');
select throws_ok($$select public.claim_child_code('valid','40000000-0000-4000-8000-000000000001')$$,'P0001',null,'cannot pair to yourself');
select throws_ok($$select public.claim_child_code('missing','40000000-0000-4000-8000-000000000002')$$,'P0001',null,'unknown codes rejected');
select lives_ok($$select public.claim_child_code('valid','40000000-0000-4000-8000-000000000002')$$,'child pairs with a valid code');
select lives_ok($$select public.claim_child_code('valid','40000000-0000-4000-8000-000000000002')$$,'lost response can retry claim on same device');
select is((select count(*)::int from public.parent_child_pairs where child_id='40000000-0000-4000-8000-000000000002'),1,'claim retry does not duplicate pairing');
select throws_ok($$select public.claim_child_code('valid','40000000-0000-4000-8000-000000000003')$$,'P0001',null,'another child cannot reuse consumed code');
select is((select child_name from public.parent_child_pairs where child_id='40000000-0000-4000-8000-000000000002'),'Test child','child name carried to pairing');
select ok(public.consume_request_limit('test-limit',2),'first attempt allowed');
select ok(public.consume_request_limit('test-limit',2),'second attempt allowed');
select ok(not public.consume_request_limit('test-limit',2),'excess attempt denied');
update public.request_limits set started_at=now()-interval '11 minutes' where key='test-limit';
select ok(public.consume_request_limit('test-limit',2),'attempts reset after window');
reset role;
select * from finish();
rollback;
