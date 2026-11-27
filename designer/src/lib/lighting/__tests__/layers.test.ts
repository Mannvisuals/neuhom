import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  LightingInputError,
  ambientInputSchema,
  calculateAccent,
  calculateAmbient,
  calculateCove,
  calculateTask,
  createConfig,
  type RoomInput,
} from "..";
import { cob36, downlight60, livingRoom, measured } from "./fixtures";

const room5x4: RoomInput = { spaceType: "living_room", length: measured(5), width: measured(4), ceilingHeight: measured(2.85) };

describe("ambient layer — lumen method", () => {
  it("matches a hand calculation: N = E·A / (Φ·UF·MF)", () => {
    // 300 lx × 20 m² / (1000 lm × 0.6 × 0.8) = 12.5 → 13 fittings
    const r = calculateAmbient({
      room: room5x4,
      fixture: downlight60,
      targetLux: 300,
      utilisationOverride: 0.6,
      maintenanceFactorOverride: 0.8,
    });
    expect(r.requiredLumens).toBe(12_500);
    expect(r.lumenMethodQuantity).toBe(13);
    // spacing ≤ 2·2.1·tan30° = 2.42 m; balanced grid 5 × 3
    expect(r.quantity).toBe(15);
    // 15 × 1000 × 0.6 × 0.8 / 20
    expect(r.achievedLux).toBe(360);
    expect(r.utilisation.source).toBe("override");
  });

  it("achieves at least the target in every room type with a sensible fitting", () => {
    for (const spaceType of Object.keys(DEFAULT_CONFIG.standards) as RoomInput["spaceType"][]) {
      const r = calculateAmbient({
        room: { spaceType, length: { source: "unknown" }, width: { source: "unknown" }, ceilingHeight: { source: "unknown" } },
        fixture: downlight60,
      });
      expect(r.achievedLux, spaceType).toBeGreaterThanOrEqual(r.target.lux);
      expect(r.quantity, spaceType).toBeGreaterThan(0);
    }
  });

  it("uses room-specific targets", () => {
    const t = (spaceType: RoomInput["spaceType"]) =>
      calculateAmbient({ room: { ...livingRoom, spaceType }, fixture: downlight60 }).target.lux;
    expect(t("living_room")).toBe(150);
    expect(t("bedroom")).toBe(100);
    expect(t("kitchen")).toBe(300);
    expect(t("office")).toBe(500);
    expect(t("retail")).toBe(300);
  });

  it("applies brightness preference within the allowed range", () => {
    const t = (brightness: "soft" | "balanced" | "bright", spaceType: RoomInput["spaceType"] = "living_room") =>
      calculateAmbient({ room: { ...livingRoom, spaceType }, fixture: downlight60, brightness }).target.lux;
    expect(t("soft")).toBe(120);
    expect(t("bright")).toBe(188);
    expect(t("soft")).toBeLessThan(t("balanced"));
    // bedroom 100 × 0.8 = 80 stays above the 75 lx minimum
    expect(t("soft", "bedroom")).toBe(80);
    // office 500 × 1.25 = 625 stays under the 750 lx maximum
    expect(t("bright", "office")).toBe(625);
  });

  it("requires more fittings for a higher target or darker room", () => {
    const n = (over: Partial<Parameters<typeof calculateAmbient>[0]>) =>
      calculateAmbient({ room: room5x4, fixture: { ...downlight60, lumens: 400 }, ...over }).lumenMethodQuantity;
    expect(n({ targetLux: 300 })).toBeGreaterThan(n({ targetLux: 150 }));
    expect(n({ room: { ...room5x4, surfaces: { walls: "dark_colour", ceiling: "dark_wood" } } })).toBeGreaterThan(n({}));
  });

  it("deducts light already provided by cove lighting", () => {
    const without = calculateAmbient({ room: room5x4, fixture: { ...downlight60, lumens: 300 } });
    const withCove = calculateAmbient({ room: room5x4, fixture: { ...downlight60, lumens: 300 }, otherAmbientLux: 50 });
    expect(withCove.requiredLumens).toBeLessThan(without.requiredLumens);
  });

  it("warns when spacing forces over-lighting and suggests a lower output", () => {
    const r = calculateAmbient({ room: livingRoom, fixture: cob36 });
    expect(r.quantity).toBeGreaterThan(r.lumenMethodQuantity);
    expect(r.warnings.map((w) => w.code)).toContain("over_lit");
    expect(r.idealLumensPerFixture).toBeLessThan(cob36.lumens);
  });

  it("reports a distribution consistent with the headline lux", () => {
    const r = calculateAmbient({ room: room5x4, fixture: downlight60 });
    expect(r.distribution?.basis).toBe("scaled_to_lumen_method");
    expect(r.distribution!.uniformity).toBeGreaterThan(0);
    expect(r.distribution!.uniformity).toBeLessThanOrEqual(1);
  });

  it("computes energy and LPD from the final quantity", () => {
    const r = calculateAmbient({ room: room5x4, fixture: downlight60 });
    expect(r.energy.connectedLoadW).toBe(r.quantity * downlight60.watts);
    expect(r.energy.lpdWPerM2).toBeCloseTo(r.energy.connectedLoadW / 20, 2);
  });

  it("flags implausible product data", () => {
    const r = calculateAmbient({ room: room5x4, fixture: { ...downlight60, lumens: 1000, watts: 2 } });
    expect(r.warnings.map((w) => w.code)).toContain("implausible_efficacy");
  });

  it("is deterministic", () => {
    const a = calculateAmbient({ room: livingRoom, fixture: downlight60 });
    const b = calculateAmbient({ room: livingRoom, fixture: downlight60 });
    expect(a).toEqual(b);
  });

  it("rejects cove/wall fittings and impossible mounting heights", () => {
    expect(() => calculateAmbient({ room: room5x4, fixture: { ...downlight60, mounting: "cove" } })).toThrow(LightingInputError);
    expect(() =>
      calculateAmbient({ room: room5x4, fixture: { ...downlight60, mounting: "suspended", suspensionLength: 1.9 } }),
    ).toThrow(LightingInputError);
  });
});

describe("assumptions and calculation status", () => {
  it("marks results from measured dimensions as an estimate, never as validated", () => {
    const r = calculateAmbient({ room: livingRoom, fixture: downlight60 });
    expect(r.quality.status).toBe("estimate");
    expect(r.quality.photometricallyValidated).toBe(false);
  });

  it("marks unknown dimensions as preliminary and records the default used", () => {
    const r = calculateAmbient({
      room: { ...livingRoom, ceilingHeight: { source: "unknown" } },
      fixture: downlight60,
    });
    expect(r.quality.status).toBe("preliminary");
    const a = r.assumptions.find((x) => x.id === "dimension.ceilingHeight");
    expect(a?.value).toBe(2.85);
    expect(a?.source).toBe("neuhom_default");
  });

  it("never treats photo-estimated dimensions as measurements", () => {
    const r = calculateAmbient({
      room: { ...livingRoom, length: { value: 5.5, source: "photo_estimate" } },
      fixture: downlight60,
    });
    expect(r.quality.status).toBe("preliminary");
    expect(r.quality.reasons.join(" ")).toMatch(/photo/i);
    expect(r.assumptions.find((x) => x.id === "dimension.length")?.source).toBe("photo_estimate");
  });

  it("records every non-user number used", () => {
    const ids = calculateAmbient({ room: livingRoom, fixture: downlight60 }).assumptions.map((a) => a.id);
    expect(ids).toEqual(
      expect.arrayContaining(["target.ambient", "calc.utilisation", "calc.maintenance", "room.reflectances", "room.workPlaneHeight", "fixture.spec"]),
    );
  });

  it("labels commercial targets as standard guidance and residential as Neuhom defaults", () => {
    const src = (spaceType: RoomInput["spaceType"]) =>
      calculateAmbient({ room: { ...livingRoom, spaceType }, fixture: downlight60 }).assumptions.find((a) => a.id === "target.ambient")?.source;
    expect(src("office")).toBe("standard_guidance");
    expect(src("living_room")).toBe("neuhom_default");
  });
});

describe("configuration", () => {
  it("allows project-specific overrides without mutating defaults", () => {
    const cfg = createConfig({ standards: { living_room: { ambient: { target: 200 } } } });
    expect(calculateAmbient({ room: livingRoom, fixture: downlight60 }, cfg).target.lux).toBe(200);
    expect(DEFAULT_CONFIG.standards.living_room.ambient.target).toBe(150);
    expect(calculateAmbient({ room: livingRoom, fixture: downlight60 }).target.lux).toBe(150);
  });
});

describe("task layer", () => {
  it("sizes under-cabinet strip in lm/m and round-trips to the target", () => {
    const base = { spaceType: "kitchen" as const, taskKey: "counter", kind: "linear_under_cabinet" as const, zoneLength: 3, zoneDepth: 0.6 };
    const req = calculateTask(base);
    expect(req.targetLux).toBe(500);
    const check = calculateTask({ ...base, lumensPerMetre: req.requiredLumensPerMetre });
    expect(check.achievedLux!).toBeGreaterThanOrEqual(500);
    expect(calculateTask({ ...base, lumensPerMetre: 300 }).warnings.map((w) => w.code)).toContain("task_under_lit");
  });

  it("sizes downlights over a task zone", () => {
    const r = calculateTask({
      spaceType: "office", taskKey: "desk", kind: "downlight_over_task",
      zoneLength: 1.6, zoneDepth: 0.8, fixtureLumens: 800, beamAngle: 60, heightAboveTask: 2.0,
    });
    expect(r.quantity).toBeGreaterThanOrEqual(1);
    expect(r.achievedLux!).toBeGreaterThanOrEqual(500);
  });

  it("rejects unknown tasks", () => {
    expect(() =>
      calculateTask({ spaceType: "bedroom", taskKey: "counter", kind: "linear_under_cabinet", zoneLength: 1, zoneDepth: 0.5 }),
    ).toThrow(LightingInputError);
  });
});

describe("accent layer", () => {
  it("matches the inverse-square law", () => {
    // 100 lx × 3 = 300 lx at 2 m, normal incidence, MF 1 → I = 300 × 4 = 1200 cd
    const r = calculateAccent({ spaceType: "living_room", ambientLux: 100, distance: 2, incidenceAngleDeg: 0, beamAngle: 24, maintenanceFactor: 1 });
    expect(r.targetLux).toBe(300);
    expect(r.requiredPeakCandela).toBe(1200);
    expect(r.beamDiameter).toBeCloseTo(2 * 2 * Math.tan((12 * Math.PI) / 180), 2);
  });

  it("round-trips: the required lumens achieve the target ratio", () => {
    const base = { spaceType: "living_room" as const, ambientLux: 150, distance: 2.2, beamAngle: 24, maintenanceFactor: 0.8 };
    const req = calculateAccent(base);
    const chk = calculateAccent({ ...base, candidateLumens: req.requiredLumens });
    expect(chk.achievedRatio).toBeCloseTo(3, 1);
  });

  it("warns when the accent is too weak to read", () => {
    const r = calculateAccent({ spaceType: "living_room", ambientLux: 150, distance: 3, beamAngle: 60, maintenanceFactor: 0.8, candidateLumens: 200 });
    expect(r.warnings.map((w) => w.code)).toContain("accent_weak");
  });
});

describe("cove layer", () => {
  it("round-trips required lm/m to the contribution target", () => {
    const req = calculateCove({ room: livingRoom });
    expect(req.contributionLux).toBe(45);
    expect(req.coveLength).toBe(19);
    const chk = calculateCove({ room: livingRoom, stripLumensPerMetre: req.requiredLumensPerMetre });
    expect(chk.achievedLux!).toBeGreaterThanOrEqual(45);
  });

  it("warns that cove lighting does little with a dark ceiling", () => {
    const r = calculateCove({ room: { ...livingRoom, surfaces: { ceiling: "dark_wood" } } });
    expect(r.warnings.map((w) => w.code)).toContain("cove_dark_ceiling");
  });
});

describe("input schema", () => {
  const valid = { room: livingRoom, fixture: downlight60 };

  it("accepts valid input", () => {
    expect(ambientInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects negative or missing measured values", () => {
    expect(ambientInputSchema.safeParse({ ...valid, room: { ...livingRoom, length: { value: -2, source: "measured" } } }).success).toBe(false);
    expect(ambientInputSchema.safeParse({ ...valid, room: { ...livingRoom, length: { source: "measured" } } }).success).toBe(false);
  });

  it("requires provenance on fixture data", () => {
    const { specSource: _drop, ...noSource } = downlight60;
    expect(ambientInputSchema.safeParse({ ...valid, fixture: noSource }).success).toBe(false);
  });

  it("has no field through which AI output could inject engineering numbers", () => {
    const parsed = ambientInputSchema.parse({ ...valid, aiSuggestedLux: 900, aiFixtureCount: 3 } as never);
    expect(parsed).not.toHaveProperty("aiSuggestedLux");
    expect(parsed).not.toHaveProperty("aiFixtureCount");
  });
});
