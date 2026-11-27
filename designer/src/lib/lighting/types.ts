/**
 * Core types for the Neuhom lighting calculation engine.
 *
 * Units: metres, lux, lumens, watts, degrees, kelvin, hours.
 * The UI is responsible for converting feet/inches into metres before
 * calling the engine.
 */

export type SpaceType =
  | "living_room"
  | "bedroom"
  | "kitchen"
  | "dining_room"
  | "bathroom"
  | "balcony"
  | "office"
  | "retail"
  | "hospitality"
  | "custom";

/**
 * Where a dimension came from. This drives how much the result can be trusted.
 * - measured:        the user measured it (tape / laser / drawing)
 * - user_estimate:   the user typed an approximate value
 * - photo_estimate:  estimated from a photograph (AI or manual) — NEVER a measurement
 * - unknown:         not provided; the engine substitutes a typical default
 */
export type DimensionSource = "measured" | "user_estimate" | "photo_estimate" | "unknown";

export interface Dimension {
  /** metres; may be omitted when source is "unknown" */
  value?: number;
  source: DimensionSource;
}

export type CeilingFinish =
  | "white_plaster"
  | "white_gypsum_false_ceiling"
  | "off_white"
  | "light_wood"
  | "dark_wood"
  | "exposed_concrete"
  | "dark_painted";

export type WallFinish =
  | "white"
  | "light_pastel"
  | "medium_colour"
  | "dark_colour"
  | "wood_panelling"
  | "exposed_brick"
  | "large_glazing";

export type FloorFinish =
  | "light_marble_or_tile"
  | "medium_wood_or_tile"
  | "dark_stone_or_wood"
  | "carpet_or_rug";

/** Cleanliness of the environment, used for maintenance factors. */
export type Environment = "clean" | "normal" | "dirty";

export type BrightnessPreference = "soft" | "balanced" | "bright";

/**
 * Light distribution family. Determines which generic utilisation profile
 * and which spacing rule applies when no photometric file is available.
 */
export type Distribution = "direct_narrow" | "direct_wide" | "general_diffuse" | "indirect";

export type MountingType = "recessed" | "surface" | "suspended" | "track" | "wall" | "cove";

export interface RoomInput {
  spaceType: SpaceType;
  length: Dimension;
  width: Dimension;
  ceilingHeight: Dimension;
  /** Height of the reference (work) plane above floor, metres. Defaults per space type. */
  workPlaneHeight?: number;
  surfaces?: {
    ceiling?: CeilingFinish;
    walls?: WallFinish;
    floor?: FloorFinish;
  };
  environment?: Environment;
}

export interface Reflectances {
  ceiling: number;
  walls: number;
  floor: number;
}

export interface ResolvedRoom {
  spaceType: SpaceType;
  length: number;
  width: number;
  ceilingHeight: number;
  workPlaneHeight: number;
  area: number;
  perimeter: number;
  reflectances: Reflectances;
  environment: Environment;
  /** Which dimensions were substituted or are not real measurements. */
  dimensionSources: Record<"length" | "width" | "ceilingHeight", DimensionSource>;
}

/**
 * A fixture as seen by the calculation engine. Values must come from product
 * data (datasheet / catalogue), user input, or a clearly labelled generic
 * reference fixture — never from free-text AI output.
 */
export interface FixtureSpec {
  /** luminaire lumens (light actually emitted by the fitting, not the bare LED) */
  lumens: number;
  watts: number;
  /** full beam angle at 50% peak intensity, degrees */
  beamAngle: number;
  mounting: MountingType;
  /** suspension length below ceiling for pendants, metres */
  suspensionLength?: number;
  /** override the distribution family; otherwise derived from beam & mounting */
  distribution?: Distribution;
  /** where these specs came from */
  specSource: "product_datasheet" | "user_input" | "generic_reference";
}

/** Calculation trust level shown to the user. */
export type CalculationStatus =
  /** inputs include unknown or photo-estimated dimensions */
  | "preliminary"
  /** lumen-method estimate from user-provided dimensions */
  | "estimate"
  /** reserved: point-by-point calculation from real IES/LDT photometry */
  | "photometric";

export interface CalculationQuality {
  status: CalculationStatus;
  method: "lumen_method";
  photometricallyValidated: false;
  reasons: string[];
}
