import { supabase } from './supabase';

// Students sign in with a student ID. Supabase needs an email, so the ID is turned into a private one.
export const STUDENT_DOMAIN = 'students.torontoaerosport.com';
export const emailFor = (id) => `${id.trim().toLowerCase()}@${STUDENT_DOMAIN}`;

// Minimums for the Ultralight Pilot Permit (same numbers as the Learning to Fly page)
export const MINIMUMS = { total: 10, solo: 2, landings: 30 };

// Total-hour milestones for each licence. Minimums only; the school checks the details with Transport Canada.
export const MILESTONES = [
  { name: 'Ultralight Permit', hours: 10 },
  { name: 'Recreational Permit (RPP)', hours: 25 },
  { name: 'Private Licence (PPL)', hours: 45 },
  { name: 'Commercial Licence (CPL)', hours: 200 },
];

export const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
export const isOpen = (s) => Boolean(s && s.active && s.access_ends >= today());

/** A short ID becomes a student email; anything with an @ is used as typed (so the team can sign in here too). */
export async function signInStudent(idOrEmail, password) {
  const name = idOrEmail.trim();
  const email = name.includes('@') ? name.toLowerCase() : emailFor(name);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}
export const signOutStudent = () => supabase.auth.signOut();

/** Who is signed in? null | { role: 'staff' | 'student' | 'none', user, student? } */
export async function getRole() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const staff = await supabase.from('staff').select('user_id').eq('user_id', user.id).maybeSingle();
  if (staff.error) throw new Error(/schema cache|does not exist/i.test(staff.error.message) ? 'SETUP' : staff.error.message);
  if (staff.data) return { role: 'staff', user };
  const st = await supabase.from('students').select('*').eq('user_id', user.id).maybeSingle();
  if (st.error) throw new Error(st.error.message);
  return st.data ? { role: 'student', user, student: st.data } : { role: 'none', user };
}

export async function fetchStudents() {
  const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Creates the login and the student record. The database makes the next ID (TAS-001, TAS-002...). */
export async function createStudent(fullName, password, accessEnds) {
  const { data, error } = await supabase.rpc('create_student', { p_full_name: fullName, p_password: password, p_access_ends: accessEnds });
  if (error) throw error;
  return data;
}

export async function updateStudent(userId, patch) {
  const { error } = await supabase.from('students').update(patch).eq('user_id', userId);
  if (error) throw error;
}

export async function fetchFlights(userId) {
  const { data, error } = await supabase.from('flights').select('*').eq('student_user_id', userId)
    .order('flown_on', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Add (no id) or change (id) a logbook entry. Fields are the flights table columns. */
export async function saveFlight(studentUserId, fields, id) {
  const q = id
    ? supabase.from('flights').update(fields).eq('id', id)
    : supabase.from('flights').insert({ ...fields, student_user_id: studentUserId });
  const { error } = await q;
  if (error) throw error;
}

export async function deleteFlight(id) {
  const { error } = await supabase.from('flights').delete().eq('id', id);
  if (error) throw error;
}

/** An instructor signs an entry (signedBy = their name) or takes the signature off (signedBy = null). */
export async function setSignOff(id, signedBy) {
  const patch = signedBy
    ? { signed_off: true, signed_by: signedBy, signed_at: new Date().toISOString() }
    : { signed_off: false, signed_by: null, signed_at: null };
  const { error } = await supabase.from('flights').update(patch).eq('id', id);
  if (error) throw error;
}

/** Running totals from a list of flights */
export function summarize(flights) {
  const sum = (k) => Math.round(flights.reduce((t, f) => t + Number(f[k] || 0), 0) * 10) / 10;
  const count = (k) => flights.reduce((t, f) => t + Number(f[k] || 0), 0);
  return {
    total: sum('total_hours'), dual: sum('dual_hours'), solo: sum('solo_hours'), pic: sum('pic_hours'),
    crossCountry: sum('cross_country_hours'), night: sum('night_hours'), ifr: sum('ifr_hours'), sim: sum('simulator_hours'),
    takeoffs: count('takeoffs'), landings: count('landings'), count: flights.length,
  };
}
