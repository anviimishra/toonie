begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(6);
insert into auth.users(id, raw_user_meta_data) values
 ('90000000-0000-4000-8000-000000000001', '{"display_name":"Test parent"}'),
 ('90000000-0000-4000-8000-000000000002', '{}');
select is((select display_name from public.profiles where id = '90000000-0000-4000-8000-000000000001'), 'Test parent', 'Signup copies the display name');
select ok(exists(select 1 from public.profiles where id = '90000000-0000-4000-8000-000000000002' and display_name is null), 'Anonymous signup works without a name');
set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.profiles), 1, 'A user sees only their own profile');
select throws_ok($$insert into public.profiles(id) values ('90000000-0000-4000-8000-000000000003')$$, '42501', null, 'Clients cannot provision profiles');
reset role;
set local role anon;
select throws_ok('select * from public.profiles', '42501', null, 'Unauthenticated users cannot read profiles');
reset role;
delete from auth.users where id = '90000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.profiles where id = '90000000-0000-4000-8000-000000000001'), 0, 'Deleting a user removes their profile');
select * from finish();
rollback;
