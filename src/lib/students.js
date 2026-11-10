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
export const isOpen = (s) => Boolean(s && s.active && s.approved !== false && !s.must_change_password && s.access_ends >= today());
/** A temporary password that has run out its 48 hours. */
export const tempExpired = (s) => Boolean(s && s.must_change_password && s.temp_password_expires && new Date(s.temp_password_expires) <= new Date());

/** A Student ID is looked up for its login. Anything with an @ is used as typed (so the team can sign in here too). */
export async function signInStudent(idOrEmail, password) {
  const name = idOrEmail.trim();
  let email;
  if (name.includes('@')) email = name.toLowerCase();
  else {
    const { data, error } = await supabase.rpc('login_email', { p_id: name }); // the ID can change once the permit number is added
    email = !error && data ? data : emailFor(name);
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}
/** The school team signs in with an email. Anyone who is not on the team is signed straight out again. */
export async function signInStaff(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  const r = await getRole();
  if (!r || r.role !== 'staff') { await supabase.auth.signOut(); throw new Error('NOT_STAFF'); }
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

/** waiting = sent by the student, not yet checked. approved = signed by an instructor. returned = sent back with a note. */
export const statusOf = (f) => (f.signed_off ? 'approved' : f.returned_note ? 'returned' : 'waiting');

/** Only approved flights count towards totals and progress. */
export const approvedOnly = (flights) => (flights || []).filter((f) => f.signed_off);

/** Every flight waiting for a sign-off, with the student's name. For the team. */
export async function fetchPending() {
  const { data, error } = await supabase.from('flights').select('*, students(user_id, student_id, full_name, whatsapp)')
    .eq('signed_off', false).is('returned_note', null).order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function returnFlight(id, note) {
  const { error } = await supabase.from('flights').update({ returned_note: note }).eq('id', id);
  if (error) throw error;
}

/** The student saves their own details. The database ignores the locked ones after the school adds the permit. */
export async function updateMyDetails(f) {
  const { error } = await supabase.rpc('update_my_details', {
    p_name: f.full_name || '', p_phone: f.phone || '', p_whatsapp: f.whatsapp || '', p_email: f.contact_email || '',
    p_citizen_of: f.citizen_of || '', p_category: f.aircraft_category || '', p_date_of_birth: f.date_of_birth || null,
    p_emergency_name: f.emergency_name || '', p_emergency_phone: f.emergency_phone || '', p_emergency_relationship: f.emergency_relationship || '',
  });
  if (error) throw error;
}

/** The team adds the permit details. This makes the Student ID and locks the student's details. Returns { student_id, changed }. */
export async function staffSetPermit(userId, f) {
  const { data, error } = await supabase.rpc('staff_set_permit', {
    p_user: userId, p_permit_number: f.permit_number || '', p_file_number: f.file_number || '',
    p_issued_on: f.permit_issued_on || null, p_issued_at: f.permit_issued_at || '',
    p_valid_to: f.permit_valid_to || null, p_authorized_person: f.authorized_person || '',
  });
  if (error) throw error;
  return data;
}

/** A new student enrols with their own details. The school adds the permit details and makes the Student ID afterwards. */
export async function enrolStudent(f) {
  const { data, error } = await supabase.rpc('enrol_student', {
    p_full_name: f.full_name, p_email: f.email || '', p_citizen_of: f.citizen_of || '', p_category: f.aircraft_category || '',
    p_date_of_birth: f.date_of_birth || null, p_phone: f.whatsapp || '', p_whatsapp: f.whatsapp || '',
    p_emergency_name: f.emergency_name || '', p_emergency_phone: f.emergency_phone || '', p_emergency_relationship: f.emergency_relationship || '',
  });
  if (error) throw error;
  return data;
}

/** The sign-in page: tell the school you need a new temporary password. Use a Student ID, an email or the WhatsApp number. It always looks the same from outside. */
export async function requestTempPassword(who) {
  const { error } = await supabase.rpc('request_temp_password', { p_who: who });
  if (error) throw error;
}

/** The team gives a student a new temporary password. Returns { temp_password }. It is shown once, to send on WhatsApp. */
export async function staffResetPassword(userId) {
  const { data, error } = await supabase.rpc('staff_reset_password', { p_user: userId });
  if (error) throw error;
  return data;
}

export async function removeEnrolment(userId) {
  const { error } = await supabase.rpc('remove_enrolment', { p_user: userId });
  if (error) throw error;
}

/** The signed-in student's own row, read fresh from the database. */
export async function fetchMyStudent() {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from('students').select('*').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  return data;
}

export async function changeMyPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function saveMyWhatsapp(number) {
  const { error } = await supabase.rpc('set_my_whatsapp', { p_number: number });
  if (error) throw error;
}

/** A WhatsApp link with the message already typed. Ten digits are taken as a Canada or US number. */
export function waLink(number, text) {
  let n = String(number || '').replace(/\D/g, '');
  if (n.length === 10) n = `1${n}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
export const portalUrl = () => `${window.location.origin}${window.location.pathname}#student-corner`;

// ---- Payments (Interac e-Transfer) ----
export async function fetchPayments(userId) {
  const { data, error } = await supabase.from('payments').select('*').eq('student_user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function fetchPendingPayments() {
  const { data, error } = await supabase.from('payments').select('*, students(user_id, student_id, full_name, whatsapp)')
    .eq('status', 'pending').order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}
export async function reportPayment(userId, fields) {
  const { error } = await supabase.from('payments').insert({ ...fields, student_user_id: userId, method: 'etransfer' });
  if (error) throw error;
}
export async function confirmPayment(id, by) {
  const { error } = await supabase.from('payments').update({ status: 'confirmed', confirmed_by: by, confirmed_at: new Date().toISOString(), team_note: null }).eq('id', id);
  if (error) throw error;
}
export async function declinePayment(id, note) {
  const { error } = await supabase.from('payments').update({ status: 'declined', team_note: note }).eq('id', id);
  if (error) throw error;
}
export async function deletePayment(id) {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
}

/** Add (no id) or change (id) a logbook entry. Fields are the flights table columns. */
export async function saveFlight(studentUserId, fields, id) {
  if (id) {
    const { error } = await supabase.from('flights').update(fields).eq('id', id);
    if (error) throw error;
    return null;
  }
  const { data, error } = await supabase.from('flights').insert({ ...fields, student_user_id: studentUserId }).select().single();
  if (error) throw error;
  return data;
}

/** The instructor signs the flight and confirms its payment together. */
export async function approveFlight(id, by) {
  const { error } = await supabase.rpc('approve_flight', { p_flight: id, p_by: by });
  if (error) throw error;
}

export async function deleteFlight(id) {
  const { error } = await supabase.from('flights').delete().eq('id', id);
  if (error) throw error;
}

/** An instructor signs an entry (signedBy = their name) or takes the signature off (signedBy = null). */
export async function setSignOff(id, signedBy) {
  const patch = signedBy
    ? { signed_off: true, signed_by: signedBy, signed_at: new Date().toISOString(), returned_note: null }
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
