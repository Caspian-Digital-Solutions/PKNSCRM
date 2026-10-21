// A drawn mock of a property-for-rent listing. Density is visual only: no click counts.
import { ASSETS } from '../data/config.js';
import { num, rm } from '../format.js';

const CARD_SPEC = [
  { id: 'kpsa', use: 'Retail' },
  { id: 'kpsa', use: 'Office' },
  { id: 'pas', use: 'Retail' },
  { id: 'bangi', use: 'Retail' },
  { id: 'mpkns', use: 'Office' },
  { id: 'mww', use: 'Office' },
];

function listingCards() {
  return CARD_SPEC.map((spec) => {
    const asset = ASSETS.find((item) => item.id === spec.id);
    const group = asset.mix.find((item) => item.use === spec.use && item.psf);
    const size = group.size[0];
    return {
      name: asset.name,
      use: group.use,
      size,
      rent: Math.round(size * group.psf[0]),
    };
  });
}

const CARDS = listingCards();

export default function SampleHeatmap() {
  return (
    <figure className="heatmap" data-testid="sample-heatmap" aria-label="Sample heatmap of a property listing page">
      <svg viewBox="0 0 640 560" role="img">
        <defs>
          <filter id="heat-blur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <radialGradient id="heat-hot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e31b23" />
            <stop offset="42%" stopColor="#f2c500" />
            <stop offset="100%" stopColor="#3d5a80" />
          </radialGradient>
          <linearGradient id="heat-legend" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3d5a80" />
            <stop offset="50%" stopColor="#f2c500" />
            <stop offset="100%" stopColor="#e31b23" />
          </linearGradient>
        </defs>
        <rect width="640" height="560" fill="#ffffff" />
        <rect width="640" height="56" fill="#e31b23" />
        <text x="20" y="36" fill="#ffffff" fontSize="22" fontFamily="Source Sans 3, sans-serif" fontWeight="700">Hartanah untuk Disewa</text>
        <rect x="16" y="72" width="608" height="48" rx="8" fill="#ffffff" stroke="#231f20" strokeWidth="2" />
        {['Lokasi', 'Jenis', 'Saiz'].map((label, index) => (
          <g key={label}>
            <rect x={28 + index * 118} y="82" width="104" height="28" rx="6" fill="#f7f6f4" stroke="#e4e1df" strokeWidth="1.5" />
            <text x={40 + index * 118} y="101" fill="#231f20" fontSize="15" fontFamily="Source Sans 3, sans-serif">{label}</text>
          </g>
        ))}
        {CARDS.map((card, index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          const x = 16 + col * 206;
          const y = 136 + row * 196;
          return (
            <g key={`${card.name}-${card.use}`}>
              <rect x={x} y={y} width="194" height="184" rx="8" fill="#ffffff" stroke="#e4e1df" strokeWidth="2" />
              <rect x={x + 10} y={y + 10} width="174" height="58" rx="4" fill="#d9d6d4" />
              <foreignObject x={x + 10} y={y + 74} width="174" height="40">
                <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontFamily: 'Source Sans 3, sans-serif', fontSize: '14px', fontWeight: 700, color: '#231f20', lineHeight: 1.2 }}>
                  {card.name}
                </div>
              </foreignObject>
              <text x={x + 10} y={y + 128} fill="#4a4546" fontSize="14" fontFamily="Source Sans 3, sans-serif">{card.use}, {num(card.size)} sq ft</text>
              <text x={x + 10} y={y + 148} fill="#231f20" fontSize="14" fontFamily="Source Sans 3, sans-serif" fontWeight="700">{`Dari ${rm(card.rent)} sebulan`}</text>
              <rect x={x + 10} y={y + 156} width="120" height="24" rx="6" fill="#e31b23" />
              <text x={x + 18} y={y + 173} fill="#ffffff" fontSize="14" fontFamily="Source Sans 3, sans-serif" fontWeight="700">Hubungi Kami</text>
            </g>
          );
        })}
        <g opacity="0.55" filter="url(#heat-blur)" style={{ pointerEvents: 'none' }}>
          <ellipse cx="320" cy="96" rx="210" ry="36" fill="url(#heat-hot)" />
          <ellipse cx="113" cy="228" rx="88" ry="70" fill="url(#heat-hot)" />
          <ellipse cx="319" cy="228" rx="88" ry="70" fill="url(#heat-hot)" />
          <ellipse cx="90" cy="302" rx="48" ry="18" fill="url(#heat-hot)" />
          <ellipse cx="296" cy="302" rx="48" ry="18" fill="url(#heat-hot)" />
        </g>
        <rect x="16" y="534" width="88" height="12" rx="6" fill="url(#heat-legend)" />
        <text x="112" y="546" fill="#231f20" fontSize="14" fontFamily="Source Sans 3, sans-serif">Fewer clicks ↔ More clicks</text>
      </svg>
      <figcaption>Sample</figcaption>
    </figure>
  );
}
