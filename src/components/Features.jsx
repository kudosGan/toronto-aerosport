import { ImageSlot } from './Art';
import useReveal from '../hooks/useReveal';
import { features, contact } from '../data/siteData';
import './Features.css';

export default function Features() {
  const [ref, visible] = useReveal();
  return (
    <section className="section features" id="why">
      <div className="container">
        <div className="section-head center">
          <span className="eyebrow">Why Toronto Aerosport</span>
          <h2>A simple way to start flying</h2>
        </div>
        <div ref={ref} className="features__grid">
          {features.map((f, i) => (
            <a key={f.title} href={f.link} className={`feature reveal ${visible ? 'visible' : ''}`} style={{ transitionDelay: `${i * 120}ms` }}>
              <div className="feature__img"><ImageSlot name={f.art} alt="" /></div>
              <div className="feature__body">
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <div className="feature__price">
                  <small>{f.priceLabel}</small>
                  {f.price ? <strong>{f.price}</strong> : <strong className="is-call">Call for price <span>{contact.phone}</span></strong>}
                </div>
                <span className="feature__cta">{f.cta} →</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
