import { useEffect, useState } from 'react';
import Logo from './Logo';
import { navLinks, contact } from '../data/siteData';
import './Footer.css';

export default function Footer() {
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <footer className="footer" id="contact">
      <div className="container footer__grid">
        <div>
          <Logo />
          <p>Fixed wing flight school. Learn to fly ultralight and light sport aircraft in Stouffville, Ontario.</p>
          <p>📞 <a href={`tel:${contact.phoneLink}`}>{contact.phone}</a> ({contact.phoneLabel})<br />✉️ <a href={`mailto:${contact.email}`}>{contact.email}</a><br />📍 {contact.officeAddress}</p>
        </div>
        <nav aria-label="Footer">
          <h3>Explore</h3>
          <div className="footer__links">
            {navLinks.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          </div>
        </nav>
      </div>
      <div className="footer__bar">© {new Date().getFullYear()} Toronto Aerosport Inc. All rights reserved. · <a href="#team" className="footer__team">Team login</a></div>
      {showTop && <a href="#top" className="footer__top" aria-label="Back to top">↑</a>}
    </footer>
  );
}
