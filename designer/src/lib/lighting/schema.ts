/**
 * Input validation at the engine boundary.
 *
 * The engine only accepts numbers with declared provenance. AI analysis can
 * contribute *categorical* information (space type, finishes) and
 * photo-estimated dimensions tagged `photo_estimate` — which forces a
 * "preliminary" result. There is deliberately no field through which an AI
 * model can supply lux, lumens, UF, MF or fixture counts.
 */
import { z } from "zod";

const SPACE_TYPES = [
  "living_room", "bedroom", "kitchen", "dining_room", "bathroom",
  "balcony", "office", "retail", "hospitality", "custom",
] as const;

export const dimensionSchema = (min: number, max: number) =>
  z
    .object({
      value: z.number().min(min).max(max).optional(),
      source: z.enum(["measured", "user_estimate", "photo_estimate", "unknown"]),
    })
    .refine((d) => d.source === "unknown" || d.value !== undefined, {
      message: "A value is required unless the dimension is marked unknown",
    });

export const roomInputSchema = z.object({
  spaceType: z.enum(SPACE_TYPES),
  length: dimensionSchema(0.5, 200),
  width: dimensionSchema(0.5, 200),
  ceilingHeight: dimensionSchema(1.8, 20),
  workPlaneHeight: z.number().min(0).max(1.5).optional(),
  surfaces: z
    .object({
      ceiling: z.enum(["white_plaster", "white_gypsum_false_ceiling", "off_white", "light_wood", "dark_wood", "exposed_concrete", "dark_painted"]).optional(),
      walls: z.enum(["white", "light_pastel", "medium_colour", "dark_colour", "wood_panelling", "exposed_brick", "large_glazing"]).optional(),
      floor: z.enum(["light_marble_or_tile", "medium_wood_or_tile", "dark_stone_or_wood", "carpet_or_rug"]).optional(),
    })
    .optional(),
  environment: z.enum(["clean", "normal", "dirty"]).optional(),
});

export const fixtureSpecSchema = z.object({
  lumens: z.number().positive().max(200_000),
  watts: z.number().positive().max(2_000),
  beamAngle: z.number().min(5).max(170),
  mounting: z.enum(["recessed", "surface", "suspended", "track", "wall", "cove"]),
  suspensionLength: z.number().min(0).max(10).optional(),
  distribution: z.enum(["direct_narrow", "direct_wide", "general_diffuse", "indirect"]).optional(),
  specSource: z.enum(["product_datasheet", "user_input", "generic_reference"]),
});

export const ambientInputSchema = z.object({
  room: roomInputSchema,
  fixture: fixtureSpecSchema,
  brightness: z.enum(["soft", "balanced", "bright"]).optional(),
  targetLux: z.number().positive().max(5_000).optional(),
  otherAmbientLux: z.number().min(0).max(5_000).optional(),
  maintenance: z
    .object({
      environment: z.enum(["clean", "normal", "dirty"]).optional(),
      dailyHours: z.number().min(0).max(24).optional(),
      periodYears: z.number().positive().max(30).optional(),
      ledRating: z.object({ lumenMaintenance: z.number().gt(0).lt(1), ratedHours: z.number().positive() }).optional(),
    })
    .optional(),
  utilisationOverride: z.number().gt(0).max(1.2).optional(),
  maintenanceFactorOverride: z.number().gt(0).max(1).optional(),
});

export type AmbientInputParsed = z.infer<typeof ambientInputSchema>;
