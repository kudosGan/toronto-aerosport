# Student Corner: one-time setup

## The database (Supabase -> SQL Editor -> New query -> paste -> Run)
Run these files in this order, each once. Only `student-corner.sql` needs an edit (your team email, near the top).

1. `supabase/student-corner.sql`, then `student-corner-2.sql` to `student-corner-12.sql`
2. `supabase/enquiries.sql` (website enquiries)

Nothing is needed outside Supabase. No email account, no extra service.

## How students start
1. **Enrol.** A new student opens the Student Corner -> **Enrol as a student** and fills in: first and last name, date of birth,
   citizenship, category of aircraft, phone (their WhatsApp number), email and an emergency contact (name, phone, relationship).
2. **Permit details (instructor).** The team opens **Enrolments** and fills in the permit details from the student's Transport
   Canada permit: permit number, file number, issued on, valid to, issued at (flight training unit) and the name of the
   authorized person. Saving makes the **Student ID** (first name, capital first letter of the last name, TAS- and the permit
   number: Kudas Gan, permit 177610 gives `Kudas-G-TAS-177610`) and locks the student's profile.
3. **Temporary password.** The team taps **Send temporary password on WhatsApp**. WhatsApp opens with the Student ID and the
   password already typed. It works for **48 hours** from that moment.
4. **First sign-in.** The student signs in and must choose a new password (typed twice) before anything else opens.
5. **Approval.** The team approves the enrolment and sets the access end date. Then the logbook, lessons and payments open.

## What the student can change later
Their name, phone, WhatsApp number, email, citizenship, date of birth and emergency contact. The category of aircraft and the permit details
are locked once the school has added the permit details. The team can still change everything.

## Expired or forgotten passwords
- Temporary password expired: on the sign-in page the student taps "Temporary password expired? Get a new one". The team sees it
  in **Enrolments** under "Asking for a new temporary password" and sends one the same way.
- Forgotten password later: the team taps **New temporary password** on that student.
