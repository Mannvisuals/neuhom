import type { CeilingFinish, FloorFinish, SpaceType, WallFinish } from "../types";

/**
 * TYPICAL SURFACE REFLECTANCES (0–1)
 *
 * Generic values for common Indian interior finishes. Real reflectance
 * depends on the exact paint/material; these are Neuhom defaults and are
 * always reported as assumptions.
 */
export const CEILING_REFLECTANCE: Record<CeilingFinish, number> = {
  white_plaster: 0.7,
  white_gypsum_false_ceiling: 0.7,
  off_white: 0.65,
  light_wood: 0.45,
  dark_wood: 0.2,
  exposed_concrete: 0.3,
  dark_painted: 0.1,
};

export const WALL_REFLECTANCE: Record<WallFinish, number> = {
  white: 0.6,
  light_pastel: 0.5,
  medium_colour: 0.3,
  dark_colour: 0.1,
  wood_panelling: 0.3,
  exposed_brick: 0.2,
  // glass reflects little light back into the room, especially at night
  large_glazing: 0.1,
};

export const FLOOR_REFLECTANCE: Record<FloorFinish, number> = {
  light_marble_or_tile: 0.3,
  medium_wood_or_tile: 0.2,
  dark_stone_or_wood: 0.1,
  carpet_or_rug: 0.1,
};

export const DEFAULT_SURFACES = {
  ceiling: "white_plaster" as CeilingFinish,
  walls: "light_pastel" as WallFinish,
  floor: "medium_wood_or_tile" as FloorFinish,
};

/**
 * TYPICAL ROOM SIZES used only when the user marks a dimension as unknown.
 * Any result using these is flagged "preliminary".
 * Values reflect common Indian apartment and commercial sizes (metres).
 */
export const DEFAULT_DIMENSIONS: Record<SpaceType, { length: number; width: number; ceilingHeight: number }> = {
  living_room: { length: 5.5, width: 4.0, ceilingHeight: 2.85 },
  bedroom: { length: 3.6, width: 3.3, ceilingHeight: 2.85 },
  kitchen: { length: 3.0, width: 2.4, ceilingHeight: 2.85 },
  dining_room: { length: 3.6, width: 3.0, ceilingHeight: 2.85 },
  bathroom: { length: 2.4, width: 1.8, ceilingHeight: 2.6 },
  balcony: { length: 3.0, width: 1.5, ceilingHeight: 2.85 },
  office: { length: 8.0, width: 6.0, ceilingHeight: 3.0 },
  retail: { length: 10.0, width: 6.0, ceilingHeight: 3.2 },
  hospitality: { length: 10.0, width: 8.0, ceilingHeight: 3.2 },
  custom: { length: 4.0, width: 4.0, ceilingHeight: 2.85 },
};
