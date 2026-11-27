"use client";

import type { ResolvedRoom } from "@/lib/lighting";
import { poolRadius } from "@/lib/design/evaluate";
import { formatLength } from "@/lib/design/room";
import { isLinear, type PlacedFixture } from "@/lib/design/types";
import type { Unit, Wall } from "@/lib/project/types";

const glow = (k: number) => (k <= 2700 ? "#ffb85c" : k <= 3000 ? "#ffc678" : k <= 3500 ? "#ffd8a0" : "#fff1d6");

/**
 * Night-time top view: how light falls in the room. An illustration for
 * homeowners — the editor's plan is the technical drawing.
 */
export function NightPreview({
  room,
  fixtures,
  unit,
  windows,
  featureWall,
  featureLabel,
  className,
}: {
  room: ResolvedRoom;
  fixtures: PlacedFixture[];
  unit: Unit;
  windows: Wall[];
  featureWall: Wall;
  featureLabel: string;
  className?: string;
}) {
  const S = 100; // px per metre in viewBox units
  const pad = 70;
  const L = room.length * S;
  const W = room.width * S;
  const vw = L + pad * 2;
  const vh = W + pad * 2;
  const X = (m: number) => pad + m * S;
  const Y = (m: number) => pad + m * S;
  const wall = 7;
  const fw = { top: { x: X(room.length / 2), y: pad - 22, r: 0 }, bottom: { x: X(room.length / 2), y: pad + W + 34, r: 0 }, left: { x: pad - 26, y: Y(room.width / 2), r: -90 }, right: { x: pad + L + 26, y: Y(room.width / 2), r: 90 } }[featureWall];

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} className={className} role="img" aria-label="Illustration of the lighting in your room at night">
      <defs>
        {[2700, 3000, 3500, 4000].map((k) => (
          <radialGradient key={k} id={`np-${k}`}>
            <stop offset="0" stopColor={glow(k)} stopOpacity="0.95" />
            <stop offset="0.35" stopColor={glow(k)} stopOpacity="0.45" />
            <stop offset="1" stopColor={glow(k)} stopOpacity="0" />
          </radialGradient>
        ))}
        <filter id="np-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={S * 0.18} />
        </filter>
        <clipPath id="np-room">
          <rect x={pad} y={pad} width={L} height={W} />
        </clipPath>
      </defs>
      <rect width={vw} height={vh} fill="#15130f" />
      <rect x={pad} y={pad} width={L} height={W} fill="#221e17" />
      <g clipPath="url(#np-room)" style={{ mixBlendMode: "screen" }}>
        {fixtures.map((f) => {
          const k = f.cct <= 2700 ? 2700 : f.cct <= 3000 ? 3000 : f.cct <= 3500 ? 3500 : 4000;
          if (isLinear(f)) {
            return (
              <line
                key={f.id}
                x1={X(f.x)}
                y1={Y(f.y)}
                x2={X(f.x2!)}
                y2={Y(f.y2!)}
                stroke={glow(f.cct)}
                strokeOpacity={Math.min(0.75, 0.3 + f.lumens / 2500)}
                strokeWidth={(f.type === "cove" ? 0.7 : 0.45) * S}
                strokeLinecap="round"
                filter="url(#np-blur)"
              />
            );
          }
          const r = Math.max(0.45, f.mounting === "wall" ? 1.0 : poolRadius(f, room) * 1.15) * S;
          const strength = Math.min(1, 0.35 + f.lumens / 1800) * (f.layer === "decorative" ? 1.1 : 1);
          return <circle key={f.id} cx={X(f.x)} cy={Y(f.y)} r={r} fill={`url(#np-${k})`} opacity={strength} />;
        })}
      </g>
      {/* fittings as small points of light */}
      {fixtures.map((f) =>
        isLinear(f) ? (
          <line key={f.id} x1={X(f.x)} y1={Y(f.y)} x2={X(f.x2!)} y2={Y(f.y2!)} stroke="#fff6e6" strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
        ) : (
          <circle key={f.id} cx={X(f.x)} cy={Y(f.y)} r={f.type === "chandelier" ? 9 : 4.5} fill="#fff8ec" />
        ),
      )}
      <rect x={pad - wall / 2} y={pad - wall / 2} width={L + wall} height={W + wall} fill="none" stroke="#efe9dc" strokeWidth={wall} />
      {windows.map((w) => {
        const h = w === "top" || w === "bottom";
        const len = (h ? L : W) * 0.44;
        const cx = h ? X(room.length / 2) : w === "left" ? pad : pad + L;
        const cy = h ? (w === "top" ? pad : pad + W) : Y(room.width / 2);
        return (
          <line
            key={w}
            x1={h ? cx - len / 2 : cx}
            y1={h ? cy : cy - len / 2}
            x2={h ? cx + len / 2 : cx}
            y2={h ? cy : cy + len / 2}
            stroke="#8fb3c9"
            strokeWidth={wall + 1}
          />
        );
      })}
      <text transform={`translate(${fw.x} ${fw.y}) rotate(${fw.r})`} textAnchor="middle" fontSize={15} letterSpacing="1.5" fill="#e9a95b" fontWeight={600}>
        {featureLabel.toUpperCase()}
      </text>
      <text x={X(room.length / 2)} y={pad + W + (featureWall === "bottom" ? 58 : 40)} textAnchor="middle" fontSize={14} fill="#efe9dc" fillOpacity={0.55}>
        {formatLength(room.length, unit)} × {formatLength(room.width, unit)}
      </text>
    </svg>
  );
}
