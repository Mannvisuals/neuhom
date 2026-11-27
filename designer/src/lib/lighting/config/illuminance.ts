import type { Environment, SpaceType } from "../types";

/**
 * ROOM-SPECIFIC ILLUMINANCE TARGETS
 *
 * All values are *maintained* illuminance (lux) on the reference plane, i.e.
 * the level still delivered after light loss over the maintenance period.
 *
 * Provenance:
 *  - Commercial spaces (office, retail) follow EN 12464-1 guidance for the
 *    named task. EN 12464-1 is the European indoor-workplace standard and is
 *    widely used as a reference in India alongside IS 3646 / NBC 2016 Part 8.
 *  - Residential spaces have no mandatory illuminance standard. The ranges
 *    below are Neuhom design defaults consistent with commonly published
 *    residential lighting guidance. They are design intent, not compliance.
 *
 * Every value here is configuration: it can be overridden per project
 * without changing the calculation code.
 */

export interface IlluminanceRange {
  min: number;
  target: number;
  max: number;
}

export interface TaskTarget extends IlluminanceRange {
  label: string;
  /** reference plane height above floor, metres */
  planeHeight: number;
  /** "horizontal" for counters/desks, "vertical" for mirrors/faces */
  plane: "horizontal" | "vertical";
}

export interface SpaceStandard {
  spaceType: SpaceType;
  label: string;
  /** general (ambient) maintained illuminance on the work plane */
  ambient: IlluminanceRange;
  tasks: Record<string, TaskTarget>;
  /** ambient reference plane height, metres */
  workPlaneHeight: number;
  /** minimum uniformity U0 = Emin / Eavg */
  uniformityMin: number;
  minCri: number;
  cct: { min: number; max: number; default: number };
  /** accent-to-ambient illuminance ratio */
  accentRatio: IlluminanceRange;
  defaultEnvironment: Environment;
  /** typical daily hours of use, for energy and LED lumen depreciation */
  dailyHours: number;
  /** minimum IP rating for fixtures, where moisture/dust is relevant */
  minIpRating?: string;
  provenance: "standard_guidance" | "neuhom_default";
  reference: string;
}

const RESIDENTIAL_REF =
  "Neuhom residential default. No mandatory residential illuminance standard applies; range reflects commonly published residential lighting guidance.";

export const SPACE_STANDARDS: Record<SpaceType, SpaceStandard> = {
  living_room: {
    spaceType: "living_room",
    label: "Living room",
    ambient: { min: 100, target: 150, max: 250 },
    tasks: {
      reading: { label: "Reading area", min: 300, target: 300, max: 500, planeHeight: 0.75, plane: "horizontal" },
    },
    workPlaneHeight: 0.75,
    uniformityMin: 0.4,
    minCri: 90,
    cct: { min: 2700, max: 3500, default: 3000 },
    accentRatio: { min: 2, target: 3, max: 5 },
    defaultEnvironment: "clean",
    dailyHours: 6,
    provenance: "neuhom_default",
    reference: RESIDENTIAL_REF,
  },
  bedroom: {
    spaceType: "bedroom",
    label: "Bedroom",
    ambient: { min: 75, target: 100, max: 200 },
    tasks: {
      bedside_reading: { label: "Bedside reading", min: 200, target: 300, max: 500, planeHeight: 0.6, plane: "horizontal" },
      wardrobe: { label: "Wardrobe front", min: 150, target: 200, max: 300, planeHeight: 1.2, plane: "vertical" },
    },
    workPlaneHeight: 0.75,
    uniformityMin: 0.4,
    minCri: 90,
    cct: { min: 2700, max: 3000, default: 2700 },
    accentRatio: { min: 2, target: 3, max: 4 },
    defaultEnvironment: "clean",
    dailyHours: 4,
    provenance: "neuhom_default",
    reference: RESIDENTIAL_REF,
  },
  kitchen: {
    spaceType: "kitchen",
    label: "Kitchen",
    ambient: { min: 200, target: 300, max: 400 },
    tasks: {
      counter: { label: "Counter / preparation", min: 300, target: 500, max: 750, planeHeight: 0.9, plane: "horizontal" },
      hob: { label: "Cooking hob", min: 300, target: 500, max: 750, planeHeight: 0.9, plane: "horizontal" },
    },
    workPlaneHeight: 0.9,
    uniformityMin: 0.4,
    minCri: 90,
    cct: { min: 3000, max: 4000, default: 4000 },
    accentRatio: { min: 2, target: 3, max: 4 },
    defaultEnvironment: "normal",
    dailyHours: 5,
    provenance: "neuhom_default",
    reference: RESIDENTIAL_REF,
  },
  dining_room: {
    spaceType: "dining_room",
    label: "Dining room",
    ambient: { min: 100, target: 150, max: 200 },
    tasks: {
      table: { label: "Dining table", min: 150, target: 200, max: 300, planeHeight: 0.75, plane: "horizontal" },
    },
    workPlaneHeight: 0.75,
    uniformityMin: 0.4,
    minCri: 90,
    cct: { min: 2700, max: 3000, default: 2700 },
    accentRatio: { min: 2, target: 3, max: 5 },
    defaultEnvironment: "clean",
    dailyHours: 3,
    provenance: "neuhom_default",
    reference: RESIDENTIAL_REF,
  },
  bathroom: {
    spaceType: "bathroom",
    label: "Bathroom",
    ambient: { min: 150, target: 200, max: 300 },
    tasks: {
      mirror: { label: "Mirror / grooming (vertical, at face)", min: 300, target: 300, max: 500, planeHeight: 1.6, plane: "vertical" },
    },
    workPlaneHeight: 0.8,
    uniformityMin: 0.4,
    minCri: 90,
    cct: { min: 3000, max: 4000, default: 4000 },
    accentRatio: { min: 2, target: 2, max: 3 },
    defaultEnvironment: "normal",
    dailyHours: 2,
    // Common practice: IP44 minimum in bathrooms; IP65 directly over showers.
    minIpRating: "IP44",
    provenance: "neuhom_default",
    reference: `${RESIDENTIAL_REF} IP44 minimum generally; IP65 directly above shower areas.`,
  },
  balcony: {
    spaceType: "balcony",
    label: "Balcony",
    ambient: { min: 30, target: 50, max: 100 },
    tasks: {},
    workPlaneHeight: 0.0,
    uniformityMin: 0.25,
    minCri: 80,
    cct: { min: 2700, max: 3000, default: 3000 },
    accentRatio: { min: 2, target: 3, max: 5 },
    defaultEnvironment: "dirty",
    dailyHours: 4,
    minIpRating: "IP54",
    provenance: "neuhom_default",
    reference: `${RESIDENTIAL_REF} Semi-outdoor: IP54 minimum recommended for dust and rain.`,
  },
  office: {
    spaceType: "office",
    label: "Office",
    ambient: { min: 300, target: 500, max: 750 },
    tasks: {
      desk: { label: "Desk — writing, reading, screen work", min: 500, target: 500, max: 750, planeHeight: 0.75, plane: "horizontal" },
    },
    workPlaneHeight: 0.75,
    uniformityMin: 0.6,
    minCri: 80,
    cct: { min: 3500, max: 5000, default: 4000 },
    accentRatio: { min: 1.5, target: 2, max: 3 },
    defaultEnvironment: "clean",
    dailyHours: 10,
    provenance: "standard_guidance",
    reference: "EN 12464-1 guidance for writing, typing, reading and data processing: 500 lx maintained, U0 0.60, Ra 80.",
  },
  retail: {
    spaceType: "retail",
    label: "Retail",
    ambient: { min: 300, target: 300, max: 750 },
    tasks: {
      till: { label: "Till / cash desk", min: 500, target: 500, max: 750, planeHeight: 0.85, plane: "horizontal" },
    },
    workPlaneHeight: 0.85,
    uniformityMin: 0.4,
    minCri: 90,
    cct: { min: 3000, max: 4000, default: 3500 },
    accentRatio: { min: 3, target: 5, max: 10 },
    defaultEnvironment: "normal",
    dailyHours: 12,
    provenance: "standard_guidance",
    reference: "EN 12464-1 guidance for sales areas: 300 lx maintained, U0 0.40, Ra 80. Neuhom recommends Ra 90 for merchandise.",
  },
  hospitality: {
    spaceType: "hospitality",
    label: "Hospitality",
    ambient: { min: 100, target: 200, max: 300 },
    tasks: {
      reception: { label: "Reception desk", min: 300, target: 300, max: 500, planeHeight: 0.85, plane: "horizontal" },
    },
    workPlaneHeight: 0.75,
    uniformityMin: 0.4,
    minCri: 90,
    cct: { min: 2700, max: 3000, default: 3000 },
    accentRatio: { min: 3, target: 4, max: 8 },
    defaultEnvironment: "normal",
    dailyHours: 14,
    provenance: "neuhom_default",
    reference: "Neuhom hospitality default (atmosphere-led). Verify against the operator's brand standards.",
  },
  custom: {
    spaceType: "custom",
    label: "Custom space",
    ambient: { min: 100, target: 200, max: 500 },
    tasks: {},
    workPlaneHeight: 0.75,
    uniformityMin: 0.4,
    minCri: 80,
    cct: { min: 2700, max: 4000, default: 3000 },
    accentRatio: { min: 2, target: 3, max: 5 },
    defaultEnvironment: "normal",
    dailyHours: 6,
    provenance: "neuhom_default",
    reference: "Generic Neuhom default — set a target illuminance for this space.",
  },
};

/**
 * Brightness preference scales the target within the space's allowed range.
 * The result is always clamped to [min, max] so a preference can never push
 * the design outside the guidance range.
 */
export const BRIGHTNESS_MULTIPLIER = {
  soft: 0.8,
  balanced: 1.0,
  bright: 1.25,
} as const;
