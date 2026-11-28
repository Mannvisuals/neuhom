import type { SpaceType, WallFinish } from "../types";

/**
 * NEUHOM LIGHTING STANDARD — v0.1 (draft)
 *
 * Homeowner plans are sized the way consumer lighting tools and electricians
 * in India work: installed general-lighting lumens per square foot of floor,
 * by room type. Task, accent, cove and decorative lights are added on top and
 * are not counted here.
 *
 * Starting values come from commonly published residential guidance
 * (living/bedroom ≈ 10–20 lm/sq ft, kitchen & dining general ≈ 30–40,
 * bathroom ≈ 70–80 including vanity, home office ≈ 50–70). Neuhom adjusts
 * them where a separate task light covers part of the need (bathroom mirror
 * light, dining pendant). This table IS the Neuhom standard: refine it from
 * real projects and every plan follows.
 */
export interface DensityRange {
  /** lumens per square foot of floor area */
  min: number;
  target: number;
  max: number;
}

export const NEUHOM_STANDARD_VERSION = "Neuhom Lighting Standard v0.1 (draft)";

export const LUMEN_DENSITY: Record<SpaceType, DensityRange> = {
  living_room: { min: 10, target: 15, max: 20 },
  bedroom: { min: 10, target: 15, max: 20 },
  // pendant over the table adds focused light separately
  dining_room: { min: 15, target: 20, max: 30 },
  // under-cabinet strip covers worktops separately
  kitchen: { min: 30, target: 35, max: 40 },
  // mirror light covers grooming separately
  bathroom: { min: 40, target: 50, max: 70 },
  balcony: { min: 5, target: 8, max: 12 },
  // small / home office general light; desk lamps for long screen work
  office: { min: 40, target: 50, max: 60 },
  retail: { min: 50, target: 70, max: 90 },
  hospitality: { min: 15, target: 20, max: 30 },
  custom: { min: 15, target: 20, max: 30 },
};

/** Tolerance on the maximum when choosing fittings (spacing often forces one extra). */
export const DENSITY_MAX_TOLERANCE = 1.1;

/** Ceilings above this height need more light at the floor. */
export const REFERENCE_CEILING_FT = 9.5;
/** Extra light per foot of ceiling above the reference, capped. */
export const HIGH_CEILING_FACTOR_PER_FT = 0.06;
export const HIGH_CEILING_FACTOR_MAX = 1.4;

/** Darker walls absorb more light. */
export const WALL_FACTOR: Record<WallFinish, number> = {
  white: 1.0,
  light_pastel: 1.0,
  medium_colour: 1.05,
  dark_colour: 1.15,
  wood_panelling: 1.1,
  exposed_brick: 1.1,
  large_glazing: 1.1,
};
