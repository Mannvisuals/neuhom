/**
 * DESIGN EVALUATION — recalculates a (possibly hand-edited) design.
 *
 * Runs on every edit, so it uses the engine's primitives directly rather
 * than re-generating: average ambient lux by the lumen method summed over
 * the actual fittings, energy from the actual quantities, and simple
 * placement checks.
 */
import {
  AssumptionLog,
  DEFAULT_CONFIG,
  GenericUtilisationProvider,
  classifyDistribution,
  energySummary,
  maintenanceFactor,
  mountingHeight,
  roomIndex,
  type Assumption,
  type CalculationQuality,
  type ResolvedRoom,
  LUMEN_DENSITY,
  NEUHOM_STANDARD_VERSION,
  SQFT_PER_M2,
  densityState,
  roomAdjustment,
} from "@/lib/lighting";
import { assessQuality } from "@/lib/lighting/quality";
import type { Project } from "@/lib/project/types";
import { resolveProjectRoom } from "./room";
import { fixtureLength, isLinear, type Design, type Layer, type PlacedFixture } from "./types";

export interface DesignWarning {
  severity: "info" | "warning";
  message: string;
  fixtureId?: string;
}

export interface DesignMetrics {
  room: ResolvedRoom;
  ambient: {
    achievedLux: number;
    targetLux: number;
    min: number;
    max: number;
    state: "low" | "ok" | "high";
    fromCoveLux: number;
  };
  /**
   * Neuhom standard check: general-light lumens per sq ft from ambient
   * ceiling fittings (cove excluded), against the room's range.
   */
  density: {
    achieved: number;
    effective: number;
    target: number;
    min: number;
    max: number;
    adjustment: number;
    state: "low" | "ok" | "high";
  };
  /** which check decides "too dim / too bright": the design's sizing method */
  method: "density" | "lux";
  /** state from the design's method — use this for the headline verdict */
  state: "low" | "ok" | "high";
  /** point fittings per layer (pieces) */
  counts: Record<Layer, number>;
  /** everything on each layer, strips included — for layer toggles and legends */
  layerItems: Record<Layer, number>;
  totalFixtures: number;
  totalLinearMetres: number;
  connectedLoadW: number;
  lpdWPerM2: number;
  annualKWh: number;
  annualCost: number;
  maintenanceFactor: number;
  quality: CalculationQuality;
  assumptions: Assumption[];
  warnings: DesignWarning[];
}

const cfg = DEFAULT_CONFIG;
const uf = new GenericUtilisationProvider(cfg);

export function fixtureWatts(f: PlacedFixture): number {
  return isLinear(f) ? f.watts * fixtureLength(f) : f.watts;
}

export function fixtureLumens(f: PlacedFixture): number {
  return isLinear(f) ? f.lumens * fixtureLength(f) : f.lumens;
}

/** Height of a fixture above the reference plane. */
export function fixtureHeight(f: PlacedFixture, room: ResolvedRoom): number {
  if (f.mounting === "wall") return Math.max(0.3, 1.8 - room.workPlaneHeight);
  return mountingHeight(room, f.mounting, f.suspensionLength ?? 0);
}

/** Radius of the beam footprint on the reference plane (for drawing light pools). */
export function poolRadius(f: PlacedFixture, room: ResolvedRoom): number {
  const h = Math.max(0.3, fixtureHeight(f, room));
  const half = (Math.min(f.beamAngle, 150) / 2) * (Math.PI / 180);
  return Math.min(Math.max(room.length, room.width), h * Math.tan(half));
}

export function evaluateDesign(project: Project, design: Design): DesignMetrics {
  const log = new AssumptionLog();
  const room = resolveProjectRoom(project, log);
  const std = cfg.standards[project.spaceType];
  const mf = maintenanceFactor({ environment: room.environment, dailyHours: std.dailyHours }, cfg).value;
  const warnings: DesignWarning[] = [];

  // ── Ambient: lumen method over actual ambient fittings ───────────────
  let directLm = 0;
  let coveLm = 0;
  for (const f of design.fixtures) {
    if (f.layer !== "ambient") continue;
    const h = Math.max(0.3, fixtureHeight(f, room));
    const k = roomIndex(room.length, room.width, h);
    const distribution = classifyDistribution({ lumens: f.lumens, watts: f.watts, beamAngle: f.beamAngle, mounting: f.mounting, specSource: "generic_reference" }, cfg);
    const u = uf.getUtilisation({ roomIndex: k, reflectances: room.reflectances, distribution }).value;
    if (distribution === "indirect") coveLm += fixtureLumens(f) * u;
    else directLm += fixtureLumens(f) * u;
  }
  const achievedLux = Math.round(((directLm + coveLm) * mf) / room.area);
  const fromCoveLux = Math.round((coveLm * mf) / room.area);
  const targetLux = Math.round(
    Math.min(std.ambient.max, Math.max(std.ambient.min, std.ambient.target * cfg.brightnessMultiplier[design.brightness])),
  );
  const state = achievedLux < std.ambient.min ? "low" : achievedLux > std.ambient.max ? "high" : "ok";

  // ── Neuhom standard: lumens per sq ft from ambient ceiling fittings ──
  const range = LUMEN_DENSITY[project.spaceType];
  const areaSqFt = room.area * SQFT_PER_M2;
  const pointLm = design.fixtures.filter((f) => f.layer === "ambient" && !isLinear(f) && f.mounting !== "cove").reduce((s, f) => s + f.lumens, 0);
  const adj = roomAdjustment(room, project.space.wallFinish).total;
  const achievedDensity = pointLm / areaSqFt;
  const effective = achievedDensity / adj;
  const densityTarget = Math.round(Math.min(range.max, Math.max(range.min, range.target * cfg.brightnessMultiplier[design.brightness])) * 10) / 10;
  const dState = densityState(effective, range);
  const method = design.method ?? "lux";
  const primary = method === "density" ? dState : state;

  if (method === "density") {
    const d = Math.round(effective);
    if (dState === "low") warnings.push({ severity: "warning", message: `General light is about ${d} lumens per sq ft — below the Neuhom standard of ${range.min}–${range.max} for this room. Add ceiling lights or choose brighter ones.` });
    if (dState === "high") warnings.push({ severity: "warning", message: `General light is about ${d} lumens per sq ft — above the Neuhom standard of ${range.min}–${range.max} for this room. Remove lights, lower their output or add dimming.` });
  } else {
    if (state === "low") warnings.push({ severity: "warning", message: `General light is about ${achievedLux} lux — below the ${std.ambient.min} lux minimum for a ${std.label.toLowerCase()}. Add ambient fittings or raise their output.` });
    if (state === "high") warnings.push({ severity: "warning", message: `General light is about ${achievedLux} lux — above the ${std.ambient.max} lux comfortable maximum. Remove fittings, lower output or add dimming.` });
  }

  // ── Placement checks ──
  for (const f of design.fixtures) {
    const pts = isLinear(f) ? [{ x: f.x, y: f.y }, { x: f.x2!, y: f.y2! }] : [{ x: f.x, y: f.y }];
    if (pts.some((p) => p.x < -0.01 || p.y < -0.01 || p.x > room.length + 0.01 || p.y > room.width + 0.01)) {
      warnings.push({ severity: "warning", message: `${f.code} is outside the room.`, fixtureId: f.id });
    }
    if (!isLinear(f) && (f.mounting === "recessed" || f.mounting === "surface") && f.layer === "ambient") {
      const d = Math.min(f.x, f.y, room.length - f.x, room.width - f.y);
      if (d < 0.3) warnings.push({ severity: "info", message: `${f.code} is within 30 cm of a wall and may cause harsh scallops of light.`, fixtureId: f.id });
    }
    if (std.minIpRating && !f.ipRating) {
      warnings.push({ severity: "info", message: `${f.code}: choose a fitting rated ${std.minIpRating} or higher for this space.`, fixtureId: f.id });
    }
  }

  // ── Counts & energy ──
  const counts: Record<Layer, number> = { ambient: 0, task: 0, accent: 0, decorative: 0 };
  const layerItems: Record<Layer, number> = { ambient: 0, task: 0, accent: 0, decorative: 0 };
  for (const f of design.fixtures) layerItems[f.layer] += 1;
  let linearM = 0;
  for (const f of design.fixtures) {
    if (isLinear(f)) linearM += fixtureLength(f);
    else counts[f.layer] += 1;
  }
  const energy = energySummary(
    design.fixtures.map((f) => ({ quantity: 1, watts: fixtureWatts(f), dailyHours: f.layer === "decorative" || f.layer === "accent" ? std.dailyHours * 0.6 : std.dailyHours })),
    room.area,
    cfg,
  );

  log.add({
    id: "standard.density",
    label: "Neuhom standard for this room",
    value: `${range.min}–${range.max} lm/sq ft`,
    source: "neuhom_default",
    note: `${NEUHOM_STANDARD_VERSION}. General ceiling light only; cove, task and accent lights are extra.`,
  });
  log.add({ id: "calc.uf", label: "Utilisation factors", value: "generic model", source: "generic_model", note: "Generic light-distribution families; replaced by photometric data when real products are chosen." });
  log.add({ id: "calc.mf", label: "Maintenance factor", value: mf, source: "generic_model", note: `5-year LED depreciation and dust for a ${room.environment} environment.` });
  if (design.fixtures.some((f) => f.specSource === "generic_reference")) {
    log.add({ id: "fixtures.generic", label: "Fixture specifications", value: "generic reference fittings", source: "neuhom_default", note: "Typical LED outputs, not specific products." });
  }
  log.add({ id: "energy.hours", label: "Daily use", value: `${std.dailyHours} h`, source: "neuhom_default", note: "Accent and decorative layers assumed on for 60% of that time." });
  log.add({ id: "energy.tariff", label: "Electricity tariff", value: `₹${cfg.energy.tariffPerKWh}/kWh`, source: "neuhom_default", note: "Placeholder — tariffs vary by state." });

  return {
    room,
    ambient: { achievedLux, targetLux, min: std.ambient.min, max: std.ambient.max, state, fromCoveLux },
    density: {
      achieved: Math.round(achievedDensity * 10) / 10,
      effective: Math.round(effective * 10) / 10,
      target: densityTarget,
      min: range.min,
      max: range.max,
      adjustment: adj,
      state: dState,
    },
    method,
    state: primary,
    counts,
    layerItems,
    totalFixtures: counts.ambient + counts.task + counts.accent + counts.decorative,
    totalLinearMetres: Math.round(linearM * 10) / 10,
    connectedLoadW: energy.connectedLoadW,
    lpdWPerM2: energy.lpdWPerM2,
    annualKWh: energy.annualKWh,
    annualCost: energy.annualCost,
    maintenanceFactor: mf,
    quality: assessQuality(room),
    assumptions: log.list(),
    warnings,
  };
}
