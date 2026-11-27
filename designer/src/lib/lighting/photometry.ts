/**
 * IDEALISED POINT-BY-POINT ESTIMATE (direct light only)
 *
 * Used to estimate uniformity and to draw light pools on the plan when no
 * IES/LDT file is available. Each fixture is modelled with a rotationally
 * symmetric intensity distribution
 *
 *     I(θ) = I0 · cos^m(θ)
 *
 * where m is chosen so that I falls to 50% at half the beam angle, and I0 is
 * set so that the total flux equals the fixture lumens:
 *
 *     Φ = 2π · I0 / (m + 1)
 *
 * Horizontal illuminance from a fixture at height h, horizontal distance d:
 *
 *     E = I(θ) · cos(θ) / r²,  r² = h² + d²,  cos θ = h / r
 *
 * Limitations (always shown to the user): ignores light reflected from walls
 * and ceiling, so absolute values are lower than reality; real fittings have
 * different intensity curves. This is NOT a photometric simulation.
 */

import type { Point } from "./spacing";
import { round } from "./utilisation";

const deg2rad = (d: number) => (d * Math.PI) / 180;

/** Exponent m such that cos^m(β/2) = 0.5. */
export function cosineExponent(beamAngleDeg: number): number {
  if (beamAngleDeg <= 0 || beamAngleDeg >= 180) throw new RangeError("Beam angle must be between 0 and 180°");
  return Math.log(0.5) / Math.log(Math.cos(deg2rad(beamAngleDeg / 2)));
}

/** Peak (nadir) intensity in candela for a given flux and beam angle. */
export function peakIntensity(lumens: number, beamAngleDeg: number): number {
  const m = cosineExponent(beamAngleDeg);
  return (lumens * (m + 1)) / (2 * Math.PI);
}

export function intensityAt(thetaRad: number, lumens: number, beamAngleDeg: number): number {
  if (thetaRad >= Math.PI / 2) return 0;
  const m = cosineExponent(beamAngleDeg);
  return peakIntensity(lumens, beamAngleDeg) * Math.cos(thetaRad) ** m;
}

export interface PointSource {
  position: Point;
  /** height above the calculation plane, metres */
  height: number;
  lumens: number;
  beamAngle: number;
}

export function directIlluminanceAt(p: Point, sources: readonly PointSource[]): number {
  let e = 0;
  for (const s of sources) {
    const dx = p.x - s.position.x;
    const dy = p.y - s.position.y;
    const r2 = dx * dx + dy * dy + s.height * s.height;
    const r = Math.sqrt(r2);
    const cosT = s.height / r;
    e += (intensityAt(Math.acos(cosT), s.lumens, s.beamAngle) * cosT) / r2;
  }
  return e;
}

export interface IlluminanceGrid {
  /**
   * direct_only: absolute direct-light values from the idealised model.
   * scaled_to_lumen_method: pattern from the point model, level matched to the
   *   lumen-method average (which includes reflected light). U0 is unchanged
   *   by scaling, and slightly pessimistic because reflected light is more even.
   */
  basis: "direct_only" | "scaled_to_lumen_method";
  min: number;
  max: number;
  average: number;
  /** U0 = Emin / Eavg */
  uniformity: number;
  /** spacing of calculation points, metres */
  resolution: number;
  /** border excluded from the calculation area (EN 12464-1 convention), metres */
  border: number;
  points: { x: number; y: number; lux: number }[];
}

/**
 * Calculate a grid of direct illuminance values over the room, excluding a
 * wall border band (0.5 m when the room is large enough).
 */
export function directIlluminanceGrid(
  length: number,
  width: number,
  sources: readonly PointSource[],
  opts: { resolution?: number; border?: number; maintenanceFactor?: number } = {},
): IlluminanceGrid {
  const resolution = opts.resolution ?? 0.25;
  const border = opts.border ?? (Math.min(length, width) >= 2 ? 0.5 : 0);
  const mf = opts.maintenanceFactor ?? 1;

  const xs: number[] = [];
  const ys: number[] = [];
  const spanX = length - 2 * border;
  const spanY = width - 2 * border;
  const nx = Math.max(1, Math.round(spanX / resolution));
  const ny = Math.max(1, Math.round(spanY / resolution));
  for (let i = 0; i < nx; i++) xs.push(border + ((i + 0.5) * spanX) / nx);
  for (let j = 0; j < ny; j++) ys.push(border + ((j + 0.5) * spanY) / ny);

  const points: IlluminanceGrid["points"] = [];
  let min = Infinity;
  let max = 0;
  let sum = 0;
  for (const y of ys) {
    for (const x of xs) {
      const lux = directIlluminanceAt({ x, y }, sources) * mf;
      points.push({ x: round(x, 3), y: round(y, 3), lux: round(lux, 1) });
      min = Math.min(min, lux);
      max = Math.max(max, lux);
      sum += lux;
    }
  }
  const average = sum / points.length;
  return {
    basis: "direct_only",
    min: round(min, 1),
    max: round(max, 1),
    average: round(average, 1),
    uniformity: average > 0 ? round(min / average, 2) : 0,
    resolution,
    border,
    points,
  };
}

/**
 * Estimated illuminance distribution: the *pattern* comes from the point
 * model, the *level* from the lumen-method average over the whole room.
 * This keeps a single consistent headline lux figure for the user.
 */
export function distributionScaledToAverage(
  length: number,
  width: number,
  sources: readonly PointSource[],
  lumenMethodAverage: number,
  opts: { resolution?: number; border?: number; maintenanceFactor?: number } = {},
): IlluminanceGrid {
  const full = directIlluminanceGrid(length, width, sources, { ...opts, border: 0 });
  const shaped = directIlluminanceGrid(length, width, sources, opts);
  const k = full.average > 0 ? lumenMethodAverage / full.average : 0;
  return {
    ...shaped,
    basis: "scaled_to_lumen_method",
    min: round(shaped.min * k, 1),
    max: round(shaped.max * k, 1),
    average: round(shaped.average * k, 1),
    points: shaped.points.map((p) => ({ ...p, lux: round(p.lux * k, 1) })),
  };
}
