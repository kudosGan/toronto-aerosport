-- Toronto Aerosport: Student Corner (step 9), the school fills in the permit details
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run it after student-corner-10.sql. Nothing in it needs editing.
--
-- Who fills in what
--  * The student enrols with: first and last name, date of birth, citizenship, category of aircraft, phone/WhatsApp,
--    email and an emergency contact (name, phone, relationship).
--  * The instructor adds the permit details: permit number, file number, issued on, valid to, issued at (flight
--    training unit) and the name of the authorized person. Saving them makes the Student ID
--    (first name, capital first letter of the last name, TAS- and the permit number) and locks the profile.
--  * After that the student can only change their name (spelling), phone, WhatsApp number and email.

alter table public.students
  add column if not exists date_of_birth         date,
  add column if not exists emergency_relationship text,
  add column if not exists profile_locked        boolean not null default false;

-- 1. The permit boxes can no longer be written by students ------------------------------------
drop function if exists public.update_my_permit(text, text, text, text, text, date, text, date, text);
drop function if exists public.update_my_profile(text, text, text, text, text);

-- 2. Sign-in: the Student ID can change once the permit number is added, so the sign-in looks up the login.
-- It always answers, with a made-up address for an unknown ID, so nobody can learn which IDs exist.
create or replace function public.login_email(p_id text) returns text
language sql stable security definer set search_path = public, auth as $$
  select coalesce(
    (select u.email::text from public.students s join auth.users u on u.id = s.user_id
      where lower(s.student_id) = lower(trim(p_id)) limit 1),
    'nobody-' || md5(lower(trim(coalesce(p_id, '')))) || '@students.torontoaerosport.com'
  )
$$;
revoke all on function public.login_email(text) from public;
grant execute on function public.login_email(text) to anon, authenticated;

-- 3. Enrolment: the student's own details only. The Student ID waits for the permit number.
drop function if exists public.enrol_student(text, text, text, text, text, text, date, text, date, text, text, text, text, text);
create or replace function public.enrol_student(
  p_full_name text, p_email text, p_citizen_of text, p_category text, p_date_of_birth date,
  p_phone text, p_whatsapp text, p_emergency_name text, p_emergency_phone text, p_emergency_relationship text
) returns jsonb
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  v_name   text := trim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
  v_email  text := lower(trim(coalesce(p_email, '')));
  v_wa     text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  v_uid    uuid := gen_random_uuid();
  v_id     text := 'PENDING-' || substr(replace(v_uid::text, '-', ''), 1, 8);
  v_login  text := 'u-' || replace(v_uid::text, '-', '') || '@students.torontoaerosport.com';
  v_unused text := public.new_temp_password(); -- a password nobody knows, until the team sends a real one
begin
  if v_name = '' or position(' ' in v_name) = 0 then raise exception 'Please type your first and last name'; end if;
  if length(v_wa) < 10 or length(v_wa) > 15 then
    raise exception 'Please type your phone number, with the country code. It must be your WhatsApp number';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please type a valid email address'; end if;
  if p_date_of_birth is null or p_date_of_birth > current_date or p_date_of_birth < date '1900-01-01' then
    raise exception 'Please check your date of birth';
  end if;
  if coalesce(trim(p_citizen_of), '') = '' then raise exception 'Please type your citizenship'; end if;
  if coalesce(trim(p_category), '') = '' then raise exception 'Please type the category of aircraft'; end if;
  if coalesce(trim(p_emergency_name), '') = '' or coalesce(trim(p_emergency_phone), '') = '' or coalesce(trim(p_emergency_relationship), '') = '' then
    raise exception 'Please add your emergency contact: name, phone number and relationship';
  end if;
  if length(v_name) > 120 or length(v_email) > 200 or length(coalesce(p_citizen_of, '')) > 80
     or length(coalesce(p_category, '')) > 120 or length(coalesce(p_phone, '')) > 40
     or length(coalesce(p_emergency_name, '')) > 120 or length(coalesce(p_emergency_phone, '')) > 40
     or length(coalesce(p_emergency_relationship, '')) > 60 then
    raise exception 'One of the answers is too long';
  end if;
  if (select count(*) from public.students where not approved and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'There are too many enrolments right now. Please try again later or call the school';
  end if;
  if exists (select 1 from public.students where lower(contact_email) = v_email)
     or exists (select 1 from public.students where lower(full_name) = lower(v_name) and date_of_birth = p_date_of_birth) then
    raise exception 'You are already enrolled. On the sign-in page, choose "Get a new temporary password", or call the school.';
  end if;

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
    user_id, student_id, full_name, permit_name, access_ends, active, approved, must_change_password, temp_password_expires, temp_request_pending,
    contact_email, phone, whatsapp, citizen_of, aircraft_category, date_of_birth,
    emergency_name, emergency_phone, emergency_relationship
  ) values (
    v_uid, v_id, v_name, v_name, current_date, true, false, true, now(), true,
    v_email, coalesce(nullif(trim(p_phone), ''), v_wa), v_wa, trim(p_citizen_of), trim(p_category), p_date_of_birth,
    trim(p_emergency_name), trim(p_emergency_phone), trim(p_emergency_relationship)
  );

  return jsonb_build_object('whatsapp', v_wa, 'name', v_name);
end $$;
revoke all on function public.enrol_student(text, text, text, text, date, text, text, text, text, text) from public;
grant execute on function public.enrol_student(text, text, text, text, date, text, text, text, text, text) to anon, authenticated;

-- 4. Team: add the permit details. This makes the Student ID and locks the student's profile.
create or replace function public.staff_set_permit(
  p_user uuid, p_permit_number text, p_file_number text, p_issued_on date,
  p_issued_at text, p_valid_to date, p_authorized_person text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s    public.students;
  v_id text;
begin
  if not public.is_staff() then raise exception 'Only team members can do this'; end if;
  select * into s from public.students where user_id = p_user;
  if not found then raise exception 'Student not found'; end if;
  if coalesce(trim(p_permit_number), '') = '' then raise exception 'Please type the permit number'; end if;
  if length(p_permit_number) > 40 or length(coalesce(p_file_number, '')) > 40 or length(coalesce(p_issued_at, '')) > 160
     or length(coalesce(p_authorized_person, '')) > 120 then
    raise exception 'One of the answers is too long';
  end if;
  if p_issued_on is not null and p_valid_to is not null and p_valid_to < p_issued_on then
    raise exception 'The permit cannot end before the day it was issued';
  end if;
  v_id := public.make_student_id(s.full_name, p_permit_number);
  if v_id is null then raise exception 'The Student ID could not be made. Check the name and the permit number'; end if;
  if exists (select 1 from public.students where lower(student_id) = lower(v_id) and user_id <> p_user) then
    raise exception 'Another student already has the Student ID %', v_id;
  end if;
  update public.students set
    permit_number = trim(p_permit_number), file_number = nullif(trim(p_file_number), ''),
    permit_issued_on = p_issued_on, permit_issued_at = nullif(trim(p_issued_at), ''),
    permit_valid_to = p_valid_to, authorized_person = nullif(trim(p_authorized_person), ''),
    student_id = v_id, profile_locked = true
  where user_id = p_user;
  return jsonb_build_object('student_id', v_id, 'changed', s.student_id is distinct from v_id);
end $$;
revoke all on function public.staff_set_permit(uuid, text, text, date, text, date, text) from public, anon;
grant execute on function public.staff_set_permit(uuid, text, text, date, text, date, text) to authenticated;

-- 5. The student edits their own details. Name, phone, WhatsApp and email can always change.
-- The rest can change only until the school has added the permit details.
create or replace function public.update_my_details(
  p_name text, p_phone text, p_whatsapp text, p_email text,
  p_citizen_of text, p_category text, p_date_of_birth date,
  p_emergency_name text, p_emergency_phone text, p_emergency_relationship text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  s      public.students;
  v_name text := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_wa   text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
begin
  select * into s from public.students where user_id = auth.uid();
  if not found then raise exception 'No student record for this login'; end if;
  if v_name = '' or position(' ' in v_name) = 0 then raise exception 'Please type your first and last name'; end if;
  if length(v_wa) < 10 or length(v_wa) > 15 then raise exception 'Please type a valid WhatsApp number, with the country code'; end if;
  if trim(coalesce(p_email, '')) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please type a valid email address'; end if;
  if length(v_name) > 120 or length(coalesce(p_phone, '')) > 40 or length(coalesce(p_email, '')) > 200
     or length(coalesce(p_citizen_of, '')) > 80 or length(coalesce(p_category, '')) > 120
     or length(coalesce(p_emergency_name, '')) > 120 or length(coalesce(p_emergency_phone, '')) > 40
     or length(coalesce(p_emergency_relationship, '')) > 60 then
    raise exception 'One of the answers is too long';
  end if;
  update public.students set
    full_name = v_name, permit_name = v_name,
    phone = nullif(trim(p_phone), ''), whatsapp = v_wa, contact_email = lower(trim(p_email))
  where user_id = auth.uid();
  if not s.profile_locked then
    update public.students set
      citizen_of = nullif(trim(p_citizen_of), ''), aircraft_category = nullif(trim(p_category), ''),
      date_of_birth = p_date_of_birth,
      emergency_name = nullif(trim(p_emergency_name), ''), emergency_phone = nullif(trim(p_emergency_phone), ''),
      emergency_relationship = nullif(trim(p_emergency_relationship), '')
    where user_id = auth.uid();
  end if;
end $$;
revoke all on function public.update_my_details(text, text, text, text, text, text, date, text, text, text) from public, anon;
grant execute on function public.update_my_details(text, text, text, text, text, text, date, text, text, text) to authenticated;

-- 6. A temporary password needs the real Student ID, so the permit details come first.
create or replace function public.staff_reset_password(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  v_temp text := public.new_temp_password();
  v_id   text;
begin
  if not public.is_staff() then raise exception 'Only team members can do this'; end if;
  select student_id into v_id from public.students where user_id = p_user;
  if not found then raise exception 'Student not found'; end if;
  if v_id like 'PENDING-%' then raise exception 'Add the permit details first, so the Student ID can be made'; end if;
  update auth.users set encrypted_password = crypt(v_temp, gen_salt('bf', 10)), updated_at = now() where id = p_user;
  -- the password change above clears the flag, so it is set again here
  update public.students
     set must_change_password = true, temp_password_expires = now() + interval '48 hours',
         temp_request_pending = false, temp_sent_at = now()
   where user_id = p_user;
  return jsonb_build_object('temp_password', v_temp, 'student_id', v_id);
end $$;
revoke all on function public.staff_reset_password(uuid) from public, anon;
grant execute on function public.staff_reset_password(uuid) to authenticated;
