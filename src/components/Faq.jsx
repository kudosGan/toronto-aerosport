import { useState } from 'react';
import { faqs } from '../data/siteData';
import './Faq.css';

export default function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="section faq" id="faq">
      <div className="container faq__inner">
        <div className="section-head">
          <span className="eyebrow">Questions</span>
          <h2>Quick answers</h2>
        </div>
        <div className="faq__list">
          {faqs.map((f, i) => (
            <div key={f.q} className={`faq__item ${open === i ? 'is-open' : ''}`}>
              <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                {f.q}<span>+</span>
              </button>
              <div className="faq__a"><p>{f.a}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
