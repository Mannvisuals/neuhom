import { describe, expect, it } from "vitest";
import type { SpaceType } from "@/lib/lighting";
import { defaultRequirements, defaultSpace, SPACE_TYPES } from "@/lib/project/options";
import type { Project } from "@/lib/project/types";
import { analyseSpaceRuleBased, spaceAnalysisSchema } from "../analysis";
import { evaluateDesign } from "../evaluate";
import { generateDesign } from "../generate";
import { CONCEPTS, isLinear } from "../types";

const ft = (v: number) => v / 3.28084;

function project(spaceType: SpaceType, over: Partial<Project["space"]> = {}, req: Partial<Project["requirements"]> = {}): Project {
  return {
    id: "p1",
    name: "Test",
    spaceType,
    style: "contemporary",
    city: "Pune",
    kind: "new_construction",
    createdAt: 0,
    updatedAt: 0,
    step: "design",
    assets: [],
    space: {
      ...defaultSpace(),
      length: { value: ft(16), unknown: false },
      width: { value: ft(12), unknown: false },
      ceilingHeight: { value: ft(9.5), unknown: false },
      ...over,
    },
    requirements: { ...defaultRequirements(spaceType), ...req },
    analysis: null,
    design: null,
    versions: [],
  };
}

describe("design generation", () => {
  it.each(SPACE_TYPES.map((s) => s.value))("produces a sensible design for %s", (spaceType) => {
    const p = project(spaceType);
    const d = generateDesign(p);
    const m = evaluateDesign(p, d);
    expect(d.fixtures.length).toBeGreaterThan(0);
    expect(m.state, `${spaceType}: ${m.density.effective} lm/sq ft`).toBe("ok");
    for (const f of d.fixtures) {
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x).toBeLessThanOrEqual(m.room.length);
      expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.y).toBeLessThanOrEqual(m.room.width);
      expect(f.specSource).toBe("generic_reference");
    }
    expect(new Set(d.fixtures.map((f) => f.code)).size).toBe(d.fixtures.length);
  });

  it("is deterministic apart from ids and timestamps", () => {
    const p = project("living_room");
    const strip = (d: ReturnType<typeof generateDesign>) => d.fixtures.map(({ id: _i, ...rest }) => rest);
    expect(strip(generateDesign(p))).toEqual(strip(generateDesign(p)));
  });

  it("uses surface fittings and no cove when there is no false ceiling", () => {
    const d = generateDesign(project("living_room", { ceilingType: "flat_slab" }));
    expect(d.fixtures.some((f) => f.type === "cove")).toBe(false);
    expect(d.fixtures.some((f) => f.mounting === "recessed")).toBe(false);
  });

  it("adds kitchen counter lighting and bathroom mirror lighting", () => {
    expect(generateDesign(project("kitchen")).fixtures.some((f) => f.layer === "task" && isLinear(f))).toBe(true);
    const bath = generateDesign(project("bathroom", { length: { value: ft(8), unknown: false }, width: { value: ft(6), unknown: false } }));
    const mirror = bath.fixtures.find((f) => f.layer === "task" && f.type === "wall_light");
    expect(mirror?.ipRating).toBe("IP44");
  });

  it("varies by concept", () => {
    const p = project("living_room");
    const cosy = generateDesign(p, "warm_cosy");
    const minimal = generateDesign(p, "minimal_functional");
    const bright = generateDesign(p, "bright_contemporary");
    expect(cosy.cct).toBe(2700);
    // "bright" asks for 4000 K but is capped at the living-room range maximum (3500 K)
    expect(bright.cct).toBe(3500);
    expect(generateDesign(project("kitchen"), "bright_contemporary").cct).toBe(4000);
    expect(minimal.fixtures.some((f) => f.layer === "accent" || f.type === "cove")).toBe(false);
    expect(cosy.fixtures.some((f) => f.type === "cove")).toBe(true);
    expect(evaluateDesign(p, bright).density.effective).toBeGreaterThan(evaluateDesign(p, cosy).density.effective);
  });

  it("every concept keeps ambient light within range in a typical living room", () => {
    const p = project("living_room");
    for (const c of CONCEPTS) expect(evaluateDesign(p, generateDesign(p, c.value)).state, c.value).toBe("ok");
  });

  it("respects manually chosen fixture types", () => {
    const p = project("living_room", {}, { autoFixtures: false, fixtures: ["surface_downlight", "track_spot"] });
    const d = generateDesign(p);
    expect(d.fixtures.filter((f) => f.layer === "ambient").every((f) => f.type === "surface_downlight")).toBe(true);
    expect(d.fixtures.some((f) => f.type === "track_spot" || f.type === "cob_spot")).toBe(true);
    expect(d.fixtures.some((f) => f.type === "cove")).toBe(false);
  });
});

describe("design evaluation", () => {
  it("recalculates when fixtures are removed or added", () => {
    const p = project("living_room");
    const d = generateDesign(p, "minimal_functional");
    const base = evaluateDesign(p, d);
    const fewer = evaluateDesign(p, { ...d, fixtures: d.fixtures.slice(0, 1) });
    expect(fewer.ambient.achievedLux).toBeLessThan(base.ambient.achievedLux);
    expect(fewer.state).toBe("low");
    expect(fewer.connectedLoadW).toBeLessThan(base.connectedLoadW);
    expect(fewer.warnings.some((w) => /below/.test(w.message))).toBe(true);
  });

  it("flags fittings dragged outside the room", () => {
    const p = project("bedroom");
    const d = generateDesign(p);
    const moved = { ...d, fixtures: d.fixtures.map((f, i) => (i === 0 ? { ...f, x: 99 } : f)) };
    expect(evaluateDesign(p, moved).warnings.some((w) => /outside/.test(w.message))).toBe(true);
  });

  it("marks designs with unknown dimensions as preliminary", () => {
    const p = project("living_room", { ceilingHeight: { value: null, unknown: true } });
    expect(evaluateDesign(p, generateDesign(p)).quality.status).toBe("preliminary");
  });
});

describe("rule-based analysis", () => {
  it("returns schema-valid output labelled as rule-based with no photo observations", () => {
    const a = analyseSpaceRuleBased(project("kitchen"));
    expect(spaceAnalysisSchema.safeParse(a).success).toBe(true);
    expect(a.source).toBe("rule_based");
    expect(a.observations).toEqual([]);
    expect(a.cct.kelvin).toBe(4000);
  });

  it("marks unknown dimensions as preliminary and lists the assumption", () => {
    const a = analyseSpaceRuleBased(project("bedroom", { length: { value: null, unknown: true } }));
    expect(a.status).toBe("preliminary");
    expect(a.assumptions.some((x) => x.label === "Room length")).toBe(true);
  });

  it("warns about recessed fittings without a false ceiling", () => {
    const a = analyseSpaceRuleBased(project("living_room", { ceilingType: "flat_slab" }));
    expect(a.considerations.join(" ")).toMatch(/false ceiling/);
  });
});

describe("placement rules", () => {
  it("keeps the reading light off window walls", () => {
    const p = project("living_room", { windows: ["top"], featureWall: "left" });
    const t = generateDesign(p).fixtures.find((f) => f.layer === "task" && f.type === "wall_light")!;
    expect(t.y).toBeGreaterThan(0.1); // not on the top (window) wall
  });
});
