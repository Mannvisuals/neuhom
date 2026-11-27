import type { EngineConfig } from "./config";
import type { Environment } from "./types";
import { round } from "./utilisation";

export interface LedRating {
  /** fraction of initial lumens remaining at ratedHours, e.g. 0.7 for L70 */
  lumenMaintenance: number;
  ratedHours: number;
}

export interface MaintenanceInput {
  environment: Environment;
  dailyHours: number;
  maintenancePeriodYears?: number;
  ledRating?: LedRating;
}

export interface MaintenanceResult {
  value: number;
  llmf: number;
  lsf: number;
  lmf: number;
  rsmf: number;
  operatingHours: number;
  ledRatingSource: "product_datasheet" | "generic_default";
}

/**
 * LED lumen maintenance at a given age, assuming linear depreciation from
 * 100% at 0 h to the rated value at ratedHours. Linear is a simplification
 * (real LED depreciation is closer to exponential) that is slightly
 * conservative over the first part of life.
 */
export function ledLumenMaintenance(hours: number, rating: LedRating): number {
  if (rating.ratedHours <= 0) throw new RangeError("ratedHours must be positive");
  const fractionOfLife = Math.min(hours / rating.ratedHours, 1.5);
  return Math.max(0.3, 1 - (1 - rating.lumenMaintenance) * fractionOfLife);
}

export function maintenanceFactor(input: MaintenanceInput, config: EngineConfig): MaintenanceResult {
  const led = config.maintenance.led;
  const years = input.maintenancePeriodYears ?? led.maintenancePeriodYears;
  const operatingHours = input.dailyHours * 365 * years;
  const rating = input.ledRating ?? { lumenMaintenance: led.ratedLumenMaintenance, ratedHours: led.ratedHours };

  const llmf = ledLumenMaintenance(operatingHours, rating);
  const lsf = led.lampSurvivalFactor;
  const lmf = config.maintenance.luminaire[input.environment];
  const rsmf = config.maintenance.roomSurface[input.environment];

  return {
    value: round(llmf * lsf * lmf * rsmf, 3),
    llmf: round(llmf, 3),
    lsf,
    lmf,
    rsmf,
    operatingHours,
    ledRatingSource: input.ledRating ? "product_datasheet" : "generic_default",
  };
}
