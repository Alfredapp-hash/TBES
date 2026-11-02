-- TBES website data. Default deny: the public (anon) role gets no table access and no policies.
-- Netlify Functions write with the service role, which only exists on the server.
-- Staff read through RLS after signing in; staff membership is granted by hand, never by sign-up.

create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()));
$$;

revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  netlify_submission_id text not null unique check (char_length(netlify_submission_id) between 1 and 100),
  form_name text not null check (form_name in ('contact', 'partner', 'portal')),
  name text not null check (char_length(name) between 1 and 200),
  company text check (char_length(company) <= 200),
  email text not null check (char_length(email) between 3 and 320),
  phone text check (char_length(phone) <= 50),
  interest text check (char_length(interest) <= 200),
  message text not null check (char_length(message) between 1 and 10000),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed', 'spam')),
  created_at timestamptz not null default now()
);

create index inquiries_created_at_idx on public.inquiries (created_at desc);

-- No cookies, IP addresses, or visitor identifiers: only which page was viewed and from which site.
create table public.page_views (
  id bigint generated always as identity primary key,
  path text not null check (char_length(path) between 1 and 300),
  referrer_host text check (char_length(referrer_host) <= 255),
  viewed_at timestamptz not null default now()
);

create index page_views_viewed_at_idx on public.page_views (viewed_at desc);

alter table public.staff enable row level security;
alter table public.inquiries enable row level security;
alter table public.page_views enable row level security;

revoke all on public.staff, public.inquiries, public.page_views from public, anon, authenticated;

grant select on public.staff to authenticated;
grant select on public.inquiries, public.page_views to authenticated;
grant update (status) on public.inquiries to authenticated;

create policy "staff see their own membership" on public.staff
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "staff read inquiries" on public.inquiries
  for select to authenticated
  using ((select public.is_staff()));

create policy "staff update inquiry status" on public.inquiries
  for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "staff read page views" on public.page_views
  for select to authenticated
  using ((select public.is_staff()));
