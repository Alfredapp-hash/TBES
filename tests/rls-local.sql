-- Runs the real migration on a throwaway local Postgres with stand-ins for Supabase's roles and auth,
-- then tries what an attacker would. Any failure stops the script (ON_ERROR_STOP).
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
-- Supabase gives these roles broad table grants by default; the migration has to undo them.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

\i /migration.sql

grant all on public.inquiries, public.page_views, public.staff to service_role;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.staff (user_id) values ('00000000-0000-0000-0000-00000000000a');
insert into public.inquiries (netlify_submission_id, form_name, name, email, message)
  values ('s1', 'contact', 'Pat', 'pat@example.com', 'Private message');
insert into public.page_views (path) values ('/');

create function expect_denied(role_name text, uid text, statement text) returns void language plpgsql as $$
begin
  perform set_config('request.uid', uid, true);
  execute format('set local role %I', role_name);
  execute statement;
  reset role;
  raise exception 'NOT DENIED: % as %', statement, role_name using errcode = 'P0001';
exception
  when insufficient_privilege then reset role; raise notice 'denied as expected: % %', role_name, statement;
end $$;

create function expect_rows(role_name text, uid text, statement text, wanted int) returns void language plpgsql as $$
declare found int;
begin
  perform set_config('request.uid', uid, true);
  execute format('set local role %I', role_name);
  execute format('select count(*) from (%s) q', statement) into found;
  reset role;
  if found <> wanted then raise exception 'WRONG ROWS: % as % saw %, wanted %', statement, role_name, found, wanted; end if;
  raise notice 'ok: % saw % row(s): %', role_name, found, statement;
end $$;

begin;
-- The public can't read, write, change, or delete anything.
select expect_denied('anon', '', 'select * from public.inquiries');
select expect_denied('anon', '', 'select * from public.page_views');
select expect_denied('anon', '', 'select * from public.staff');
select expect_denied('anon', '', $q$insert into public.inquiries (netlify_submission_id, form_name, name, email, message) values ('x','contact','a','a@b.c','m')$q$);
select expect_denied('anon', '', $q$insert into public.page_views (path) values ('/x')$q$);
select expect_denied('anon', '', 'delete from public.inquiries');
select expect_denied('anon', '', 'select public.is_staff()');

-- A signed-in person who isn't staff sees nothing and can't make themselves staff.
select expect_rows('authenticated', '00000000-0000-0000-0000-00000000000b', 'select * from public.inquiries', 0);
select expect_rows('authenticated', '00000000-0000-0000-0000-00000000000b', 'select * from public.page_views', 0);
select expect_rows('authenticated', '00000000-0000-0000-0000-00000000000b', 'select * from public.staff', 0);
select expect_denied('authenticated', '00000000-0000-0000-0000-00000000000b', $q$insert into public.staff (user_id) values ('00000000-0000-0000-0000-00000000000b')$q$);

-- Staff can read, and can change status only.
select expect_rows('authenticated', '00000000-0000-0000-0000-00000000000a', 'select * from public.inquiries', 1);
select expect_rows('authenticated', '00000000-0000-0000-0000-00000000000a', 'select * from public.page_views', 1);
select expect_denied('authenticated', '00000000-0000-0000-0000-00000000000a', $q$update public.inquiries set message = 'edited'$q$);
select expect_denied('authenticated', '00000000-0000-0000-0000-00000000000a', 'delete from public.inquiries');
select expect_denied('authenticated', '00000000-0000-0000-0000-00000000000a', $q$insert into public.staff (user_id) values ('00000000-0000-0000-0000-00000000000b')$q$);

-- A non-staff update touches no rows, so it can't change anything.
select set_config('request.uid', '00000000-0000-0000-0000-00000000000b', true);
set local role authenticated;
update public.inquiries set status = 'spam';
reset role;
select expect_rows('service_role', '', $q$select * from public.inquiries where status = 'new'$q$, 1);

select set_config('request.uid', '00000000-0000-0000-0000-00000000000a', true);
set local role authenticated;
update public.inquiries set status = 'contacted';
reset role;
select expect_rows('service_role', '', $q$select * from public.inquiries where status = 'contacted'$q$, 1);
rollback;

\echo RLS CHECKS PASSED
