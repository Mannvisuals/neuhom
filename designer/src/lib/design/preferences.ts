import { DEFAULT_CONFIG, type BrightnessPreference, type SpaceType } from "@/lib/lighting";
import type { Activity, FixtureType, Project } from "@/lib/project/types";
import { canCove, canRecess } from "./room";
import type { Concept } from "./types";

export type TaskKind = "counter_strip" | "bedside" | "reading_wall" | "table_pendant" | "mirror";

export interface ResolvedPreferences {
  concept: Concept;
  cct: number;
  cri: number;
  brightness: BrightnessPreference;
  ambientType: FixtureType;
  cove: boolean;
  accent: boolean;
  accentType: FixtureType;
  decorative: boolean;
  decorativeType: FixtureType;
  taskKinds: TaskKind[];
  /** human labels for task purposes */
  task: string[];
  types: FixtureType[];
}

const COVE_SPACES: SpaceType[] = ["living_room", "bedroom", "dining_room", "hospitality", "custom"];
const ACCENT_SPACES: SpaceType[] = ["living_room", "bedroom", "dining_room", "hospitality", "retail", "custom"];
const DECORATIVE_SPACES: SpaceType[] = ["living_room", "dining_room", "hospitality"];

const AMBIENCE_CCT = { warm_cosy: 2700, calm_minimal: 3000, bright_functional: 4000, dramatic: 3000 } as const;

function clampCct(k: number, space: SpaceType): number {
  const { min, max } = DEFAULT_CONFIG.standards[space].cct;
  return Math.min(max, Math.max(min, k));
}

function taskKindsFor(space: SpaceType, activities: Activity[]): TaskKind[] {
  const k: TaskKind[] = [];
  if (space === "kitchen" || activities.includes("cooking")) k.push("counter_strip");
  if (space === "bedroom" && activities.includes("reading")) k.push("bedside");
  if ((space === "living_room" || space === "hospitality") && activities.includes("reading")) k.push("reading_wall");
  if (space === "dining_room" || (activities.includes("dining") && space !== "kitchen")) k.push("table_pendant");
  if (space === "bathroom" || activities.includes("grooming")) k.push("mirror");
  return [...new Set(k)];
}

const TASK_LABEL: Record<TaskKind, string> = {
  counter_strip: "kitchen counters",
  bedside: "bedside reading",
  reading_wall: "a reading corner",
  table_pendant: "the dining table",
  mirror: "the mirror",
};

export function resolvePreferences(p: Project, concept: Concept): ResolvedPreferences {
  const req = p.requirements;
  const space = p.spaceType;
  const recess = canRecess(p.space.ceilingType);
  const cove = canCove(p.space.ceilingType);
  const selected = new Set(req.fixtures);
  const manual = !req.autoFixtures && selected.size > 0;

  // ── ambient fitting ──
  let ambientType: FixtureType = space === "office" ? "panel" : "recessed_downlight";
  if (manual) {
    const pick = (["panel", "recessed_downlight", "surface_downlight", "cob_spot", "track_spot"] as FixtureType[]).find((t) => selected.has(t));
    if (pick) ambientType = pick === "cob_spot" || pick === "track_spot" ? "recessed_downlight" : pick;
  }
  if (!recess && (ambientType === "recessed_downlight" || ambientType === "panel")) ambientType = "surface_downlight";

  // ── tailored defaults ──
  let cct = req.cct === "auto" ? AMBIENCE_CCT[req.ambience] : req.cct;
  if (req.cct === "auto" && space === "bedroom" && cct > 3000) cct = 3000;
  let brightness = req.brightness;
  let wantCove = manual
    ? selected.has("cove") || selected.has("led_strip")
    : req.budget !== "essential" && COVE_SPACES.includes(space) && req.ambience !== "bright_functional";
  let wantAccent = manual
    ? selected.has("cob_spot") || selected.has("track_spot")
    : ACCENT_SPACES.includes(space) &&
      (req.ambience === "warm_cosy" || req.ambience === "dramatic" || req.activities.includes("display") || req.budget === "premium");
  let wantDecorative = manual
    ? selected.has("chandelier") || selected.has("decorative") || (selected.has("pendant") && space !== "dining_room")
    : req.budget === "premium" && DECORATIVE_SPACES.includes(space) && space !== "dining_room";
  let cri = req.budget === "premium" ? 95 : DEFAULT_CONFIG.standards[space].minCri;

  // ── concept overrides ──
  switch (concept) {
    case "warm_cosy":
      cct = 2700;
      brightness = "soft";
      wantCove = COVE_SPACES.includes(space);
      wantAccent = ACCENT_SPACES.includes(space);
      wantDecorative = req.budget !== "essential" && DECORATIVE_SPACES.includes(space) && space !== "dining_room";
      break;
    case "minimal_functional":
      cct = space === "kitchen" || space === "office" ? 4000 : 3000;
      brightness = "balanced";
      wantCove = false;
      wantAccent = false;
      wantDecorative = false;
      break;
    case "premium_architectural":
      cct = 3000;
      brightness = "balanced";
      wantCove = COVE_SPACES.includes(space);
      wantAccent = ACCENT_SPACES.includes(space);
      wantDecorative = DECORATIVE_SPACES.includes(space) && space !== "dining_room";
      cri = 95;
      break;
    case "bright_contemporary":
      cct = 4000;
      brightness = "bright";
      wantCove = false;
      wantAccent = false;
      wantDecorative = false;
      break;
  }

  const taskKinds = taskKindsFor(space, req.activities);
  const accentType: FixtureType = recess ? "cob_spot" : "track_spot";
  const decorativeType: FixtureType = manual && selected.has("pendant") && !selected.has("chandelier") ? "pendant" : "chandelier";
  const types = new Set<FixtureType>([ambientType]);
  if (wantCove && cove) types.add("cove");
  if (wantAccent) types.add(accentType);
  if (wantDecorative) types.add(decorativeType);
  for (const t of taskKinds) types.add(t === "counter_strip" ? "led_strip" : t === "table_pendant" ? "pendant" : "wall_light");

  return {
    concept,
    cct: clampCct(cct, space),
    cri,
    brightness,
    ambientType,
    cove: wantCove && cove,
    accent: wantAccent,
    accentType,
    decorative: wantDecorative,
    decorativeType,
    taskKinds,
    task: taskKinds.map((k) => TASK_LABEL[k]),
    types: [...types],
  };
}
