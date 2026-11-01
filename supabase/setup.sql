-- Toronto Aerosport: aircraft for sale
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  title       text not null,
  price       numeric,                 -- CAD. Leave empty to show "Call for price"
  year        int,
  hours       numeric,                 -- total airframe hours
  engine      text,
  location    text,
  description text,
  status      text not null default 'available' check (status in ('available', 'sold')),
  photos      text[] not null default '{}'
);

alter table public.listings enable row level security;

-- Everyone can browse listings
create policy "Public can read listings" on public.listings
  for select using (true);

-- Only signed-in team members can add, change or delete
create policy "Team can insert listings" on public.listings
  for insert to authenticated with check (true);
create policy "Team can update listings" on public.listings
  for update to authenticated using (true) with check (true);
create policy "Team can delete listings" on public.listings
  for delete to authenticated using (true);

-- Photo storage (public so visitors can see photos)
insert into storage.buckets (id, name, public)
values ('aircraft-photos', 'aircraft-photos', true)
on conflict (id) do nothing;

create policy "Public can view photos" on storage.objects
  for select using (bucket_id = 'aircraft-photos');
create policy "Team can upload photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'aircraft-photos');
create policy "Team can delete photos" on storage.objects
  for delete to authenticated using (bucket_id = 'aircraft-photos');
