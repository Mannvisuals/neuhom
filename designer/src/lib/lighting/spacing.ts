import type { EngineConfig } from "./config";
import type { Distribution } from "./types";
import { round } from "./utilisation";

const deg2rad = (d: number) => (d * Math.PI) / 180;

/**
 * Maximum centre-to-centre spacing for an even field, given mounting height
 * above the reference plane and beam angle.
 */
export function maxSpacing(hm: number, beamAngleDeg: number, distribution: Distribution, config: EngineConfig): number {
  if (hm <= 0) throw new RangeError("Mounting height must be positive");
  const cap = config.spacing.maxSpacingToHeight * hm;
  if (distribution === "indirect") return cap;
  const beamSpread = 2 * hm * Math.tan(deg2rad(Math.min(beamAngleDeg, 170) / 2)) * config.spacing.beamOverlapFactor;
  return Math.min(beamSpread, cap);
}

export interface Point {
  x: number;
  y: number;
}

export interface GridLayout {
  rows: number;
  cols: number;
  count: number;
  /** centre-to-centre spacing along length (x) and width (y), metres */
  spacingX: number;
  spacingY: number;
  /** distance from wall to first fixture centre */
  wallOffsetX: number;
  wallOffsetY: number;
  /** fixture centres in metres, origin at one room corner, x along length */
  positions: Point[];
  /** true if spacing exceeds the maximum for even light */
  spacingExceedsMax: boolean;
  /** true if fittings would be closer than is practical */
  tooDense: boolean;
}

/**
 * Fit a regular rows × cols grid to a rectangular room, with half-spacing
 * from the walls (the standard pattern for even general lighting).
 *
 * Constraints, in order:
 *  1. spacing in both directions ≤ maxSpacing
 *  2. count ≥ minCount (from the lumen method)
 *  3. balance of fewest fixtures and spacing closest to square
 */
export function fitGrid(length: number, width: number, minCount: number, maxSpacingM: number, config: EngineConfig): GridLayout {
  if (length <= 0 || width <= 0) throw new RangeError("Room dimensions must be positive");
  const need = Math.max(1, Math.ceil(minCount));
  const minCols = Math.max(1, Math.ceil(length / maxSpacingM - 1e-9));
  const minRows = Math.max(1, Math.ceil(width / maxSpacingM - 1e-9));

  let best: { rows: number; cols: number; score: number; count: number } | undefined;
  for (let cols = minCols; cols <= minCols + 40; cols++) {
    const rows = Math.max(minRows, Math.ceil(need / cols));
    const count = rows * cols;
    const sx = length / cols;
    const sy = width / rows;
    const squareness = Math.abs(sx - sy) / Math.max(sx, sy);
    // Trade fixture count against an even, near-square pattern: a layout may
    // use up to ~25% more fittings if that avoids long, thin spacing.
    const score = count + squareness * need * 0.25;
    if (!best || score < best.score) best = { rows, cols, score, count };
  }
  const { rows, cols } = best!;
  const spacingX = length / cols;
  const spacingY = width / rows;

  const positions: Point[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push({ x: round((c + 0.5) * spacingX, 3), y: round((r + 0.5) * spacingY, 3) });
    }
  }

  return {
    rows,
    cols,
    count: rows * cols,
    spacingX: round(spacingX, 3),
    spacingY: round(spacingY, 3),
    wallOffsetX: round(spacingX / 2, 3),
    wallOffsetY: round(spacingY / 2, 3),
    positions,
    spacingExceedsMax: spacingX > maxSpacingM + 1e-6 || spacingY > maxSpacingM + 1e-6,
    tooDense: Math.min(spacingX, spacingY) < config.spacing.minPracticalSpacing,
  };
}
