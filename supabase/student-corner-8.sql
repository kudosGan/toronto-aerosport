-- Toronto Aerosport: Student Corner (step 6), student profile and student pilot permit details
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run it after student-corner.sql and -2 to -6. Nothing in it needs editing.
-- It adds columns and two functions. Nothing already saved is changed or removed.

alter table public.students
  add column if not exists phone              text,
  add column if not exists contact_email      text,
  add column if not exists emergency_name     text,
  add column if not exists emergency_phone    text,
  -- the Transport Canada Student Pilot Permit
  add column if not exists permit_name        text,
  add column if not exists permit_number      text,
  add column if not exists file_number        text,
  add column if not exists citizen_of         text,
  add column if not exists aircraft_category  text,
  add column if not exists permit_issued_on   date,
  add column if not exists permit_issued_at   text,
  add column if not exists permit_valid_to    date,
  add column if not exists authorized_person  text;

-- A student edits their own contact details. They cannot change their name, ID or access dates.
create or replace function public.update_my_profile(
  p_whatsapp text, p_phone text, p_email text, p_emergency_name text, p_emergency_phone text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_wa text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
begin
  if v_wa <> '' and (length(v_wa) < 10 or length(v_wa) > 15) then
    raise exception 'Please type a valid WhatsApp number, with the country code';
  end if;
  if coalesce(trim(p_email), '') <> '' and trim(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Please type a valid email address';
  end if;
  if length(coalesce(p_phone, '')) > 40 or length(coalesce(p_emergency_phone, '')) > 40
     or length(coalesce(p_email, '')) > 200 or length(coalesce(p_emergency_name, '')) > 120 then
    raise exception 'One of the answers is too long';
  end if;
  update public.students set
    whatsapp = nullif(v_wa, ''),
    phone = nullif(trim(p_phone), ''),
    contact_email = nullif(trim(p_email), ''),
    emergency_name = nullif(trim(p_emergency_name), ''),
    emergency_phone = nullif(trim(p_emergency_phone), '')
  where user_id = auth.uid();
  if not found then raise exception 'No student record for this login'; end if;
end $$;
revoke all on function public.update_my_profile(text, text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text, text) to authenticated;

-- A student writes down the details on their Student Pilot Permit (the same boxes as the paper permit).
create or replace function public.update_my_permit(
  p_name text, p_permit_number text, p_file_number text, p_citizen_of text, p_category text,
  p_issued_on date, p_issued_at text, p_valid_to date, p_authorized_person text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if length(coalesce(p_name, '')) > 160 or length(coalesce(p_permit_number, '')) > 40 or length(coalesce(p_file_number, '')) > 40
     or length(coalesce(p_citizen_of, '')) > 80 or length(coalesce(p_category, '')) > 120
     or length(coalesce(p_issued_at, '')) > 160 or length(coalesce(p_authorized_person, '')) > 120 then
    raise exception 'One of the answers is too long';
  end if;
  if p_issued_on is not null and p_valid_to is not null and p_valid_to < p_issued_on then
    raise exception 'The permit cannot end before the day it was issued';
  end if;
  update public.students set
    permit_name = nullif(trim(p_name), ''),
    permit_number = nullif(trim(p_permit_number), ''),
    file_number = nullif(trim(p_file_number), ''),
    citizen_of = nullif(trim(p_citizen_of), ''),
    aircraft_category = nullif(trim(p_category), ''),
    permit_issued_on = p_issued_on,
    permit_issued_at = nullif(trim(p_issued_at), ''),
    permit_valid_to = p_valid_to,
    authorized_person = nullif(trim(p_authorized_person), '')
  where user_id = auth.uid();
  if not found then raise exception 'No student record for this login'; end if;
end $$;
revoke all on function public.update_my_permit(text, text, text, text, text, date, text, date, text) from public, anon;
grant execute on function public.update_my_permit(text, text, text, text, text, date, text, date, text) to authenticated;
