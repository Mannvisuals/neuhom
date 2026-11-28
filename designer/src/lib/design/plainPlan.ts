/**
 * PLAIN-LANGUAGE PLAN
 *
 * Turns a design and its metrics into what a homeowner needs: what the
 * lights do, how the room will feel, and a fitting list (quantities only —
 * prices come with the product catalogue). All facts come from the design
 * and the engine; this module only words them.
 */
import { fixtureLabel, spaceLabel } from "@/lib/project/options";
import type { FixtureType, Project } from "@/lib/project/types";
import type { DesignMetrics } from "./evaluate";
import { fixtureLength, isLinear, type Design, type Layer, type PlacedFixture } from "./types";

export const FEATURE_WALL_NAME: Record<string, string> = {
  living_room: "TV / feature wall",
  bedroom: "wall behind the bed",
  kitchen: "counter wall",
  dining_room: "feature wall",
  bathroom: "mirror wall",
  balcony: "main wall",
  office: "main wall",
  retail: "display wall",
  hospitality: "feature wall",
  custom: "feature wall",
};

/** Short labels for drawings. */
export const FEATURE_WALL_SHORT: Record<string, string> = {
  living_room: "TV / feature wall",
  bedroom: "Bed wall",
  kitchen: "Counter wall",
  dining_room: "Feature wall",
  bathroom: "Mirror wall",
  balcony: "Main wall",
  office: "Main wall",
  retail: "Display wall",
  hospitality: "Feature wall",
  custom: "Feature wall",
};

export function colourWord(k: number): { label: string; note: string } {
  if (k <= 2700) return { label: "Warm white", note: "soft and relaxing, like evening sunlight" };
  if (k <= 3000) return { label: "Soft white", note: "warm but clear" };
  if (k <= 3500) return { label: "Natural white", note: "balanced, neither warm nor cool" };
  return { label: "Neutral white", note: "crisp and clear, good for tasks" };
}

export function brightnessWord(state: DesignMetrics["state"], achieved: number, target: number): { label: string; note: string } {
  if (state === "low") return { label: "A bit dim", note: "add a few lights or choose brighter ones in Customise" };
  if (state === "high") return { label: "Very bright", note: "consider dimmers or fewer lights" };
  if (achieved > target * 1.2) return { label: "Bright", note: "comfortably bright for this room" };
  return { label: "Just right", note: "the recommended level for this room" };
}

/** Friendly product names. */
const NAME: Record<FixtureType, string> = {
  recessed_downlight: "Ceiling downlight (recessed)",
  cob_spot: "Adjustable spotlight (COB)",
  surface_downlight: "Ceiling downlight (surface-mounted)",
  track_spot: "Track spotlight",
  linear_profile: "Linear light profile",
  led_strip: "LED strip light",
  cove: "Cove LED strip",
  pendant: "Pendant light",
  chandelier: "Chandelier",
  wall_light: "Wall light",
  decorative: "Decorative light",
  panel: "LED panel light",
};

function whereFor(f: PlacedFixture, p: Project): string {
  const wall = FEATURE_WALL_NAME[p.spaceType] ?? "feature wall";
  switch (f.type) {
    case "cove":
      return "Hidden in the false-ceiling edge";
    case "led_strip":
      return f.layer === "task" ? "Under the wall cabinets" : "Hidden in a recess";
    case "wall_light":
      return p.spaceType === "bathroom" ? "Beside or above the mirror" : p.spaceType === "bedroom" ? "Either side of the bed" : "On the wall beside the seating";
    case "pendant":
      return p.spaceType === "dining_room" ? "Above the dining table" : "Hanging from the ceiling";
    case "chandelier":
      return "Centre of the ceiling";
  }
  if (f.layer === "accent") return `Ceiling, aimed at the ${wall}`;
  if (f.layer === "ambient") return "Ceiling, evenly spaced";
  return "As shown on the plan";
}

export interface PlanLine {
  key: string;
  layer: Layer;
  type: FixtureType;
  name: string;
  where: string;
  spec: string;
  quantity: number;
  unit: "pcs" | "m";
  codes: string[];
}

const ORDER: Layer[] = ["ambient", "task", "accent", "decorative"];

export function fittingList(design: Design, p: Project): PlanLine[] {
  const map = new Map<string, PlanLine>();
  for (const f of design.fixtures) {
    const linear = isLinear(f);
    const key = [f.layer, f.type, f.lumens, f.watts, f.beamAngle, f.cct, f.cri].join("|");
    const colour = colourWord(f.cct).label.toLowerCase();
    const spec = linear
      ? `${f.watts} W per metre · ${f.lumens} lm/m · ${colour} (${f.cct} K)`
      : `${f.watts} W · ${f.lumens} lm · ${f.beamAngle}° beam · ${colour} (${f.cct} K) · CRI ${f.cri}+${f.ipRating ? ` · ${f.ipRating}` : ""}`;
    const line = map.get(key) ?? { key, layer: f.layer, type: f.type, name: NAME[f.type], where: whereFor(f, p), spec, quantity: 0, unit: linear ? "m" : "pcs", codes: [] };
    line.quantity += linear ? fixtureLength(f) : 1;
    line.codes.push(f.code);
    map.set(key, line);
  }
  return [...map.values()]
    .map((l) => ({ ...l, quantity: l.unit === "m" ? Math.ceil(l.quantity * 10) / 10 : l.quantity }))
    .sort((a, b) => ORDER.indexOf(a.layer) - ORDER.indexOf(b.layer));
}

/** One sentence per group of lights, in the order a person would read the room. */
export function describeLights(design: Design, p: Project): { layer: Layer; text: string }[] {
  const lines = fittingList(design, p);
  const wall = FEATURE_WALL_NAME[p.spaceType] ?? "feature wall";
  return lines.map((l) => {
    const n = l.quantity;
    const plural = (s: string) => (n === 1 ? s : `${s}s`);
    switch (l.type) {
      case "cove":
        return { layer: l.layer, text: "A soft, hidden glow around the edge of the ceiling that makes the room feel calm and spacious." };
      case "led_strip":
        return { layer: l.layer, text: l.layer === "task" ? "Strip lights under the cabinets so your worktop is bright and shadow-free." : `${l.quantity} m of hidden strip light for a gentle glow.` };
      case "chandelier":
        return { layer: l.layer, text: "A statement chandelier in the centre as the room's focal point." };
      case "pendant":
        return { layer: l.layer, text: p.spaceType === "dining_room" ? `${n === 1 ? "A pendant" : `${n} pendants`} above the table for a warm, focused pool of light.` : `${n} ${plural("pendant")} for character and a softer mood.` };
      case "wall_light":
        return {
          layer: l.layer,
          text:
            p.spaceType === "bathroom"
              ? "A mirror light at face height for clear, shadow-free grooming."
              : p.spaceType === "bedroom"
                ? "Wall lights either side of the bed for reading without lighting the whole room."
                : `${n === 1 ? "A wall light" : `${n} wall lights`} beside the seating for reading.`,
        };
    }
    if (l.layer === "accent") return { layer: l.layer, text: `${n} adjustable ${plural("spotlight")} washing the ${wall} with light to add depth and drama.` };
    if (l.layer === "ambient") return { layer: l.layer, text: `${n} ceiling ${plural(fixtureLabel(l.type).toLowerCase())} spread evenly for comfortable all-round light.` };
    return { layer: l.layer, text: `${n} × ${fixtureLabel(l.type).toLowerCase()}.` };
  });
}

export function planHeadline(design: Design, p: Project, m: DesignMetrics): string {
  const points = m.totalFixtures;
  const strip = m.totalLinearMetres;
  const parts = [`${points} ${points === 1 ? "light" : "lights"}`];
  if (strip > 0) parts.push(`${strip} m of strip lighting`);
  return `${parts.join(" and ")} for your ${spaceLabel(p).toLowerCase()}`;
}

/** WhatsApp message summarising the plan for Neuhom's team. */
export function whatsappMessage(design: Design, p: Project, m: DesignMetrics, unitLabel: (metres: number) => string): string {
  const lines = fittingList(design, p);
  const list = lines.map((l) => `• ${l.name} — ${l.unit === "m" ? `${l.quantity} m` : `${l.quantity} pcs`} (${l.spec.split(" · ").slice(0, 2).join(", ")})`).join("\n");
  return [
    "Hi Neuhom, I designed my lighting with the Neuhom Lighting Designer and would like help with it.",
    "",
    `Project: ${p.name || "Untitled"}${p.city ? ` (${p.city})` : ""}`,
    `Room: ${spaceLabel(p)}, ${unitLabel(m.room.length)} × ${unitLabel(m.room.width)}, ceiling ${unitLabel(m.room.ceilingHeight)}${m.quality.status === "preliminary" ? " (some sizes estimated)" : ""}`,
    `Light colour: ${colourWord(design.cct).label} (${design.cct} K)`,
    "",
    "Fittings:",
    list,
  ].join("\n");
}

export const NEUHOM_WHATSAPP = "919063616060";
