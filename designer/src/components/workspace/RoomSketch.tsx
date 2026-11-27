"use client";

import { formatLength } from "@/lib/design/room";
import type { Unit, Wall } from "@/lib/project/types";

/** Small proportional plan used while describing the space. */
export function RoomSketch({
  length,
  width,
  unit,
  windows,
  featureWall,
  featureLabel,
  assumed,
}: {
  length: number;
  width: number;
  unit: Unit;
  windows: Wall[];
  featureWall: Wall;
  featureLabel: string;
  assumed: boolean;
}) {
  const pad = 34;
  const maxW = 272;
  const maxH = 200;
  const scale = Math.min(maxW / length, maxH / width);
  const w = length * scale;
  const h = width * scale;
  const vbW = w + pad * 2;
  const vbH = h + pad * 2;
  const x0 = pad;
  const y0 = pad;

  const wallLine = (wall: Wall, inset = 0) => {
    switch (wall) {
      case "top":
        return { x1: x0, y1: y0 + inset, x2: x0 + w, y2: y0 + inset };
      case "bottom":
        return { x1: x0, y1: y0 + h - inset, x2: x0 + w, y2: y0 + h - inset };
      case "left":
        return { x1: x0 + inset, y1: y0, x2: x0 + inset, y2: y0 + h };
      case "right":
        return { x1: x0 + w - inset, y1: y0, x2: x0 + w - inset, y2: y0 + h };
    }
  };

  const fw = wallLine(featureWall, 7);
  const fwMid = { x: (fw.x1 + fw.x2) / 2, y: (fw.y1 + fw.y2) / 2 };
  const labelOffset = featureWall === "top" ? 14 : featureWall === "bottom" ? -8 : 0;

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full" role="img" aria-label={`Room plan ${formatLength(length, unit)} by ${formatLength(width, unit)}`}>
      <rect x={x0} y={y0} width={w} height={h} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth={assumed ? 1.5 : 4} strokeDasharray={assumed ? "6 4" : undefined} />
      {windows.map((win) => {
        const l = wallLine(win);
        const mx = (l.x1 + l.x2) / 2;
        const my = (l.y1 + l.y2) / 2;
        const horizontal = win === "top" || win === "bottom";
        const half = (horizontal ? w : h) * 0.22;
        return (
          <g key={win}>
            <line
              x1={horizontal ? mx - half : mx}
              y1={horizontal ? my : my - half}
              x2={horizontal ? mx + half : mx}
              y2={horizontal ? my : my + half}
              stroke="var(--color-paper)"
              strokeWidth={6}
            />
            <line
              x1={horizontal ? mx - half : mx}
              y1={horizontal ? my : my - half}
              x2={horizontal ? mx + half : mx}
              y2={horizontal ? my : my + half}
              stroke="var(--color-task)"
              strokeWidth={2}
            />
          </g>
        );
      })}
      <line {...fw} stroke="var(--color-brass)" strokeWidth={3} strokeLinecap="round" />
      <text
        x={featureWall === "left" ? fwMid.x + 8 : featureWall === "right" ? fwMid.x - 8 : fwMid.x}
        y={fwMid.y + labelOffset + (featureWall === "left" || featureWall === "right" ? 4 : 0)}
        textAnchor={featureWall === "left" ? "start" : featureWall === "right" ? "end" : "middle"}
        fontSize={10}
        fill="var(--color-brass-ink)"
        fontWeight={600}
      >
        {featureLabel}
      </text>
      {/* dimensions */}
      <g stroke="var(--color-muted)" strokeWidth={0.75}>
        <line x1={x0} y1={y0 + h + 16} x2={x0 + w} y2={y0 + h + 16} />
        <line x1={x0} y1={y0 + h + 12} x2={x0} y2={y0 + h + 20} />
        <line x1={x0 + w} y1={y0 + h + 12} x2={x0 + w} y2={y0 + h + 20} />
        <line x1={x0 - 16} y1={y0} x2={x0 - 16} y2={y0 + h} />
        <line x1={x0 - 20} y1={y0} x2={x0 - 12} y2={y0} />
        <line x1={x0 - 20} y1={y0 + h} x2={x0 - 12} y2={y0 + h} />
      </g>
      <text x={x0 + w / 2} y={y0 + h + 29} textAnchor="middle" fontSize={10.5} fill="var(--color-ink-2)" className="tabular">
        {formatLength(length, unit)}
      </text>
      <text
        x={x0 - 22}
        y={y0 + h / 2}
        textAnchor="middle"
        fontSize={10.5}
        fill="var(--color-ink-2)"
        transform={`rotate(-90 ${x0 - 22} ${y0 + h / 2})`}
        className="tabular"
      >
        {formatLength(width, unit)}
      </text>
    </svg>
  );
}
