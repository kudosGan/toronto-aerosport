-- Toronto Aerosport: Student Corner (step 4), e-Transfer payments
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run it after student-corner.sql, -2, -3 and -4. Nothing in it needs editing.
--
-- A student tells the school they sent an Interac e-Transfer. The team checks the money arrived and
-- confirms it. Students can only add a payment that is "pending"; only the team can confirm or decline.

create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.students (user_id) on delete restrict,
  amount          numeric(10,2) not null check (amount > 0),
  method          text not null default 'etransfer' check (method in ('etransfer', 'cash')),
  sent_on         date not null default current_date,
  reference       text,
  status          text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  team_note       text,
  confirmed_by    text,
  confirmed_at    timestamptz,
  entered_by      uuid not null default auth.uid(),
  created_at      timestamptz not null default now()
);
create index if not exists payments_student_idx on public.payments (student_user_id, created_at desc);
alter table public.payments enable row level security;

drop policy if exists "Team manages payments" on public.payments;
create policy "Team manages payments" on public.payments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Student reads own payments" on public.payments;
create policy "Student reads own payments" on public.payments
  for select to authenticated using (student_user_id = auth.uid());

drop policy if exists "Student reports own payment" on public.payments;
create policy "Student reports own payment" on public.payments
  for insert to authenticated with check (
    student_user_id = auth.uid() and entered_by = auth.uid() and public.is_active_student()
    and method = 'etransfer' and status = 'pending'
    and team_note is null and confirmed_by is null and confirmed_at is null
  );

-- A student can take back a report that the team has not looked at yet.
drop policy if exists "Student removes own pending payment" on public.payments;
create policy "Student removes own pending payment" on public.payments
  for delete to authenticated using (student_user_id = auth.uid() and status = 'pending');
