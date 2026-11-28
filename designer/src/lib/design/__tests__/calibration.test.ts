/**
 * CALIBRATION AGAINST PRACTICAL INSTALLATIONS
 *
 * Generated designs must stay within what experienced Indian lighting
 * designers and electricians would specify for common rooms. These ranges
 * guard against the engine drifting back to over-lighting (e.g. the earlier
 * 15 × 18 W surface downlights in a 15 × 10 ft office).
 */
import { describe, expect, it } from "vitest";
import type { SpaceType } from "@/lib/lighting";
import { defaultRequirements, defaultSpace } from "@/lib/project/options";
import type { Project } from "@/lib/project/types";
import { REFERENCE_FITTINGS } from "../reference";
import { evaluateDesign, fixtureWatts } from "../evaluate";
import { generateDesign } from "../generate";

const ft = (v: number) => v / 3.28084;
function room(spaceType: SpaceType, L: number, W: number, H: number, space: Partial<Project["space"]> = {}, req: Partial<Project["requirements"]> = {}): Project {
  return {
    id: "c", name: "", spaceType, style: "contemporary", city: "", kind: "new_construction", createdAt: 0, updatedAt: 0, step: "plan", assets: [],
    space: { ...defaultSpace(), length: { value: ft(L), unknown: false }, width: { value: ft(W), unknown: false }, ceilingHeight: { value: ft(H), unknown: false }, ...space },
    requirements: { ...defaultRequirements(spaceType), ...req }, analysis: null, design: null, versions: [],
  };
}

function ambientDownlights(p: Project, concept: Parameters<typeof generateDesign>[1] = "tailored") {
  const d = generateDesign(p, concept);
  const pts = d.fixtures.filter((f) => f.layer === "ambient" && f.x2 === undefined);
  return { d, m: evaluateDesign(p, d), count: pts.length, watts: pts.reduce((s, f) => s + fixtureWatts(f), 0) };
}

describe("generic fittings reflect current LED efficiency", () => {
  it("downlights, panels and strips are at least 100 lm/W", () => {
    for (const f of REFERENCE_FITTINGS.filter((r) => ["recessed_downlight", "surface_downlight", "panel", "led_strip", "cove", "linear_profile"].includes(r.type))) {
      expect(f.lumens / f.watts, f.id).toBeGreaterThanOrEqual(100);
    }
  });
});

describe("practical fitting counts", () => {
  it("15 × 10 ft office without false ceiling: ≤ 6 downlights, ≤ 90 W (was 15 × 18 W = 270 W)", () => {
    const r = ambientDownlights(room("office", 15, 10, 10, { ceilingType: "exposed_concrete", wallFinish: "white", floorFinish: "dark_stone_or_wood" }, { brightness: "soft" }));
    expect(r.count).toBeLessThanOrEqual(6);
    expect(r.watts).toBeLessThanOrEqual(90);
    expect(r.m.state).toBe("ok");
  });

  it("15 × 10 ft office with false ceiling: 2–4 panels", () => {
    const r = ambientDownlights(room("office", 15, 10, 9.5));
    expect(r.count).toBeGreaterThanOrEqual(2);
    expect(r.count).toBeLessThanOrEqual(4);
  });

  it("12 × 10 ft bedroom: 4–6 small downlights, ≤ 45 W of downlights", () => {
    for (const c of ["tailored", "minimal_functional"] as const) {
      const r = ambientDownlights(room("bedroom", 12, 10, 9.5), c);
      expect(r.count, c).toBeGreaterThanOrEqual(4);
      expect(r.count, c).toBeLessThanOrEqual(6);
      expect(r.watts, c).toBeLessThanOrEqual(45);
    }
  });

  it("18 × 13 ft living room: ≤ 9 downlights and ≤ 9 W/m² overall", () => {
    const r = ambientDownlights(room("living_room", 18, 13, 9.5));
    expect(r.count).toBeLessThanOrEqual(9);
    expect(r.m.lpdWPerM2).toBeLessThanOrEqual(9);
    expect(r.m.state).toBe("ok");
  });

  it("10 × 8 ft kitchen: ≤ 6 downlights", () => {
    expect(ambientDownlights(room("kitchen", 10, 8, 9.5)).count).toBeLessThanOrEqual(6);
  });

  it("8 × 6 ft bathroom: ≤ 4 downlights", () => {
    expect(ambientDownlights(room("bathroom", 8, 6, 8.5)).count).toBeLessThanOrEqual(4);
  });

  it("a cove never replaces the downlights entirely", () => {
    for (const s of ["bedroom", "living_room", "dining_room"] as const) {
      const r = ambientDownlights(room(s, 12, 10, 9.5));
      expect(r.count, s).toBeGreaterThan(0);
    }
  });

  it("general light lands inside the Neuhom standard for common rooms and every style", () => {
    for (const [s, L, W] of [["bedroom", 12, 10], ["living_room", 18, 13], ["dining_room", 12, 10], ["kitchen", 10, 8], ["office", 15, 10], ["bathroom", 8, 6]] as const) {
      for (const c of ["tailored", "warm_cosy", "minimal_functional", "premium_architectural", "bright_contemporary"] as const) {
        const r = ambientDownlights(room(s, L, W, 9.5), c);
        expect(r.m.state, `${s} ${c}: ${r.m.density.effective} lm/sq ft`).toBe("ok");
      }
    }
  });

  it("matches the market rule of thumb (area × lm/sq ft) within one fitting", () => {
    // 18 × 13 ft living room at 10–20 lm/sq ft → 2,340–4,680 lm of general light
    const r = ambientDownlights(room("living_room", 18, 13, 9.5));
    const lm = r.d.fixtures.filter((f) => f.layer === "ambient" && f.x2 === undefined).reduce((s, f) => s + f.lumens, 0);
    expect(lm).toBeGreaterThanOrEqual(2340);
    expect(lm).toBeLessThanOrEqual(4680 * 1.1);
  });

  it("10 × 8 ft kitchen stays inside 30–40 lm/sq ft", () => {
    const r = ambientDownlights(room("kitchen", 10, 8, 9.5));
    expect(r.m.density.effective).toBeGreaterThanOrEqual(30 * 0.95);
    expect(r.m.density.effective).toBeLessThanOrEqual(40 * 1.1);
  });
});
