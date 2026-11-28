/**
 * POST /api/analyse — AI room reading (server only).
 *
 * The Anthropic API key lives only in the server environment
 * (ANTHROPIC_API_KEY). Without it the endpoint answers "not_configured" and
 * the app keeps working with manual entry.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import { ROOM_READING_SYSTEM, roomReadingUserText } from "@/lib/ai/prompt";
import { analyseRequestSchema, roomReadingSchema, type AnalyseResponse } from "@/lib/ai/roomReading";

export const runtime = "nodejs";
export const maxDuration = 60;
// always evaluate at request time so a newly added key is picked up
export const dynamic = "force-dynamic";

const MODEL = process.env.NEUHOM_VISION_MODEL || "claude-opus-5-5";

// Best-effort per-visitor limit (per server instance). Keeps casual abuse from
// running up the API bill; a shared store can replace this when traffic grows.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = Number(process.env.NEUHOM_ANALYSES_PER_HOUR || 12);
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

const reply = (body: AnalyseResponse, status = 200) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return reply({ ok: false, code: "not_configured", message: "AI analysis is not connected yet." }, 503);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return reply({ ok: false, code: "rate_limited", message: "Too many analyses in the last hour. Please try again later." }, 429);
  }

  let body;
  try {
    body = analyseRequestSchema.parse(await req.json());
  } catch {
    return reply({ ok: false, code: "invalid_request", message: "Those files couldn't be read. Try JPG or PNG photos under 4 MB." }, 400);
  }

  const counts = {
    photos: body.images.filter((i) => i.kind === "room_photo").length,
    plans: body.images.filter((i) => i.kind === "floor_plan").length,
    references: body.images.filter((i) => i.kind === "reference").length,
  };

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const [i, img] of body.images.entries()) {
    const label = img.kind === "floor_plan" ? "Floor plan" : img.kind === "reference" ? "Inspiration image" : "Room photo";
    content.push({ type: "text", text: `${label} ${i + 1}:` });
    if (img.mediaType === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: img.data } });
    } else {
      content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } });
    }
  }
  content.push({ type: "text", text: roomReadingUserText(body.context, counts) });

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: ROOM_READING_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content }],
      output_config: { effort: "medium", format: betaZodOutputFormat(roomReadingSchema) },
    });

    if (response.stop_reason === "refusal") {
      return reply({ ok: false, code: "refused", message: "These images couldn't be analysed. Please try different photos." }, 422);
    }
    const parsed = roomReadingSchema.safeParse(response.parsed_output);
    if (!parsed.success) {
      return reply({ ok: false, code: "failed", message: "The analysis came back incomplete. Please try again." }, 502);
    }
    return reply({ ok: true, reading: parsed.data, model: response.model });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return reply({ ok: false, code: "rate_limited", message: "The AI service is busy. Please try again in a minute." }, 429);
    }
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error("Anthropic auth error", err.status);
      return reply({ ok: false, code: "not_configured", message: "AI analysis is not set up correctly." }, 503);
    }
    if (err instanceof Anthropic.BadRequestError) {
      console.error("Anthropic bad request", err.message);
      return reply({ ok: false, code: "invalid_request", message: "Those images couldn't be processed. Try smaller JPG or PNG photos." }, 400);
    }
    console.error("Analyse failed", err instanceof Anthropic.APIError ? err.status : err);
    return reply({ ok: false, code: "failed", message: "Something went wrong while analysing. Please try again." }, 502);
  }
}

/** GET /api/analyse — whether AI analysis is available (no secrets exposed). */
export function GET() {
  return NextResponse.json({ configured: !!process.env.ANTHROPIC_API_KEY });
}
