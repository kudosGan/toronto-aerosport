-- Toronto Aerosport: Student Corner (step 2), full pilot logbook fields
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run it after student-corner.sql and student-corner-2.sql. Nothing in it needs editing.
-- It only adds columns. Nothing already saved is changed or removed.

alter table public.flights
  add column if not exists departed_at      time,
  add column if not exists flight_number    text,
  add column if not exists registration     text,
  add column if not exists from_airport     text,
  add column if not exists to_airport       text,
  add column if not exists weather          text,
  add column if not exists pic_hours        numeric(5,1) not null default 0 check (pic_hours >= 0),
  add column if not exists ifr_hours        numeric(5,1) not null default 0 check (ifr_hours >= 0),
  add column if not exists simulator_hours  numeric(5,1) not null default 0 check (simulator_hours >= 0),
  add column if not exists takeoffs         int not null default 0 check (takeoffs >= 0),
  add column if not exists landings         int not null default 0 check (landings >= 0);

comment on column public.flights.aircraft is 'Aircraft name or type';
comment on column public.flights.takeoffs_landings is 'Old combined count, no longer used. See takeoffs and landings.';
