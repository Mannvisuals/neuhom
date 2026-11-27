import type { MountingType } from "@/lib/lighting";
import type { FixtureType } from "@/lib/project/types";
import type { Layer } from "./types";

/**
 * GENERIC REFERENCE FITTINGS
 *
 * Not real products. Typical current LED specifications used to size a design
 * before products are chosen from the catalogue: ~100–110 lm/W for downlights,
 * panels and strips; ~90–95 lm/W for COB/track spots (deeper optics); lower
 * for decorative fittings. Every fixture using these is labelled "generic
 * reference" in the app.
 * Linear entries are per metre.
 */
export interface ReferenceFitting {
  id: string;
  type: FixtureType;
  label: string;
  lumens: number;
  watts: number;
  beamAngle: number;
  mounting: MountingType;
  linear?: boolean;
  defaultLayer: Layer;
  ipRating?: string;
}

const r = (f: ReferenceFitting) => f;

export const REFERENCE_FITTINGS: ReferenceFitting[] = [
  // Recessed downlights — ~90 lm/W
  r({ id: "dl-6", type: "recessed_downlight", label: "Downlight 6 W", lumens: 630, watts: 6, beamAngle: 60, mounting: "recessed", defaultLayer: "ambient" }),
  r({ id: "dl-9", type: "recessed_downlight", label: "Downlight 9 W", lumens: 950, watts: 9, beamAngle: 60, mounting: "recessed", defaultLayer: "ambient" }),
  r({ id: "dl-12", type: "recessed_downlight", label: "Downlight 12 W", lumens: 1260, watts: 12, beamAngle: 60, mounting: "recessed", defaultLayer: "ambient" }),
  r({ id: "dl-15", type: "recessed_downlight", label: "Downlight 15 W", lumens: 1580, watts: 15, beamAngle: 60, mounting: "recessed", defaultLayer: "ambient" }),
  // Surface downlights
  r({ id: "sdl-9", type: "surface_downlight", label: "Surface downlight 9 W", lumens: 900, watts: 9, beamAngle: 90, mounting: "surface", defaultLayer: "ambient" }),
  r({ id: "sdl-12", type: "surface_downlight", label: "Surface downlight 12 W", lumens: 1200, watts: 12, beamAngle: 90, mounting: "surface", defaultLayer: "ambient" }),
  r({ id: "sdl-18", type: "surface_downlight", label: "Surface downlight 18 W", lumens: 1850, watts: 18, beamAngle: 90, mounting: "surface", defaultLayer: "ambient" }),
  // Panels
  r({ id: "pn-18", type: "panel", label: "Panel 18 W", lumens: 1900, watts: 18, beamAngle: 110, mounting: "recessed", defaultLayer: "ambient" }),
  r({ id: "pn-36", type: "panel", label: "Panel 36 W (2×2 ft)", lumens: 3800, watts: 36, beamAngle: 110, mounting: "recessed", defaultLayer: "ambient" }),
  // COB spots — ~80 lm/W
  r({ id: "cob-7", type: "cob_spot", label: "COB spot 7 W, 24°", lumens: 630, watts: 7, beamAngle: 24, mounting: "recessed", defaultLayer: "accent" }),
  r({ id: "cob-10", type: "cob_spot", label: "COB spot 10 W, 36°", lumens: 900, watts: 10, beamAngle: 36, mounting: "recessed", defaultLayer: "accent" }),
  r({ id: "cob-15", type: "cob_spot", label: "COB spot 15 W, 36°", lumens: 1350, watts: 15, beamAngle: 36, mounting: "recessed", defaultLayer: "accent" }),
  // Track
  r({ id: "trk-10", type: "track_spot", label: "Track spot 10 W, 24°", lumens: 950, watts: 10, beamAngle: 24, mounting: "track", defaultLayer: "accent" }),
  r({ id: "trk-20", type: "track_spot", label: "Track spot 20 W, 36°", lumens: 1900, watts: 20, beamAngle: 36, mounting: "track", defaultLayer: "accent" }),
  // Linear (per metre)
  r({ id: "strip-5", type: "led_strip", label: "LED strip 5 W/m", lumens: 500, watts: 5, beamAngle: 120, mounting: "surface", linear: true, defaultLayer: "task" }),
  r({ id: "strip-10", type: "led_strip", label: "LED strip 10 W/m", lumens: 1000, watts: 10, beamAngle: 120, mounting: "surface", linear: true, defaultLayer: "task" }),
  r({ id: "strip-14", type: "led_strip", label: "LED strip 14 W/m", lumens: 1400, watts: 14, beamAngle: 120, mounting: "surface", linear: true, defaultLayer: "task" }),
  r({ id: "cove-5", type: "cove", label: "Cove strip 5 W/m", lumens: 500, watts: 5, beamAngle: 120, mounting: "cove", linear: true, defaultLayer: "ambient" }),
  r({ id: "cove-10", type: "cove", label: "Cove strip 10 W/m", lumens: 1000, watts: 10, beamAngle: 120, mounting: "cove", linear: true, defaultLayer: "ambient" }),
  r({ id: "cove-14", type: "cove", label: "Cove strip 14 W/m", lumens: 1400, watts: 14, beamAngle: 120, mounting: "cove", linear: true, defaultLayer: "ambient" }),
  r({ id: "lp-15", type: "linear_profile", label: "Linear profile 15 W/m", lumens: 1500, watts: 15, beamAngle: 110, mounting: "recessed", linear: true, defaultLayer: "ambient" }),
  // Pendants, chandeliers, wall lights
  r({ id: "pd-9", type: "pendant", label: "Pendant 9 W", lumens: 850, watts: 9, beamAngle: 90, mounting: "suspended", defaultLayer: "task" }),
  r({ id: "pd-15", type: "pendant", label: "Pendant 15 W", lumens: 1400, watts: 15, beamAngle: 90, mounting: "suspended", defaultLayer: "task" }),
  r({ id: "ch-30", type: "chandelier", label: "Chandelier 30 W", lumens: 2700, watts: 30, beamAngle: 140, mounting: "suspended", defaultLayer: "decorative" }),
  r({ id: "deco-6", type: "decorative", label: "Decorative 6 W", lumens: 480, watts: 6, beamAngle: 140, mounting: "surface", defaultLayer: "decorative" }),
  r({ id: "wl-6", type: "wall_light", label: "Wall light 6 W", lumens: 540, watts: 6, beamAngle: 60, mounting: "wall", defaultLayer: "task" }),
  r({ id: "wl-10", type: "wall_light", label: "Mirror / wall light 10 W", lumens: 950, watts: 10, beamAngle: 110, mounting: "wall", defaultLayer: "task" }),
];

export const fittingsOfType = (type: FixtureType) => REFERENCE_FITTINGS.filter((f) => f.type === type);
export const referenceById = (id: string) => REFERENCE_FITTINGS.find((f) => f.id === id);

export const BEAM_OPTIONS = [15, 24, 36, 60, 90, 110, 120] as const;
export const CCT_OPTIONS = [2700, 3000, 4000] as const;
export const CRI_OPTIONS = [80, 90, 95] as const;

export const LINEAR_TYPES: FixtureType[] = ["led_strip", "cove", "linear_profile"];
