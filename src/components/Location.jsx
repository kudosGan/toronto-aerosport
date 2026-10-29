import useReveal from '../hooks/useReveal';
import { contact } from '../data/siteData';
import './Location.css';

export default function Location() {
  const [ref, visible] = useReveal();
  return (
    <section className="section where" id="where">
      <div ref={ref} className={`container where__inner reveal ${visible ? 'visible' : ''}`}>
        <div>
          <span className="eyebrow">Where we are</span>
          <h2>Find us in Stouffville, Ontario</h2>
          <p>We are north-east of Toronto. It is an easy drive for a day in the air.</p>
          <ul>
            <li><strong>We fly from:</strong> {contact.flyingAt}</li>
            <li><strong>Office:</strong> {contact.officeAddress}</li>
            <li><strong>Phone ({contact.phoneLabel}):</strong> <a href={`tel:${contact.phoneLink}`}>{contact.phone}</a></li>
            <li><strong>Email:</strong> <a href={`mailto:${contact.email}`}>{contact.email}</a></li>
            <li><strong>Our team:</strong> {contact.people.join(', ')}</li>
          </ul>
          <a className="btn btn-ghost" href="https://www.google.com/maps/search/?api=1&query=Stouffville+Ontario" target="_blank" rel="noreferrer">Open in Maps ↗</a>
        </div>
        <div className="where__map" aria-hidden="true">
          <div className="where__pulse" />
          <span className="where__pin">📍</span>
          <span className="where__label where__label--gta">Toronto / GTA</span>
          <span className="where__label where__label--bw">Stouffville</span>
        </div>
      </div>
    </section>
  );
}
