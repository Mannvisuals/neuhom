import type { FixtureType } from "@/lib/project/types";

/**
 * Reflected-ceiling-plan style symbols, drawn around (0,0) at size `s` px.
 * Stroke colour comes from the layer.
 */
export function FixtureSymbol({ type, s = 16, color, selected }: { type: FixtureType; s?: number; color: string; selected?: boolean }) {
  const r = s / 2;
  const sw = selected ? 1.8 : 1.4;
  const common = { stroke: color, strokeWidth: sw, fill: "var(--color-surface)" } as const;
  switch (type) {
    case "recessed_downlight":
      return (
        <g>
          <circle r={r} {...common} />
          <path d={`M${-r * 0.62} 0H${r * 0.62}M0 ${-r * 0.62}V${r * 0.62}`} stroke={color} strokeWidth={sw} />
        </g>
      );
    case "cob_spot":
      return (
        <g>
          <circle r={r * 0.9} {...common} />
          <circle r={r * 0.38} fill={color} />
        </g>
      );
    case "surface_downlight":
      return (
        <g>
          <circle r={r} {...common} />
          <circle r={r * 0.55} fill="none" stroke={color} strokeWidth={sw} />
        </g>
      );
    case "track_spot":
      return (
        <g>
          <rect x={-r} y={-r * 0.32} width={s} height={r * 0.64} rx={1} {...common} />
          <circle r={r * 0.42} fill={color} />
        </g>
      );
    case "panel":
      return (
        <g>
          <rect x={-r * 1.15} y={-r * 1.15} width={s * 1.15} height={s * 1.15} {...common} />
          <path d={`M${-r * 1.15} ${-r * 1.15}L${r * 1.15} ${r * 1.15}M${r * 1.15} ${-r * 1.15}L${-r * 1.15} ${r * 1.15}`} stroke={color} strokeWidth={sw * 0.7} />
        </g>
      );
    case "pendant":
      return (
        <g>
          <circle r={r} {...common} />
          <circle r={r * 0.45} fill={color} />
          <circle r={r * 0.12} fill="var(--color-surface)" />
        </g>
      );
    case "chandelier":
      return (
        <g>
          <circle r={r * 1.25} {...common} />
          {[0, 45, 90, 135].map((a) => (
            <line
              key={a}
              x1={-Math.cos((a * Math.PI) / 180) * r}
              y1={-Math.sin((a * Math.PI) / 180) * r}
              x2={Math.cos((a * Math.PI) / 180) * r}
              y2={Math.sin((a * Math.PI) / 180) * r}
              stroke={color}
              strokeWidth={sw}
            />
          ))}
        </g>
      );
    case "wall_light":
      return (
        <g>
          <path d={`M${-r} 0A${r} ${r} 0 0 0 ${r} 0Z`} {...common} />
          <line x1={-r * 1.2} y1={0} x2={r * 1.2} y2={0} stroke={color} strokeWidth={sw + 0.6} />
        </g>
      );
    case "decorative":
      return (
        <g>
          <path d={`M0 ${-r}L${r} 0L0 ${r}L${-r} 0Z`} {...common} />
          <circle r={r * 0.25} fill={color} />
        </g>
      );
    default:
      return <circle r={r} {...common} />;
  }
}

/** Small inline symbol for lists. */
export function FixtureGlyph({ type, color, linear }: { type: FixtureType; color: string; linear?: boolean }) {
  return (
    <svg viewBox="-11 -11 22 22" className="h-[18px] w-[18px] shrink-0" aria-hidden>
      {linear ? (
        <line x1={-9} y1={0} x2={9} y2={0} stroke={color} strokeWidth={2.2} strokeDasharray={type === "cove" ? "4 2" : undefined} strokeLinecap="round" />
      ) : (
        <FixtureSymbol type={type} s={14} color={color} />
      )}
    </svg>
  );
}
