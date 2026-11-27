import type { EngineConfig } from "./config";
import type { Distribution, FixtureSpec, Reflectances } from "./types";

export interface UtilisationResult {
  value: number;
  source: "generic_model" | "photometric" | "override";
  distribution: Distribution;
  roomIndex: number;
  /** room index used for lookup after clamping to the table range */
  roomIndexUsed: number;
}

export interface UtilisationQuery {
  roomIndex: number;
  reflectances: Reflectances;
  distribution: Distribution;
}

/**
 * Anything that can provide a UF. The generic model is the default; a future
 * PhotometricUtilisationProvider (built from IES/LDT files) implements the
 * same interface so the rest of the engine doesn't change.
 */
export interface UtilisationProvider {
  getUtilisation(q: UtilisationQuery): UtilisationResult;
}

export function classifyDistribution(fixture: FixtureSpec, config: EngineConfig): Distribution {
  if (fixture.distribution) return fixture.distribution;
  if (fixture.mounting === "cove") return "indirect";
  if (fixture.mounting === "suspended") return "general_diffuse";
  return fixture.beamAngle <= config.narrowBeamThresholdDeg ? "direct_narrow" : "direct_wide";
}

/** Linear interpolation on an ascending x array, clamped at both ends. */
export function interpolate(xs: readonly number[], ys: readonly number[], x: number): number {
  if (xs.length !== ys.length || xs.length === 0) throw new Error("interpolate: mismatched tables");
  const first = xs[0]!;
  const last = xs[xs.length - 1]!;
  if (x <= first) return ys[0]!;
  if (x >= last) return ys[ys.length - 1]!;
  for (let i = 1; i < xs.length; i++) {
    const x1 = xs[i]!;
    if (x <= x1) {
      const x0 = xs[i - 1]!;
      const y0 = ys[i - 1]!;
      const y1 = ys[i]!;
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return ys[ys.length - 1]!;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export class GenericUtilisationProvider implements UtilisationProvider {
  constructor(private readonly config: EngineConfig) {}

  getUtilisation({ roomIndex, reflectances, distribution }: UtilisationQuery): UtilisationResult {
    const profile = this.config.utilisation[distribution];
    const ks = profile.roomIndices;
    const kUsed = clamp(roomIndex, ks[0]!, ks[ks.length - 1]!);
    const base = interpolate(ks, profile.base, kUsed);

    const rw = clamp(reflectances.walls, 0.1, 0.7);
    const rc = clamp(reflectances.ceiling, 0.1, 0.8);
    const wallFactor = 1 - profile.alpha * (0.5 - rw) * Math.min(1, 1 / kUsed);
    const ceilingFactor = 1 - profile.beta * (0.7 - rc);

    const value = clamp(base * wallFactor * ceilingFactor, 0.01, 1);
    return { value: round(value, 3), source: "generic_model", distribution, roomIndex, roomIndexUsed: kUsed };
  }
}

export function round(v: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}
