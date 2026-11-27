"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ResolvedRoom } from "@/lib/lighting";
import { poolRadius } from "@/lib/design/evaluate";
import { formatLength } from "@/lib/design/room";
import { LAYERS, isLinear, type Layer, type PlacedFixture } from "@/lib/design/types";
import type { Unit, Wall } from "@/lib/project/types";
import { FixtureSymbol } from "./FixtureSymbol";

const PAD = 64;
const SNAP = 0.05;

const layerColor = (l: Layer) => LAYERS.find((x) => x.value === l)!.color;

/** Warm-to-neutral glow colour by colour temperature. */
export function cctGlow(k: number): string {
  if (k <= 2700) return "#f0a94d";
  if (k <= 3000) return "#f2b766";
  if (k <= 3500) return "#efc58a";
  return "#d9cdb0";
}

export interface PlanCanvasProps {
  room: ResolvedRoom;
  unit: Unit;
  fixtures: PlacedFixture[];
  visible: Set<Layer>;
  showPools: boolean;
  showLabels: boolean;
  windows: Wall[];
  featureWall: Wall;
  featureLabel: string;
  selectedId: string | null;
  warnIds: Set<string>;
  onSelect: (id: string | null) => void;
  onDragStart: () => void;
  onMove: (id: string, dx: number, dy: number) => void;
}

export function PlanCanvas(props: PlanCanvasProps) {
  const { room, unit, fixtures, visible, showPools, showLabels, selectedId, onSelect, onDragStart, onMove } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = Math.max(8, Math.min((size.w - PAD * 2) / room.length, (size.h - PAD * 2) / room.width));
  const ox = (size.w - room.length * scale) / 2;
  const oy = (size.h - room.width * scale) / 2;
  const X = (m: number) => ox + m * scale;
  const Y = (m: number) => oy + m * scale;

  // ── dragging ──
  const drag = useRef<{ id: string; startX: number; startY: number; lastDx: number; lastDy: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, f: PlacedFixture) => {
      e.stopPropagation();
      onSelect(f.id);
      (e.target as Element).setPointerCapture?.(e.pointerId);
      drag.current = { id: f.id, startX: e.clientX, startY: e.clientY, lastDx: 0, lastDy: 0 };
    },
    [onSelect],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const snap = e.altKey ? 0.001 : SNAP;
      const totalDx = Math.round((e.clientX - d.startX) / scale / snap) * snap;
      const totalDy = Math.round((e.clientY - d.startY) / scale / snap) * snap;
      const ddx = totalDx - d.lastDx;
      const ddy = totalDy - d.lastDy;
      if (ddx === 0 && ddy === 0) return;
      if (d.lastDx === 0 && d.lastDy === 0) onDragStart();
      d.lastDx = totalDx;
      d.lastDy = totalDy;
      onMove(d.id, ddx, ddy);
    },
    [scale, onMove, onDragStart],
  );

  const endDrag = useCallback(() => {
    drag.current = null;
  }, []);

  const shown = fixtures.filter((f) => visible.has(f.layer));
  const wallT = 6;

  return (
    <div ref={wrap} className="relative h-full w-full touch-none select-none drafting-paper" onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <svg width={size.w} height={size.h} className="absolute inset-0" onPointerDown={() => onSelect(null)} role="img" aria-label="Lighting plan">
        <defs>
          {[2700, 3000, 3500, 4000].map((k) => (
            <radialGradient key={k} id={`pool-${k}`}>
              <stop offset="0" stopColor={cctGlow(k)} stopOpacity="0.55" />
              <stop offset="0.55" stopColor={cctGlow(k)} stopOpacity="0.2" />
              <stop offset="1" stopColor={cctGlow(k)} stopOpacity="0" />
            </radialGradient>
          ))}
          <filter id="cove-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={Math.max(4, scale * 0.12)} />
          </filter>
          <clipPath id="room-clip">
            <rect x={X(0)} y={Y(0)} width={room.length * scale} height={room.width * scale} />
          </clipPath>
        </defs>

        {/* floor */}
        <rect x={X(0)} y={Y(0)} width={room.length * scale} height={room.width * scale} fill="var(--color-surface)" />
        {/* 1 m grid */}
        <g clipPath="url(#room-clip)" stroke="var(--color-ink)" strokeOpacity={0.06} strokeWidth={1}>
          {Array.from({ length: Math.floor(room.length) }, (_, i) => (
            <line key={`gx${i}`} x1={X(i + 1)} y1={Y(0)} x2={X(i + 1)} y2={Y(room.width)} strokeDasharray="2 4" />
          ))}
          {Array.from({ length: Math.floor(room.width) }, (_, i) => (
            <line key={`gy${i}`} x1={X(0)} y1={Y(i + 1)} x2={X(room.length)} y2={Y(i + 1)} strokeDasharray="2 4" />
          ))}
        </g>

        {/* light pools */}
        {showPools && (
          <g clipPath="url(#room-clip)" style={{ mixBlendMode: "multiply" }} pointerEvents="none">
            {shown.map((f) => {
              const k = f.cct <= 2700 ? 2700 : f.cct <= 3000 ? 3000 : f.cct <= 3500 ? 3500 : 4000;
              if (isLinear(f)) {
                const w = f.type === "cove" ? 0.55 : 0.35;
                return (
                  <line
                    key={f.id}
                    x1={X(f.x)}
                    y1={Y(f.y)}
                    x2={X(f.x2!)}
                    y2={Y(f.y2!)}
                    stroke={cctGlow(f.cct)}
                    strokeOpacity={Math.min(0.55, 0.18 + f.lumens / 3000)}
                    strokeWidth={w * scale}
                    strokeLinecap="round"
                    filter="url(#cove-blur)"
                  />
                );
              }
              const rad = Math.max(0.35, f.mounting === "wall" ? 0.9 : poolRadius(f, room)) * scale;
              const intensity = Math.min(1, 0.45 + f.lumens / 2200);
              return <circle key={f.id} cx={X(f.x)} cy={Y(f.y)} r={rad} fill={`url(#pool-${k})`} opacity={intensity} />;
            })}
          </g>
        )}

        {/* walls */}
        <rect
          x={X(0) - wallT / 2}
          y={Y(0) - wallT / 2}
          width={room.length * scale + wallT}
          height={room.width * scale + wallT}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={wallT}
        />
        {/* windows */}
        {props.windows.map((w) => {
          const horizontal = w === "top" || w === "bottom";
          const len = (horizontal ? room.length : room.width) * 0.44;
          const cx = horizontal ? X(room.length / 2) : w === "left" ? X(0) : X(room.length);
          const cy = horizontal ? (w === "top" ? Y(0) : Y(room.width)) : Y(room.width / 2);
          const half = (len * scale) / 2;
          return (
            <g key={w}>
              <rect
                x={horizontal ? cx - half : cx - wallT / 2 - 1}
                y={horizontal ? cy - wallT / 2 - 1 : cy - half}
                width={horizontal ? half * 2 : wallT + 2}
                height={horizontal ? wallT + 2 : half * 2}
                fill="var(--color-surface)"
              />
              {[-1.6, 1.6].map((o) => (
                <line
                  key={o}
                  x1={horizontal ? cx - half : cx + o}
                  y1={horizontal ? cy + o : cy - half}
                  x2={horizontal ? cx + half : cx + o}
                  y2={horizontal ? cy + o : cy + half}
                  stroke="var(--color-task)"
                  strokeWidth={1}
                />
              ))}
            </g>
          );
        })}

        {/* feature wall label */}
        <FeatureLabel wall={props.featureWall} label={props.featureLabel} X={X} Y={Y} room={room} />

        {/* dimensions */}
        <g stroke="var(--color-muted)" strokeWidth={0.8} fill="none">
          <line x1={X(0)} y1={Y(room.width) + 30} x2={X(room.length)} y2={Y(room.width) + 30} />
          <line x1={X(0)} y1={Y(room.width) + 24} x2={X(0)} y2={Y(room.width) + 36} />
          <line x1={X(room.length)} y1={Y(room.width) + 24} x2={X(room.length)} y2={Y(room.width) + 36} />
          <line x1={X(0) - 30} y1={Y(0)} x2={X(0) - 30} y2={Y(room.width)} />
          <line x1={X(0) - 36} y1={Y(0)} x2={X(0) - 24} y2={Y(0)} />
          <line x1={X(0) - 36} y1={Y(room.width)} x2={X(0) - 24} y2={Y(room.width)} />
        </g>
        <DimLabel x={X(room.length / 2)} y={Y(room.width) + 30} text={formatLength(room.length, unit)} />
        <DimLabel x={X(0) - 30} y={Y(room.width / 2)} text={formatLength(room.width, unit)} vertical />

        {/* fixtures */}
        {shown.map((f) => {
          const color = layerColor(f.layer);
          const selected = f.id === selectedId;
          const warn = props.warnIds.has(f.id);
          if (isLinear(f)) {
            const mx = (X(f.x) + X(f.x2!)) / 2;
            const my = (Y(f.y) + Y(f.y2!)) / 2;
            return (
              <g key={f.id} onPointerDown={(e) => onPointerDown(e, f)} className="cursor-move" role="button" aria-label={`${f.code} ${f.type}`}>
                <line x1={X(f.x)} y1={Y(f.y)} x2={X(f.x2!)} y2={Y(f.y2!)} stroke="transparent" strokeWidth={16} />
                {selected && <line x1={X(f.x)} y1={Y(f.y)} x2={X(f.x2!)} y2={Y(f.y2!)} stroke={color} strokeOpacity={0.18} strokeWidth={10} strokeLinecap="round" />}
                <line
                  x1={X(f.x)}
                  y1={Y(f.y)}
                  x2={X(f.x2!)}
                  y2={Y(f.y2!)}
                  stroke={color}
                  strokeWidth={selected ? 2.6 : 2}
                  strokeDasharray={f.type === "cove" ? "10 5" : f.type === "led_strip" ? "3 3" : undefined}
                  strokeLinecap="round"
                />
                {showLabels && <CodeTag x={mx} y={my - 10} code={f.code} color={color} selected={selected} />}
              </g>
            );
          }
          return (
            <g key={f.id} transform={`translate(${X(f.x)} ${Y(f.y)})`} onPointerDown={(e) => onPointerDown(e, f)} className="cursor-move" role="button" aria-label={`${f.code} ${f.type}`}>
              <circle r={14} fill="transparent" />
              {selected && <circle r={14} fill={color} fillOpacity={0.12} stroke={color} strokeOpacity={0.5} strokeDasharray="3 2" />}
              {warn && !selected && <circle r={12} fill="none" stroke="var(--color-danger)" strokeOpacity={0.6} strokeDasharray="2 2" />}
              <FixtureSymbol type={f.type} s={f.type === "chandelier" ? 18 : 15} color={color} selected={selected} />
              {showLabels && <CodeTag x={0} y={f.type === "wall_light" ? 18 : -17} code={f.code} color={color} selected={selected} />}
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-surface/90 px-2.5 py-1.5 text-[11.5px] text-muted shadow-panel backdrop-blur">
        Reflected ceiling plan · drawn to scale · ceiling {formatLength(room.ceilingHeight, unit)}
      </div>
    </div>
  );
}

function CodeTag({ x, y, code, color, selected }: { x: number; y: number; code: string; color: string; selected: boolean }) {
  const w = code.length * 6.4 + 8;
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <rect x={-w / 2} y={-7.5} width={w} height={15} rx={3} fill={selected ? color : "var(--color-surface)"} stroke={color} strokeOpacity={selected ? 1 : 0.35} />
      <text textAnchor="middle" y={3.6} fontSize={10} fontWeight={600} fill={selected ? "#fff" : color} className="tabular">
        {code}
      </text>
    </g>
  );
}

function DimLabel({ x, y, text, vertical }: { x: number; y: number; text: string; vertical?: boolean }) {
  const w = text.length * 6.6 + 12;
  return (
    <g transform={`translate(${x} ${y}) ${vertical ? "rotate(-90)" : ""}`} pointerEvents="none">
      <rect x={-w / 2} y={-8} width={w} height={16} fill="var(--color-paper)" />
      <text textAnchor="middle" y={4} fontSize={11} fill="var(--color-ink-2)" fontWeight={500} className="tabular">
        {text}
      </text>
    </g>
  );
}

function FeatureLabel({ wall, label, X, Y, room }: { wall: Wall; label: string; X: (m: number) => number; Y: (m: number) => number; room: ResolvedRoom }) {
  const pos =
    wall === "top"
      ? { x: X(room.length / 2), y: Y(0) - 16, r: 0 }
      : wall === "bottom"
        ? { x: X(room.length / 2), y: Y(room.width) + 52, r: 0 }
        : wall === "left"
          ? { x: X(0) - 52, y: Y(room.width / 2), r: -90 }
          : { x: X(room.length) + 18, y: Y(room.width / 2), r: 90 };
  return (
    <text
      transform={`translate(${pos.x} ${pos.y}) rotate(${pos.r})`}
      textAnchor="middle"
      fontSize={10.5}
      fontWeight={600}
      letterSpacing="0.06em"
      fill="var(--color-brass-ink)"
      pointerEvents="none"
    >
      {label.toUpperCase()}
    </text>
  );
}
