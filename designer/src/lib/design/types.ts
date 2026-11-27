import type { BrightnessPreference, MountingType } from "@/lib/lighting";
import type { FixtureType } from "@/lib/project/types";

export type Layer = "ambient" | "task" | "accent" | "decorative";
export const LAYERS: { value: Layer; label: string; prefix: string; color: string }[] = [
  { value: "ambient", label: "Ambient", prefix: "A", color: "var(--color-ambient)" },
  { value: "task", label: "Task", prefix: "T", color: "var(--color-task)" },
  { value: "accent", label: "Accent", prefix: "X", color: "var(--color-accent)" },
  { value: "decorative", label: "Decorative", prefix: "D", color: "var(--color-decorative)" },
];

export type Concept = "tailored" | "warm_cosy" | "minimal_functional" | "premium_architectural" | "bright_contemporary";
export const CONCEPTS: { value: Concept; label: string; description: string }[] = [
  { value: "tailored", label: "Tailored", description: "Built from your requirements" },
  { value: "warm_cosy", label: "Warm & cosy", description: "2700 K, soft ambient, cove and accents" },
  { value: "minimal_functional", label: "Minimal & functional", description: "Even downlights, essentials only" },
  { value: "premium_architectural", label: "Premium architectural", description: "Cove, wall washing, statement piece" },
  { value: "bright_contemporary", label: "Bright & contemporary", description: "4000 K, bright and crisp" },
];

/**
 * A fixture placed on the plan. Plan coordinates are metres from the
 * top-left room corner: x along the length (left→right), y along the width
 * (top→bottom). Linear fittings run from (x, y) to (x2, y2).
 */
export interface PlacedFixture {
  id: string;
  code: string;
  layer: Layer;
  type: FixtureType;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  /** per unit; per metre for linear fittings */
  lumens: number;
  /** per unit; per metre for linear fittings */
  watts: number;
  beamAngle: number;
  cct: number;
  cri: number;
  mounting: MountingType;
  /** pendants: drop below ceiling, metres */
  suspensionLength?: number;
  ipRating?: string;
  specSource: "generic_reference" | "product_datasheet" | "user_input";
  referenceId?: string;
}

export interface Design {
  id: string;
  concept: Concept;
  createdAt: number;
  brightness: BrightnessPreference;
  cct: number;
  fixtures: PlacedFixture[];
  /** plain-language reasons for the main choices */
  rationale: string[];
  edited: boolean;
  /** fingerprint of the project inputs the design was generated from */
  inputs?: string;
}

export const isLinear = (f: Pick<PlacedFixture, "x2" | "y2">) => f.x2 !== undefined && f.y2 !== undefined;

export function fixtureLength(f: PlacedFixture): number {
  if (!isLinear(f)) return 0;
  return Math.hypot(f.x2! - f.x, f.y2! - f.y);
}
