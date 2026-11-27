import type { ResolvedRoom } from "@/lib/lighting";
import { assignCodes, newId } from "@/lib/design/generate";
import { LINEAR_TYPES, fittingsOfType } from "@/lib/design/reference";
import { isLinear, type Layer, type PlacedFixture } from "@/lib/design/types";
import type { FixtureType } from "@/lib/project/types";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function moveFixture(f: PlacedFixture, dx: number, dy: number, room: ResolvedRoom): PlacedFixture {
  if (isLinear(f)) {
    const minX = Math.min(f.x, f.x2!);
    const maxX = Math.max(f.x, f.x2!);
    const minY = Math.min(f.y, f.y2!);
    const maxY = Math.max(f.y, f.y2!);
    const cdx = clamp(dx, -minX, room.length - maxX);
    const cdy = clamp(dy, -minY, room.width - maxY);
    return { ...f, x: r3(f.x + cdx), y: r3(f.y + cdy), x2: r3(f.x2! + cdx), y2: r3(f.y2! + cdy) };
  }
  return { ...f, x: r3(clamp(f.x + dx, 0, room.length)), y: r3(clamp(f.y + dy, 0, room.width)) };
}

/** A new fixture of `type`, using the first generic reference fitting for that type. */
export function createFixture(type: FixtureType, room: ResolvedRoom, cct: number, cri: number, layer?: Layer): PlacedFixture {
  const ref = fittingsOfType(type)[type === "pendant" ? 0 : Math.min(1, fittingsOfType(type).length - 1)]!;
  const cx = room.length / 2;
  const cy = room.width / 2;
  const linear = LINEAR_TYPES.includes(type);
  const half = Math.min(0.9, room.length / 3);
  return {
    id: newId(),
    code: "",
    layer: layer ?? ref.defaultLayer,
    type,
    x: r3(linear ? cx - half : cx),
    y: r3(cy),
    ...(linear ? { x2: r3(cx + half), y2: r3(cy) } : {}),
    lumens: ref.lumens,
    watts: ref.watts,
    beamAngle: ref.beamAngle,
    cct,
    cri,
    mounting: ref.mounting,
    ...(type === "pendant" || type === "chandelier" ? { suspensionLength: 0.7 } : {}),
    specSource: "generic_reference",
    referenceId: ref.id,
  };
}

export function duplicateFixture(f: PlacedFixture, room: ResolvedRoom): PlacedFixture {
  const off = 0.3;
  const moved = moveFixture({ ...f, id: newId() }, off, off, room);
  return moved;
}

/** Change a fixture's type, adopting that type's default spec and converting point ↔ linear geometry. */
export function changeType(f: PlacedFixture, type: FixtureType, room: ResolvedRoom): PlacedFixture {
  const fresh = createFixture(type, room, f.cct, f.cri, f.layer);
  const linear = LINEAR_TYPES.includes(type);
  if (linear && !isLinear(f)) {
    const half = 0.6;
    return { ...fresh, id: f.id, code: f.code, x: r3(clamp(f.x - half, 0, room.length)), y: f.y, x2: r3(clamp(f.x + half, 0, room.length)), y2: f.y };
  }
  if (!linear && isLinear(f)) {
    const { x2: _x2, y2: _y2, ...rest } = { ...fresh, id: f.id, code: f.code, x: r3((f.x + f.x2!) / 2), y: r3((f.y + f.y2!) / 2) };
    return rest;
  }
  return { ...fresh, id: f.id, code: f.code, x: f.x, y: f.y, ...(isLinear(f) ? { x2: f.x2, y2: f.y2 } : {}) };
}

export const recode = (fs: PlacedFixture[]) => assignCodes(fs);

/** Group fittings with identical specs for the schedule. */
export interface FixtureGroup {
  key: string;
  layer: Layer;
  type: FixtureType;
  items: PlacedFixture[];
  linear: boolean;
}

export function groupFixtures(fs: PlacedFixture[]): FixtureGroup[] {
  const map = new Map<string, FixtureGroup>();
  for (const f of fs) {
    const key = [f.layer, f.type, f.lumens, f.watts, f.beamAngle, f.cct].join("|");
    const g = map.get(key) ?? { key, layer: f.layer, type: f.type, items: [], linear: isLinear(f) };
    g.items.push(f);
    map.set(key, g);
  }
  return [...map.values()];
}

/**
 * Even layout of exactly `n` points over a rectangle: rows chosen to match
 * the room's proportions, fittings shared between rows as evenly as possible,
 * each row centred with half-spacing to the walls.
 */
export function evenLayout(n: number, length: number, width: number): { x: number; y: number }[] {
  if (n <= 0) return [];
  const rows = clamp(Math.round(Math.sqrt((n * width) / length)), 1, n);
  const base = Math.floor(n / rows);
  const extra = n % rows;
  const pts: { x: number; y: number }[] = [];
  for (let j = 0; j < rows; j++) {
    const k = base + (j < extra ? 1 : 0);
    for (let i = 0; i < k; i++) pts.push({ x: r3(((i + 0.5) * length) / k), y: r3(((j + 0.5) * width) / rows) });
  }
  return pts;
}

const TOL = 0.05;

/**
 * Change how many fittings a schedule group has, re-spacing the whole group
 * instead of stacking copies:
 *  - ambient: even layout over the whole room
 *  - fittings in a line (e.g. accents along a wall): evenly along that line
 *  - anything else: a centred row around the existing fitting(s)
 */
export function resizeGroup(items: PlacedFixture[], n: number, room: ResolvedRoom): PlacedFixture[] {
  if (n <= 0 || !items.length) return [];
  const template = items[items.length - 1]!;
  const make = (i: number, p: { x: number; y: number }): PlacedFixture => ({ ...(items[i] ?? { ...template, id: newId() }), x: p.x, y: p.y });

  let pts: { x: number; y: number }[];
  const sameY = items.length > 1 && items.every((f) => Math.abs(f.y - items[0]!.y) < TOL);
  const sameX = items.length > 1 && items.every((f) => Math.abs(f.x - items[0]!.x) < TOL);

  if (template.layer === "ambient") {
    pts = evenLayout(n, room.length, room.width);
  } else if (sameY) {
    pts = Array.from({ length: n }, (_, i) => ({ x: r3(((i + 0.5) * room.length) / n), y: items[0]!.y }));
  } else if (sameX) {
    pts = Array.from({ length: n }, (_, i) => ({ x: items[0]!.x, y: r3(((i + 0.5) * room.width) / n) }));
  } else if (n <= items.length) {
    return items.slice(0, n);
  } else {
    // centred row around the group's centre, 0.8 m apart
    const cx = items.reduce((s, f) => s + f.x, 0) / items.length;
    const cy = items.reduce((s, f) => s + f.y, 0) / items.length;
    const gap = Math.min(0.8, room.length / (n + 1));
    pts = Array.from({ length: n }, (_, i) => ({ x: r3(clamp(cx + (i - (n - 1) / 2) * gap, 0, room.length)), y: r3(cy) }));
  }
  return pts.map((p, i) => make(i, p));
}
