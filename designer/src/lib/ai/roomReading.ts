/**
 * AI ROOM READING — the contract between the vision model and the app.
 *
 * The model returns ONLY this structure (enforced with structured outputs
 * and validated again here). It describes what it can see; it never supplies
 * lux, lumens, fitting counts or photo-estimated dimensions. Dimensions are
 * accepted only when they are written on a floor-plan drawing, and the user
 * must confirm them.
 */
import { z } from "zod";

const confidence = z.enum(["low", "medium", "high"]);

export const roomReadingSchema = z.object({
  roomType: z.object({
    value: z.enum(["living_room", "bedroom", "kitchen", "dining_room", "bathroom", "balcony", "office", "retail", "hospitality", "unsure"]),
    confidence,
  }),
  ceiling: z.object({
    value: z.enum(["false_ceiling", "flat_slab", "wood_ceiling", "exposed_concrete", "unsure"]),
    confidence,
    evidence: z.string(),
  }),
  walls: z.object({
    value: z.enum(["white", "light_pastel", "medium_colour", "dark_colour", "wood_panelling", "exposed_brick", "large_glazing", "unsure"]),
    confidence,
  }),
  floor: z.object({
    value: z.enum(["light_marble_or_tile", "medium_wood_or_tile", "dark_stone_or_wood", "carpet_or_rug", "unsure"]),
    confidence,
  }),
  naturalLight: z.object({ value: z.enum(["low", "medium", "high", "unsure"]), confidence }),
  existingLights: z.object({
    description: z.string(),
    /** visible ceiling light points / fan points; null if not countable */
    ceilingPoints: z.number().int().nullable(),
  }),
  features: z.array(
    z.object({
      kind: z.enum(["tv_wall", "feature_wall", "artwork", "shelving", "bed", "sofa", "dining_table", "kitchen_counter", "vanity_mirror", "desk", "plants", "other"]),
      description: z.string(),
      accentWorthy: z.boolean(),
    }),
  ),
  activities: z.array(z.enum(["reading", "cooking", "working", "grooming", "dining", "entertaining", "display"])),
  observations: z.array(z.object({ text: z.string(), confidence })),
  suggestions: z.array(z.object({ text: z.string(), layer: z.enum(["ambient", "task", "accent", "decorative"]) })),
  floorPlan: z.object({
    provided: z.boolean(),
    rooms: z.array(
      z.object({
        name: z.string(),
        /** dimension exactly as written on the drawing, e.g. 12'0" x 10'6" */
        writtenAs: z.string(),
        lengthFt: z.number().nullable(),
        widthFt: z.number().nullable(),
        /** true for the room on the plan that best matches the project's space */
        matchesProject: z.boolean(),
      }),
    ),
    notes: z.string(),
  }),
});

export type RoomReading = z.infer<typeof roomReadingSchema>;

export interface StoredReading {
  reading: RoomReading;
  model: string;
  createdAt: number;
  imageCount: number;
  /** keys of suggestions the user accepted */
  applied: string[];
  dismissed: string[];
}

/** Request body for /api/analyse */
export const analyseRequestSchema = z.object({
  images: z
    .array(
      z.object({
        kind: z.enum(["room_photo", "floor_plan", "reference"]),
        mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
        /** base64 without data: prefix */
        data: z.string().min(100).max(6_000_000),
      }),
    )
    .min(1)
    .max(4),
  context: z.object({
    spaceType: z.string().max(40),
    customSpaceName: z.string().max(80).optional(),
    style: z.string().max(40),
    city: z.string().max(80).optional(),
  }),
});

export type AnalyseRequest = z.infer<typeof analyseRequestSchema>;

export type AnalyseResponse =
  | { ok: true; reading: RoomReading; model: string; skipped?: string[] }
  | { ok: false; code: "not_configured" | "rate_limited" | "invalid_request" | "refused" | "failed"; message: string };
