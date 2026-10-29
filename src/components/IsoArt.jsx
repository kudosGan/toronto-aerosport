// Original isometric-style illustrations for the "4 parts" cards.
const K = Math.cos(Math.PI / 6);
const P = (x, y, z, ox = 110, oy = 50) => [ox + (x - y) * K, oy + (x + y) * 0.5 - z];
const pts = (arr) => arr.map((p) => p.join(',')).join(' ');

// colors = [top, front-left face, front-right face]
function Box({ x, y, z, w, d, h, c }) {
  const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const left = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const right = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
  return (
    <g>
      <polygon points={pts(left)} fill={c[1]} />
      <polygon points={pts(right)} fill={c[2]} />
      <polygon points={pts(top)} fill={c[0]} />
    </g>
  );
}

const Platform = ({ c = ['#ffffff', '#cfe0f7', '#b8d0f0'] }) => <Box x={0} y={0} z={0} w={100} d={100} h={10} c={c} />;

const Plane = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="100" cy="46" rx="62" ry="12" fill="#ffc61a" />
    <path d="M150 42 L186 22 L190 30 L160 50 Z" fill="#ff6b2c" />
    <path d="M70 44 L110 8 L124 10 L100 48 Z" fill="#ffd54a" stroke="#d4a000" strokeWidth="1.5" />
    <path d="M70 50 L112 84 L124 82 L100 46 Z" fill="#f2b400" />
    <ellipse cx="82" cy="38" rx="20" ry="9" fill="#bfe0ff" stroke="#0a1f44" strokeWidth="2" />
    <circle cx="40" cy="46" r="5" fill="#0a1f44" />
  </g>
);

const Svg = ({ children, label }) => (
  <svg viewBox="0 0 220 180" role="img" aria-label={label}>{children}</svg>
);

export function GroundArt() {
  return (
    <Svg label="Books and a laptop">
      <Platform />
      <Box x={14} y={18} z={10} w={36} d={28} h={7} c={['#3b82f6', '#1d4ed8', '#2563eb']} />
      <Box x={16} y={20} z={17} w={32} d={24} h={6} c={['#ff8a50', '#e5551a', '#ff6b2c']} />
      <Box x={18} y={22} z={23} w={28} d={20} h={6} c={['#35527d', '#0a1f44', '#14305e']} />
      <Box x={54} y={50} z={10} w={36} d={30} h={3} c={['#e5e7eb', '#9ca3af', '#b6bcc6']} />
      <Box x={54} y={50} z={13} w={36} d={3} h={26} c={['#bfe0ff', '#7db7f5', '#5a9de8']} />
      <circle cx="160" cy="34" r="22" fill="#ff6b2c" />
      <text x="160" y="41" textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="800" fontSize="20" fill="#fff">20h</text>
    </Svg>
  );
}

export function DualArt() {
  return (
    <Svg label="Plane flying with an instructor">
      <Platform />
      <ellipse cx="110" cy="112" rx="42" ry="9" fill="#0a1f44" opacity=".14" />
      <path d="M36 98 Q110 18 188 62" fill="none" stroke="#1565d8" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" opacity=".6" />
      <Plane x={52} y={30} s={0.62} />
      <circle cx="100" cy="56" r="6" fill="#0a1f44" opacity=".85" />
      <circle cx="113" cy="56" r="6" fill="#ff6b2c" />
    </Svg>
  );
}

export function SoloArt() {
  const flag = [P(91, 11, 52), P(91, 11, 40), P(108, 11, 46)];
  return (
    <Svg label="Plane on a runway with a flag">
      <Platform />
      <Box x={8} y={38} z={10} w={84} d={26} h={1.5} c={['#4b5563', '#374151', '#374151']} />
      {[16, 36, 56].map((x) => <Box key={x} x={x} y={49} z={11.5} w={12} d={3} h={0.6} c={['#fff', '#fff', '#fff']} />)}
      <Plane x={44} y={52} s={0.4} />
      <Box x={88} y={8} z={10} w={3} d={3} h={44} c={['#35527d', '#0a1f44', '#14305e']} />
      <polygon points={pts(flag)} fill="#ff6b2c" />
    </Svg>
  );
}

export function ExamArt() {
  const line = (h, w2 = 0) => {
    const a = P(36, 36, 10 + h), b = P(70 - w2, 36, 10 + h);
    return <line key={h + w2} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#9fb3d1" strokeWidth="3" strokeLinecap="round" />;
  };
  return (
    <Svg label="Exam paper with a check mark">
      <Platform c={['#9ec3f2', '#6f9fde', '#5b8bcb']} />
      <Box x={30} y={30} z={10} w={46} d={5} h={56} c={['#e9f1ff', '#ffffff', '#b9cdee']} />
      <polygon points={pts([P(30, 35, 10), P(76, 35, 10), P(76, 35, 66), P(30, 35, 66)])} fill="none" stroke="#5b8bcb" strokeWidth="2" strokeLinejoin="round" />
      {line(44)}{line(34, 10)}{line(24)}{line(14, 14)}
      <circle cx="150" cy="70" r="26" fill="#22c55e" />
      <path d="M137 70 l9 9 l17 -19" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="rotate(-35 170 120)"><rect x="150" y="116" width="48" height="7" rx="2" fill="#ffc61a" /><polygon points="198,116 208,119.5 198,123" fill="#f5d7a8" /></g>
    </Svg>
  );
}
