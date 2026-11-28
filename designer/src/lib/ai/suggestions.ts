/**
 * Turns an AI room reading into concrete, user-confirmable suggestions.
 * Nothing is applied without the user accepting it.
 */
import { ACTIVITIES, CEILING_TYPES, FLOOR_FINISHES, SPACE_TYPES, WALL_FINISHES } from "@/lib/project/options";
import type { Activity, Project } from "@/lib/project/types";
import type { RoomReading } from "./roomReading";

export interface Suggestion {
  key: string;
  label: string;
  value: string;
  confidence: "low" | "medium" | "high";
  /** pre-ticked for the user */
  recommended: boolean;
  apply: (p: Project) => Project;
}

const FT = 3.28084;
const okConfidence = (c: "low" | "medium" | "high") => c !== "low";

export function buildSuggestions(r: RoomReading, p: Project): Suggestion[] {
  const out: Suggestion[] = [];
  const space = p.space;

  if (r.roomType.value !== "unsure" && r.roomType.value !== p.spaceType) {
    const label = SPACE_TYPES.find((s) => s.value === r.roomType.value)?.label ?? r.roomType.value;
    out.push({
      key: "roomType",
      label: "Type of space",
      value: label,
      confidence: r.roomType.confidence,
      recommended: false, // the user's own choice wins by default
      apply: (x) => ({ ...x, spaceType: r.roomType.value as Project["spaceType"] }),
    });
  }
  if (r.ceiling.value !== "unsure" && r.ceiling.value !== space.ceilingType) {
    const v = r.ceiling.value;
    out.push({
      key: "ceiling",
      label: "Ceiling",
      value: `${CEILING_TYPES.find((c) => c.value === v)?.label ?? v}${r.ceiling.evidence ? ` — ${r.ceiling.evidence}` : ""}`,
      confidence: r.ceiling.confidence,
      recommended: okConfidence(r.ceiling.confidence),
      apply: (x) => ({ ...x, space: { ...x.space, ceilingType: v } }),
    });
  }
  if (r.walls.value !== "unsure" && r.walls.value !== space.wallFinish) {
    const v = r.walls.value;
    out.push({
      key: "walls",
      label: "Wall colour",
      value: WALL_FINISHES.find((w) => w.value === v)?.label ?? v,
      confidence: r.walls.confidence,
      recommended: okConfidence(r.walls.confidence),
      apply: (x) => ({ ...x, space: { ...x.space, wallFinish: v } }),
    });
  }
  if (r.floor.value !== "unsure" && r.floor.value !== space.floorFinish) {
    const v = r.floor.value;
    out.push({
      key: "floor",
      label: "Floor finish",
      value: FLOOR_FINISHES.find((f) => f.value === v)?.label ?? v,
      confidence: r.floor.confidence,
      recommended: okConfidence(r.floor.confidence),
      apply: (x) => ({ ...x, space: { ...x.space, floorFinish: v } }),
    });
  }
  if (r.naturalLight.value !== "unsure" && r.naturalLight.value !== space.naturalLight) {
    const v = r.naturalLight.value;
    out.push({
      key: "naturalLight",
      label: "Natural light",
      value: v[0]!.toUpperCase() + v.slice(1),
      confidence: r.naturalLight.confidence,
      recommended: okConfidence(r.naturalLight.confidence),
      apply: (x) => ({ ...x, space: { ...x.space, naturalLight: v } }),
    });
  }
  const newActivities = r.activities.filter((a) => !p.requirements.activities.includes(a as Activity));
  if (newActivities.length) {
    out.push({
      key: "activities",
      label: "How the space is used",
      value: newActivities.map((a) => ACTIVITIES.find((x) => x.value === a)?.label ?? a).join(", "),
      confidence: "medium",
      recommended: true,
      apply: (x) => ({ ...x, requirements: { ...x.requirements, activities: [...new Set([...x.requirements.activities, ...(newActivities as Activity[])])] } }),
    });
  }
  if (r.features.some((f) => f.accentWorthy) && !p.requirements.activities.includes("display")) {
    const names = r.features.filter((f) => f.accentWorthy).map((f) => f.description).slice(0, 2).join("; ");
    out.push({
      key: "accent",
      label: "Highlight a feature",
      value: names,
      confidence: "medium",
      recommended: true,
      apply: (x) => ({ ...x, requirements: { ...x.requirements, activities: [...new Set([...x.requirements.activities, "display" as Activity])] } }),
    });
  }
  if (r.existingLights.ceilingPoints !== null && p.kind === "renovation" && space.existingLightPoints === null) {
    const n = r.existingLights.ceilingPoints;
    out.push({
      key: "points",
      label: "Existing ceiling points",
      value: `${n} visible`,
      confidence: "medium",
      recommended: true,
      apply: (x) => ({ ...x, space: { ...x.space, existingLightPoints: n } }),
    });
  }
  return out;
}

export interface PlanRoomSize {
  key: string;
  name: string;
  writtenAs: string;
  lengthM: number;
  widthM: number;
}

/** Sizes read from text on a floor plan, ready for the user to confirm. */
export function planSizes(r: RoomReading): PlanRoomSize[] {
  if (!r.floorPlan.provided) return [];
  return r.floorPlan.rooms
    .filter((room) => room.lengthFt !== null && room.widthFt !== null && room.lengthFt > 2 && room.widthFt > 2 && room.lengthFt < 300 && room.widthFt < 300)
    .map((room, i) => {
      const a = room.lengthFt! / FT;
      const b = room.widthFt! / FT;
      return { key: `plan-${i}`, name: room.name, writtenAs: room.writtenAs, lengthM: Math.max(a, b), widthM: Math.min(a, b) };
    });
}

export function applyPlanSize(p: Project, s: PlanRoomSize): Project {
  return {
    ...p,
    space: {
      ...p.space,
      length: { value: s.lengthM, unknown: false },
      width: { value: s.widthM, unknown: false },
    },
  };
}
