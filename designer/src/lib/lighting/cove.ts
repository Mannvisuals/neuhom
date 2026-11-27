/**
 * COVE LIGHTING — indirect lumen method
 *
 * Light from a cove reaches the room only after bouncing off the ceiling, so
 * the indirect utilisation profile (strongly dependent on ceiling
 * reflectance) is used:
 *
 *   required lm/m = (E_contribution × A) / (UF_indirect × MF × L_cove)
 */

import { AssumptionLog, type Assumption } from "./assumptions";
import { DEFAULT_CONFIG, type EngineConfig } from "./config";
import { LightingInputError, type CalcWarning } from "./errors";
import { resolveRoom, roomIndex } from "./geometry";
import { maintenanceFactor } from "./maintenance";
import { assessQuality } from "./quality";
import type { CalculationQuality, ResolvedRoom, RoomInput } from "./types";
import { GenericUtilisationProvider, round, type UtilisationProvider } from "./utilisation";

export interface CoveInput {
  room: RoomInput;
  /** run length in metres; defaults to the full room perimeter */
  coveLength?: number;
  /** ambient lux the cove should contribute; defaults to 30% of the ambient target */
  contributionLux?: number;
  /** strip output in lm/m, to report what a chosen product achieves */
  stripLumensPerMetre?: number;
  stripWattsPerMetre?: number;
}

export interface CoveResult {
  room: ResolvedRoom;
  coveLength: number;
  contributionLux: number;
  utilisation: number;
  maintenanceFactor: number;
  requiredLumensPerMetre: number;
  achievedLux: number | null;
  connectedLoadW: number | null;
  warnings: CalcWarning[];
  assumptions: Assumption[];
  quality: CalculationQuality;
}

export const DEFAULT_COVE_SHARE = 0.3;

export function calculateCove(
  input: CoveInput,
  config: EngineConfig = DEFAULT_CONFIG,
  ufProvider: UtilisationProvider = new GenericUtilisationProvider(config),
): CoveResult {
  const log = new AssumptionLog();
  const warnings: CalcWarning[] = [];
  const room = resolveRoom(input.room, config, log);
  const std = config.standards[room.spaceType];

  const coveLength = input.coveLength ?? room.perimeter;
  if (coveLength <= 0) throw new LightingInputError("Cove length must be positive.", "coveLength");
  if (input.coveLength === undefined) {
    log.add({ id: "cove.length", label: "Cove length", value: round(coveLength, 2), unit: "m", source: "neuhom_default", note: "Full room perimeter assumed." });
  }

  const contributionLux = input.contributionLux ?? Math.round(std.ambient.target * DEFAULT_COVE_SHARE);
  if (input.contributionLux === undefined) {
    log.add({
      id: "cove.contribution",
      label: "Cove share of ambient light",
      value: contributionLux,
      unit: "lx",
      source: "neuhom_default",
      note: `${DEFAULT_COVE_SHARE * 100}% of the ${std.ambient.target} lx ambient target; downlights provide the rest.`,
    });
  }

  const hm = room.ceilingHeight - room.workPlaneHeight;
  const k = roomIndex(room.length, room.width, hm);
  const uf = ufProvider.getUtilisation({ roomIndex: k, reflectances: room.reflectances, distribution: "indirect" });
  log.add({
    id: "calc.cove.utilisation",
    label: "Cove utilisation factor",
    value: uf.value,
    source: "generic_model",
    note: "Generic indirect profile; highly dependent on a light, matte ceiling.",
  });
  if (room.reflectances.ceiling < 0.5) {
    warnings.push({
      code: "cove_dark_ceiling",
      severity: "warning",
      message: "Cove lighting relies on the ceiling reflecting light. With a dark ceiling it adds little brightness — consider it decorative only.",
    });
  }

  const mf = maintenanceFactor({ environment: room.environment, dailyHours: std.dailyHours }, config).value;
  const requiredLumensPerMetre = Math.ceil((contributionLux * room.area) / (uf.value * mf * coveLength));
  const achievedLux = input.stripLumensPerMetre
    ? round((input.stripLumensPerMetre * coveLength * uf.value * mf) / room.area, 0)
    : null;
  const connectedLoadW = input.stripWattsPerMetre ? round(input.stripWattsPerMetre * coveLength, 1) : null;

  return {
    room,
    coveLength: round(coveLength, 2),
    contributionLux,
    utilisation: uf.value,
    maintenanceFactor: mf,
    requiredLumensPerMetre,
    achievedLux,
    connectedLoadW,
    warnings,
    assumptions: log.list(),
    quality: assessQuality(room),
  };
}
