// A drawn mock of a property-for-rent listing. Density is visual only: no click counts.

export default function SampleHeatmap() {
  return (
    <figure className="heatmap" data-testid="sample-heatmap" aria-label="Sample heatmap of a property listing page">
      <svg viewBox="0 0 640 460" role="img">
        <rect width="640" height="460" fill="#ffffff" />
        <rect width="640" height="52" fill="#e31b23" />
        <text x="20" y="33" fill="#ffffff" fontSize="20" fontFamily="Source Sans 3, sans-serif" fontWeight="700">Property for rent</text>
        <rect x="20" y="70" width="600" height="40" rx="8" fill="#ffffff" stroke="#231f20" strokeWidth="2" />
        <text x="36" y="96" fill="#6e6a6b" fontSize="16" fontFamily="Source Sans 3, sans-serif">Search</text>
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          const x = 20 + col * 204;
          const y = 130 + row * 130;
          return (
            <g key={index}>
              <rect x={x} y={y} width="188" height="114" rx="8" fill="#f7f6f4" stroke="#e4e1df" strokeWidth="2" />
              <rect x={x + 12} y={y + 12} width="164" height="48" rx="4" fill="#efedeb" />
              <text x={x + 12} y={y + 84} fill="#231f20" fontSize="16" fontFamily="Source Sans 3, sans-serif" fontWeight="700">Listing</text>
              <text x={x + 12} y={y + 104} fill="#231f20" fontSize="14" fontFamily="Source Sans 3, sans-serif">Hubungi Kami</text>
            </g>
          );
        })}
        <g fill="#e31b23" opacity="0.28">
          <ellipse cx="320" cy="90" rx="180" ry="28" />
          <ellipse cx="114" cy="187" rx="78" ry="48" />
          <ellipse cx="318" cy="187" rx="78" ry="48" />
          <ellipse cx="114" cy="234" rx="46" ry="16" />
          <ellipse cx="318" cy="234" rx="46" ry="16" />
        </g>
      </svg>
      <figcaption>Sample</figcaption>
    </figure>
  );
}
