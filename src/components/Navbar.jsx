import { useEffect, useState } from 'react';
import Logo from './Logo';
import { navLinks } from '../data/siteData';
import './Navbar.css';

export default function Navbar({ theme, onToggleTheme }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock page scroll while the phone menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`navbar ${scrolled || open ? 'navbar--solid' : ''}`}>
      <div className="container navbar__inner">
        <a href="#top" aria-label="Toronto Aerosport home" onClick={close}><Logo /></a>

        <nav className="navbar__links" aria-label="Main">
          {navLinks.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
        </nav>

        <div className="navbar__actions">
          <a href="#intro-flight" className="btn btn-primary navbar__cta">Book a flight</a>
          <button className="navbar__icon" onClick={onToggleTheme} aria-label="Switch day and night colours">
            {theme === 'night' ? '☀️' : '🌙'}
          </button>
          <button className="navbar__icon navbar__burger" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            <span className={open ? 'is-x' : ''} />
          </button>
        </div>
      </div>

      <nav className={`navbar__mobile ${open ? 'is-open' : ''}`} aria-label="Mobile">
        {navLinks.map((l) => <a key={l.href} href={l.href} onClick={close}>{l.label}</a>)}
        <a href="#intro-flight" className="btn btn-primary" onClick={close}>Book an introductory flight</a>
      </nav>
    </header>
  );
}
