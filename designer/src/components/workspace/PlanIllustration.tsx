/** Decorative night-time ceiling plan with light pools. Purely illustrative. */
export function PlanIllustration({ className }: { className?: string }) {
  const pools: [number, number][] = [
    [110, 90], [210, 90], [310, 90],
    [110, 180], [210, 180], [310, 180],
  ];
  return (
    <svg viewBox="0 0 420 270" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <radialGradient id="pi-pool">
          <stop offset="0" stopColor="#f3c27e" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#e9a95b" stopOpacity="0.18" />
          <stop offset="1" stopColor="#e9a95b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pi-cove" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e9a95b" stopOpacity="0.35" />
          <stop offset="1" stopColor="#e9a95b" stopOpacity="0" />
        </linearGradient>
        <pattern id="pi-grid" width="15" height="15" patternUnits="userSpaceOnUse">
          <path d="M15 0H0V15" fill="none" stroke="#ffffff" strokeOpacity="0.04" />
        </pattern>
      </defs>
      <rect width="420" height="270" fill="#1c1a15" />
      <rect width="420" height="270" fill="url(#pi-grid)" />
      <rect x="50" y="40" width="320" height="190" fill="none" stroke="#f4efe4" strokeOpacity="0.55" strokeWidth="5" />
      <rect x="62" y="52" width="296" height="20" fill="url(#pi-cove)" />
      <rect x="62" y="52" width="296" height="166" fill="none" stroke="#e9a95b" strokeOpacity="0.6" strokeDasharray="10 5" />
      {pools.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="58" fill="url(#pi-pool)" />
          <circle cx={x} cy={y} r="6" fill="none" stroke="#f4efe4" strokeWidth="1.2" />
          <path d={`M${x - 9} ${y}H${x + 9}M${x} ${y - 9}V${y + 9}`} stroke="#f4efe4" strokeWidth="1" />
        </g>
      ))}
      <path d="M50 252H370M50 247V257M370 247V257" stroke="#f4efe4" strokeOpacity="0.35" />
      <text x="210" y="266" textAnchor="middle" fill="#f4efe4" fillOpacity="0.45" fontSize="9" fontFamily="var(--font-sans)" letterSpacing="1">
        16 FT
      </text>
    </svg>
  );
}
