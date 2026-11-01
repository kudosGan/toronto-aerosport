import { useRef, useState } from 'react';
import { PlaneArt } from './Art';
import { money } from '../lib/listings';
import './ListingCard.css';

// Photos sit in a swipeable strip (swipe on phones, arrows on computers). Clicking the photo or the text opens the details.
export default function ListingCard({ l, onOpen }) {
  const photos = l.photos || [];
  const many = photos.length > 1;
  const track = useRef(null);
  const [i, setI] = useState(0);
  const price = money(l.price);

  const go = (d) => (e) => {
    e.stopPropagation();
    const el = track.current;
    el.scrollTo({ left: ((i + d + photos.length) % photos.length) * el.clientWidth, behavior: 'smooth' });
  };
  const onScroll = (e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth));

  return (
    <article className={`lc ${l.status === 'sold' ? 'is-sold' : ''}`}>
      <div className="lc__img" onClick={() => onOpen(l)}>
        <div className="lc__track" ref={track} onScroll={onScroll}>
          {photos.length
            ? photos.map((p, n) => <img key={p} src={p} alt={`${l.title}, photo ${n + 1}`} loading={n ? 'lazy' : undefined} draggable="false" />)
            : <PlaneArt />}
        </div>
        {l.status === 'sold' && <span className="lc__ribbon lc__ribbon--sold">Sold</span>}
        {l.demo && <span className="lc__ribbon lc__ribbon--demo">Sample</span>}
        {many && (
          <>
            <button type="button" className="lc__nav lc__nav--prev" onClick={go(-1)} aria-label="Previous photo">‹</button>
            <button type="button" className="lc__nav lc__nav--next" onClick={go(1)} aria-label="Next photo">›</button>
            <span className="lc__dots" aria-hidden="true">{photos.map((p, n) => <i key={p} className={n === i ? 'on' : ''} />)}</span>
            <span className="lc__count">{i + 1}/{photos.length}</span>
          </>
        )}
      </div>
      <button type="button" className="lc__body" onClick={() => onOpen(l)}>
        <strong className="lc__price">{price || 'Call for price'}</strong>
        <span className="lc__title">{l.title}</span>
        <span className="lc__meta">
          {[l.year, l.hours != null && l.hours !== '' ? `${l.hours} hrs` : null, l.engine].filter(Boolean).join(' · ')}
        </span>
        {l.location && <span className="lc__loc">📍 {l.location}</span>}
      </button>
    </article>
  );
}
