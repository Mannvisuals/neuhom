import type { SpaceType, WallFinish, FloorFinish, BrightnessPreference } from "@/lib/lighting";
import type { Design } from "@/lib/design/types";
import type { SpaceAnalysis } from "@/lib/design/analysis";

export type DesignStyle = "minimal" | "contemporary" | "luxury" | "modern" | "traditional" | "custom";
export type ProjectKind = "new_construction" | "renovation";
export type Unit = "ft" | "m";
/** Walls as they appear on the plan: top, right, bottom, left. */
export type Wall = "top" | "right" | "bottom" | "left";
export type CeilingType = "false_ceiling" | "flat_slab" | "wood_ceiling" | "exposed_concrete";
export type NaturalLight = "low" | "medium" | "high";

export type StepId = "project" | "photos" | "space" | "needs" | "analysis" | "design";
export const STEPS: { id: StepId; label: string }[] = [
  { id: "project", label: "Project" },
  { id: "photos", label: "Photos" },
  { id: "space", label: "Space" },
  { id: "needs", label: "Needs" },
  { id: "analysis", label: "Analysis" },
  { id: "design", label: "Design" },
];

export type AssetKind = "room_photo" | "floor_plan" | "reference";
export interface AssetMeta {
  id: string;
  kind: AssetKind;
  name: string;
  mime: string;
  size: number;
  addedAt: number;
}

/** Stored in metres. `unknown` means the user chose not to guess. */
export interface DimensionValue {
  value: number | null;
  unknown: boolean;
}

export interface SpaceDetails {
  unit: Unit;
  length: DimensionValue;
  width: DimensionValue;
  ceilingHeight: DimensionValue;
  ceilingType: CeilingType;
  wallFinish: WallFinish;
  floorFinish: FloorFinish;
  windows: Wall[];
  /** wall with the bed / TV / counter / vanity / display, used to place task and accent lights */
  featureWall: Wall;
  existingLightPoints: number | null;
  naturalLight: NaturalLight;
  furnitureNotes: string;
}

export type Ambience = "warm_cosy" | "calm_minimal" | "bright_functional" | "dramatic";
export type CctPreference = "auto" | 2700 | 3000 | 4000;
export type BudgetRange = "essential" | "balanced" | "premium";
export type Activity = "reading" | "cooking" | "working" | "grooming" | "dining" | "entertaining" | "display";

export type FixtureType =
  | "recessed_downlight"
  | "cob_spot"
  | "surface_downlight"
  | "track_spot"
  | "linear_profile"
  | "led_strip"
  | "cove"
  | "pendant"
  | "chandelier"
  | "wall_light"
  | "decorative"
  | "panel";

export interface Requirements {
  ambience: Ambience;
  cct: CctPreference;
  brightness: BrightnessPreference;
  budget: BudgetRange;
  /** true: Neuhom chooses the fixture mix; false: use `fixtures` */
  autoFixtures: boolean;
  fixtures: FixtureType[];
  activities: Activity[];
}

export interface DesignVersion {
  id: string;
  label: string;
  createdAt: number;
  design: Design;
}

export interface Project {
  id: string;
  name: string;
  spaceType: SpaceType;
  customSpaceName?: string;
  style: DesignStyle;
  city: string;
  kind: ProjectKind;
  createdAt: number;
  updatedAt: number;
  step: StepId;
  assets: AssetMeta[];
  space: SpaceDetails;
  requirements: Requirements;
  analysis: SpaceAnalysis | null;
  design: Design | null;
  versions: DesignVersion[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  spaceType: SpaceType;
  city: string;
  updatedAt: number;
  step: StepId;
  hasDesign: boolean;
  fixtureCount: number;
  coverAssetId?: string;
}
