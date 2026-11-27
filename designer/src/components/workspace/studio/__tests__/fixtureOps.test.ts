import { describe, expect, it } from "vitest";
import { AssumptionLog, DEFAULT_CONFIG, resolveRoom } from "@/lib/lighting";
import type { PlacedFixture } from "@/lib/design/types";
import { evenLayout, resizeGroup } from "../fixtureOps";

const room = resolveRoom(
  { spaceType: "retail", length: { value: 3.05, source: "measured" }, width: { value: 3.05, source: "measured" }, ceilingHeight: { value: 3.05, source: "measured" } },
  DEFAULT_CONFIG,
  new AssumptionLog(),
);

const fx = (id: string, x: number, y: number, layer: PlacedFixture["layer"] = "ambient"): PlacedFixture => ({
  id, code: id, layer, type: "surface_downlight", x, y, lumens: 1530, watts: 18, beamAngle: 90, cct: 3000, cri: 90, mounting: "surface", specSource: "generic_reference",
});

const isDiagonal = (pts: { x: number; y: number }[]) => new Set(pts.map((p) => p.x.toFixed(2))).size === pts.length && new Set(pts.map((p) => p.y.toFixed(2))).size === pts.length && pts.length > 2;

describe("evenLayout", () => {
  it("places exactly n points inside the room, in balanced rows", () => {
    for (let n = 1; n <= 16; n++) {
      const pts = evenLayout(n, 3.05, 3.05);
      expect(pts).toHaveLength(n);
      for (const p of pts) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(3.05);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(3.05);
      }
      const rows = new Map<number, number>();
      for (const p of pts) rows.set(p.y, (rows.get(p.y) ?? 0) + 1);
      const counts = [...rows.values()];
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      if (n > 2) expect(isDiagonal(pts)).toBe(false);
    }
  });

  it("gives a 3 × 3 grid for 9 in a square room", () => {
    const pts = evenLayout(9, 4, 4);
    expect(new Set(pts.map((p) => p.x)).size).toBe(3);
    expect(new Set(pts.map((p) => p.y)).size).toBe(3);
  });
});

describe("resizeGroup", () => {
  const nine = evenLayout(9, 3.05, 3.05).map((p, i) => fx(`a${i}`, p.x, p.y));

  it("re-spaces ambient fittings evenly when adding (regression: copies went diagonally)", () => {
    let group = nine;
    for (let n = 10; n <= 13; n++) {
      group = resizeGroup(group, n, room);
      expect(group).toHaveLength(n);
      expect(isDiagonal(group)).toBe(false);
    }
  });

  it("keeps existing ids when re-spacing and drops from the end when removing", () => {
    const fewer = resizeGroup(nine, 8, room);
    expect(fewer).toHaveLength(8);
    expect(fewer.map((f) => f.id)).toEqual(nine.slice(0, 8).map((f) => f.id));
  });

  it("re-spaces fittings in a line along that line", () => {
    const line = [0.5, 1.5, 2.5].map((x, i) => fx(`x${i}`, x, 0.6, "accent"));
    const four = resizeGroup(line, 4, room);
    expect(four.every((f) => f.y === 0.6)).toBe(true);
    expect(new Set(four.map((f) => f.x)).size).toBe(4);
  });

  it("adds a single non-ambient fitting as a centred row, not a diagonal copy", () => {
    const two = resizeGroup([fx("p", 1.5, 1.5, "task")], 2, room);
    expect(two[0]!.y).toBe(two[1]!.y);
    expect(two[0]!.x).not.toBe(two[1]!.x);
  });

  it("removes the group entirely at zero", () => {
    expect(resizeGroup(nine, 0, room)).toEqual([]);
  });
});
