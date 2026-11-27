import { describe, expect, it } from "vitest";
import {
  AssumptionLog,
  DEFAULT_CONFIG,
  GenericUtilisationProvider,
  classifyDistribution,
  energySummary,
  feetToMetres,
  ledLumenMaintenance,
  maintenanceFactor,
  mountingHeight,
  resolveRoom,
  roomIndex,
} from "..";
import { interpolate } from "../utilisation";
import { cob36, downlight60, livingRoom } from "./fixtures";

const uf = new GenericUtilisationProvider(DEFAULT_CONFIG);
const refl = (ceiling: number, walls: number, floor = 0.2) => ({ ceiling, walls, floor });

describe("room index", () => {
  it("matches the textbook formula K = LW / (Hm(L+W))", () => {
    expect(roomIndex(5.5, 4, 2.1)).toBeCloseTo(22 / (2.1 * 9.5), 10);
    expect(roomIndex(10, 10, 2.5)).toBeCloseTo(2, 10);
  });

  it("rejects impossible geometry", () => {
    expect(() => roomIndex(0, 4, 2)).toThrow(RangeError);
    expect(() => roomIndex(4, 4, 0)).toThrow(RangeError);
  });

  it("uses ceiling minus work plane (minus pendant drop) as mounting height", () => {
    const room = resolveRoom(livingRoom, DEFAULT_CONFIG, new AssumptionLog());
    expect(mountingHeight(room, "recessed")).toBeCloseTo(2.1, 10);
    expect(mountingHeight(room, "suspended", 0.8)).toBeCloseTo(1.3, 10);
  });

  it("converts feet and inches to metres", () => {
    expect(feetToMetres(10)).toBeCloseTo(3.048, 6);
    expect(feetToMetres(9, 6)).toBeCloseTo(2.8956, 6);
  });
});

describe("utilisation factor (generic model)", () => {
  it("interpolates linearly and clamps at the table ends", () => {
    expect(interpolate([1, 2], [10, 20], 1.5)).toBe(15);
    expect(interpolate([1, 2], [10, 20], 0)).toBe(10);
    expect(interpolate([1, 2], [10, 20], 9)).toBe(20);
  });

  it("returns the base curve at reference reflectances (0.7 / 0.5)", () => {
    const r = uf.getUtilisation({ roomIndex: 1.0, reflectances: refl(0.7, 0.5), distribution: "direct_narrow" });
    expect(r.value).toBe(0.62);
    expect(r.source).toBe("generic_model");
  });

  it("interpolates between tabulated room indices", () => {
    const r = uf.getUtilisation({ roomIndex: 1.125, reflectances: refl(0.7, 0.5), distribution: "direct_narrow" });
    expect(r.value).toBeCloseTo((0.62 + 0.68) / 2, 3);
  });

  it("applies the wall factor, stronger in small rooms", () => {
    // 0.62 × (1 − 0.35 × 0.2 × 1)
    expect(uf.getUtilisation({ roomIndex: 1.0, reflectances: refl(0.7, 0.3), distribution: "direct_narrow" }).value).toBeCloseTo(0.577, 3);
    // 0.78 × (1 − 0.35 × 0.2 × 0.5)
    expect(uf.getUtilisation({ roomIndex: 2.0, reflectances: refl(0.7, 0.3), distribution: "direct_narrow" }).value).toBeCloseTo(0.753, 3);
  });

  it("is monotonic: larger rooms and lighter surfaces use more light", () => {
    const at = (k: number, c = 0.7, w = 0.5) => uf.getUtilisation({ roomIndex: k, reflectances: refl(c, w), distribution: "direct_wide" }).value;
    for (let k = 0.6; k < 5; k += 0.2) expect(at(k + 0.2)).toBeGreaterThanOrEqual(at(k));
    expect(at(1.5, 0.7, 0.1)).toBeLessThan(at(1.5, 0.7, 0.5));
    expect(at(1.5, 0.3, 0.5)).toBeLessThan(at(1.5, 0.7, 0.5));
  });

  it("makes indirect (cove) light far more sensitive to the ceiling than downlights", () => {
    const drop = (d: "indirect" | "direct_narrow") =>
      uf.getUtilisation({ roomIndex: 1.5, reflectances: refl(0.3, 0.5), distribution: d }).value /
      uf.getUtilisation({ roomIndex: 1.5, reflectances: refl(0.7, 0.5), distribution: d }).value;
    expect(drop("indirect")).toBeLessThan(0.6);
    expect(drop("direct_narrow")).toBeGreaterThan(0.95);
  });

  it("clamps very small/large room indices to the table range", () => {
    const r = uf.getUtilisation({ roomIndex: 0.2, reflectances: refl(0.7, 0.5), distribution: "direct_narrow" });
    expect(r.roomIndexUsed).toBe(0.6);
    expect(r.value).toBe(0.48);
  });

  it("classifies fittings into distribution families", () => {
    expect(classifyDistribution(cob36, DEFAULT_CONFIG)).toBe("direct_narrow");
    expect(classifyDistribution(downlight60, DEFAULT_CONFIG)).toBe("direct_wide");
    expect(classifyDistribution({ ...downlight60, mounting: "cove" }, DEFAULT_CONFIG)).toBe("indirect");
    expect(classifyDistribution({ ...downlight60, mounting: "suspended" }, DEFAULT_CONFIG)).toBe("general_diffuse");
  });
});

describe("maintenance factor (CIE 97 structure)", () => {
  it("depreciates LED output linearly to the rated value", () => {
    const l70 = { lumenMaintenance: 0.7, ratedHours: 25_000 };
    expect(ledLumenMaintenance(0, l70)).toBe(1);
    expect(ledLumenMaintenance(25_000, l70)).toBeCloseTo(0.7, 10);
    expect(ledLumenMaintenance(12_500, l70)).toBeCloseTo(0.85, 10);
  });

  it("multiplies LLMF × LSF × LMF × RSMF", () => {
    // 6 h/day × 365 × 5 yr = 10,950 h → LLMF = 1 − 0.3 × 0.438 = 0.8686
    const mf = maintenanceFactor({ environment: "clean", dailyHours: 6 }, DEFAULT_CONFIG);
    expect(mf.operatingHours).toBe(10_950);
    expect(mf.llmf).toBeCloseTo(0.869, 3);
    expect(mf.value).toBeCloseTo(0.8686 * 1 * 0.95 * 0.97, 3);
  });

  it("is lower in dirtier environments and with longer use", () => {
    const mf = (environment: "clean" | "normal" | "dirty", dailyHours = 6) =>
      maintenanceFactor({ environment, dailyHours }, DEFAULT_CONFIG).value;
    expect(mf("dirty")).toBeLessThan(mf("normal"));
    expect(mf("normal")).toBeLessThan(mf("clean"));
    expect(mf("clean", 12)).toBeLessThan(mf("clean", 6));
  });

  it("uses datasheet LED rating when supplied", () => {
    const generic = maintenanceFactor({ environment: "clean", dailyHours: 6 }, DEFAULT_CONFIG);
    const better = maintenanceFactor({ environment: "clean", dailyHours: 6, ledRating: { lumenMaintenance: 0.8, ratedHours: 50_000 } }, DEFAULT_CONFIG);
    expect(better.value).toBeGreaterThan(generic.value);
    expect(better.ledRatingSource).toBe("product_datasheet");
  });
});

describe("energy", () => {
  it("computes connected load, LPD, annual kWh and cost", () => {
    const e = energySummary([{ quantity: 10, watts: 10, dailyHours: 6 }], 20, DEFAULT_CONFIG);
    expect(e.connectedLoadW).toBe(100);
    expect(e.lpdWPerM2).toBe(5);
    expect(e.annualKWh).toBe(219);
    expect(e.annualCost).toBe(1752);
  });

  it("uses a project tariff when provided", () => {
    expect(energySummary([{ quantity: 1, watts: 1000, dailyHours: 1 }], 10, DEFAULT_CONFIG, 10).annualCost).toBe(3650);
  });
});
