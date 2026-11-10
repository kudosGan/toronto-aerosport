-- Toronto Aerosport: Student Corner (step 10), students can always edit their personal details
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run it after student-corner-11.sql. Nothing in it needs editing. It only replaces one function.
--
-- A student can always change: name, phone, WhatsApp number, email, citizenship, date of birth, category of aircraft and the
-- emergency contact (name, phone, relationship). The permit details themselves (number, dates, authorized person) can only be
-- written by the school. Before this script, a student whose permit had been added could type these boxes, but they were not saved.
-- Older students may not have a WhatsApp number or email saved yet, so those can be left empty. If typed, they are checked.

create or replace function public.update_my_details(
  p_name text, p_phone text, p_whatsapp text, p_email text,
  p_citizen_of text, p_category text, p_date_of_birth date,
  p_emergency_name text, p_emergency_phone text, p_emergency_relationship text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  s       public.students;
  v_name  text := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_wa    text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  select * into s from public.students where user_id = auth.uid();
  if not found then raise exception 'No student record for this login'; end if;
  if v_name = '' or position(' ' in v_name) = 0 then raise exception 'Please type your first and last name'; end if;
  if v_wa <> '' and (length(v_wa) < 10 or length(v_wa) > 15) then
    raise exception 'Please type a valid WhatsApp number, with the country code';
  end if;
  if v_email <> '' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please type a valid email address'; end if;
  if p_date_of_birth is not null and (p_date_of_birth > current_date or p_date_of_birth < date '1900-01-01') then
    raise exception 'Please check your date of birth';
  end if;
  if length(v_name) > 120 or length(coalesce(p_phone, '')) > 40 or length(v_email) > 200
     or length(coalesce(p_citizen_of, '')) > 80 or length(coalesce(p_category, '')) > 120
     or length(coalesce(p_emergency_name, '')) > 120 or length(coalesce(p_emergency_phone, '')) > 40
     or length(coalesce(p_emergency_relationship, '')) > 60 then
    raise exception 'One of the answers is too long';
  end if;

  update public.students set
    full_name = v_name, permit_name = v_name,
    phone = nullif(trim(p_phone), ''), whatsapp = nullif(v_wa, ''), contact_email = nullif(v_email, ''),
    citizen_of = nullif(trim(p_citizen_of), ''), aircraft_category = nullif(trim(p_category), ''), date_of_birth = p_date_of_birth,
    emergency_name = nullif(trim(p_emergency_name), ''), emergency_phone = nullif(trim(p_emergency_phone), ''),
    emergency_relationship = nullif(trim(p_emergency_relationship), '')
  where user_id = auth.uid();
end $$;
revoke all on function public.update_my_details(text, text, text, text, text, text, date, text, text, text) from public, anon;
grant execute on function public.update_my_details(text, text, text, text, text, text, date, text, text, text) to authenticated;
