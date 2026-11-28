/**
 * Turns an AI room reading into concrete, user-confirmable suggestions.
 * Nothing is applied without the user accepting it.
 */
import { ACTIVITIES, CEILING_TYPES, FLOOR_FINISHES, SPACE_TYPES, WALL_FINISHES, zoneLabel } from "@/lib/project/options";
import type { Activity, Project, Wall, Zone } from "@/lib/project/types";
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
const WALL_NAME: Record<Wall | "centre", string> = { top: "top", right: "right", bottom: "bottom", left: "left", centre: "centre" };
const wallsText = (ws: Wall[]) => ws.map((w) => WALL_NAME[w]).join(" & ") + (ws.length === 1 ? " wall" : " walls");
const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Record that a Space-step field was filled from the AI reading. */
function mark(p: Project, key: string): Project {
  return { ...p, space: { ...p.space, aiFilled: [...new Set([...(p.space.aiFilled ?? []), key])] } };
}

let zoneSeq = 0;
const zoneId = () => `z_${Date.now().toString(36)}${(zoneSeq++).toString(36)}`;

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
    // In a new build the false ceiling often isn't up yet: a bare slab in the
    // photo doesn't mean there won't be one, so don't pre-tick it.
    const maybePlanned = p.kind === "new_construction" && v === "flat_slab";
    out.push({
      key: "ceiling",
      label: "Ceiling",
      value: `${CEILING_TYPES.find((c) => c.value === v)?.label ?? v}${r.ceiling.evidence ? ` — ${r.ceiling.evidence}` : ""}${maybePlanned ? " Leave unticked if a false ceiling is planned." : ""}`,
      confidence: r.ceiling.confidence,
      recommended: okConfidence(r.ceiling.confidence) && !maybePlanned,
      apply: (x) => mark({ ...x, space: { ...x.space, ceilingType: v } }, "ceiling"),
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
      apply: (x) => mark({ ...x, space: { ...x.space, wallFinish: v } }, "walls"),
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
      apply: (x) => mark({ ...x, space: { ...x.space, floorFinish: v } }, "floor"),
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
      apply: (x) => mark({ ...x, space: { ...x.space, naturalLight: v } }, "naturalLight"),
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
      apply: (x) => mark({ ...x, space: { ...x.space, existingLightPoints: n } }, "points"),
    });
  }
  // ── Layout (plan terms) ──
  const L = r.layout;
  if (L.frame !== "unknown") {
    const frameNote = L.frame === "floor_plan" ? "as drawn on your floor plan" : "with the top wall being the one facing the doorway";
    if (L.windows.length && !sameSet(L.windows, space.windows)) {
      const ws = [...new Set(L.windows)];
      out.push({
        key: "windows",
        label: "Windows on",
        value: `${wallsText(ws)} (${frameNote})`,
        confidence: "medium",
        recommended: true,
        apply: (x) => mark({ ...x, space: { ...x.space, windows: ws } }, "windows"),
      });
    }
    if (L.mainWall.wall !== "unsure" && L.mainWall.wall !== space.featureWall) {
      const w = L.mainWall.wall;
      out.push({
        key: "featureWall",
        label: "Main wall",
        value: `${WALL_NAME[w]} wall${L.mainWall.what ? ` — ${L.mainWall.what}` : ""}`,
        confidence: "medium",
        recommended: true,
        apply: (x) => mark({ ...x, space: { ...x.space, featureWall: w } }, "featureWall"),
      });
    }
    if (L.counterWalls.length && !sameSet(L.counterWalls, space.counterWalls ?? [])) {
      const ws = [...new Set(L.counterWalls)];
      out.push({
        key: "counterWalls",
        label: "Counters along",
        value: `${wallsText(ws)}${ws.length === 2 ? " (L-shaped)" : ws.length === 3 ? " (U-shaped)" : ""}`,
        confidence: "medium",
        recommended: true,
        apply: (x) => mark({ ...x, space: { ...x.space, counterWalls: ws } }, "counterWalls"),
      });
    }
    if (L.zones.length) {
      const zones: Zone[] = L.zones.map((z) => ({ id: zoneId(), kind: z.kind, wall: z.wall, label: z.description, source: "ai" }));
      const notes = L.zones.map((z) => `${z.description} (${WALL_NAME[z.wall]}${z.wall === "centre" ? "" : " wall"})`).join("; ");
      out.push({
        key: "zones",
        label: "Furniture & fixtures",
        value: L.zones.map((z) => `${zoneLabel(z.kind)} — ${WALL_NAME[z.wall]}${z.wall === "centre" ? "" : " wall"}`).join(", "),
        confidence: "medium",
        recommended: true,
        apply: (x) =>
          mark(
            {
              ...x,
              space: {
                ...x.space,
                zones: [...(x.space.zones ?? []).filter((z) => z.source !== "ai"), ...zones],
                furnitureNotes: x.space.furnitureNotes.trim() ? x.space.furnitureNotes : notes,
              },
            },
            "zones",
          ),
      });
    }
  }
  return out;
}

export interface PlanRoomSize {
  key: string;
  name: string;
  matchesProject: boolean;
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
      return { key: `plan-${i}`, name: room.name, matchesProject: room.matchesProject, writtenAs: room.writtenAs, lengthM: Math.max(a, b), widthM: Math.min(a, b) };
    })
    .sort((x, y) => Number(y.matchesProject) - Number(x.matchesProject));
}

export function applyPlanSize(p: Project, s: PlanRoomSize): Project {
  return {
    ...p,
    space: {
      ...p.space,
      length: { value: s.lengthM, unknown: false },
      width: { value: s.widthM, unknown: false },
      aiFilled: [...new Set([...(p.space.aiFilled ?? []), "length", "width"])],
    },
  };
}
