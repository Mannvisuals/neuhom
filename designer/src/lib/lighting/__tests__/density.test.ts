import { describe, expect, it } from "vitest";
import { LUMEN_DENSITY, calculateDensityAmbient, feetToMetres as ft, type RoomInput } from "..";

const m = (v: number) => ({ value: ft(v), source: "measured" as const });
const living: RoomInput = { spaceType: "living_room", length: m(18), width: m(13), ceilingHeight: m(9.5) };
const dl = (lumens: number, watts: number) => ({ lumens, watts, beamAngle: 60, mounting: "recessed" as const, specSource: "generic_reference" as const });

describe("lumen-density method (Neuhom standard)", () => {
  it("uses area × lm/sq ft", () => {
    const r = calculateDensityAmbient({ room: living, fixture: dl(630, 6) });
    expect(r.areaSqFt).toBeCloseTo(234, 0);
    expect(r.targetDensity).toBe(LUMEN_DENSITY.living_room.target);
    expect(r.requiredLumens).toBe(Math.round(r.areaSqFt * 15));
    expect(r.quantity).toBeGreaterThanOrEqual(Math.ceil(r.requiredLumens / 630) - 1);
    expect(r.state).toBe("ok");
  });

  it("applies brightness preference within the range", () => {
    expect(calculateDensityAmbient({ room: living, fixture: dl(630, 6), brightness: "soft" }).targetDensity).toBe(12);
    expect(calculateDensityAmbient({ room: living, fixture: dl(630, 6), brightness: "bright" }).targetDensity).toBe(18.8);
  });

  it("adds light for high ceilings and dark walls", () => {
    const base = calculateDensityAmbient({ room: living, fixture: dl(630, 6) });
    const high = calculateDensityAmbient({ room: { ...living, ceilingHeight: m(12) }, fixture: dl(630, 6) });
    const dark = calculateDensityAmbient({ room: { ...living, surfaces: { walls: "dark_colour" } }, fixture: dl(630, 6) });
    expect(high.adjustment).toBeCloseTo(1 + 2.5 * 0.06, 3);
    expect(high.requiredLumens).toBeGreaterThan(base.requiredLumens);
    expect(dark.requiredLumens).toBeGreaterThan(base.requiredLumens);
    expect(base.adjustment).toBe(1);
  });

  it("steps down when the grid would overshoot the range", () => {
    // 10 × 8 ft kitchen: 3 × 9 W needed → a 2 × 2 grid would overshoot 40 lm/sq ft with bigger fittings
    const r = calculateDensityAmbient({ room: { spaceType: "kitchen", length: m(10), width: m(8), ceilingHeight: m(9.5) }, fixture: dl(630, 6) });
    expect(r.state).toBe("ok");
  });

  it("flags rooms it cannot light within range", () => {
    const tiny = calculateDensityAmbient({ room: { spaceType: "bedroom", length: m(6), width: m(5), ceilingHeight: m(9.5) }, fixture: dl(3800, 36) });
    expect(tiny.state).toBe("high");
  });

  it("marks unknown sizes as preliminary", () => {
    expect(calculateDensityAmbient({ room: { ...living, length: { source: "unknown" } }, fixture: dl(630, 6) }).quality.status).toBe("preliminary");
  });
});
