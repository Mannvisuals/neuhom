import type { EngineConfig } from "./config";
import { round } from "./utilisation";

export interface LoadItem {
  quantity: number;
  /** system watts per unit (including driver), from product data */
  watts: number;
  dailyHours: number;
}

export interface EnergyResult {
  connectedLoadW: number;
  /** lighting power density, W/m² */
  lpdWPerM2: number;
  annualKWh: number;
  annualCost: number;
  tariffPerKWh: number;
}

export function energySummary(items: readonly LoadItem[], areaM2: number, config: EngineConfig, tariffPerKWh?: number): EnergyResult {
  if (areaM2 <= 0) throw new RangeError("Area must be positive");
  const tariff = tariffPerKWh ?? config.energy.tariffPerKWh;
  let connected = 0;
  let annualWh = 0;
  for (const it of items) {
    if (it.quantity < 0 || it.watts < 0) throw new RangeError("Quantity and watts must be non-negative");
    connected += it.quantity * it.watts;
    annualWh += it.quantity * it.watts * it.dailyHours * 365;
  }
  const annualKWh = annualWh / 1000;
  return {
    connectedLoadW: round(connected, 1),
    lpdWPerM2: round(connected / areaM2, 2),
    annualKWh: round(annualKWh, 1),
    annualCost: Math.round(annualKWh * tariff),
    tariffPerKWh: tariff,
  };
}

export function efficacy(lumens: number, watts: number): number {
  if (watts <= 0) throw new RangeError("Watts must be positive");
  return round(lumens / watts, 1);
}

/** Flags product data that is physically implausible for an LED luminaire. */
export function isEfficacyPlausible(lumens: number, watts: number, config: EngineConfig): boolean {
  const e = lumens / watts;
  return e >= config.energy.plausibleEfficacy.min && e <= config.energy.plausibleEfficacy.max;
}
