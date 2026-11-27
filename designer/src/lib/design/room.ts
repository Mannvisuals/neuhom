import { AssumptionLog, DEFAULT_CONFIG, resolveRoom, type CeilingFinish, type Dimension, type ResolvedRoom, type RoomInput } from "@/lib/lighting";
import type { CeilingType, DimensionValue, Project, Wall } from "@/lib/project/types";

const CEILING_FINISH: Record<CeilingType, CeilingFinish> = {
  false_ceiling: "white_gypsum_false_ceiling",
  flat_slab: "white_plaster",
  wood_ceiling: "light_wood",
  exposed_concrete: "exposed_concrete",
};

/** Ceilings that can take recessed fittings and coves. */
export const canRecess = (c: CeilingType) => c === "false_ceiling" || c === "wood_ceiling";
export const canCove = (c: CeilingType) => c === "false_ceiling";

const dim = (d: DimensionValue): Dimension =>
  d.unknown || d.value === null ? { source: "unknown" } : { value: d.value, source: "measured" };

export function toRoomInput(p: Project): RoomInput {
  return {
    spaceType: p.spaceType,
    length: dim(p.space.length),
    width: dim(p.space.width),
    ceilingHeight: dim(p.space.ceilingHeight),
    surfaces: {
      ceiling: CEILING_FINISH[p.space.ceilingType],
      walls: p.space.wallFinish,
      floor: p.space.floorFinish,
    },
  };
}

export function resolveProjectRoom(p: Project, log = new AssumptionLog()): ResolvedRoom {
  return resolveRoom(toRoomInput(p), DEFAULT_CONFIG, log);
}

/** Wall as a line segment on the plan, with its inward normal. */
export function wallGeometry(wall: Wall, room: Pick<ResolvedRoom, "length" | "width">) {
  const { length: L, width: W } = room;
  switch (wall) {
    case "top":
      return { x1: 0, y1: 0, x2: L, y2: 0, length: L, nx: 0, ny: 1 };
    case "bottom":
      return { x1: 0, y1: W, x2: L, y2: W, length: L, nx: 0, ny: -1 };
    case "left":
      return { x1: 0, y1: 0, x2: 0, y2: W, length: W, nx: 1, ny: 0 };
    case "right":
      return { x1: L, y1: 0, x2: L, y2: W, length: W, nx: -1, ny: 0 };
  }
}

/** A point `along` metres down the wall and `offset` metres into the room. */
export function pointOnWall(wall: Wall, room: Pick<ResolvedRoom, "length" | "width">, along: number, offset: number) {
  const g = wallGeometry(wall, room);
  const t = g.length > 0 ? along / g.length : 0;
  return {
    x: g.x1 + (g.x2 - g.x1) * t + g.nx * offset,
    y: g.y1 + (g.y2 - g.y1) * t + g.ny * offset,
  };
}

export const M_TO_FT = 3.28084;
export const toDisplay = (m: number, unit: "ft" | "m") => (unit === "ft" ? m * M_TO_FT : m);
export const fromDisplay = (v: number, unit: "ft" | "m") => (unit === "ft" ? v / M_TO_FT : v);
export const formatLength = (m: number, unit: "ft" | "m", dp = 1) =>
  `${toDisplay(m, unit).toFixed(dp).replace(/\.0$/, "")} ${unit === "ft" ? "ft" : "m"}`;
