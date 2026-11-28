import { afterEach, describe, expect, it } from "vitest";
import { defaultRequirements, defaultSpace } from "@/lib/project/options";
import type { Project } from "@/lib/project/types";
import { roomReadingSchema, type RoomReading } from "../roomReading";
import { applyPlanSize, buildSuggestions, planSizes } from "../suggestions";
import { POST, GET } from "@/app/api/analyse/route";

const project = (over: Partial<Project> = {}): Project => ({
  id: "p", name: "", spaceType: "living_room", style: "modern", city: "", kind: "renovation", createdAt: 0, updatedAt: 0, step: "photos", assets: [],
  space: defaultSpace(), requirements: defaultRequirements("living_room"), analysis: null, design: null, versions: [], ...over,
});

const reading = (over: Partial<RoomReading> = {}): RoomReading =>
  roomReadingSchema.parse({
    roomType: { value: "living_room", confidence: "high" },
    ceiling: { value: "flat_slab", confidence: "high", evidence: "Plain ceiling with a fan box" },
    walls: { value: "white", confidence: "medium" },
    floor: { value: "unsure", confidence: "low" },
    naturalLight: { value: "high", confidence: "low" },
    existingLights: { description: "One tube light and a fan", ceilingPoints: 2 },
    features: [{ kind: "artwork", description: "Large painting above the sofa", accentWorthy: true }],
    activities: ["reading", "display"],
    observations: [{ text: "Plain plastered ceiling", confidence: "high" }],
    suggestions: [{ text: "Wash the painting with an adjustable spot", layer: "accent" }],
    layout: {
      frame: "photo",
      windows: ["left"],
      entrance: "bottom",
      mainWall: { wall: "top", what: "back counter with the chimney point" },
      counterWalls: ["top", "left"],
      zones: [
        { kind: "stove", wall: "top", description: "Stove below the chimney outlet" },
        { kind: "shelves", wall: "top", description: "Open shelves above the back counter" },
      ],
    },
    floorPlan: { provided: true, rooms: [{ name: "Store", writtenAs: "6x5", lengthFt: 6, widthFt: 5, matchesProject: false }, { name: "Living", writtenAs: "18'0\" x 13'6\"", lengthFt: 18, widthFt: 13.5, matchesProject: true }, { name: "Loft", writtenAs: "?", lengthFt: null, widthFt: null, matchesProject: false }], notes: "" },
    ...over,
  });

describe("AI suggestions", () => {
  it("suggests only changes, skipping 'unsure' and values that already match", () => {
    const s = buildSuggestions(reading(), project());
    const keys = s.map((x) => x.key);
    expect(keys).toContain("ceiling");
    expect(keys).toContain("walls");
    expect(keys).not.toContain("floor"); // unsure
    expect(keys).not.toContain("roomType"); // same as the user's choice
  });

  it("pre-ticks only medium/high confidence suggestions", () => {
    const s = buildSuggestions(reading(), project());
    expect(s.find((x) => x.key === "ceiling")!.recommended).toBe(true);
    expect(s.find((x) => x.key === "naturalLight")!.recommended).toBe(false);
  });

  it("never overrides the user's room type by default", () => {
    const s = buildSuggestions(reading({ roomType: { value: "bedroom", confidence: "high" } }), project());
    expect(s.find((x) => x.key === "roomType")!.recommended).toBe(false);
  });

  it("applies only what is accepted", () => {
    const p = project();
    const s = buildSuggestions(reading(), p).find((x) => x.key === "ceiling")!;
    const next = s.apply(p);
    expect(next.space.ceilingType).toBe("flat_slab");
    expect(next.space.wallFinish).toBe(p.space.wallFinish);
  });

  it("offers existing light points for renovations", () => {
    expect(buildSuggestions(reading(), project()).some((x) => x.key === "points")).toBe(true);
    expect(buildSuggestions(reading(), project({ kind: "new_construction" })).some((x) => x.key === "points")).toBe(false);
  });
});

describe("layout suggestions", () => {
  it("offers windows, main wall, counter runs and furniture in plan terms", () => {
    const s = buildSuggestions(reading(), project({ spaceType: "kitchen" }));
    const by = Object.fromEntries(s.map((x) => [x.key, x]));
    expect(by.windows!.value).toMatch(/left/);
    expect(by.counterWalls!.value).toMatch(/L-shaped/);
    expect(by.zones!.value).toMatch(/Stove/);
    let p = project({ spaceType: "kitchen" });
    for (const x of s) p = x.apply(p);
    expect(p.space.windows).toEqual(["left"]);
    expect(p.space.counterWalls).toEqual(["top", "left"]);
    expect(p.space.zones!.map((z) => z.kind)).toEqual(["stove", "shelves"]);
    expect(p.space.furnitureNotes).toMatch(/chimney/);
    expect(p.space.aiFilled).toEqual(expect.arrayContaining(["windows", "counterWalls", "zones", "ceiling"]));
  });

  it("skips layout when the AI couldn't tell orientation", () => {
    const r = reading({ layout: { frame: "unknown", windows: [], entrance: "unsure", mainWall: { wall: "unsure", what: "" }, counterWalls: [], zones: [] } });
    expect(buildSuggestions(r, project()).some((x) => ["windows", "featureWall", "counterWalls", "zones"].includes(x.key))).toBe(false);
  });

  it("does not pre-tick 'no false ceiling' on a new build", () => {
    const s = buildSuggestions(reading(), project({ kind: "new_construction" })).find((x) => x.key === "ceiling")!;
    expect(s.recommended).toBe(false);
    expect(s.value).toMatch(/false ceiling is planned/);
  });

  it("keeps the user's own furniture when re-applying AI zones", () => {
    const p = project({ space: { ...defaultSpace(), zones: [{ id: "u1", kind: "sofa", wall: "right", label: "Sofa", source: "user" }] } });
    const zs = buildSuggestions(reading(), p).find((x) => x.key === "zones")!.apply(p).space.zones!;
    expect(zs.some((z) => z.id === "u1")).toBe(true);
  });
});

describe("floor-plan sizes", () => {
  it("uses only dimensions written on the plan, longest side as length, matching room first", () => {
    const sizes = planSizes(reading());
    expect(sizes).toHaveLength(2); // the loft has no written size
    expect(sizes[0]!.name).toBe("Living");
    expect(sizes[0]!.matchesProject).toBe(true);
    expect(sizes[0]!.lengthM).toBeCloseTo(18 / 3.28084, 4);
    expect(sizes[0]!.widthM).toBeCloseTo(13.5 / 3.28084, 4);
    const p = applyPlanSize(project(), sizes[0]!);
    expect(p.space.length.unknown).toBe(false);
  });

  it("returns nothing when no plan was provided", () => {
    expect(planSizes(reading({ floorPlan: { provided: false, rooms: [], notes: "" } }))).toEqual([]);
  });
});

describe("/api/analyse", () => {
  const key = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    if (key === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = key;
  });

  it("reports not configured without a key, without calling the API", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await POST(new Request("http://x/api/analyse", { method: "POST", body: "{}" }));
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("not_configured");
    expect((await GET().json()).configured).toBe(false);
  });

  it("rejects malformed requests before calling the API", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key-not-used";
    const res = await POST(new Request("http://x/api/analyse", { method: "POST", headers: { "x-forwarded-for": "1.2.3.4" }, body: JSON.stringify({ images: [] }) }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("invalid_request");
  });
});
