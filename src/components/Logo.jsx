import './Logo.css';

// Text-based recreation of the wordmark; swap for your real logo image in /public/images if you prefer.
export default function Logo() {
  return (
    <span className="logo">
      <span className="logo__top">TORONTO</span>
      <span className="logo__main">Aerosport<small>inc.</small></span>
    </span>
  );
}
