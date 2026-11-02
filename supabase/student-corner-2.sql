-- Toronto Aerosport: Student Corner (step 1b), the team creates a student's login from the website
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run it after supabase/student-corner.sql. Nothing in it needs editing.
--
-- It makes the next student ID automatically (TAS-001, TAS-002, ...) and creates the login and the
-- student record in one go. The password is chosen by the website (for now: the student's name).

drop function if exists public.register_student(text, text, date);

create or replace function public.create_student(p_full_name text, p_password text, p_access_ends date)
returns public.students
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  v_name  text := trim(p_full_name);
  v_n     int;
  v_id    text;
  v_email text;
  v_uid   uuid := gen_random_uuid();
  v_row   public.students;
begin
  if not public.is_staff() then raise exception 'Only team members can add students'; end if;
  if coalesce(v_name, '') = '' then raise exception 'Please add the student''s name'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'The password must be at least 6 characters'; end if;
  if p_access_ends is null then raise exception 'Please choose when access ends'; end if;

  perform pg_advisory_xact_lock(7001); -- two team members adding at once cannot get the same ID
  select coalesce(max((substring(student_id from 5))::int), 0) + 1 into v_n
    from public.students where student_id ~ '^TAS-[0-9]+$';
  v_id := 'TAS-' || lpad(v_n::text, 3, '0');
  v_email := lower(v_id) || '@students.torontoaerosport.com';

  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'A login for % already exists in Supabase. Delete it in Authentication, Users, then try again.', v_id;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf', 10)), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid::text, v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_email), 'email', now(), now(), now());

  insert into public.students (user_id, student_id, full_name, access_ends)
  values (v_uid, v_id, v_name, p_access_ends)
  returning * into v_row;
  return v_row;
end $$;

revoke all on function public.create_student(text, text, date) from public, anon;
grant execute on function public.create_student(text, text, date) to authenticated;
