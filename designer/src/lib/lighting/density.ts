/**
 * AMBIENT LAYER — LUMEN-DENSITY METHOD (homeowner plans)
 *
 *   Installed lumens = floor area (sq ft) × density (lm/sq ft) × adjustments
 *   Fittings         = ⌈ installed lumens ÷ lumens per fitting ⌉, then fitted
 *                      to an even grid within the spacing rules
 *
 * Adjustments (all reported as assumptions): brightness preference, ceilings
 * above 9.5 ft, darker walls. No utilisation or maintenance factors — the
 * published densities already reflect typical practice.
 *
 * The lux-based lumen method (ambient.ts) remains available as the
 * professional cross-check.
 */
import { AssumptionLog, type Assumption } from "./assumptions";
import { DEFAULT_CONFIG, type EngineConfig } from "./config";
import {
  DENSITY_MAX_TOLERANCE,
  HIGH_CEILING_FACTOR_MAX,
  HIGH_CEILING_FACTOR_PER_FT,
  LUMEN_DENSITY,
  NEUHOM_STANDARD_VERSION,
  REFERENCE_CEILING_FT,
  WALL_FACTOR,
  type DensityRange,
} from "./config/density";
import { LightingInputError } from "./errors";
import { mountingHeight, resolveRoom } from "./geometry";
import { assessQuality } from "./quality";
import { fitGrid, maxSpacing, type GridLayout } from "./spacing";
import type { BrightnessPreference, CalculationQuality, FixtureSpec, ResolvedRoom, RoomInput, WallFinish } from "./types";
import { classifyDistribution, round } from "./utilisation";

export const SQFT_PER_M2 = 10.7639;

export interface DensityInput {
  room: RoomInput;
  fixture: FixtureSpec;
  brightness?: BrightnessPreference;
  /** override the standard's target density (lm/sq ft) */
  targetDensity?: number;
}

export interface DensityResult {
  room: ResolvedRoom;
  areaSqFt: number;
  range: DensityRange;
  /** density after brightness preference, before room adjustments */
  targetDensity: number;
  /** combined ceiling-height and wall-colour adjustment */
  adjustment: number;
  requiredLumens: number;
  quantity: number;
  layout: GridLayout | null;
  /** installed lumens per sq ft, before room adjustments are taken out */
  achievedDensity: number;
  /** achieved density divided by the room adjustment — comparable with the range */
  effectiveDensity: number;
  state: "low" | "ok" | "high";
  assumptions: Assumption[];
  quality: CalculationQuality;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function roomAdjustment(room: ResolvedRoom, walls: WallFinish | undefined): { ceiling: number; walls: number; total: number } {
  const ceilingFt = room.ceilingHeight * 3.28084;
  const ceiling = clamp(1 + Math.max(0, ceilingFt - REFERENCE_CEILING_FT) * HIGH_CEILING_FACTOR_PER_FT, 1, HIGH_CEILING_FACTOR_MAX);
  const w = WALL_FACTOR[walls ?? "light_pastel"];
  return { ceiling: round(ceiling, 3), walls: w, total: round(ceiling * w, 3) };
}

export function densityState(effective: number, range: DensityRange): "low" | "ok" | "high" {
  if (effective < range.min * 0.95) return "low";
  if (effective > range.max * DENSITY_MAX_TOLERANCE) return "high";
  return "ok";
}

export function calculateDensityAmbient(input: DensityInput, config: EngineConfig = DEFAULT_CONFIG): DensityResult {
  const { fixture } = input;
  if (fixture.mounting === "cove" || fixture.mounting === "wall") {
    throw new LightingInputError("Cove and wall lights are not sized as general ceiling light.", "fixture.mounting");
  }
  const log = new AssumptionLog();
  const room = resolveRoom(input.room, config, log);
  const range = LUMEN_DENSITY[room.spaceType];
  const areaSqFt = room.area * SQFT_PER_M2;

  const brightness = input.brightness ?? "balanced";
  const overridden = input.targetDensity !== undefined;
  const targetDensity = overridden
    ? input.targetDensity!
    : round(clamp(range.target * config.brightnessMultiplier[brightness], range.min, range.max), 1);
  log.add({
    id: "target.density",
    label: "General light (Neuhom standard)",
    value: targetDensity,
    unit: "lm/sq ft",
    source: overridden ? "user_estimate" : "neuhom_default",
    note: `${range.min}–${range.max} lm/sq ft for this room, ${brightness} preference. ${NEUHOM_STANDARD_VERSION}.`,
  });

  const adj = roomAdjustment(room, input.room.surfaces?.walls);
  if (adj.total !== 1) {
    log.add({
      id: "density.adjustment",
      label: "Room adjustment",
      value: `× ${adj.total}`,
      source: "neuhom_default",
      note: `${adj.ceiling > 1 ? `High ceiling × ${adj.ceiling}. ` : ""}${adj.walls > 1 ? `Darker walls × ${adj.walls}.` : ""}`.trim(),
    });
  }

  const requiredLumens = areaSqFt * targetDensity * adj.total;
  const need = Math.max(1, Math.ceil(requiredLumens / fixture.lumens - 1e-9));
  const hm = mountingHeight(room, fixture.mounting, fixture.suspensionLength);
  if (hm < 0.3) throw new LightingInputError("The fitting would hang too low above the floor. Check the ceiling height.", "ceilingHeight");
  const sMax = maxSpacing(hm, fixture.beamAngle, classifyDistribution(fixture, config), config);
  const densityOf = (count: number) => (count * fixture.lumens) / areaSqFt / adj.total;

  // An even grid often rounds the count up (e.g. 3 needed → 2 × 2). If that
  // overshoots the range, step down towards the range minimum and take the
  // first count whose grid lands inside it.
  let layout = fitGrid(room.length, room.width, need, sMax, config);
  if (densityState(densityOf(layout.count), range) === "high") {
    const needMin = Math.max(1, Math.ceil((areaSqFt * range.min * adj.total) / fixture.lumens - 1e-9));
    for (let n = need - 1; n >= needMin; n--) {
      const g = fitGrid(room.length, room.width, n, sMax, config);
      if (densityState(densityOf(g.count), range) === "ok") {
        layout = g;
        break;
      }
    }
  }
  const achievedDensity = (layout.count * fixture.lumens) / areaSqFt;
  const effectiveDensity = achievedDensity / adj.total;

  return {
    room,
    areaSqFt: round(areaSqFt, 1),
    range,
    targetDensity,
    adjustment: adj.total,
    requiredLumens: Math.round(requiredLumens),
    quantity: layout.count,
    layout,
    achievedDensity: round(achievedDensity, 1),
    effectiveDensity: round(effectiveDensity, 1),
    state: densityState(effectiveDensity, range),
    assumptions: log.list(),
    quality: assessQuality(room),
  };
}
