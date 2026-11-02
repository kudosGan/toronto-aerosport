-- Toronto Aerosport: Student Corner (step 3), instructor sign-off and the student's WhatsApp number
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run it after student-corner.sql, -2 and -3. Nothing in it needs editing.
-- It adds two columns and tightens two rules. Nothing already saved is changed or removed.

alter table public.students add column if not exists whatsapp text;
alter table public.flights  add column if not exists returned_note text;

-- A student saves their own WhatsApp number (digits only, with the country code).
create or replace function public.set_my_whatsapp(p_number text) returns void
language plpgsql security definer set search_path = public as $$
declare v text := regexp_replace(coalesce(p_number, ''), '[^0-9]', '', 'g');
begin
  if v <> '' and (length(v) < 10 or length(v) > 15) then
    raise exception 'Please type a valid WhatsApp number, with the country code';
  end if;
  update public.students set whatsapp = nullif(v, '') where user_id = auth.uid();
  if not found then raise exception 'No student record for this login'; end if;
end $$;
revoke all on function public.set_my_whatsapp(text) from public, anon;
grant execute on function public.set_my_whatsapp(text) to authenticated;

-- A student can add and change entries only while they are waiting. An instructor's "send back"
-- note and the sign-off can only be written by the team.
drop policy if exists "Student adds own flights" on public.flights;
create policy "Student adds own flights" on public.flights
  for insert to authenticated with check (
    student_user_id = auth.uid() and entered_by = auth.uid() and public.is_active_student()
    and not signed_off and signed_by is null and signed_at is null and returned_note is null
  );
drop policy if exists "Student edits own open flights" on public.flights;
create policy "Student edits own open flights" on public.flights
  for update to authenticated
  using (student_user_id = auth.uid() and entered_by = auth.uid() and not signed_off and public.is_active_student())
  with check (student_user_id = auth.uid() and entered_by = auth.uid() and not signed_off
    and signed_by is null and signed_at is null and returned_note is null and public.is_active_student());
