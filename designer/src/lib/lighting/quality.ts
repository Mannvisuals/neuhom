import type { CalculationQuality, ResolvedRoom } from "./types";

export function assessQuality(room: ResolvedRoom): CalculationQuality {
  const reasons: string[] = [];
  const names = { length: "length", width: "width", ceilingHeight: "ceiling height" } as const;
  for (const [k, src] of Object.entries(room.dimensionSources) as [keyof typeof names, string][]) {
    if (src === "unknown") reasons.push(`Room ${names[k]} not provided — a typical value was used.`);
    if (src === "photo_estimate") reasons.push(`Room ${names[k]} estimated from a photo, not measured.`);
  }
  reasons.push("Lumen-method estimate using generic utilisation data — not a photometric simulation.");
  return {
    status: reasons.length > 1 ? "preliminary" : "estimate",
    method: "lumen_method",
    photometricallyValidated: false,
    reasons,
  };
}
