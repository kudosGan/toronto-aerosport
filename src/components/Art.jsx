import { useState } from 'react';
import './Art.css';

/* Illustrated artwork used until real photos are added.
   To use your own photo, save it in public/images/ with the name shown in <ImageSlot name="..."> (jpg). */

function PlaneShape({ x = 0, y = 0, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="100" cy="46" rx="62" ry="12" fill="#ffc61a" />
      <path d="M150 42 L186 22 L190 30 L160 50 Z" fill="#ff6b2c" />
      <path d="M70 44 L110 8 L124 10 L100 48 Z" fill="#ffd54a" stroke="#d4a000" strokeWidth="1.5" />
      <path d="M70 50 L112 84 L124 82 L100 46 Z" fill="#f2b400" />
      <ellipse cx="82" cy="38" rx="20" ry="9" fill="#bfe0ff" stroke="#0a1f44" strokeWidth="2" />
      <circle cx="40" cy="46" r="5" fill="#0a1f44" />
      <rect x="34" y="28" width="3" height="36" rx="1.5" fill="#0a1f44" opacity=".5" />
    </g>
  );
}

export function HeroArt() {
  return (
    <svg viewBox="0 0 600 480" role="img" aria-label="Small yellow plane flying over a lake" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4aa3ff" /><stop offset=".7" stopColor="#bfe0ff" /><stop offset="1" stopColor="#ffe9c9" /></linearGradient>
        <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f8cf0" /><stop offset="1" stopColor="#0f5fc4" /></linearGradient>
      </defs>
      <rect width="600" height="480" fill="url(#sky)" />
      <circle cx="470" cy="120" r="46" fill="#fff6d6" opacity=".95" />
      <g fill="#fff" opacity=".9"><ellipse cx="120" cy="90" rx="60" ry="16" /><ellipse cx="160" cy="76" rx="36" ry="14" /><ellipse cx="400" cy="210" rx="70" ry="16" /><ellipse cx="440" cy="196" rx="36" ry="13" /></g>
      <path d="M0 320 Q120 270 240 310 T480 300 T600 320 V480 H0Z" fill="#7bb67a" />
      <rect y="350" width="600" height="130" fill="url(#lake)" />
      <g stroke="#fff" strokeWidth="3" opacity=".35" strokeLinecap="round"><path d="M60 390h70M200 420h90M380 385h80M470 440h70" /></g>
      <path d="M0 400 Q150 360 300 395 T600 380 V480 H0Z" fill="#4f9a56" />
      <path d="M0 440 Q200 410 400 440 T600 430 V480 H0Z" fill="#3d8545" />
      <g className="art-plane"><PlaneShape x={190} y={150} s={1.35} /></g>
    </svg>
  );
}

export function LearnArt() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Runway at sunrise" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="s2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb36b" /><stop offset="1" stopColor="#ffe3b8" /></linearGradient></defs>
      <rect width="400" height="260" fill="url(#s2)" />
      <circle cx="300" cy="150" r="48" fill="#fff3c9" />
      <path d="M0 150 Q100 120 200 145 T400 140 V260 H0Z" fill="#6aa86a" />
      <path d="M150 260 L190 150 L215 150 L270 260Z" fill="#4b5563" />
      <g stroke="#fff" strokeWidth="4" strokeDasharray="10 12"><path d="M205 260 L202 150" /></g>
      <PlaneShape x={40} y={60} s={.6} />
    </svg>
  );
}

export function PlaneArt() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Small yellow aircraft" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="s3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5db0ff" /><stop offset="1" stopColor="#d6ecff" /></linearGradient></defs>
      <rect width="400" height="260" fill="url(#s3)" />
      <g fill="#fff" opacity=".9"><ellipse cx="90" cy="60" rx="50" ry="13" /><ellipse cx="320" cy="190" rx="56" ry="13" /></g>
      <PlaneShape x={90} y={70} s={1.1} />
    </svg>
  );
}

export function CostArt() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Price tag" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="260" fill="#eaf3ff" />
      <circle cx="320" cy="60" r="70" fill="#cfe4ff" />
      <circle cx="60" cy="220" r="80" fill="#d9ebff" />
      <g transform="rotate(-12 200 130)">
        <path d="M110 80 H250 L300 130 L250 180 H110 Q95 180 95 165 V95 Q95 80 110 80Z" fill="#ff6b2c" />
        <circle cx="130" cy="130" r="12" fill="#fff" />
        <text x="165" y="146" fontFamily="Outfit, sans-serif" fontSize="46" fontWeight="800" fill="#fff">Less</text>
      </g>
    </svg>
  );
}

const art = { hero: HeroArt, learn: LearnArt, plane: PlaneArt, cost: CostArt };

/** Shows /images/<name>.jpg if you add one; otherwise shows the illustrated fallback. */
export function ImageSlot({ name, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  const Fallback = art[name] || HeroArt;
  return (
    <div className={`imgslot ${className}`}>
      {failed ? <Fallback /> : <img src={`${import.meta.env.BASE_URL}images/${name}.jpg`} alt={alt} loading="lazy" onError={() => setFailed(true)} />}
    </div>
  );
}
