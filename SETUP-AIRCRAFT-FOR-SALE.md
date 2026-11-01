# Aircraft For Sale: one-time setup (about 15 minutes)

Until this is done, the site runs in DEMO mode (sample listings, nothing saved).

1. Create a free project at https://supabase.com (name it toronto-aerosport).
2. SQL Editor -> New query -> paste everything from `supabase/setup.sql` -> Run.
3. Authentication -> Providers -> Email: turn OFF "Allow new users to sign up" (so only your team can have accounts).
4. Authentication -> Users -> Add user -> create one account per person (Bill, Manny, Harpreet, developer) with email + password.
5. Project Settings -> API: copy the Project URL and the `anon public` key.
6. GitHub repo -> Settings -> Secrets and variables -> Actions -> Variables tab -> New repository variable:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key
   (The anon key is meant to be public. The database rules in setup.sql keep it read-only for visitors.)
7. Push any change (or Actions -> Run workflow). The site rebuilds with the database connected.
8. Team members sign in at: https://kudosgan.github.io/toronto-aerosport/#team

To test on your own computer: copy `.env.example` to `.env`, fill in both values, run `npm run dev`.
