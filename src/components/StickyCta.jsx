import { useEffect, useState } from 'react';
import './StickyCta.css';

// Mobile-only bar that appears after scrolling past the hero, so booking is always one tap away.
export default function StickyCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className={`stickycta ${show ? 'is-visible' : ''}`}>
      <a href="#intro-flight" className="btn btn-primary">Book an introductory flight →</a>
    </div>
  );
}
