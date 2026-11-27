/**
 * TASK LAYER
 *
 * Task lighting serves a defined zone (counter, desk, reading chair) rather
 * than the whole room. The lumen method is applied to the zone area with a
 * *local* utilisation factor, because the fitting is close to the task and
 * most of its light lands on or near it.
 *
 *   Discrete fittings:  N = (E × A_zone) / (Φ × UF_local × MF)
 *   Linear fittings:    lm/m = (E × depth) / (UF_local × MF)
 */

import { AssumptionLog, type Assumption } from "./assumptions";
import { DEFAULT_CONFIG, type EngineConfig } from "./config";
import type { TaskTarget } from "./config/illuminance";
import { LightingInputError, type CalcWarning } from "./errors";
import { maintenanceFactor } from "./maintenance";
import { fitGrid, maxSpacing, type GridLayout } from "./spacing";
import type { Environment, SpaceType } from "./types";
import { round } from "./utilisation";

/**
 * Generic local UF for task lighting mounted close to the task, by fitting
 * kind. Neuhom engineering approximation; replaced by photometry when
 * available.
 */
export const LOCAL_UTILISATION = {
  /** under-cabinet strip/profile: part of the light lands on the backsplash */
  linear_under_cabinet: 0.6,
  /** focused downlight/spot directly above the task */
  downlight_over_task: 0.55,
  /** pendant above a table */
  pendant_over_task: 0.45,
} as const;

export type TaskFittingKind = keyof typeof LOCAL_UTILISATION;

interface TaskBase {
  spaceType: SpaceType;
  /** key into the space standard's tasks, e.g. "counter" */
  taskKey: string;
  /** zone length (along the run of fittings) and depth, metres */
  zoneLength: number;
  zoneDepth: number;
  environment?: Environment;
  dailyHours?: number;
  targetLux?: number;
  localUtilisationOverride?: number;
}

export interface DiscreteTaskInput extends TaskBase {
  kind: "downlight_over_task" | "pendant_over_task";
  fixtureLumens: number;
  beamAngle: number;
  /** height of the fitting above the task surface, metres */
  heightAboveTask: number;
}

export interface LinearTaskInput extends TaskBase {
  kind: "linear_under_cabinet";
  /** product output, lm per metre — optional; if given the achieved lux is reported */
  lumensPerMetre?: number;
}

export interface TaskResult {
  task: TaskTarget;
  targetLux: number;
  localUtilisation: number;
  maintenanceFactor: number;
  zoneArea: number;
  /** discrete fittings */
  quantity?: number;
  layout?: GridLayout;
  /** linear fittings */
  requiredLumensPerMetre?: number;
  runLength?: number;
  achievedLux: number | null;
  warnings: CalcWarning[];
  assumptions: Assumption[];
}

export function calculateTask(input: DiscreteTaskInput | LinearTaskInput, config: EngineConfig = DEFAULT_CONFIG): TaskResult {
  const std = config.standards[input.spaceType];
  const task = std.tasks[input.taskKey];
  if (!task) {
    throw new LightingInputError(`"${input.taskKey}" is not a defined task for ${std.label}.`, "taskKey");
  }
  if (input.zoneLength <= 0 || input.zoneDepth <= 0) {
    throw new LightingInputError("Task zone length and depth must be positive.", "zone");
  }

  const log = new AssumptionLog();
  const warnings: CalcWarning[] = [];
  const targetLux = input.targetLux ?? task.target;
  log.add({
    id: `target.task.${input.taskKey}`,
    label: `${task.label} target`,
    value: targetLux,
    unit: "lx",
    source: input.targetLux !== undefined ? "user_estimate" : std.provenance,
    note: `${task.min}–${task.max} lx range. ${std.reference}`,
  });

  const uf = input.localUtilisationOverride ?? LOCAL_UTILISATION[input.kind];
  if (input.localUtilisationOverride === undefined) {
    log.add({
      id: `calc.task.${input.taskKey}.uf`,
      label: "Local utilisation factor",
      value: uf,
      source: "generic_model",
      note: "Generic value for task lighting close to the work surface.",
    });
  }

  const mf = maintenanceFactor(
    { environment: input.environment ?? std.defaultEnvironment, dailyHours: input.dailyHours ?? std.dailyHours },
    config,
  ).value;

  const zoneArea = input.zoneLength * input.zoneDepth;

  if (input.kind === "linear_under_cabinet") {
    const requiredLumensPerMetre = Math.ceil((targetLux * input.zoneDepth) / (uf * mf));
    const achievedLux = input.lumensPerMetre ? round((input.lumensPerMetre * uf * mf) / input.zoneDepth, 0) : null;
    if (achievedLux !== null && achievedLux < task.min) {
      warnings.push({
        code: "task_under_lit",
        severity: "warning",
        message: `${input.lumensPerMetre} lm/m gives about ${achievedLux} lx — below the ${task.min} lx minimum. Choose at least ${requiredLumensPerMetre} lm/m.`,
      });
    }
    return {
      task,
      targetLux,
      localUtilisation: uf,
      maintenanceFactor: mf,
      zoneArea: round(zoneArea, 3),
      requiredLumensPerMetre,
      runLength: input.zoneLength,
      achievedLux,
      warnings,
      assumptions: log.list(),
    };
  }

  if (input.heightAboveTask <= 0) throw new LightingInputError("Fitting must be above the task surface.", "heightAboveTask");
  const quantityLumen = Math.ceil((targetLux * zoneArea) / (input.fixtureLumens * uf * mf) - 1e-9);
  const sMax = maxSpacing(input.heightAboveTask, input.beamAngle, "direct_narrow", config);
  const layout = fitGrid(input.zoneLength, input.zoneDepth, quantityLumen, sMax, config);
  const achievedLux = round((layout.count * input.fixtureLumens * uf * mf) / zoneArea, 0);
  if (achievedLux > task.max) {
    warnings.push({
      code: "task_over_lit",
      severity: "info",
      message: `About ${achievedLux} lx — above the ${task.max} lx guide. A lower-output fitting or dimmer is recommended.`,
    });
  }
  return {
    task,
    targetLux,
    localUtilisation: uf,
    maintenanceFactor: mf,
    zoneArea: round(zoneArea, 3),
    quantity: layout.count,
    layout,
    achievedLux,
    warnings,
    assumptions: log.list(),
  };
}
