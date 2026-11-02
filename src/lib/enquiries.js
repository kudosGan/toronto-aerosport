import { supabase, configured } from './supabase';

// Remember where the visitor came from (for example a link ending ?utm_source=instagram), so the team can see which marketing works.
export function captureSource() {
  try {
    const p = new URLSearchParams(window.location.search);
    const s = p.get('utm_source') || p.get('ref');
    if (s) window.sessionStorage.setItem('source', s.slice(0, 60));
  } catch { /* ignore */ }
}
function currentSource() {
  try {
    const saved = window.sessionStorage.getItem('source');
    if (saved) return saved;
    if (document.referrer) return new URL(document.referrer).hostname.slice(0, 60);
  } catch { /* ignore */ }
  return null;
}

/** Saves the enquiry. Throws if it could not be saved, so the form never says "thank you" for a lost request. */
export async function submitEnquiry(f) {
  if (!configured) { console.log('Enquiry (demo mode, not saved)', f); return; }
  const clean = (v, max) => (v && v.trim() ? v.trim().slice(0, max) : null);
  const { error } = await supabase.from('enquiries').insert({
    name: f.name.trim().slice(0, 120), email: f.email.trim().slice(0, 200),
    phone: clean(f.phone, 40), heard_from: clean(f.heard_from, 60), message: clean(f.message, 1000), source: currentSource(),
  });
  if (error) throw error;
}

export async function fetchEnquiries() {
  const { data, error } = await supabase.from('enquiries').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data;
}

export async function setEnquiryStatus(id, status) {
  const { error } = await supabase.from('enquiries').update({ status }).eq('id', id);
  if (error) throw error;
}
