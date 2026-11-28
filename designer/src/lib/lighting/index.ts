/**
 * Neuhom lighting calculation engine — public API.
 *
 * Deterministic: the same inputs always produce the same outputs. No network
 * calls, no AI. Every non-user number is reported as an assumption.
 */
export * from "./types";
export * from "./assumptions";
export * from "./errors";
export { DEFAULT_CONFIG, createConfig, type EngineConfig } from "./config";
export { resolveRoom, roomIndex, mountingHeight, feetToMetres } from "./geometry";
export { GenericUtilisationProvider, classifyDistribution, type UtilisationProvider, type UtilisationResult } from "./utilisation";
export { maintenanceFactor, ledLumenMaintenance, type MaintenanceResult, type LedRating } from "./maintenance";
export { maxSpacing, fitGrid, type GridLayout, type Point } from "./spacing";
export { cosineExponent, peakIntensity, directIlluminanceAt, directIlluminanceGrid, distributionScaledToAverage, type IlluminanceGrid } from "./photometry";
export { energySummary, efficacy, isEfficacyPlausible, type EnergyResult } from "./energy";
export { calculateAmbient, type AmbientInput, type AmbientResult } from "./ambient";
export { calculateTask, LOCAL_UTILISATION, type TaskResult } from "./task";
export { calculateAccent, type AccentInput, type AccentResult } from "./accent";
export { calculateCove, type CoveInput, type CoveResult } from "./cove";
export { ambientInputSchema, roomInputSchema, fixtureSpecSchema } from "./schema";
export { calculateDensityAmbient, densityState, roomAdjustment, SQFT_PER_M2, type DensityResult } from "./density";
export { LUMEN_DENSITY, NEUHOM_STANDARD_VERSION, type DensityRange } from "./config/density";
