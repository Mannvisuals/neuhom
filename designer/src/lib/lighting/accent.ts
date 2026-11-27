/**
 * ACCENT LAYER — inverse-square point calculation
 *
 * Accent lighting is specified as a contrast ratio over ambient (e.g. 3:1),
 * not as a room average, so the lumen method does not apply. For a spotlight
 * aimed at an object at distance d:
 *
 *   E = I · cos(i) / d²        (i = angle of incidence on the surface)
 *   I_required = E · d² / cos(i)
 *   Φ_required = I_required · 2π / (m + 1)   (idealised cosine-power beam)
 *
 * Also used for vertical tasks such as mirror lighting.
 */

import { DEFAULT_CONFIG, type EngineConfig } from "./config";
import { LightingInputError, type CalcWarning } from "./errors";
import { cosineExponent, peakIntensity } from "./photometry";
import type { SpaceType } from "./types";
import { round } from "./utilisation";

const deg2rad = (d: number) => (d * Math.PI) / 180;

export interface AccentInput {
  spaceType: SpaceType;
  /** ambient illuminance on/around the object, lux */
  ambientLux: number;
  /** accent:ambient ratio; defaults to the space standard's target */
  ratio?: number;
  /** distance from fitting to the object centre, metres */
  distance: number;
  /**
   * Angle between the beam axis and the surface normal. Artwork is usually
   * lit at about 30° from vertical, giving ~30° incidence on a wall.
   */
  incidenceAngleDeg?: number;
  beamAngle: number;
  maintenanceFactor: number;
  /** if given, the achieved illuminance and ratio are reported */
  candidateLumens?: number;
}

export interface AccentResult {
  targetLux: number;
  ratio: number;
  requiredPeakCandela: number;
  requiredLumens: number;
  /** beam footprint on the object: circle diameter (normal) / ellipse long axis (at incidence) */
  beamDiameter: number;
  beamFootprintLong: number;
  achievedLux: number | null;
  achievedRatio: number | null;
  warnings: CalcWarning[];
}

export const DEFAULT_ACCENT_INCIDENCE_DEG = 30;

export function calculateAccent(input: AccentInput, config: EngineConfig = DEFAULT_CONFIG): AccentResult {
  if (input.distance <= 0) throw new LightingInputError("Distance to the object must be positive.", "distance");
  const inc = input.incidenceAngleDeg ?? DEFAULT_ACCENT_INCIDENCE_DEG;
  if (inc < 0 || inc >= 85) throw new LightingInputError("Incidence angle must be between 0° and 85°.", "incidenceAngleDeg");
  if (input.ambientLux < 0) throw new LightingInputError("Ambient illuminance cannot be negative.", "ambientLux");

  const std = config.standards[input.spaceType];
  const ratio = input.ratio ?? std.accentRatio.target;
  const targetLux = Math.max(input.ambientLux * ratio, 1);
  const cosI = Math.cos(deg2rad(inc));
  const m = cosineExponent(input.beamAngle);

  const requiredPeakCandela = (targetLux * input.distance ** 2) / (cosI * input.maintenanceFactor);
  const requiredLumens = (requiredPeakCandela * 2 * Math.PI) / (m + 1);

  const beamDiameter = 2 * input.distance * Math.tan(deg2rad(input.beamAngle / 2));
  const beamFootprintLong = beamDiameter / cosI;

  let achievedLux: number | null = null;
  let achievedRatio: number | null = null;
  const warnings: CalcWarning[] = [];
  if (input.candidateLumens !== undefined) {
    const i0 = peakIntensity(input.candidateLumens, input.beamAngle);
    achievedLux = round(((i0 * cosI) / input.distance ** 2) * input.maintenanceFactor, 0);
    achievedRatio = input.ambientLux > 0 ? round(achievedLux / input.ambientLux, 1) : null;
    if (achievedRatio !== null && achievedRatio < std.accentRatio.min) {
      warnings.push({
        code: "accent_weak",
        severity: "warning",
        message: `Contrast is only ${achievedRatio}:1 — accent lighting is barely noticeable below ${std.accentRatio.min}:1. Use a narrower beam or about ${Math.round(requiredLumens)} lm.`,
      });
    }
    if (achievedRatio !== null && achievedRatio > std.accentRatio.max * 2) {
      warnings.push({
        code: "accent_harsh",
        severity: "info",
        message: `Contrast of ${achievedRatio}:1 is very dramatic. Consider dimming or a wider beam.`,
      });
    }
  }

  return {
    targetLux: Math.round(targetLux),
    ratio,
    requiredPeakCandela: Math.round(requiredPeakCandela),
    requiredLumens: Math.round(requiredLumens),
    beamDiameter: round(beamDiameter, 2),
    beamFootprintLong: round(beamFootprintLong, 2),
    achievedLux,
    achievedRatio,
    warnings,
  };
}
