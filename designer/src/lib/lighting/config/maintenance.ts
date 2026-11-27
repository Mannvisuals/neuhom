import type { Environment } from "../types";

/**
 * MAINTENANCE FACTOR (MF) CONFIGURATION — CIE 97 structure
 *
 *   MF = LLMF × LSF × LMF × RSMF
 *
 *   LLMF  lamp lumen maintenance  — LED output drops with age
 *   LSF   lamp survival           — 1.0 assumes failed LEDs are replaced promptly
 *   LMF   luminaire maintenance   — dirt on the fitting
 *   RSMF  room surface maintenance — dirt on walls/ceiling
 *
 * The LMF/RSMF values are generic approximations for enclosed/recessed
 * luminaires cleaned about once a year. Indian conditions are dustier than
 * many reference environments, so "normal" is the default for most spaces.
 */

export const LUMINAIRE_MAINTENANCE: Record<Environment, number> = {
  clean: 0.95,
  normal: 0.9,
  dirty: 0.85,
};

export const ROOM_SURFACE_MAINTENANCE: Record<Environment, number> = {
  clean: 0.97,
  normal: 0.94,
  dirty: 0.9,
};

export const LED_DEFAULTS = {
  /**
   * Generic LED rating used when the product datasheet doesn't state one:
   * L80 at 50,000 h (80% of initial output remains after 50,000 h), typical
   * of decent current LED fittings. Gives overall MF ≈ 0.8–0.85, in line with
   * common industry practice for LED installations.
   */
  ratedLumenMaintenance: 0.8,
  ratedHours: 50_000,
  /** design maintenance period, years */
  maintenancePeriodYears: 5,
  lampSurvivalFactor: 1.0,
};

/** Lower bound: below this the design is unrealistic and is flagged. */
export const MIN_PLAUSIBLE_MF = 0.5;
