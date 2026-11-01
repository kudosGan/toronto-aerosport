import { useEffect, useState } from 'react';
import ListingCard from './ListingCard';
import { fetchListings, isDemo } from '../lib/listings';
import './SaleTeaser.css';

// Shows up to 3 newest aircraft on the home page. Hidden if there is nothing to show.
export default function SaleTeaser() {
  const [items, setItems] = useState([]);
  useEffect(() => { if (isDemo) return; fetchListings().then((all) => setItems(all.filter((l) => l.status === 'available').slice(0, 3))).catch(() => {}); }, []);
  if (!items.length) return null;
  return (
    <section className="section teaser" id="for-sale">
      <div className="container">
        <div className="teaser__head">
          <div className="section-head"><span className="eyebrow">Aircraft for sale</span><h2>Ready to own your aircraft?</h2></div>
          <a href="#aircraft-for-sale" className="btn btn-ghost">See all aircraft →</a>
        </div>
        <div className="teaser__grid">
          {items.map((l) => <ListingCard key={l.id} l={l} onOpen={() => { window.location.hash = 'aircraft-for-sale'; }} />)}
        </div>
      </div>
    </section>
  );
}
