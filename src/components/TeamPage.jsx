import { useEffect, useRef, useState } from 'react';
import { PlaneArt } from './Art';
import { fetchListings, saveListing, setStatus, deleteListing, getUser, signIn, signOut, isDemo, money } from '../lib/listings';
import './TeamPage.css';

const MAX_PHOTOS = 6;
const blank = { title: '', price: '', year: '', hours: '', engine: '', location: 'Stouffville, ON', description: '', status: 'available' };

export function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { onDone(await signIn(email, password)); } catch { setErr('Username or password is wrong.'); }
    setBusy(false);
  };
  return (
    <form className="tp-card tp-login" onSubmit={submit}>
      <h2>Team sign in</h2>
      {isDemo && <p className="tp-note">Demo mode: type any username and password to look around. Nothing is saved online.</p>}
      <label>Username<input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoCapitalize="none" required /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required={!isDemo} /></label>
      {err && <p className="tp-err">{err}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

export function ListingForm({ initial, onSaved, onCancel }) {
  const editing = Boolean(initial?.id);
  const [f, setF] = useState(editing ? { ...blank, ...initial, price: initial.price ?? '', year: initial.year ?? '', hours: initial.hours ?? '' } : blank);
  const [photos, setPhotos] = useState(initial?.photos || []); // strings (saved) or File (new)
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef();
  const cameraRef = useRef();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const addFiles = (e) => {
    const files = [...e.target.files].filter((x) => x.type.startsWith('image/'));
    setPhotos((p) => [...p, ...files].slice(0, MAX_PHOTOS));
    e.target.value = '';
  };
  const urlOf = (p) => (typeof p === 'string' ? p : URL.createObjectURL(p));
  const move = (i, d) => setPhotos((p) => { const a = [...p]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) return setErr('Please add a title.');
    setBusy(true); setErr('');
    const num = (v) => (v === '' || v == null ? null : Number(v));
    try {
      const fields = { title: f.title.trim(), price: num(f.price), year: num(f.year), hours: num(f.hours), engine: f.engine.trim() || null, location: f.location.trim() || null, description: f.description.trim() || null, status: f.status };
      onSaved(await saveListing(fields, photos, initial?.id));
    } catch (ex) { setErr('Could not save. Check your internet and try again.'); console.error(ex); setBusy(false); }
  };

  return (
    <form className="tp-card tp-form" onSubmit={submit}>
      <h2>{editing ? 'Edit aircraft' : 'Add an aircraft'}</h2>

      <div className="tp-photos">
        <div className="tp-photos__head"><strong>Photos</strong><small>{photos.length}/{MAX_PHOTOS}. The first photo is the cover.</small></div>
        <div className="tp-photos__grid">
          {photos.map((p, i) => (
            <div key={i} className="tp-photo">
              <img src={urlOf(p)} alt={`Photo ${i + 1}`} />
              {i === 0 && <span className="tp-cover">Cover</span>}
              <div className="tp-photo__tools">
                <button type="button" onClick={() => move(i, -1)} aria-label="Move earlier">←</button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Move later">→</button>
                <button type="button" onClick={() => setPhotos(photos.filter((_, n) => n !== i))} aria-label="Remove photo">✕</button>
              </div>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" className="tp-add" onClick={() => fileRef.current.click()}>
              <span>🖼️</span>Choose photos
            </button>
          )}
          {photos.length < MAX_PHOTOS && (
            <button type="button" className="tp-add" onClick={() => cameraRef.current.click()}>
              <span>📷</span>Take a photo
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={addFiles} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={addFiles} />
      </div>

      <label>Title<input value={f.title} onChange={set('title')} placeholder="2012 Sport plane, Rotax 912" required /></label>
      <div className="tp-row">
        <label>Price (CAD)<input type="number" inputMode="numeric" min="0" value={f.price} onChange={set('price')} placeholder="Leave empty for “Call for price”" /></label>
        <label>Year<input type="number" inputMode="numeric" value={f.year} onChange={set('year')} /></label>
      </div>
      <div className="tp-row">
        <label>Total time (hours)<input type="number" inputMode="decimal" min="0" value={f.hours} onChange={set('hours')} /></label>
        <label>Engine<input value={f.engine} onChange={set('engine')} placeholder="Rotax 912" /></label>
      </div>
      <label>Location<input value={f.location} onChange={set('location')} /></label>
      <label>Description<textarea rows="6" value={f.description} onChange={set('description')} placeholder="Condition, avionics, upgrades, why you are selling…" /></label>
      <label>Status
        <select value={f.status} onChange={set('status')}><option value="available">For sale</option><option value="sold">Sold</option></select>
      </label>

      {err && <p className="tp-err">{err}</p>}
      <div className="tp-actions">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Post aircraft'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}

export default function TeamPage() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // null | {} (new) | listing
  const [confirmId, setConfirmId] = useState(null);

  const load = () => fetchListings().then(setItems).catch(() => {});
  useEffect(() => { getUser().then((u) => { setUser(u); setReady(true); }); }, []);
  useEffect(() => { if (user) load(); }, [user]);

  if (!ready) return <section className="tp"><div className="container"><p>Loading…</p></div></section>;

  return (
    <section className="tp">
      <div className="container">
        {!user ? <Login onDone={setUser} /> : editing ? (
          <ListingForm initial={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        ) : (
          <>
            <div className="tp-head">
              <div><span className="eyebrow">Team area</span><h1>Aircraft listings</h1></div>
              <div className="tp-head__btns">
                <button className="btn btn-primary" onClick={() => setEditing({})}>+ Add aircraft</button>
                <button className="btn btn-ghost" onClick={async () => { await signOut(); setUser(null); }}>Sign out</button>
              </div>
            </div>
            {isDemo && <p className="tp-note">Demo mode: changes are not saved online and disappear when you refresh.</p>}
            {items.length === 0 && <div className="tp-card tp-empty"><PlaneArt /><p>No listings yet. Tap “Add aircraft” to post the first one.</p></div>}
            <ul className="tp-list">
              {items.map((l) => (
                <li key={l.id} className="tp-card tp-item">
                  <div className="tp-item__img">{l.photos?.[0] ? <img src={l.photos[0]} alt="" /> : <PlaneArt />}</div>
                  <div className="tp-item__info">
                    <strong>{l.title}</strong>
                    <span>{money(l.price) || 'Call for price'} · {l.status === 'sold' ? 'Sold' : 'For sale'}</span>
                  </div>
                  <div className="tp-item__btns">
                    <button onClick={() => setEditing(l)}>Edit</button>
                    <button onClick={async () => { await setStatus(l.id, l.status === 'sold' ? 'available' : 'sold'); load(); }}>{l.status === 'sold' ? 'Mark for sale' : 'Mark sold'}</button>
                    {confirmId === l.id ? (
                      <button className="danger" onClick={async () => { await deleteListing(l); setConfirmId(null); load(); }}>Yes, delete</button>
                    ) : <button className="danger" onClick={() => setConfirmId(l.id)}>Delete</button>}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
