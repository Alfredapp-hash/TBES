-- Staff data now requires a session verified with an authenticator code, not just a password.
-- All staff policies go through is_staff(), so this one change covers them all.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and exists (select 1 from public.staff where user_id = (select auth.uid()));
$$;

-- Runs as the caller, so the page_views policy decides what comes back.
create function public.traffic_summary(days integer)
returns table (day date, path text, referrer_host text, views bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select (viewed_at at time zone 'utc')::date, path, referrer_host, count(*)
  from public.page_views
  where viewed_at >= now() - make_interval(days => least(greatest(days, 1), 366))
  group by 1, 2, 3
  order by 1;
$$;

revoke all on function public.traffic_summary(integer) from public, anon;
grant execute on function public.traffic_summary(integer) to authenticated;
