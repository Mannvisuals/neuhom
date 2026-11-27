import type { SpaceType, WallFinish, FloorFinish } from "@/lib/lighting";
import type {
  Activity,
  Ambience,
  BudgetRange,
  CeilingType,
  DesignStyle,
  FixtureType,
  Project,
  ProjectKind,
  Requirements,
  SpaceDetails,
  Wall,
} from "./types";

export const SPACE_TYPES: { value: SpaceType; label: string; hint: string }[] = [
  { value: "living_room", label: "Living room", hint: "Lounge, TV, conversation" },
  { value: "bedroom", label: "Bedroom", hint: "Rest, reading, wardrobe" },
  { value: "kitchen", label: "Kitchen", hint: "Cooking, counters" },
  { value: "dining_room", label: "Dining", hint: "Table, gathering" },
  { value: "bathroom", label: "Bathroom", hint: "Vanity, shower" },
  { value: "balcony", label: "Balcony", hint: "Semi-outdoor" },
  { value: "office", label: "Office", hint: "Desks, screens" },
  { value: "retail", label: "Retail", hint: "Display, merchandise" },
  { value: "hospitality", label: "Hospitality", hint: "Lobby, café, restaurant" },
  { value: "custom", label: "Other space", hint: "Name it yourself" },
];

export const STYLES: { value: DesignStyle; label: string }[] = [
  { value: "minimal", label: "Minimal" },
  { value: "contemporary", label: "Contemporary" },
  { value: "luxury", label: "Luxury" },
  { value: "modern", label: "Modern" },
  { value: "traditional", label: "Traditional" },
  { value: "custom", label: "Custom" },
];

export const PROJECT_KINDS: { value: ProjectKind; label: string; hint: string }[] = [
  { value: "new_construction", label: "New construction", hint: "Wiring and ceilings not yet done" },
  { value: "renovation", label: "Renovation", hint: "Existing wiring and light points" },
];

export const CITIES = [
  "Ahmedabad", "Bengaluru", "Bhopal", "Chandigarh", "Chennai", "Coimbatore", "Delhi", "Goa", "Gurugram",
  "Hyderabad", "Indore", "Jaipur", "Kochi", "Kolkata", "Lucknow", "Mumbai", "Nagpur", "Noida", "Pune",
  "Surat", "Thiruvananthapuram", "Vadodara", "Visakhapatnam",
];

export const CEILING_TYPES: { value: CeilingType; label: string; hint: string }[] = [
  { value: "false_ceiling", label: "False ceiling (gypsum)", hint: "Allows recessed lights and coves" },
  { value: "flat_slab", label: "Plain slab (no false ceiling)", hint: "Surface-mounted lights only" },
  { value: "wood_ceiling", label: "Wooden ceiling", hint: "Darker, absorbs light" },
  { value: "exposed_concrete", label: "Exposed concrete", hint: "Industrial, surface or track" },
];

export const WALL_FINISHES: { value: WallFinish; label: string; swatch: string }[] = [
  { value: "white", label: "White", swatch: "#f7f6f2" },
  { value: "light_pastel", label: "Light / pastel", swatch: "#ece3d3" },
  { value: "medium_colour", label: "Medium colour", swatch: "#b9a58a" },
  { value: "dark_colour", label: "Dark colour", swatch: "#4a4238" },
  { value: "wood_panelling", label: "Wood panelling", swatch: "#8b5e3c" },
  { value: "exposed_brick", label: "Exposed brick", swatch: "#9c5a43" },
  { value: "large_glazing", label: "Mostly glass", swatch: "#c9d6d8" },
];

export const FLOOR_FINISHES: { value: FloorFinish; label: string }[] = [
  { value: "light_marble_or_tile", label: "Light marble / tile" },
  { value: "medium_wood_or_tile", label: "Wood / medium tile" },
  { value: "dark_stone_or_wood", label: "Dark stone / wood" },
  { value: "carpet_or_rug", label: "Carpet / large rug" },
];

export const WALLS: { value: Wall; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "right", label: "Right" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
];

export const AMBIENCES: { value: Ambience; label: string; description: string; tone: string }[] = [
  { value: "warm_cosy", label: "Warm & cosy", description: "Soft, layered, relaxing evenings", tone: "#e9b874" },
  { value: "calm_minimal", label: "Calm & minimal", description: "Even, quiet, nothing distracting", tone: "#efd9b6" },
  { value: "bright_functional", label: "Bright & functional", description: "Clear light for tasks and detail", tone: "#f3efe4" },
  { value: "dramatic", label: "Dramatic", description: "Contrast, highlights, mood", tone: "#c98a3d" },
];

export const BUDGETS: { value: BudgetRange; label: string; description: string }[] = [
  { value: "essential", label: "Essential", description: "Fewer, efficient fittings" },
  { value: "balanced", label: "Balanced", description: "Good quality, layered light" },
  { value: "premium", label: "Premium", description: "Architectural details, high CRI" },
];

export const FIXTURE_TYPES: { value: FixtureType; label: string; short: string }[] = [
  { value: "recessed_downlight", label: "Recessed downlights", short: "Downlight" },
  { value: "cob_spot", label: "COB spotlights", short: "COB spot" },
  { value: "surface_downlight", label: "Surface downlights", short: "Surface downlight" },
  { value: "track_spot", label: "Track lights", short: "Track spot" },
  { value: "linear_profile", label: "Linear profiles", short: "Linear profile" },
  { value: "led_strip", label: "LED strip lighting", short: "LED strip" },
  { value: "cove", label: "Cove lighting", short: "Cove" },
  { value: "pendant", label: "Pendant lights", short: "Pendant" },
  { value: "chandelier", label: "Chandeliers", short: "Chandelier" },
  { value: "wall_light", label: "Wall lights", short: "Wall light" },
  { value: "decorative", label: "Decorative lighting", short: "Decorative" },
  { value: "panel", label: "Panel lights", short: "Panel" },
];

export const fixtureLabel = (t: FixtureType) => FIXTURE_TYPES.find((f) => f.value === t)?.short ?? t;

export const ACTIVITIES: { value: Activity; label: string }[] = [
  { value: "reading", label: "Reading" },
  { value: "cooking", label: "Cooking" },
  { value: "working", label: "Working" },
  { value: "grooming", label: "Grooming" },
  { value: "dining", label: "Dining" },
  { value: "entertaining", label: "Entertaining" },
  { value: "display", label: "Displaying art / decor" },
];

export const spaceLabel = (p: Pick<Project, "spaceType" | "customSpaceName">) =>
  p.spaceType === "custom" && p.customSpaceName ? p.customSpaceName : SPACE_TYPES.find((s) => s.value === p.spaceType)?.label ?? "Space";

export const DEFAULT_ACTIVITIES: Record<SpaceType, Activity[]> = {
  living_room: ["reading", "entertaining"],
  bedroom: ["reading"],
  kitchen: ["cooking"],
  dining_room: ["dining"],
  bathroom: ["grooming"],
  balcony: [],
  office: ["working"],
  retail: ["display"],
  hospitality: ["dining", "entertaining"],
  custom: [],
};

export function defaultSpace(): SpaceDetails {
  return {
    unit: "ft",
    length: { value: null, unknown: false },
    width: { value: null, unknown: false },
    ceilingHeight: { value: null, unknown: false },
    ceilingType: "false_ceiling",
    wallFinish: "light_pastel",
    floorFinish: "light_marble_or_tile",
    windows: [],
    featureWall: "top",
    existingLightPoints: null,
    naturalLight: "medium",
    furnitureNotes: "",
  };
}

export function defaultRequirements(spaceType: SpaceType): Requirements {
  return {
    ambience: spaceType === "office" || spaceType === "kitchen" ? "bright_functional" : "warm_cosy",
    cct: "auto",
    brightness: "balanced",
    budget: "balanced",
    autoFixtures: true,
    fixtures: [],
    activities: DEFAULT_ACTIVITIES[spaceType],
  };
}
