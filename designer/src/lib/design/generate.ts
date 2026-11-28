/**
 * DESIGN GENERATION — deterministic.
 *
 * Turns a project into a placed, layered lighting design using the
 * calculation engine. Every quantity, output and position comes from the
 * engine or from explicit placement rules below; nothing comes from AI.
 */
import {
  calculateAccent,
  calculateCove,
  calculateDensityAmbient,
  calculateTask,
  maintenanceFactor,
  DEFAULT_CONFIG,
  type DensityResult,
  type FixtureSpec,
  type ResolvedRoom,
} from "@/lib/lighting";
import type { Project, Wall, Zone } from "@/lib/project/types";
import { fixtureLabel } from "@/lib/project/options";
import { designInputs } from "./inputs";
import { fittingsOfType, type ReferenceFitting } from "./reference";
import { resolvePreferences, type ResolvedPreferences } from "./preferences";
import { pointOnWall, resolveProjectRoom, toRoomInput, wallGeometry } from "./room";
import { LAYERS, type Concept, type Design, type Layer, type PlacedFixture } from "./types";

const round = (v: number, dp = 3) => Math.round(v * 10 ** dp) / 10 ** dp;

let idCounter = 0;
export const newId = (prefix = "f") => `${prefix}_${Date.now().toString(36)}${(idCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

type Draft = Omit<PlacedFixture, "id" | "code">;

function fromReference(ref: ReferenceFitting, layer: Layer, prefs: ResolvedPreferences, pos: { x: number; y: number; x2?: number; y2?: number }, extra: Partial<Draft> = {}): Draft {
  return {
    layer,
    type: ref.type,
    lumens: ref.lumens,
    watts: ref.watts,
    beamAngle: ref.beamAngle,
    cct: prefs.cct,
    cri: prefs.cri,
    mounting: ref.mounting,
    specSource: "generic_reference",
    referenceId: ref.id,
    ipRating: ref.ipRating,
    ...pos,
    ...extra,
  };
}

const toSpec = (ref: ReferenceFitting): FixtureSpec => ({
  lumens: ref.lumens,
  watts: ref.watts,
  beamAngle: ref.beamAngle,
  mounting: ref.mounting,
  specSource: "generic_reference",
});

/** Assign stable layer codes A1, A2, T1 ... in plan reading order. */
export function assignCodes(drafts: Draft[] | PlacedFixture[]): PlacedFixture[] {
  const counters: Record<Layer, number> = { ambient: 0, task: 0, accent: 0, decorative: 0 };
  return drafts.map((d) => {
    const prefix = LAYERS.find((l) => l.value === d.layer)!.prefix;
    counters[d.layer] += 1;
    return { ...d, id: "id" in d && d.id ? d.id : newId(), code: `${prefix}${counters[d.layer]}` } as PlacedFixture;
  });
}

export function generateDesign(project: Project, concept: Concept = "tailored"): Design {
  const prefs = resolvePreferences(project, concept);
  const room = resolveProjectRoom(project);
  const roomInput = toRoomInput(project);
  const std = DEFAULT_CONFIG.standards[project.spaceType];
  const drafts: Draft[] = [];
  const rationale: string[] = [];
  const wallIp = std.minIpRating;

  // ── Cove (indirect ambient) ──────────────────────────────────────────
  let coveLux = 0;
  if (prefs.cove && room.length > 1.6 && room.width > 1.6) {
    const inset = 0.25;
    const coveLength = 2 * (room.length - 2 * inset) + 2 * (room.width - 2 * inset);
    const req = calculateCove({ room: roomInput, coveLength });
    const options = fittingsOfType("cove");
    const strip = options.find((o) => o.lumens >= req.requiredLumensPerMetre) ?? options[options.length - 1]!;
    const chk = calculateCove({ room: roomInput, coveLength, stripLumensPerMetre: strip.lumens });
    coveLux = chk.achievedLux ?? 0;
    const L = room.length - inset;
    const W = room.width - inset;
    for (const seg of [
      { x: inset, y: inset, x2: L, y2: inset },
      { x: L, y: inset, x2: L, y2: W },
      { x: L, y: W, x2: inset, y2: W },
      { x: inset, y: W, x2: inset, y2: inset },
    ]) {
      drafts.push(fromReference(strip, "ambient", prefs, seg));
    }
    rationale.push(`Cove lighting (${strip.lumens} lm/m) around the ceiling edge adds about ${coveLux} lux of soft, indirect light.`);
  }

  // ── Ambient grid — sized by the Neuhom standard (lumens per sq ft) ───
  // The cove is mood light on its own switch and is not counted here, so the
  // room is properly lit with the cove off.
  const targetLux = Math.round(
    Math.min(std.ambient.max, Math.max(std.ambient.min, std.ambient.target * DEFAULT_CONFIG.brightnessMultiplier[prefs.brightness])),
  );
  const candidates = fittingsOfType(prefs.ambientType);
  let best: { ref: ReferenceFitting; result: DensityResult; score: number } | undefined;
  for (const ref of candidates) {
    const result = calculateDensityAmbient({ room: roomInput, fixture: toSpec(ref), brightness: prefs.brightness });
    const score =
      (result.state === "ok" ? 0 : 1000) +
      (result.layout?.tooDense ? 500 : 0) +
      result.quantity * 3 +
      (Math.abs(result.effectiveDensity - result.targetDensity) / result.targetDensity) * 20;
    if (!best || score < best.score) best = { ref, result, score };
  }
  if (best && best.result.layout) {
    const r = best.result;
    for (const p of r.layout!.positions) drafts.push(fromReference(best.ref, "ambient", prefs, p));
    rationale.push(
      `${r.quantity} × ${best.ref.label.toLowerCase()} on a ${r.layout!.cols} × ${r.layout!.rows} grid give about ${Math.round(r.effectiveDensity)} lumens per sq ft — the Neuhom standard for this room is ${r.range.min}–${r.range.max}.`,
    );
  }

  // ── Layout: walls of furniture and fixtures (from the user or the AI reading) ──
  const fw = project.space.featureWall;
  const zones = project.space.zones ?? [];
  /** wall of the first zone of a kind that sits against a wall */
  const zoneWall = (...kinds: Zone["kind"][]): Wall | undefined =>
    zones.find((z) => kinds.includes(z.kind) && z.wall !== "centre")?.wall as Wall | undefined;
  const hasZone = (kind: Zone["kind"]) => zones.some((z) => z.kind === kind);
  const wallName = (w: Wall) => `${w} wall`;

  // ── Task ─────────────────────────────────────────────────────────────
  for (const kind of prefs.taskKinds) {
    if (kind === "counter_strip") {
      // one strip under the wall cabinets along every counter run (L / U shapes)
      const runs: Wall[] = project.space.counterWalls?.length ? [...new Set(project.space.counterWalls)] : [zoneWall("stove", "sink") ?? fw];
      const opts = fittingsOfType("led_strip");
      const longest = Math.max(...runs.map((w) => wallGeometry(w, room).length));
      const req = calculateTask({ spaceType: "kitchen", taskKey: "counter", kind: "linear_under_cabinet", zoneLength: Math.max(0.6, longest - 0.6), zoneDepth: 0.6 });
      const strip = opts.find((o) => o.lumens >= req.requiredLumensPerMetre!) ?? opts[opts.length - 1]!;
      for (const w of runs) {
        const g = wallGeometry(w, room);
        const a = pointOnWall(w, room, 0.3, 0.3);
        const b = pointOnWall(w, room, g.length - 0.3, 0.3);
        drafts.push(fromReference(strip, "task", prefs, { x: a.x, y: a.y, x2: b.x, y2: b.y }, { ipRating: "IP20" }));
      }
      rationale.push(
        runs.length > 1
          ? `Under-cabinet strips (${strip.lumens} lm/m) along each counter run — ${runs.map(wallName).join(" and ")} — so every worktop is lit without shadows.`
          : `Under-cabinet strip (${strip.lumens} lm/m) along the counter on the ${wallName(runs[0]!)} for shadow-free worktops.`,
      );
    }
    if (kind === "bedside") {
      const w = zoneWall("bed") ?? fw;
      const g = wallGeometry(w, room);
      const ref = fittingsOfType("wall_light")[0]!;
      const mid = g.length / 2;
      for (const along of [mid - 1.1, mid + 1.1]) {
        drafts.push(fromReference(ref, "task", prefs, pointOnWall(w, room, Math.max(0.3, Math.min(g.length - 0.3, along)), 0.05)));
      }
      rationale.push(`A pair of wall lights either side of the bed on the ${wallName(w)}, for reading without lighting the whole room.`);
    }
    if (kind === "reading_wall") {
      const sofa = zoneWall("sofa");
      let side: Wall;
      let along: number;
      if (sofa) {
        // beside one end of the sofa
        side = sofa;
        along = wallGeometry(sofa, room).length * 0.2;
      } else {
        // a wall next to the feature wall, avoiding windows
        const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" } as const;
        const adjacent: Wall[] = fw === "top" || fw === "bottom" ? ["left", "right"] : ["top", "bottom"];
        const windows = project.space.windows;
        side = adjacent.find((w) => !windows.includes(w)) ?? (!windows.includes(opposite[fw]) ? opposite[fw] : adjacent[0]!);
        along = wallGeometry(side, room).length / 2;
      }
      drafts.push(fromReference(fittingsOfType("wall_light")[0]!, "task", prefs, pointOnWall(side, room, along, 0.05)));
      rationale.push(sofa ? `A reading light beside the sofa on the ${wallName(sofa)}.` : "A wall light beside the seating for reading.");
    }
    if (kind === "table_pendant") {
      const count = room.length >= 3.6 ? 2 : 1;
      const opts = fittingsOfType("pendant");
      const req = calculateTask({
        spaceType: "dining_room",
        taskKey: "table",
        kind: "pendant_over_task",
        zoneLength: 1.8,
        zoneDepth: 0.9,
        fixtureLumens: opts[0]!.lumens,
        beamAngle: opts[0]!.beamAngle,
        heightAboveTask: 0.75,
      });
      const ref = (req.quantity ?? 1) > count ? opts[opts.length - 1]! : opts[0]!;
      const drop = Math.max(0.3, room.ceilingHeight - 0.75 - 1.5);
      // over the table: centre of the room, or 0.9 m out from the wall it stands against
      const tw = zoneWall("dining_table");
      const centre = tw ? pointOnWall(tw, room, wallGeometry(tw, room).length / 2, 0.9) : { x: room.length / 2, y: room.width / 2 };
      const alongX = !tw || tw === "top" || tw === "bottom";
      for (let i = 0; i < count; i++) {
        const off = count === 1 ? 0 : (i - 0.5) * 0.8;
        drafts.push(fromReference(ref, "task", prefs, alongX ? { x: centre.x + off, y: centre.y } : { x: centre.x, y: centre.y + off }, { suspensionLength: round(drop, 2) }));
      }
      rationale.push(`${count === 1 ? "A pendant" : "Two pendants"} hung about 75 cm above the table for a focused pool of light.`);
    }
    if (kind === "mirror") {
      const w = zoneWall("vanity") ?? fw;
      const g = wallGeometry(w, room);
      const opts = fittingsOfType("wall_light");
      const mf = maintenanceFactor({ environment: room.environment, dailyHours: std.dailyHours }, DEFAULT_CONFIG).value;
      const req = calculateAccent({ spaceType: "bathroom", ambientLux: 300, ratio: 1, distance: 0.6, incidenceAngleDeg: 0, beamAngle: 110, maintenanceFactor: mf });
      const ref = opts.find((o) => o.lumens >= req.requiredLumens) ?? opts[opts.length - 1]!;
      drafts.push(fromReference(ref, "task", prefs, pointOnWall(w, room, g.length / 2, 0.05), { ipRating: wallIp ?? "IP44" }));
      rationale.push(`A mirror light at face height on the ${wallName(w)} for shadow-free grooming.`);
    }
  }

  // Desk or study table: a focused light above it
  const desk = zoneWall("desk");
  if (desk && project.spaceType !== "office") {
    const g = wallGeometry(desk, room);
    const ref = fittingsOfType(prefs.ambientType === "panel" ? "recessed_downlight" : prefs.ambientType)[0]!;
    drafts.push(fromReference(ref, "task", prefs, pointOnWall(desk, room, g.length / 2, 0.6)));
    rationale.push(`A focused light above the desk on the ${wallName(desk)}.`);
  }

  // ── Accent: wall washing the feature wall ────────────────────────────
  const accentWall = zoneWall("tv", "artwork") ?? fw;
  const awg = wallGeometry(accentWall, room);
  if (prefs.accent && awg.length >= 1.5) {
    const drop = Math.max(0.6, room.ceilingHeight - 1.5);
    const offset = round(Math.min(1.0, Math.max(0.5, drop * Math.tan(Math.PI / 6))), 2);
    const distance = drop / Math.cos(Math.PI / 6);
    const mf = maintenanceFactor({ environment: room.environment, dailyHours: std.dailyHours }, DEFAULT_CONFIG).value;
    const opts = fittingsOfType(prefs.accentType);
    const pickFor = (beam: number) =>
      calculateAccent({ spaceType: project.spaceType, ambientLux: Math.max(targetLux, 50), distance, incidenceAngleDeg: 60, beamAngle: beam, maintenanceFactor: mf });
    const ref = opts.find((o) => o.lumens >= pickFor(o.beamAngle).requiredLumens) ?? opts[opts.length - 1]!;
    const n = Math.max(2, Math.round(awg.length / 1.2));
    for (let i = 0; i < n; i++) {
      const along = ((i + 0.5) * awg.length) / n;
      drafts.push(fromReference(ref, "accent", prefs, pointOnWall(accentWall, room, along, offset)));
    }
    const what = zones.find((z) => (z.kind === "tv" || z.kind === "artwork") && z.wall === accentWall)?.label;
    rationale.push(
      `${n} adjustable ${fixtureLabel(prefs.accentType).toLowerCase()}s ${Math.round(offset * 100)} cm from the ${wallName(accentWall)}${what ? ` (${what.toLowerCase()})` : ""}, aimed at about 30°, for a ${std.accentRatio.target}:1 highlight.`,
    );
  }

  // Open shelves with display: a slim strip along their front edge
  const shelves = zoneWall("shelves");
  if (shelves && hasZone("shelves") && project.requirements.activities.includes("display") && prefs.concept !== "minimal_functional") {
    const g = wallGeometry(shelves, room);
    const opts = fittingsOfType("led_strip");
    const a = pointOnWall(shelves, room, 0.4, 0.15);
    const b = pointOnWall(shelves, room, Math.max(0.8, g.length - 0.4), 0.15);
    drafts.push(fromReference(opts[0]!, "accent", prefs, { x: a.x, y: a.y, x2: b.x, y2: b.y }));
    rationale.push(`A slim strip along the front of the open shelves on the ${wallName(shelves)} to light what's on display.`);
  }

  // ── Decorative ───────────────────────────────────────────────────────
  if (prefs.decorative) {
    const ref = fittingsOfType(prefs.decorativeType)[prefs.decorativeType === "pendant" ? 1 : 0]!;
    const drop = Math.max(0.4, Math.min(0.9, room.ceilingHeight - 2.3));
    drafts.push(fromReference(ref, "decorative", prefs, { x: room.length / 2, y: room.width / 2 }, { suspensionLength: round(drop, 2) }));
    rationale.push(`A ${fixtureLabel(prefs.decorativeType).toLowerCase()} as a centrepiece (decorative — not counted towards general light levels).`);
  }

  if (!prefs.cove && project.space.ceilingType === "false_ceiling" && concept === "tailored" && prefs.types.includes("cove")) {
    rationale.push("Cove lighting was skipped because the room is too small for it.");
  }

  return {
    id: newId("d"),
    concept,
    createdAt: Date.now(),
    brightness: prefs.brightness,
    cct: prefs.cct,
    fixtures: assignCodes(drafts.map((d) => roundDraft(d, room))),
    rationale,
    edited: false,
    method: "density",
    inputs: designInputs(project),
  };
}

function roundDraft(d: Draft, room: ResolvedRoom): Draft {
  const clampX = (v: number) => round(Math.min(room.length, Math.max(0, v)));
  const clampY = (v: number) => round(Math.min(room.width, Math.max(0, v)));
  return {
    ...d,
    x: clampX(d.x),
    y: clampY(d.y),
    ...(d.x2 !== undefined ? { x2: clampX(d.x2) } : {}),
    ...(d.y2 !== undefined ? { y2: clampY(d.y2) } : {}),
  };
}
