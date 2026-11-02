-- Toronto Aerosport: Student Corner (step 1)
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run supabase/setup.sql first (it creates the listings table this file protects).
--
-- BEFORE YOU RUN: change 'YOUR-TEAM-EMAIL@example.com' below to the email of your team login.
-- To add another team member later, run just that one "insert into public.staff" statement again.

-- 1. Who is on the team ------------------------------------------------------------------------
create table if not exists public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.staff enable row level security;
drop policy if exists "Staff can see own row" on public.staff;
create policy "Staff can see own row" on public.staff
  for select to authenticated using (user_id = auth.uid());

insert into public.staff (user_id)
select id from auth.users where email in ('YOUR-TEAM-EMAIL@example.com')
on conflict do nothing;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid())
$$;

-- 2. Students ----------------------------------------------------------------------------------
create table if not exists public.students (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  student_id    text not null unique,
  full_name     text not null,
  access_ends   date not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
alter table public.students enable row level security;

create or replace function public.is_active_student() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.students
    where user_id = auth.uid() and active and access_ends >= current_date
  )
$$;

drop policy if exists "Team manages students" on public.students;
create policy "Team manages students" on public.students
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "Student sees own record" on public.students;
create policy "Student sees own record" on public.students
  for select to authenticated using (user_id = auth.uid());

-- 3. Flight log --------------------------------------------------------------------------------
create table if not exists public.flights (
  id                  uuid primary key default gen_random_uuid(),
  student_user_id     uuid not null references public.students (user_id) on delete restrict,
  flown_on            date not null,
  aircraft            text,
  instructor          text,
  total_hours         numeric(5,1) not null default 0 check (total_hours >= 0),
  dual_hours          numeric(5,1) not null default 0 check (dual_hours >= 0),
  solo_hours          numeric(5,1) not null default 0 check (solo_hours >= 0),
  cross_country_hours numeric(5,1) not null default 0 check (cross_country_hours >= 0),
  night_hours         numeric(5,1) not null default 0 check (night_hours >= 0),
  takeoffs_landings   int not null default 0 check (takeoffs_landings >= 0),
  notes               text,
  entered_by          uuid not null default auth.uid(),
  signed_off          boolean not null default false,
  signed_by           text,
  signed_at           timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists flights_student_idx on public.flights (student_user_id, flown_on desc);
alter table public.flights enable row level security;

drop policy if exists "Team manages flights" on public.flights;
create policy "Team manages flights" on public.flights
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Student reads own flights" on public.flights;
create policy "Student reads own flights" on public.flights
  for select to authenticated using (student_user_id = auth.uid() and public.is_active_student());

-- A student can add, change and delete their own entries until the instructor signs them off.
drop policy if exists "Student adds own flights" on public.flights;
create policy "Student adds own flights" on public.flights
  for insert to authenticated with check (
    student_user_id = auth.uid() and entered_by = auth.uid() and public.is_active_student()
    and not signed_off and signed_by is null and signed_at is null
  );
drop policy if exists "Student edits own open flights" on public.flights;
create policy "Student edits own open flights" on public.flights
  for update to authenticated
  using (student_user_id = auth.uid() and entered_by = auth.uid() and not signed_off and public.is_active_student())
  with check (student_user_id = auth.uid() and entered_by = auth.uid() and not signed_off
    and signed_by is null and signed_at is null and public.is_active_student());
drop policy if exists "Student deletes own open flights" on public.flights;
create policy "Student deletes own open flights" on public.flights
  for delete to authenticated
  using (student_user_id = auth.uid() and entered_by = auth.uid() and not signed_off and public.is_active_student());

-- 4. Team adds a student -----------------------------------------------------------------------
-- The login itself is created in Supabase (Authentication -> Users) with the email shown on the site.
-- This function then links that login to a student record. Only team members can run it.
create or replace function public.register_student(p_student_id text, p_full_name text, p_access_ends date)
returns public.students
language plpgsql security definer set search_path = public, auth as $$
declare
  v_id  text := lower(trim(p_student_id));
  v_uid uuid;
  v_row public.students;
begin
  if not public.is_staff() then raise exception 'Only team members can add students'; end if;
  if v_id !~ '^[a-z0-9._-]{3,30}$' then
    raise exception 'Student ID must be 3 to 30 letters, numbers, dots, dashes or underscores';
  end if;
  if coalesce(trim(p_full_name), '') = '' then raise exception 'Please add the student''s name'; end if;
  select id into v_uid from auth.users where email = v_id || '@students.torontoaerosport.com';
  if v_uid is null then
    raise exception 'No login found for this ID yet. Create it first in Supabase: Authentication, Users, Add user.';
  end if;
  insert into public.students (user_id, student_id, full_name, access_ends)
  values (v_uid, v_id, trim(p_full_name), p_access_ends)
  on conflict (user_id) do update
    set student_id = excluded.student_id, full_name = excluded.full_name,
        access_ends = excluded.access_ends, active = true
  returning * into v_row;
  return v_row;
end $$;
revoke all on function public.register_student(text, text, date) from public, anon;
grant execute on function public.register_student(text, text, date) to authenticated;

-- 5. Only the team can change aircraft listings and photos --------------------------------------
-- (Before this, any signed-in account could. Students are signed-in accounts too.)
drop policy if exists "Team can insert listings" on public.listings;
create policy "Team can insert listings" on public.listings
  for insert to authenticated with check (public.is_staff());
drop policy if exists "Team can update listings" on public.listings;
create policy "Team can update listings" on public.listings
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "Team can delete listings" on public.listings;
create policy "Team can delete listings" on public.listings
  for delete to authenticated using (public.is_staff());

drop policy if exists "Team can upload photos" on storage.objects;
create policy "Team can upload photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'aircraft-photos' and public.is_staff());
drop policy if exists "Team can delete photos" on storage.objects;
create policy "Team can delete photos" on storage.objects
  for delete to authenticated using (bucket_id = 'aircraft-photos' and public.is_staff());
