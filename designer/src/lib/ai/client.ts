"use client";

import { repository } from "@/lib/project/repository";
import type { AssetMeta, Project } from "@/lib/project/types";
import type { AnalyseRequest, AnalyseResponse } from "./roomReading";

const MAX_EDGE = 1568;
const MAX_PDF_BYTES = 2.5 * 1024 * 1024;
/** keep the whole request under the hosting platform's body limit */
const MAX_TOTAL_BASE64 = 3_800_000;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Downscale an image to at most MAX_EDGE px on its long side, as JPEG. */
async function shrink(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.82));
}

/** Pick up to 4 files: floor plan first, then room photos, then inspiration. */
export function pickAssets(assets: AssetMeta[]): AssetMeta[] {
  const plan = assets.filter((a) => a.kind === "floor_plan").slice(0, 1);
  const photos = assets.filter((a) => a.kind === "room_photo").slice(0, 3);
  const refs = assets.filter((a) => a.kind === "reference");
  return [...plan, ...photos, ...refs].slice(0, 4);
}

export async function analyseProject(p: Project): Promise<AnalyseResponse & { imageCount?: number; skipped?: string[] }> {
  const chosen = pickAssets(p.assets);
  if (!chosen.length) return { ok: false, code: "invalid_request", message: "Add a room photo or floor plan first." };

  const images: AnalyseRequest["images"] = [];
  const skipped: string[] = [];
  let total = 0;
  for (const a of chosen) {
    const blob = await repository.getAsset(a.id);
    if (!blob) continue;
    let data: string;
    let mediaType: AnalyseRequest["images"][number]["mediaType"];
    if (a.mime === "application/pdf") {
      if (blob.size > MAX_PDF_BYTES) {
        skipped.push(`${a.name} (PDF over 2.5 MB — upload a screenshot or JPG of the plan instead)`);
        continue;
      }
      data = await blobToBase64(blob);
      mediaType = "application/pdf";
    } else {
      data = await blobToBase64(await shrink(blob));
      mediaType = "image/jpeg";
    }
    if (total + data.length > MAX_TOTAL_BASE64) {
      skipped.push(`${a.name} (too much to send at once)`);
      continue;
    }
    total += data.length;
    images.push({ kind: a.kind, mediaType, data });
  }
  if (!images.length) return { ok: false, code: "invalid_request", message: `Nothing could be sent: ${skipped.join("; ") || "files are too large"}.` };

  const body: AnalyseRequest = {
    images,
    context: { spaceType: p.spaceType, customSpaceName: p.customSpaceName, style: p.style, city: p.city || undefined },
  };
  try {
    const res = await fetch("/api/analyse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    let json: AnalyseResponse;
    try {
      json = (await res.json()) as AnalyseResponse;
    } catch {
      // the host returned a non-JSON error page (e.g. timeout or payload too large)
      return {
        ok: false,
        code: "failed",
        message: res.status === 413 ? "The files were too large to send. Try fewer or smaller photos." : res.status === 504 ? "The analysis took too long. Try again with fewer photos." : `The analysis service returned an error (${res.status}). Please try again.`,
      };
    }
    return { ...json, imageCount: images.length, skipped };
  } catch {
    return { ok: false, code: "failed", message: "Couldn't reach the analysis service. Check your connection and try again." };
  }
}
