import { useEffect, useState } from 'react';
import ListingCard from './ListingCard';
import { PlaneArt } from './Art';
import { Login, ListingForm } from './TeamPage';
import { fetchListings, getUser, signOut, isDemo, money } from '../lib/listings';
import { contact } from '../data/siteData';
import './ForSalePage.css';

function Modal({ l, onClose }) {
  const [i, setI] = useState(0);
  const photos = l.photos?.length ? l.photos : [];
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (photos.length > 1 && e.key === 'ArrowLeft') setI((n) => (n - 1 + photos.length) % photos.length);
      if (photos.length > 1 && e.key === 'ArrowRight') setI((n) => (n + 1) % photos.length);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose, photos.length]);

  const specs = [
    ['Year', l.year], ['Total time', l.hours !== '' && l.hours != null ? `${l.hours} hours` : null],
    ['Engine', l.engine], ['Location', l.location],
  ].filter(([, v]) => v);
  const subject = encodeURIComponent(`Aircraft for sale: ${l.title}`);

  return (
    <div className="lm" role="dialog" aria-modal="true" aria-label={l.title} onClick={onClose}>
      <div className="lm__panel" onClick={(e) => e.stopPropagation()}>
        <button className="lm__close" onClick={onClose} aria-label="Close">✕</button>
        <div className="lm__gallery">
          <div className="lm__main">
            {photos.length ? <img src={photos[i]} alt={l.title} /> : <PlaneArt />}
            {photos.length > 1 && (
              <>
                <button type="button" className="lm__nav lm__nav--prev" onClick={() => setI((i - 1 + photos.length) % photos.length)} aria-label="Previous photo">‹</button>
                <button type="button" className="lm__nav lm__nav--next" onClick={() => setI((i + 1) % photos.length)} aria-label="Next photo">›</button>
                <span className="lm__count">{i + 1} / {photos.length}</span>
              </>
            )}
          </div>
          {photos.length > 1 && (
            <div className="lm__thumbs">
              {photos.map((p, n) => (
                <button key={p} className={n === i ? 'on' : ''} onClick={() => setI(n)} aria-label={`Photo ${n + 1}`}><img src={p} alt="" /></button>
              ))}
            </div>
          )}
        </div>
        <div className="lm__info">
          {l.status === 'sold' && <span className="lm__sold">Sold</span>}
          <strong className="lm__price">{money(l.price) || 'Call for price'}</strong>
          <h2>{l.title}</h2>
          {specs.length > 0 && <dl>{specs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
          {l.description && <p className="lm__desc">{l.description}</p>}
          <div className="lm__cta">
            <a className="btn btn-primary" href={`tel:${contact.phoneLink}`}>Call {contact.phone}</a>
            <a className="btn btn-ghost" href={`mailto:${contact.email}?subject=${subject}`}>Email about this aircraft</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForSalePage() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('available');
  const [open, setOpen] = useState(null);
  const [user, setUser] = useState(null);
  const [panel, setPanel] = useState(null); // null | 'login' | 'create'

  const load = () => fetchListings().then(setItems).catch(() => setError('Could not load the aircraft. Please try again.'));
  useEffect(() => { load(); getUser().then(setUser); }, []);

  const shown = (items || []).filter((l) => filter === 'all' || l.status === filter);

  return (
    <>
      <section className="fs-hero">
        <div className="container">
          <span className="eyebrow">Aircraft for sale</span>
          <h1>Find your aircraft</h1>
          <p>Ultralight and light sport aircraft from the Toronto Aerosport community. Tap a card to see photos and details.</p>
          {isDemo && <p className="fs-demo"><strong>Demo mode.</strong> These are sample listings. They are replaced once the team connects the online database.</p>}
        </div>
      </section>

      <section className="fs-list">
        <div className="container">
          <div className="fs-team">
            {user ? (
              <>
                <button className="btn btn-primary" onClick={() => setPanel('create')}>+ Create your listing</button>
                <a className="btn btn-ghost" href="#team">Manage listings</a>
                <button className="btn btn-ghost" onClick={async () => { await signOut(); setUser(null); setPanel(null); }}>Sign out</button>
              </>
            ) : (
              <button className="btn btn-ghost" onClick={() => setPanel(panel === 'login' ? null : 'login')}>Team login</button>
            )}
          </div>

          {panel && (
            <div className="tp tp--inline">
              {panel === 'login' && !user && <Login onDone={(u) => { setUser(u); setPanel('create'); }} />}
              {panel === 'create' && user && (
                <ListingForm onCancel={() => setPanel(null)} onSaved={() => { setPanel(null); setFilter('available'); load(); }} />
              )}
            </div>
          )}

          <div className="fs-filters" role="tablist" aria-label="Filter">
            {[['available', 'For sale'], ['sold', 'Sold'], ['all', 'All']].map(([k, label]) => (
              <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{label}</button>
            ))}
          </div>

          {error && <p className="fs-msg">{error}</p>}
          {!items && !error && <p className="fs-msg">Loading aircraft…</p>}
          {items && shown.length === 0 && (
            <div className="fs-empty">
              <PlaneArt />
              <h3>No aircraft here right now</h3>
              <p>New aircraft are added often. Call us on <a href={`tel:${contact.phoneLink}`}>{contact.phone}</a> and tell us what you are looking for.</p>
            </div>
          )}
          <div className="fs-grid">
            {shown.map((l) => <ListingCard key={l.id} l={l} onOpen={setOpen} />)}
          </div>

          <div className="fs-sell">
            <h3>Want to sell your aircraft?</h3>
            <p>Talk to our team. We can list it here with photos and a description.</p>
            <a href={`tel:${contact.phoneLink}`} className="btn btn-primary">Call {contact.phone}</a>
          </div>
        </div>
      </section>
      {open && <Modal l={open} onClose={() => setOpen(null)} />}
    </>
  );
}
