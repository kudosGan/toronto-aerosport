-- Toronto Aerosport: Student Corner (step 13), instructor gives ground lesson access for a time frame
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- It only adds three columns to the students table. Nothing already saved is changed.
-- Only the school team can change them (students can only read their own row).

alter table public.students
  add column if not exists ground_enabled boolean not null default false,
  add column if not exists ground_starts  date,
  add column if not exists ground_ends    date;
