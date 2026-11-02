-- Toronto Aerosport: Student Corner (step 5), pay for a trip when sending it, approve both together
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run it after student-corner.sql, -2, -3, -4 and -5. Nothing in it needs editing.
-- It adds one column and one function. Nothing already saved is changed or removed.

-- Which trip a payment is for (empty for a general payment)
alter table public.payments add column if not exists flight_id uuid references public.flights (id) on delete set null;
create index if not exists payments_flight_idx on public.payments (flight_id);

-- A student can only link a payment to one of their own trips.
drop policy if exists "Student reports own payment" on public.payments;
create policy "Student reports own payment" on public.payments
  for insert to authenticated with check (
    student_user_id = auth.uid() and entered_by = auth.uid() and public.is_active_student()
    and method = 'etransfer' and status = 'pending'
    and team_note is null and confirmed_by is null and confirmed_at is null
    and (flight_id is null or exists (
      select 1 from public.flights f where f.id = flight_id and f.student_user_id = auth.uid()
    ))
  );

-- The instructor signs the flight and confirms its payment in one step. Both happen together or not at all.
create or replace function public.approve_flight(p_flight uuid, p_by text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Only team members can approve flights'; end if;
  if coalesce(trim(p_by), '') = '' then raise exception 'Please type your name to sign'; end if;
  update public.flights
     set signed_off = true, signed_by = trim(p_by), signed_at = now(), returned_note = null
   where id = p_flight;
  if not found then raise exception 'Flight not found'; end if;
  update public.payments
     set status = 'confirmed', confirmed_by = trim(p_by), confirmed_at = now(), team_note = null
   where flight_id = p_flight and status = 'pending';
end $$;
revoke all on function public.approve_flight(uuid, text) from public, anon;
grant execute on function public.approve_flight(uuid, text) to authenticated;
