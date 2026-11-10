-- Toronto Aerosport: Student Corner (step 8), temporary passwords go by WhatsApp, not email
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run it after student-corner-9.sql. Nothing in it needs editing, and nothing outside Supabase needs setting up.
--
-- How it works now
--  * A new student enrols with their WhatsApp number. Nothing is emailed.
--  * The team sees the enrolment, taps "Send temporary password on WhatsApp", and the message opens in WhatsApp
--    with the Student ID and password already typed. The 48 hours start when the team sends it.
--  * A student whose temporary password has expired asks for a new one on the sign-in page. The team sees the
--    request and sends it the same way.

alter table public.students add column if not exists temp_request_pending boolean not null default false;

-- The email parts of script 9 are no longer used.
drop function if exists public.queue_temp_email(uuid, text);
drop table if exists private.app_secrets;

-- Enrolment: makes the login and the Student ID. The student cannot sign in until the team sends a temporary password.
create or replace function public.enrol_student(
  p_full_name text, p_email text, p_permit_number text, p_file_number text, p_citizen_of text, p_category text,
  p_issued_on date, p_issued_at text, p_valid_to date, p_authorized_person text,
  p_phone text, p_whatsapp text, p_emergency_name text, p_emergency_phone text
) returns jsonb
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  v_name  text := trim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_wa    text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  v_id    text;
  v_login text;
  v_uid   uuid := gen_random_uuid();
  v_unused text := public.new_temp_password(); -- a password nobody knows, until the team sends a real one
begin
  if v_name = '' or position(' ' in v_name) = 0 then raise exception 'Please type your first and last name'; end if;
  if length(v_wa) < 10 or length(v_wa) > 15 then
    raise exception 'Please type your WhatsApp number, with the country code. We send your temporary password there';
  end if;
  if v_email <> '' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please type a valid email address, or leave it empty'; end if;
  if coalesce(trim(p_permit_number), '') = '' then raise exception 'Please type the number on your student pilot permit'; end if;
  if length(v_name) > 120 or length(v_email) > 200 or length(coalesce(p_permit_number, '')) > 40
     or length(coalesce(p_file_number, '')) > 40 or length(coalesce(p_citizen_of, '')) > 80
     or length(coalesce(p_category, '')) > 120 or length(coalesce(p_issued_at, '')) > 160
     or length(coalesce(p_authorized_person, '')) > 120 or length(coalesce(p_phone, '')) > 40
     or length(coalesce(p_emergency_name, '')) > 120 or length(coalesce(p_emergency_phone, '')) > 40 then
    raise exception 'One of the answers is too long';
  end if;
  if p_issued_on is not null and p_valid_to is not null and p_valid_to < p_issued_on then
    raise exception 'The permit cannot end before the day it was issued';
  end if;
  if (select count(*) from public.students where not approved and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'There are too many enrolments right now. Please try again later or call the school';
  end if;
  if v_email <> '' and exists (select 1 from public.students where lower(contact_email) = v_email) then
    raise exception 'This email is already enrolled. On the sign-in page, choose "Get a new temporary password".';
  end if;

  v_id := public.make_student_id(v_name, p_permit_number);
  if v_id is null then raise exception 'We could not make a Student ID. Please check your name and permit number'; end if;
  if exists (select 1 from public.students where lower(student_id) = lower(v_id)) then
    raise exception 'A student with this name and permit number is already enrolled. Please call the school';
  end if;

  v_login := lower(v_id) || '@students.torontoaerosport.com';

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_login,
    crypt(v_unused, gen_salt('bf', 10)), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid::text, v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_login), 'email', now(), now(), now());

  insert into public.students (
    user_id, student_id, full_name, access_ends, active, approved, must_change_password, temp_password_expires, temp_request_pending,
    contact_email, phone, whatsapp, emergency_name, emergency_phone,
    permit_name, permit_number, file_number, citizen_of, aircraft_category,
    permit_issued_on, permit_issued_at, permit_valid_to, authorized_person
  ) values (
    v_uid, v_id, v_name, current_date, true, false, true, now(), true,
    nullif(v_email, ''), nullif(trim(p_phone), ''), v_wa, nullif(trim(p_emergency_name), ''), nullif(trim(p_emergency_phone), ''),
    v_name, trim(p_permit_number), nullif(trim(p_file_number), ''), nullif(trim(p_citizen_of), ''), nullif(trim(p_category), ''),
    p_issued_on, nullif(trim(p_issued_at), ''), p_valid_to, nullif(trim(p_authorized_person), '')
  );

  return jsonb_build_object('student_id', v_id, 'whatsapp', v_wa);
end $$;

-- Sign-in page: "I need a new temporary password". This only tells the team. It never changes the password,
-- and it answers the same whether or not the student exists. Use a Student ID, an email or the WhatsApp number.
create or replace function public.request_temp_password(p_who text) returns void
language plpgsql security definer set search_path = public as $$
declare
  s  public.students;
  v  text := lower(trim(coalesce(p_who, '')));
  vd text := regexp_replace(coalesce(p_who, ''), '[^0-9]', '', 'g');
begin
  if v = '' then return; end if;
  select * into s from public.students
   where lower(student_id) = v or lower(contact_email) = v or (vd <> '' and whatsapp = vd) limit 1;
  if found and s.must_change_password and (s.temp_requested_at is null or s.temp_requested_at < now() - interval '10 minutes') then
    update public.students set temp_request_pending = true, temp_requested_at = now() where user_id = s.user_id;
  end if;
end $$;
revoke all on function public.request_temp_password(text) from public;
grant execute on function public.request_temp_password(text) to anon, authenticated;

-- Team: give a student a temporary password (new enrolment, expired one, or a forgotten password).
-- It is shown to the team once, to send on WhatsApp. It works for 48 hours from now.
create or replace function public.staff_reset_password(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  v_temp text := public.new_temp_password();
begin
  if not public.is_staff() then raise exception 'Only team members can do this'; end if;
  if not exists (select 1 from public.students where user_id = p_user) then raise exception 'Student not found'; end if;
  update auth.users set encrypted_password = crypt(v_temp, gen_salt('bf', 10)), updated_at = now() where id = p_user;
  -- the password change above clears the flag, so it is set again here
  update public.students
     set must_change_password = true, temp_password_expires = now() + interval '48 hours',
         temp_request_pending = false, temp_sent_at = now()
   where user_id = p_user;
  return jsonb_build_object('temp_password', v_temp);
end $$;
revoke all on function public.staff_reset_password(uuid) from public, anon;
grant execute on function public.staff_reset_password(uuid) to authenticated;
