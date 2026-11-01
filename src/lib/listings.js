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
// If the browser cannot shrink a photo, the original file is uploaded instead of failing.
function decode(file) {
  if (window.createImageBitmap) return createImageBitmap(file).catch(() => decodeWithImg(file));
  return decodeWithImg(file);
}
function decodeWithImg(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('The browser could not read this photo')); };
    img.src = url;
  });
}

export async function resizeImage(file, max = 1600, quality = 0.82) {
  try {
    const src = await decode(file);
    const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
    const scale = Math.min(1, max / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (blob) return blob;
  } catch (e) { console.warn('Photo not resized, uploading original', e); }
  return file;
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

async function uploadPhoto(file) {
  const blob = await resizeImage(file);
  const type = blob.type || 'image/jpeg';
  const path = `${uid()}.${type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type });
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
export async function signIn(email, password) {
  const name = email.trim().toLowerCase();
  if (isDemo) return { email: name || 'demo@team' };
  const { data, error } = await supabase.auth.signInWithPassword({ email: name, password });
  if (error) throw error;
  return data.user;
}
export async function signOut() { if (!isDemo) await supabase.auth.signOut(); }

export const money = (n) => (n == null || n === '' ? null : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n));
