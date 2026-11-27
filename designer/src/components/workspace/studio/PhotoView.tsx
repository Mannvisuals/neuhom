"use client";

import { useState } from "react";
import { ImagePlus, Wand2 } from "lucide-react";
import { Button, Segmented, cn } from "@/components/ui/primitives";
import { CONCEPTS, type Concept } from "@/lib/design/types";
import type { AssetMeta } from "@/lib/project/types";
import { useAssetUrl } from "@/lib/project/useAssetUrl";

/**
 * Before/after photo view. Proposed visualisations need an image-generation
 * service; until one is connected the "Proposed" side says so plainly
 * instead of faking an image.
 */
export function PhotoView({ photos, concept, onAddPhotos }: { photos: AssetMeta[]; concept: Concept; onAddPhotos: () => void }) {
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<"original" | "proposed">("original");
  const photo = photos[Math.min(active, photos.length - 1)];
  const url = useAssetUrl(photo?.id);
  const conceptLabel = CONCEPTS.find((c) => c.value === concept)?.label ?? "";

  if (!photos.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sunken text-ink-2">
          <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <div>
          <div className="text-[15px] font-semibold">No room photos yet</div>
          <p className="mt-1 max-w-[42ch] text-[13px] text-muted">Add photos of the space to compare it with the proposed lighting concept.</p>
        </div>
        <Button onClick={onAddPhotos}>Add photos</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          size="sm"
          ariaLabel="Photo mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "original", label: "Original" },
            { value: "proposed", label: `Proposed · ${conceptLabel}` },
          ]}
        />
        <span className="text-[11.5px] text-muted">Photos are for visual reference only — never used as measurements.</span>
      </div>
      <div className="relative min-h-[260px] flex-1 overflow-hidden rounded-lg bg-[#1c1a15]">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={photo?.name ?? "Room photo"}
            className={cn("absolute inset-0 h-full w-full object-contain transition-[filter,opacity] duration-300", mode === "proposed" && "opacity-30 blur-[2px] grayscale")}
          />
        )}
        {mode === "proposed" && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-[420px] rounded-lg bg-surface/95 p-5 text-center shadow-pop backdrop-blur">
              <Wand2 className="mx-auto h-5 w-5 text-brass" />
              <div className="mt-2 text-[14.5px] font-semibold">Concept visualisation isn&apos;t connected yet</div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                When an image service is connected, Neuhom will relight this photo to show the {conceptLabel.toLowerCase()} concept while
                keeping your room and furniture as they are. It will be an impression of the mood — the plan remains the technical reference.
              </p>
            </div>
          </div>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {photos.map((p, i) => (
            <Thumb key={p.id} asset={p} active={i === active} onClick={() => setActive(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Thumb({ asset, active, onClick }: { asset: AssetMeta; active: boolean; onClick: () => void }) {
  const url = useAssetUrl(asset.id);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={asset.name}
      className={cn("h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors", active ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </button>
  );
}
