-- Toronto Aerosport: Student Corner (step 7), enrolment with a temporary password
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run it after student-corner.sql and -2 to -8. Nothing in it needs editing.
-- It adds columns, helper functions and a trigger. Nothing already saved is changed or removed.
--
-- How it works
--  * A new student fills in the enrolment form. This makes their login, with a temporary password
--    that works for 48 hours, and emails it to them. They are "waiting for approval" until the team approves.
--  * With a temporary password a student can only choose a new password. Nothing else opens until they have.
--  * When the 48 hours pass, the temporary password opens nothing. The student asks for a new one on the sign-in page.

create extension if not exists pg_net with schema extensions;

-- 1. Private settings (never visible from the website) -----------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.app_secrets (name text primary key, value text not null);
revoke all on private.app_secrets from public, anon, authenticated;
insert into private.app_secrets (name, value) values
  ('mail_function_url', 'https://znjotvnrmzemiywgzbch.supabase.co/functions/v1/send-temp-password'),
  ('site_url', 'https://kudosgan.github.io/toronto-aerosport/')
on conflict (name) do nothing;
-- The third setting, mail_secret, is added by you in a separate step (see SETUP-STUDENT-CORNER.md).

-- 2. New columns -------------------------------------------------------------------------------
alter table public.students
  add column if not exists approved               boolean not null default true,
  add column if not exists must_change_password   boolean not null default false,
  add column if not exists temp_password_expires  timestamptz,
  add column if not exists temp_sent_at           timestamptz,
  add column if not exists temp_requested_at      timestamptz;

-- 3. A student is "active" only when approved, in date, and past the temporary password -------
create or replace function public.is_active_student() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.students
    where user_id = auth.uid() and active and approved and access_ends >= current_date
      and not must_change_password
      and (temp_password_expires is null or temp_password_expires > now())
  )
$$;

-- 4. The Student ID: first name, capital first letter of the last name, TAS- and the permit number
--    Kudas Gan with permit 177610 gives Kudas-G-TAS-177610
create or replace function public.make_student_id(p_full_name text, p_permit_number text) returns text
language plpgsql immutable as $$
declare
  parts    text[] := regexp_split_to_array(trim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g')), ' ');
  v_first  text;
  v_last   text;
  v_permit text;
begin
  if array_length(parts, 1) is null or array_length(parts, 1) < 2 then return null; end if;
  v_first  := regexp_replace(parts[1], '[^[:alpha:]]', '', 'g');
  v_last   := regexp_replace(parts[array_length(parts, 1)], '[^[:alpha:]]', '', 'g');
  v_permit := upper(regexp_replace(coalesce(p_permit_number, ''), '[^[:alnum:]]', '', 'g'));
  if v_first = '' or v_last = '' or v_permit = '' then return null; end if;
  return initcap(lower(v_first)) || '-' || upper(left(v_last, 1)) || '-TAS-' || v_permit;
end $$;

-- 5. A random temporary password (no look-alike letters) --------------------------------------
create or replace function public.new_temp_password() returns text
language plpgsql volatile set search_path = public, extensions as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  b     bytea := gen_random_bytes(10);
  out   text := '';
  i     int;
begin
  for i in 0..9 loop out := out || substr(chars, (get_byte(b, i) % length(chars)) + 1, 1); end loop;
  return out;
end $$;
revoke all on function public.new_temp_password() from public, anon, authenticated;

-- 6. Ask the email function to send the temporary password -----------------------------------
create or replace function public.queue_temp_email(p_user uuid, p_temp text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  s        public.students;
  v_url    text;
  v_secret text;
  v_site   text;
begin
  select * into s from public.students where user_id = p_user;
  if not found or coalesce(s.contact_email, '') = '' then return false; end if;
  select value into v_url    from private.app_secrets where name = 'mail_function_url';
  select value into v_secret from private.app_secrets where name = 'mail_secret';
  select value into v_site   from private.app_secrets where name = 'site_url';
  if v_url is null or v_secret is null then return false; end if; -- email is not set up yet
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-mail-secret', v_secret),
    body    := jsonb_build_object('to', s.contact_email, 'name', s.full_name, 'studentId', s.student_id,
                                  'tempPassword', p_temp, 'expires', s.temp_password_expires, 'siteUrl', v_site)
  );
  update public.students set temp_sent_at = now() where user_id = p_user;
  return true;
end $$;
revoke all on function public.queue_temp_email(uuid, text) from public, anon, authenticated;

-- 7. Changing the password for real is what ends "must change password" ----------------------
create or replace function public.clear_temp_password_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    update public.students set must_change_password = false, temp_password_expires = null where user_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists on_password_changed on auth.users;
create trigger on_password_changed after update of encrypted_password on auth.users
  for each row execute function public.clear_temp_password_flag();

-- 8. Enrolment: anyone can enrol. It makes the login and emails the temporary password. ------
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
  v_temp  text;
  v_sent  boolean;
begin
  if v_name = '' or position(' ' in v_name) = 0 then raise exception 'Please type your first and last name'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please type a valid email address'; end if;
  if coalesce(trim(p_permit_number), '') = '' then raise exception 'Please type the number on your student pilot permit'; end if;
  if v_wa <> '' and (length(v_wa) < 10 or length(v_wa) > 15) then
    raise exception 'Please type a valid WhatsApp number, with the country code';
  end if;
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
  if exists (select 1 from public.students where lower(contact_email) = v_email) then
    raise exception 'This email is already enrolled. On the sign-in page, choose "Get a new temporary password".';
  end if;

  v_id := public.make_student_id(v_name, p_permit_number);
  if v_id is null then raise exception 'We could not make a Student ID. Please check your name and permit number'; end if;
  if exists (select 1 from public.students where lower(student_id) = lower(v_id)) then
    raise exception 'A student with this name and permit number is already enrolled. Please call the school';
  end if;

  v_login := lower(v_id) || '@students.torontoaerosport.com';
  v_temp  := public.new_temp_password();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_login,
    crypt(v_temp, gen_salt('bf', 10)), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid::text, v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_login), 'email', now(), now(), now());

  insert into public.students (
    user_id, student_id, full_name, access_ends, active, approved, must_change_password, temp_password_expires,
    contact_email, phone, whatsapp, emergency_name, emergency_phone,
    permit_name, permit_number, file_number, citizen_of, aircraft_category,
    permit_issued_on, permit_issued_at, permit_valid_to, authorized_person
  ) values (
    v_uid, v_id, v_name, current_date, true, false, true, now() + interval '48 hours',
    v_email, nullif(trim(p_phone), ''), nullif(v_wa, ''), nullif(trim(p_emergency_name), ''), nullif(trim(p_emergency_phone), ''),
    v_name, trim(p_permit_number), nullif(trim(p_file_number), ''), nullif(trim(p_citizen_of), ''), nullif(trim(p_category), ''),
    p_issued_on, nullif(trim(p_issued_at), ''), p_valid_to, nullif(trim(p_authorized_person), '')
  );

  v_sent := public.queue_temp_email(v_uid, v_temp);
  return jsonb_build_object('student_id', v_id, 'email', v_email, 'email_queued', v_sent);
end $$;
revoke all on function public.enrol_student(text, text, text, text, text, text, date, text, date, text, text, text, text, text) from public;
grant execute on function public.enrol_student(text, text, text, text, text, text, date, text, date, text, text, text, text, text) to anon, authenticated;

-- 9. Expired or lost temporary password: ask for a new one from the sign-in page --------------
-- Works only until the student has chosen their own password. Always answers the same, so nobody can
-- find out which IDs exist. One request every 10 minutes for each student.
create or replace function public.request_temp_password(p_who text) returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  s      public.students;
  v      text := lower(trim(coalesce(p_who, '')));
  v_temp text;
begin
  if v = '' then return; end if;
  select * into s from public.students where lower(student_id) = v or lower(contact_email) = v limit 1;
  if found and s.must_change_password and (s.temp_requested_at is null or s.temp_requested_at < now() - interval '10 minutes') then
    v_temp := public.new_temp_password();
    update auth.users set encrypted_password = crypt(v_temp, gen_salt('bf', 10)), updated_at = now() where id = s.user_id;
    -- the password change above clears the flag, so it is set again here
    update public.students
       set must_change_password = true, temp_password_expires = now() + interval '48 hours', temp_requested_at = now()
     where user_id = s.user_id;
    perform public.queue_temp_email(s.user_id, v_temp);
  end if;
end $$;
revoke all on function public.request_temp_password(text) from public;
grant execute on function public.request_temp_password(text) to anon, authenticated;

-- 10. Team: give any student a new temporary password (for example after a forgotten password) -
-- It is emailed to the student and also shown to the team once, in case the email does not arrive.
create or replace function public.staff_reset_password(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  v_temp text := public.new_temp_password();
  v_sent boolean;
begin
  if not public.is_staff() then raise exception 'Only team members can do this'; end if;
  if not exists (select 1 from public.students where user_id = p_user) then raise exception 'Student not found'; end if;
  update auth.users set encrypted_password = crypt(v_temp, gen_salt('bf', 10)), updated_at = now() where id = p_user;
  update public.students
     set must_change_password = true, temp_password_expires = now() + interval '48 hours', temp_requested_at = now()
   where user_id = p_user;
  v_sent := public.queue_temp_email(p_user, v_temp);
  return jsonb_build_object('temp_password', v_temp, 'email_queued', v_sent);
end $$;
revoke all on function public.staff_reset_password(uuid) from public, anon;
grant execute on function public.staff_reset_password(uuid) to authenticated;

-- 11. Team: remove a mistaken or spam enrolment (only if the student has no flights or payments) -
create or replace function public.remove_enrolment(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_staff() then raise exception 'Only team members can do this'; end if;
  if exists (select 1 from public.students where user_id = p_user and approved) then
    raise exception 'This student is already approved and cannot be removed here';
  end if;
  if exists (select 1 from public.flights where student_user_id = p_user)
     or exists (select 1 from public.payments where student_user_id = p_user) then
    raise exception 'This student already has records and cannot be removed';
  end if;
  delete from auth.users where id = p_user;
end $$;
revoke all on function public.remove_enrolment(uuid) from public, anon;
grant execute on function public.remove_enrolment(uuid) to authenticated;
