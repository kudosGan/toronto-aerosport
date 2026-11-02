-- Toronto Aerosport: introductory flight enquiries from the website form
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run it after student-corner.sql (it uses the team list from that file). Nothing in it needs editing.
--
-- Anyone on the website can SEND an enquiry. Nobody except the team can read, change or delete them.

create table if not exists public.enquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null check (char_length(email) between 3 and 200),
  phone       text check (phone is null or char_length(phone) <= 40),
  heard_from  text check (heard_from is null or char_length(heard_from) <= 60),
  message     text check (message is null or char_length(message) <= 1000),
  source      text check (source is null or char_length(source) <= 60),
  status      text not null default 'new' check (status in ('new', 'contacted', 'booked', 'closed'))
);
create index if not exists enquiries_status_idx on public.enquiries (status, created_at desc);
alter table public.enquiries enable row level security;

drop policy if exists "Anyone can send an enquiry" on public.enquiries;
create policy "Anyone can send an enquiry" on public.enquiries
  for insert to anon, authenticated with check (status = 'new');

drop policy if exists "Team manages enquiries" on public.enquiries;
create policy "Team manages enquiries" on public.enquiries
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
