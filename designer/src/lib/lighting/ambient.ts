/**
 * AMBIENT LAYER — LUMEN METHOD
 *
 *   N = (E × A) / (Φ × UF × MF)
 *
 *   E   target maintained illuminance (lux)
 *   A   floor area (m²)
 *   Φ   luminaire lumens per fixture
 *   UF  utilisation factor (share of light reaching the reference plane)
 *   MF  maintenance factor (light lost to ageing and dirt)
 *
 * The count from the lumen method is then reconciled with spacing: a grid is
 * fitted so fittings are never further apart than the beam/height allows.
 */

import { AssumptionLog, type Assumption } from "./assumptions";
import { DEFAULT_CONFIG, type EngineConfig } from "./config";
import { energySummary, efficacy, isEfficacyPlausible, type EnergyResult } from "./energy";
import { LightingInputError, type CalcWarning } from "./errors";
import { mountingHeight, resolveRoom, roomIndex } from "./geometry";
import { maintenanceFactor, type LedRating, type MaintenanceResult } from "./maintenance";
import { distributionScaledToAverage, type IlluminanceGrid } from "./photometry";
import { assessQuality } from "./quality";
import { fitGrid, maxSpacing, type GridLayout } from "./spacing";
import type {
  BrightnessPreference,
  CalculationQuality,
  Environment,
  FixtureSpec,
  ResolvedRoom,
  RoomInput,
} from "./types";
import {
  classifyDistribution,
  GenericUtilisationProvider,
  round,
  type UtilisationProvider,
  type UtilisationResult,
} from "./utilisation";
import type { IlluminanceRange } from "./config/illuminance";

export interface AmbientInput {
  room: RoomInput;
  fixture: FixtureSpec;
  brightness?: BrightnessPreference;
  /** user/designer override of the target (lux) */
  targetLux?: number;
  /** lux already provided by other ambient sources, e.g. cove lighting */
  otherAmbientLux?: number;
  maintenance?: {
    environment?: Environment;
    dailyHours?: number;
    periodYears?: number;
    ledRating?: LedRating;
  };
  /** explicit UF, e.g. from a manufacturer table */
  utilisationOverride?: number;
  /** explicit MF agreed with the client */
  maintenanceFactorOverride?: number;
}

export interface AmbientResult {
  room: ResolvedRoom;
  target: { lux: number; range: IlluminanceRange; brightness: BrightnessPreference; overridden: boolean };
  mountingHeight: number;
  roomIndex: number;
  utilisation: UtilisationResult;
  maintenance: MaintenanceResult & { overridden: boolean };
  /** lumens that must reach the plane, grossed up for UF and MF */
  requiredLumens: number;
  /** count from the lumen method alone */
  lumenMethodQuantity: number;
  maxSpacing: number;
  layout: GridLayout | null;
  /** final count after spacing reconciliation */
  quantity: number;
  /** average maintained illuminance by the lumen method, including other ambient sources */
  achievedLux: number;
  withinRange: boolean;
  /** lumens per fitting that would hit the target exactly with this layout */
  idealLumensPerFixture: number | null;
  /** estimated distribution (point-model pattern, lumen-method level); for uniformity and plan visualisation */
  distribution: IlluminanceGrid | null;
  energy: EnergyResult;
  efficacy: number;
  warnings: CalcWarning[];
  assumptions: Assumption[];
  quality: CalculationQuality;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function calculateAmbient(
  input: AmbientInput,
  config: EngineConfig = DEFAULT_CONFIG,
  ufProvider: UtilisationProvider = new GenericUtilisationProvider(config),
): AmbientResult {
  const log = new AssumptionLog();
  const warnings: CalcWarning[] = [];
  const { fixture } = input;

  if (fixture.mounting === "cove" || fixture.mounting === "wall") {
    throw new LightingInputError(
      "Cove and wall lights are not calculated as a ceiling grid. Use the cove or accent calculation instead.",
      "fixture.mounting",
    );
  }

  const room = resolveRoom(input.room, config, log);
  const std = config.standards[room.spaceType];

  // ── Target illuminance ────────────────────────────────────────────────
  const brightness = input.brightness ?? "balanced";
  const overridden = input.targetLux !== undefined;
  const targetLux = overridden
    ? input.targetLux!
    : Math.round(clamp(std.ambient.target * config.brightnessMultiplier[brightness], std.ambient.min, std.ambient.max));
  log.add({
    id: "target.ambient",
    label: "Ambient target (maintained)",
    value: targetLux,
    unit: "lx",
    source: overridden ? "user_estimate" : std.provenance,
    note: overridden
      ? "Set manually for this project."
      : `${std.label}: ${std.ambient.min}–${std.ambient.max} lx range, ${brightness} preference. ${std.reference}`,
  });

  const other = Math.max(0, input.otherAmbientLux ?? 0);
  const requirement = Math.max(0, targetLux - other);

  // ── Geometry ──────────────────────────────────────────────────────────
  const hm = mountingHeight(room, fixture.mounting, fixture.suspensionLength);
  if (hm < 0.3) {
    throw new LightingInputError(
      `The fitting would be only ${round(hm, 2)} m above the ${room.workPlaneHeight} m reference plane. Check the ceiling height or pendant drop.`,
      "ceilingHeight",
    );
  }
  const k = roomIndex(room.length, room.width, hm);

  // ── Utilisation ───────────────────────────────────────────────────────
  const distribution = classifyDistribution(fixture, config);
  const utilisation: UtilisationResult =
    input.utilisationOverride !== undefined
      ? { value: input.utilisationOverride, source: "override", distribution, roomIndex: k, roomIndexUsed: k }
      : ufProvider.getUtilisation({ roomIndex: k, reflectances: room.reflectances, distribution });
  if (utilisation.source === "generic_model") {
    log.add({
      id: "calc.utilisation",
      label: "Utilisation factor",
      value: utilisation.value,
      source: "generic_model",
      note: `${config.utilisation[distribution].label}, room index ${round(k, 2)}. Generic model — a manufacturer UF table or IES file would replace this.`,
    });
  }
  if (k < config.utilisation[distribution].roomIndices[0]!) {
    warnings.push({
      code: "room_index_low",
      severity: "info",
      message: "This is a narrow or tall space; light loss on walls is high and the estimate is less certain.",
    });
  }

  // ── Maintenance ───────────────────────────────────────────────────────
  const mfCalc = maintenanceFactor(
    {
      environment: input.maintenance?.environment ?? room.environment,
      dailyHours: input.maintenance?.dailyHours ?? std.dailyHours,
      maintenancePeriodYears: input.maintenance?.periodYears,
      ledRating: input.maintenance?.ledRating,
    },
    config,
  );
  const mfOverridden = input.maintenanceFactorOverride !== undefined;
  const mf = mfOverridden ? input.maintenanceFactorOverride! : mfCalc.value;
  if (!mfOverridden) {
    log.add({
      id: "calc.maintenance",
      label: "Maintenance factor",
      value: mf,
      source: mfCalc.ledRatingSource === "product_datasheet" ? "neuhom_default" : "generic_model",
      note: `LED ${round(mfCalc.llmf, 2)} × survival ${mfCalc.lsf} × fitting dirt ${mfCalc.lmf} × room dirt ${mfCalc.rsmf}, over ${mfCalc.operatingHours.toLocaleString("en-IN")} h (${room.environment} environment, ~annual cleaning)${mfCalc.ledRatingSource === "generic_default" ? `. LED life assumed L${Math.round(config.maintenance.led.ratedLumenMaintenance * 100)} at ${config.maintenance.led.ratedHours.toLocaleString("en-IN")} h` : ""}.`,
    });
  }

  if (fixture.specSource === "generic_reference") {
    log.add({
      id: "fixture.spec",
      label: "Fixture specification",
      value: `${fixture.lumens} lm, ${fixture.watts} W, ${fixture.beamAngle}°`,
      source: "neuhom_default",
      note: "Generic reference fitting. Select a catalogue product to calculate with real datasheet values.",
    });
  }

  // ── Lumen method ──────────────────────────────────────────────────────
  const requiredLumens = (requirement * room.area) / (utilisation.value * mf);
  const lumenMethodQuantity = requirement > 0 ? Math.ceil(requiredLumens / fixture.lumens - 1e-9) : 0;

  // ── Spacing reconciliation ────────────────────────────────────────────
  const sMax = maxSpacing(hm, fixture.beamAngle, distribution, config);
  const layout = lumenMethodQuantity > 0 ? fitGrid(room.length, room.width, lumenMethodQuantity, sMax, config) : null;
  const quantity = layout?.count ?? 0;

  if (layout && quantity > lumenMethodQuantity) {
    warnings.push({
      code: "spacing_added_fixtures",
      severity: "info",
      message: `${lumenMethodQuantity} fittings would give enough light, but ${quantity} are needed to keep spacing within ${round(sMax, 2)} m for even coverage.`,
    });
  }
  if (layout?.tooDense) {
    warnings.push({
      code: "too_dense",
      severity: "warning",
      message: `Fittings would be under ${config.spacing.minPracticalSpacing} m apart. Choose a higher-output fitting.`,
    });
  }

  const achievedLux = round((quantity * fixture.lumens * utilisation.value * mf) / room.area + other, 0);
  const range = overridden ? { min: targetLux, target: targetLux, max: Number.POSITIVE_INFINITY } : std.ambient;
  const withinRange = achievedLux >= Math.min(targetLux, range.min) && achievedLux <= range.max;
  const idealLumensPerFixture = quantity > 0 ? Math.round(requiredLumens / quantity) : null;

  if (!overridden && achievedLux > std.ambient.max && idealLumensPerFixture) {
    warnings.push({
      code: "over_lit",
      severity: "warning",
      message: `${achievedLux} lx exceeds the ${std.ambient.max} lx upper limit. Use fittings of about ${idealLumensPerFixture} lm, or add dimming.`,
    });
  }

  // ── Estimated distribution for uniformity & visualisation ────────────
  const distribution_ = layout
    ? distributionScaledToAverage(
        room.length,
        room.width,
        layout.positions.map((p) => ({ position: p, height: hm, lumens: fixture.lumens, beamAngle: fixture.beamAngle })),
        achievedLux - other,
        { maintenanceFactor: mf },
      )
    : null;
  if (distribution_ && distribution_.uniformity < std.uniformityMin) {
    warnings.push({
      code: "low_uniformity",
      severity: "info",
      message: `Estimated uniformity is ${distribution_.uniformity} (guide ≥ ${std.uniformityMin}). Reflected light usually improves this; consider a wider beam if the room should feel evenly lit.`,
    });
  }

  // ── Energy & data sanity ──────────────────────────────────────────────
  const energy = energySummary(
    [{ quantity, watts: fixture.watts, dailyHours: input.maintenance?.dailyHours ?? std.dailyHours }],
    room.area,
    config,
  );
  if (!isEfficacyPlausible(fixture.lumens, fixture.watts, config)) {
    warnings.push({
      code: "implausible_efficacy",
      severity: "warning",
      message: `${efficacy(fixture.lumens, fixture.watts)} lm/W is outside the plausible range for LED fittings. Check the product data.`,
    });
  }

  return {
    room,
    target: { lux: targetLux, range: std.ambient, brightness, overridden },
    mountingHeight: round(hm, 3),
    roomIndex: round(k, 3),
    utilisation,
    maintenance: { ...mfCalc, value: mf, overridden: mfOverridden },
    requiredLumens: Math.round(requiredLumens),
    lumenMethodQuantity,
    maxSpacing: round(sMax, 3),
    layout,
    quantity,
    achievedLux,
    withinRange,
    idealLumensPerFixture,
    distribution: distribution_,
    energy,
    efficacy: efficacy(fixture.lumens, fixture.watts),
    warnings,
    assumptions: log.list(),
    quality: assessQuality(room),
  };
}
