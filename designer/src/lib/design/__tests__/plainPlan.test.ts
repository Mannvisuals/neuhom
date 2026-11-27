import { describe, expect, it } from "vitest";
import { defaultRequirements, defaultSpace } from "@/lib/project/options";
import type { Project } from "@/lib/project/types";
import { evaluateDesign } from "../evaluate";
import { generateDesign } from "../generate";
import { designInputs } from "../inputs";
import { brightnessWord, colourWord, describeLights, fittingList, whatsappMessage } from "../plainPlan";

const ft = (v: number) => v / 3.28084;
function project(over: Partial<Project> = {}): Project {
  return {
    id: "p", name: "Sharma residence", spaceType: "living_room", style: "contemporary", city: "Pune", kind: "new_construction",
    createdAt: 0, updatedAt: 0, step: "plan", assets: [],
    space: { ...defaultSpace(), length: { value: ft(18), unknown: false }, width: { value: ft(13), unknown: false }, ceilingHeight: { value: ft(9.5), unknown: false } },
    requirements: defaultRequirements("living_room"), analysis: null, design: null, versions: [],
    ...over,
  };
}

describe("fitting list", () => {
  it("accounts for every fitting exactly once", () => {
    const p = project();
    const d = generateDesign(p);
    const lines = fittingList(d, p);
    const pcs = lines.filter((l) => l.unit === "pcs").reduce((s, l) => s + l.quantity, 0);
    expect(pcs).toBe(evaluateDesign(p, d).totalFixtures);
    expect(lines.flatMap((l) => l.codes).sort()).toEqual(d.fixtures.map((f) => f.code).sort());
  });

  it("lists strip lights in metres, rounded up", () => {
    const p = project();
    const cove = fittingList(generateDesign(p), p).find((l) => l.type === "cove")!;
    expect(cove.unit).toBe("m");
    expect(cove.quantity * 10).toBe(Math.round(cove.quantity * 10));
  });

  it("contains no prices", () => {
    const p = project();
    const text = JSON.stringify(fittingList(generateDesign(p), p));
    expect(text).not.toMatch(/₹|price|cost/i);
  });
});

describe("plain language", () => {
  it("describes each group of lights", () => {
    const p = project();
    const d = generateDesign(p);
    const sentences = describeLights(d, p);
    expect(sentences).toHaveLength(fittingList(d, p).length);
    expect(sentences.map((s) => s.text).join(" ")).toMatch(/ceiling/);
  });

  it("uses words instead of kelvin and lux", () => {
    expect(colourWord(2700).label).toBe("Warm white");
    expect(colourWord(4000).label).toBe("Neutral white");
    expect(brightnessWord("ok", 160, 150).label).toBe("Just right");
    expect(brightnessWord("low", 60, 150).label).toBe("A bit dim");
  });

  it("builds a WhatsApp summary with the room and fittings", () => {
    const p = project();
    const d = generateDesign(p);
    const msg = whatsappMessage(d, p, evaluateDesign(p, d), (m) => `${(m * 3.28084).toFixed(0)} ft`);
    expect(msg).toMatch(/Sharma residence/);
    expect(msg).toMatch(/18 ft × 13 ft/);
    expect(msg).toMatch(/pcs/);
  });
});

describe("input fingerprint", () => {
  it("changes when room details change but not for notes", () => {
    const p = project();
    const base = designInputs(p);
    expect(designInputs({ ...p, space: { ...p.space, furnitureNotes: "sofa" } })).toBe(base);
    expect(designInputs({ ...p, space: { ...p.space, ceilingType: "flat_slab" } })).not.toBe(base);
    expect(generateDesign(p).inputs).toBe(base);
  });
});
