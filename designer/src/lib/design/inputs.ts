import type { Project } from "@/lib/project/types";

/** Fingerprint of everything that affects design generation (notes excluded). */
export function designInputs(p: Project): string {
  const { furnitureNotes: _n, ...space } = p.space;
  return JSON.stringify([p.spaceType, p.customSpaceName ?? "", p.style, p.kind, space, p.requirements]);
}
