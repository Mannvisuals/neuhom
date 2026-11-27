/**
 * SPACE ANALYSIS
 *
 * The schema below is the contract for any analysis source. A future AI
 * vision analysis must return exactly this shape and is validated with it;
 * application logic never reads free-form AI prose.
 *
 * Today only the rule-based source exists: it reasons from what the user
 * entered and is labelled as such. It never claims to have looked at photos.
 */
import { z } from "zod";
import { AssumptionLog, DEFAULT_CONFIG } from "@/lib/lighting";
import type { Project } from "@/lib/project/types";
import { AMBIENCES, CEILING_TYPES, fixtureLabel, spaceLabel } from "@/lib/project/options";
import { canCove, canRecess, formatLength, resolveProjectRoom } from "./room";
import { resolvePreferences } from "./preferences";

export const spaceAnalysisSchema = z.object({
  source: z.enum(["rule_based", "ai_vision"]),
  model: z.string().optional(),
  createdAt: z.number(),
  summary: z.string().min(1),
  objectives: z.array(z.string()).min(1),
  layers: z.object({ ambient: z.string(), task: z.string(), accent: z.string() }),
  fixtureTypes: z.array(z.string()),
  cct: z.object({ kelvin: z.number().int().min(1800).max(6500), rationale: z.string() }),
  brightness: z.object({ targetLux: z.number().positive(), rangeLux: z.tuple([z.number(), z.number()]), rationale: z.string() }),
  considerations: z.array(z.string()),
  /** visual observations from photos — empty for rule-based analysis */
  observations: z.array(z.object({ text: z.string(), confidence: z.enum(["low", "medium", "high"]) })),
  assumptions: z.array(z.object({ label: z.string(), value: z.string(), source: z.string(), note: z.string().optional() })),
  status: z.enum(["preliminary", "estimate"]),
});

export type SpaceAnalysis = z.infer<typeof spaceAnalysisSchema>;

export function analyseSpaceRuleBased(p: Project): SpaceAnalysis {
  const log = new AssumptionLog();
  const room = resolveProjectRoom(p, log);
  const std = DEFAULT_CONFIG.standards[p.spaceType];
  const prefs = resolvePreferences(p, "tailored");
  const unit = p.space.unit;
  const label = spaceLabel(p).toLowerCase();
  const ambience = AMBIENCES.find((a) => a.value === p.requirements.ambience)!;
  const ceiling = CEILING_TYPES.find((c) => c.value === p.space.ceilingType)!;
  const unknownDims = (["length", "width", "ceilingHeight"] as const).filter((k) => p.space[k].unknown || p.space[k].value === null);

  const targetLux = Math.round(
    Math.min(std.ambient.max, Math.max(std.ambient.min, std.ambient.target * DEFAULT_CONFIG.brightnessMultiplier[prefs.brightness])),
  );

  const summary =
    `A ${formatLength(room.length, unit)} × ${formatLength(room.width, unit)} ${label} (${Math.round(room.area * 10.764)} sq ft) ` +
    `with a ${formatLength(room.ceilingHeight, unit)} ${ceiling.label.toLowerCase()}, ${p.style} style, aiming for a ${ambience.label.toLowerCase()} feel.` +
    (unknownDims.length ? ` Some dimensions are not yet known, so typical sizes were assumed.` : "");

  const objectives: string[] = [`Even general light of about ${targetLux} lux across the ${label}.`];
  if (prefs.task.length) objectives.push(`Focused light for ${prefs.task.join(", ")}.`);
  if (prefs.accent) objectives.push("Layered accent light to add depth and highlight the feature wall.");
  if (prefs.cove) objectives.push("Soft indirect glow from a ceiling cove.");
  objectives.push(`Glare-free fittings with CRI ${prefs.cri}+ for natural colours.`);

  const considerations: string[] = [];
  if (!canRecess(p.space.ceilingType)) considerations.push("Without a false ceiling, recessed lights and coves aren't possible — surface-mounted or track fittings are used instead.");
  if (canCove(p.space.ceilingType) && prefs.cove) considerations.push("Cove lighting needs a recess of about 150 mm in the false ceiling, set back from the wall so the strip is hidden.");
  if (p.kind === "renovation") considerations.push("Renovation: check existing light points and switch wiring before finalising positions.");
  if (p.kind === "new_construction") considerations.push("New construction: fix fitting positions before the false ceiling is closed and plan switching circuits by layer.");
  if (std.minIpRating) considerations.push(`Use fittings rated at least ${std.minIpRating} in this space.`);
  if (p.space.ceilingType === "wood_ceiling" || p.space.wallFinish === "dark_colour") considerations.push("Darker surfaces absorb light, so more output is needed for the same brightness.");
  if (p.space.naturalLight === "high" && p.space.windows.length) considerations.push("Good daylight: consider dimmers so artificial light can be reduced during the day.");
  considerations.push("Put each layer on its own switch or dimmer so the mood can change through the day.");

  return spaceAnalysisSchema.parse({
    source: "rule_based",
    createdAt: Date.now(),
    summary,
    objectives,
    layers: {
      ambient: prefs.cove
        ? `${fixtureLabel(prefs.ambientType)}s on an even grid, supported by cove lighting around the perimeter.`
        : `${fixtureLabel(prefs.ambientType)}s on an even grid.`,
      task: prefs.task.length ? `Dedicated lights for ${prefs.task.join(", ")}.` : "General light covers this space's tasks.",
      accent: prefs.accent ? "Adjustable spots washing the feature wall." : "Not needed for this concept.",
    },
    fixtureTypes: prefs.types.map(fixtureLabel),
    cct: { kelvin: prefs.cct, rationale: `${prefs.cct} K suits a ${ambience.label.toLowerCase()} ${label} (${std.cct.min}–${std.cct.max} K range).` },
    brightness: {
      targetLux,
      rangeLux: [std.ambient.min, std.ambient.max],
      rationale: `${std.label} ambient range ${std.ambient.min}–${std.ambient.max} lux; ${prefs.brightness} brightness preference.`,
    },
    considerations,
    observations: [],
    assumptions: log.list().map((a) => ({ label: a.label, value: `${a.value}${a.unit ? ` ${a.unit}` : ""}`, source: a.source, note: a.note })),
    status: unknownDims.length ? "preliminary" : "estimate",
  });
}
