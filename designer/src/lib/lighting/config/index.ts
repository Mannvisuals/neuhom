import { SPACE_STANDARDS, BRIGHTNESS_MULTIPLIER, type SpaceStandard } from "./illuminance";
import {
  CEILING_REFLECTANCE,
  WALL_REFLECTANCE,
  FLOOR_REFLECTANCE,
  DEFAULT_SURFACES,
  DEFAULT_DIMENSIONS,
} from "./surfaces";
import { UTILISATION_PROFILES, NARROW_BEAM_THRESHOLD_DEG, type UtilisationProfile } from "./utilisation";
import { LUMINAIRE_MAINTENANCE, ROOM_SURFACE_MAINTENANCE, LED_DEFAULTS } from "./maintenance";
import type { Distribution, SpaceType } from "../types";

export * from "./illuminance";
export * from "./surfaces";
export * from "./utilisation";
export * from "./maintenance";

/**
 * Spacing rules (no photometry available).
 *
 * maxSpacing = min( 2 · Hm · tan(β/2) · beamOverlapFactor,  maxSpacingToHeight · Hm )
 *
 * Beam angle is defined at 50% of peak intensity, so adjacent beams meeting
 * at their edges give a reasonably even field. The spacing-to-height cap
 * stops wide-beam fittings being spread too far apart.
 */
export const SPACING_RULES = {
  beamOverlapFactor: 1.0,
  maxSpacingToHeight: 1.5,
  /** below this, fittings are placed too densely to be practical */
  minPracticalSpacing: 0.45,
};

export const ENERGY_DEFAULTS = {
  /**
   * ₹/kWh. Indian electricity tariffs vary widely by state, slab and
   * consumer category; this is only a placeholder for cost estimates and
   * should be set from the user's bill.
   */
  tariffPerKWh: 8,
  /** plausible LED luminaire efficacy band, lm/W — outside it, product data is suspect */
  plausibleEfficacy: { min: 30, max: 220 },
};

export interface EngineConfig {
  standards: Record<SpaceType, SpaceStandard>;
  brightnessMultiplier: typeof BRIGHTNESS_MULTIPLIER;
  reflectance: {
    ceiling: typeof CEILING_REFLECTANCE;
    walls: typeof WALL_REFLECTANCE;
    floor: typeof FLOOR_REFLECTANCE;
  };
  defaultSurfaces: typeof DEFAULT_SURFACES;
  defaultDimensions: typeof DEFAULT_DIMENSIONS;
  utilisation: Record<Distribution, UtilisationProfile>;
  narrowBeamThresholdDeg: number;
  maintenance: {
    luminaire: typeof LUMINAIRE_MAINTENANCE;
    roomSurface: typeof ROOM_SURFACE_MAINTENANCE;
    led: typeof LED_DEFAULTS;
  };
  spacing: typeof SPACING_RULES;
  energy: typeof ENERGY_DEFAULTS;
}

export const DEFAULT_CONFIG: EngineConfig = {
  standards: SPACE_STANDARDS,
  brightnessMultiplier: BRIGHTNESS_MULTIPLIER,
  reflectance: { ceiling: CEILING_REFLECTANCE, walls: WALL_REFLECTANCE, floor: FLOOR_REFLECTANCE },
  defaultSurfaces: DEFAULT_SURFACES,
  defaultDimensions: DEFAULT_DIMENSIONS,
  utilisation: UTILISATION_PROFILES,
  narrowBeamThresholdDeg: NARROW_BEAM_THRESHOLD_DEG,
  maintenance: { luminaire: LUMINAIRE_MAINTENANCE, roomSurface: ROOM_SURFACE_MAINTENANCE, led: LED_DEFAULTS },
  spacing: SPACING_RULES,
  energy: ENERGY_DEFAULTS,
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return (patch === undefined ? base : patch) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = deepMerge((base as Record<string, unknown>)[k], v);
  }
  return out as T;
}

/** Create a project-specific configuration without mutating the defaults. */
export function createConfig(overrides: DeepPartial<EngineConfig> = {}): EngineConfig {
  return deepMerge(DEFAULT_CONFIG, overrides);
}
