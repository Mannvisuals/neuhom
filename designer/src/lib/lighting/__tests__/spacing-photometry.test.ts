import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  cosineExponent,
  directIlluminanceAt,
  directIlluminanceGrid,
  distributionScaledToAverage,
  fitGrid,
  maxSpacing,
  peakIntensity,
} from "..";
import { intensityAt } from "../photometry";

describe("maximum spacing", () => {
  it("follows the beam spread 2·Hm·tan(β/2)", () => {
    expect(maxSpacing(2, 60, "direct_wide", DEFAULT_CONFIG)).toBeCloseTo(2 * 2 * Math.tan(Math.PI / 6), 6);
    expect(maxSpacing(2.1, 36, "direct_narrow", DEFAULT_CONFIG)).toBeCloseTo(2 * 2.1 * Math.tan((18 * Math.PI) / 180), 6);
  });

  it("is capped by the spacing-to-height ratio for wide beams", () => {
    expect(maxSpacing(2, 120, "direct_wide", DEFAULT_CONFIG)).toBe(3);
  });

  it("grows with mounting height", () => {
    expect(maxSpacing(3, 40, "direct_narrow", DEFAULT_CONFIG)).toBeGreaterThan(maxSpacing(2, 40, "direct_narrow", DEFAULT_CONFIG));
  });
});

describe("grid fitting", () => {
  it("places fittings at half-spacing from walls on a regular grid", () => {
    const g = fitGrid(4, 4, 4, 2, DEFAULT_CONFIG);
    expect([g.rows, g.cols]).toEqual([2, 2]);
    expect(g.positions).toEqual([
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 1, y: 3 },
      { x: 3, y: 3 },
    ]);
    expect(g.wallOffsetX).toBe(1);
  });

  it("always satisfies the minimum count and maximum spacing", () => {
    for (const [l, w, n, s] of [
      [5.5, 4, 8, 1.36],
      [10, 3, 5, 2.4],
      [3, 2.4, 1, 2],
      [12, 8, 40, 2.5],
      [2.4, 1.8, 2, 3],
    ] as const) {
      const g = fitGrid(l, w, n, s, DEFAULT_CONFIG);
      expect(g.count).toBeGreaterThanOrEqual(n);
      expect(g.spacingX).toBeLessThanOrEqual(s + 1e-3);
      expect(g.spacingY).toBeLessThanOrEqual(s + 1e-3);
      expect(g.spacingExceedsMax).toBe(false);
      for (const p of g.positions) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(l);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(w);
      }
    }
  });

  it("prefers a balanced grid over a long, thin one", () => {
    // 13 needed in 5 × 4 m: 5 × 3 (15) is better than 7 × 2 (14, 0.71 m × 2 m spacing)
    const g = fitGrid(5, 4, 13, 2.42, DEFAULT_CONFIG);
    expect([g.cols, g.rows]).toEqual([5, 3]);
  });

  it("flags impractically dense layouts", () => {
    expect(fitGrid(2, 2, 36, 2, DEFAULT_CONFIG).tooDense).toBe(true);
  });
});

describe("idealised cosine-power beam", () => {
  it("halves intensity at half the beam angle (definition of beam angle)", () => {
    for (const beam of [15, 24, 36, 60, 90, 120]) {
      const i0 = peakIntensity(1000, beam);
      expect(intensityAt(((beam / 2) * Math.PI) / 180, 1000, beam) / i0).toBeCloseTo(0.5, 6);
    }
  });

  it("conserves flux: ∫ I dΩ equals fixture lumens", () => {
    for (const beam of [24, 60, 120]) {
      const n = 20_000;
      let flux = 0;
      for (let i = 0; i < n; i++) {
        const t = ((i + 0.5) / n) * (Math.PI / 2);
        flux += intensityAt(t, 1000, beam) * Math.sin(t) * 2 * Math.PI * (Math.PI / 2 / n);
      }
      expect(flux).toBeCloseTo(1000, 0);
    }
  });

  it("gives E = I0 / h² directly below a fitting", () => {
    const i0 = peakIntensity(800, 40);
    const e = directIlluminanceAt({ x: 0, y: 0 }, [{ position: { x: 0, y: 0 }, height: 2, lumens: 800, beamAngle: 40 }]);
    expect(e).toBeCloseTo(i0 / 4, 6);
  });

  it("produces a lambertian exponent of ~1 for a 120° beam", () => {
    expect(cosineExponent(120)).toBeCloseTo(1, 6);
  });

  it("produces a symmetric grid for a centred fitting", () => {
    const grid = directIlluminanceGrid(4, 4, [{ position: { x: 2, y: 2 }, height: 2, lumens: 1000, beamAngle: 60 }], { border: 0, resolution: 1 });
    const lux = grid.points.map((p) => p.lux);
    expect(lux[0]).toBeCloseTo(lux[15]!, 6);
    expect(lux[3]).toBeCloseTo(lux[12]!, 6);
    expect(grid.uniformity).toBeLessThan(1);
  });

  it("scaled distribution keeps the uniformity and matches the target average over the whole room", () => {
    const sources = [
      { position: { x: 1, y: 1 }, height: 2, lumens: 1000, beamAngle: 60 },
      { position: { x: 3, y: 1 }, height: 2, lumens: 1000, beamAngle: 60 },
    ];
    const raw = directIlluminanceGrid(4, 2, sources, { border: 0 });
    const scaled = distributionScaledToAverage(4, 2, sources, 200, { border: 0 });
    expect(scaled.average).toBeCloseTo(200, 0);
    expect(scaled.uniformity).toBe(raw.uniformity);
    expect(scaled.basis).toBe("scaled_to_lumen_method");
  });
});
