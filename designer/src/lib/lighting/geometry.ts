import type { AssumptionLog } from "./assumptions";
import type { EngineConfig } from "./config";
import type { Dimension, DimensionSource, MountingType, ResolvedRoom, RoomInput } from "./types";

const FT_TO_M = 0.3048;

export const feetToMetres = (ft: number, inches = 0): number => (ft + inches / 12) * FT_TO_M;

function resolveDimension(
  name: "length" | "width" | "ceilingHeight",
  dim: Dimension,
  fallback: number,
  log: AssumptionLog,
): { value: number; source: DimensionSource } {
  const label = { length: "Room length", width: "Room width", ceilingHeight: "Ceiling height" }[name];
  if (dim.source === "unknown" || dim.value === undefined) {
    log.add({
      id: `dimension.${name}`,
      label,
      value: fallback,
      unit: "m",
      source: "neuhom_default",
      note: "Not provided — a typical size for this space type was used. Enter a measurement for a reliable result.",
    });
    return { value: fallback, source: "unknown" };
  }
  if (dim.source === "photo_estimate") {
    log.add({
      id: `dimension.${name}`,
      label,
      value: dim.value,
      unit: "m",
      source: "photo_estimate",
      note: "Estimated from a photograph. This is not a measurement and the result is preliminary.",
    });
  } else if (dim.source === "user_estimate") {
    log.add({
      id: `dimension.${name}`,
      label,
      value: dim.value,
      unit: "m",
      source: "user_estimate",
      note: "Approximate value entered by the user.",
    });
  }
  return { value: dim.value, source: dim.source };
}

export function resolveRoom(input: RoomInput, config: EngineConfig, log: AssumptionLog): ResolvedRoom {
  const std = config.standards[input.spaceType];
  const defaults = config.defaultDimensions[input.spaceType];

  const length = resolveDimension("length", input.length, defaults.length, log);
  const width = resolveDimension("width", input.width, defaults.width, log);
  const ceilingHeight = resolveDimension("ceilingHeight", input.ceilingHeight, defaults.ceilingHeight, log);

  const workPlaneHeight = input.workPlaneHeight ?? std.workPlaneHeight;
  if (input.workPlaneHeight === undefined) {
    log.add({
      id: "room.workPlaneHeight",
      label: "Reference plane height",
      value: workPlaneHeight,
      unit: "m",
      source: "neuhom_default",
      note: `Typical height for a ${std.label.toLowerCase()} (table/counter level).`,
    });
  }

  const surfaces = {
    ceiling: input.surfaces?.ceiling ?? config.defaultSurfaces.ceiling,
    walls: input.surfaces?.walls ?? config.defaultSurfaces.walls,
    floor: input.surfaces?.floor ?? config.defaultSurfaces.floor,
  };
  const reflectances = {
    ceiling: config.reflectance.ceiling[surfaces.ceiling],
    walls: config.reflectance.walls[surfaces.walls],
    floor: config.reflectance.floor[surfaces.floor],
  };
  log.add({
    id: "room.reflectances",
    label: "Surface reflectances (ceiling / walls / floor)",
    value: `${reflectances.ceiling} / ${reflectances.walls} / ${reflectances.floor}`,
    source: "neuhom_default",
    note: `Typical values for ${surfaces.ceiling.replace(/_/g, " ")}, ${surfaces.walls.replace(/_/g, " ")} walls and ${surfaces.floor.replace(/_/g, " ")} floor${input.surfaces ? "" : " (finishes not specified — defaults used)"}.`,
  });

  const environment = input.environment ?? std.defaultEnvironment;

  return {
    spaceType: input.spaceType,
    length: length.value,
    width: width.value,
    ceilingHeight: ceilingHeight.value,
    workPlaneHeight,
    area: length.value * width.value,
    perimeter: 2 * (length.value + width.value),
    reflectances,
    environment,
    dimensionSources: { length: length.source, width: width.source, ceilingHeight: ceilingHeight.source },
  };
}

/**
 * Mounting height Hm: vertical distance from the luminaire to the reference plane.
 */
export function mountingHeight(room: ResolvedRoom, mounting: MountingType, suspensionLength = 0): number {
  const drop = mounting === "suspended" ? suspensionLength : 0;
  return room.ceilingHeight - drop - room.workPlaneHeight;
}

/**
 * Room index K = (L × W) / (Hm × (L + W)).
 * Describes room proportions: low K = tall/narrow (more light lost on walls),
 * high K = wide/shallow (light reaches the floor efficiently).
 */
export function roomIndex(length: number, width: number, hm: number): number {
  if (length <= 0 || width <= 0) throw new RangeError("Room length and width must be positive");
  if (hm <= 0) throw new RangeError("Mounting height must be above the reference plane");
  return (length * width) / (hm * (length + width));
}
