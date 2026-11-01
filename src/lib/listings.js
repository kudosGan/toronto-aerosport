import { supabase, configured } from './supabase';

export const isDemo = !configured;
const BUCKET = 'aircraft-photos';
const base = import.meta.env.BASE_URL;

// ---- Demo mode: sample listings so the page can be shown before Supabase is connected ----
let demoStore = [
  { id: 'demo-1', demo: true, created_at: '2026-10-01', title: 'Sample: Sport plane', price: 54000, year: 2008, hours: 620, engine: 'Rotax 912', location: 'Stouffville, ON', status: 'available', photos: [`${base}images/hero.jpg`], description: 'This is a SAMPLE listing to show how the page looks. Real listings will replace it.' },
  { id: 'demo-2', demo: true, created_at: '2026-09-20', title: 'Sample: Ultralight with passenger seat', price: 38500, year: 2012, hours: 410, engine: 'Rotax 582', location: 'Stouffville, ON', status: 'available', photos: [`${base}images/learn.jpg`], description: 'SAMPLE listing. Add your own photos and details from the Team page.' },
  { id: 'demo-3', demo: true, created_at: '2026-09-02', title: 'Sample: Hangar-kept trainer', price: null, year: 2015, hours: 880, engine: 'Rotax 912 ULS', location: 'Stouffville, ON', status: 'sold', photos: [`${base}images/plane.jpg`], description: 'SAMPLE listing marked as sold.' },
];

// Shrink phone photos before upload (keeps pages fast and storage small)
export async function resizeImage(file, max = 1600, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
}

async function uploadPhoto(file) {
  const blob = await resizeImage(file);
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function fetchListings() {
  if (isDemo) return [...demoStore];
  const { data, error } = await supabase.from('listings').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** photos: array of existing URLs (strings) and new File objects, in display order */
export async function saveListing(fields, photos, id) {
  if (isDemo) {
    const urls = photos.map((p) => (typeof p === 'string' ? p : URL.createObjectURL(p)));
    const row = { ...fields, photos: urls, id: id || `demo-${Date.now()}`, created_at: new Date().toISOString() };
    demoStore = id ? demoStore.map((l) => (l.id === id ? { ...l, ...row, created_at: l.created_at } : l)) : [row, ...demoStore];
    return row;
  }
  const urls = [];
  for (const p of photos) urls.push(typeof p === 'string' ? p : await uploadPhoto(p));
  const row = { ...fields, photos: urls };
  const q = id ? supabase.from('listings').update(row).eq('id', id) : supabase.from('listings').insert(row);
  const { data, error } = await q.select().single();
  if (error) throw error;
  return data;
}

export async function setStatus(id, status) {
  if (isDemo) { demoStore = demoStore.map((l) => (l.id === id ? { ...l, status } : l)); return; }
  const { error } = await supabase.from('listings').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteListing(listing) {
  if (isDemo) { demoStore = demoStore.filter((l) => l.id !== listing.id); return; }
  const { error } = await supabase.from('listings').delete().eq('id', listing.id);
  if (error) throw error;
  const names = (listing.photos || []).filter((u) => u.includes(`/${BUCKET}/`)).map((u) => u.split(`/${BUCKET}/`)[1]);
  if (names.length) await supabase.storage.from(BUCKET).remove(names);
}

// ---- Team sign-in ----
export async function getUser() {
  if (isDemo) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}
// A short username such as "admin" is turned into an email, and the password gets a suffix,
// because Supabase needs an email and at least 6 characters. A full email is used as typed.
const TEAM_DOMAIN = 'team.torontoaerosport.com';
const TEAM_SUFFIX = '-aero';
export async function signIn(username, password) {
  const name = username.trim().toLowerCase();
  if (isDemo) return { email: name || 'demo@team' };
  const short = !name.includes('@');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: short ? `${name}@${TEAM_DOMAIN}` : name,
    password: short ? password + TEAM_SUFFIX : password,
  });
  if (error) throw error;
  return data.user;
}
export async function signOut() { if (!isDemo) await supabase.auth.signOut(); }

export const money = (n) => (n == null || n === '' ? null : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n));
