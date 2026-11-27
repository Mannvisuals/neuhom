"use client";

import { useRef, useState } from "react";
import { FileText, ImagePlus, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button, Segmented, cn } from "@/components/ui/primitives";
import { newId } from "@/lib/design/generate";
import { repository } from "@/lib/project/repository";
import { useWorkspace } from "@/lib/project/store";
import type { AssetKind, AssetMeta } from "@/lib/project/types";
import { useAssetUrl } from "@/lib/project/useAssetUrl";
import { StepLayout } from "../StepLayout";

const KINDS: { value: AssetKind; label: string; hint: string; accept: string }[] = [
  { value: "room_photo", label: "Room photos", hint: "Wide shots from the corners work best. Daylight and evening both help.", accept: "image/jpeg,image/png,image/webp" },
  { value: "floor_plan", label: "Floor plan", hint: "A drawing or PDF of the layout, if you have one.", accept: "image/jpeg,image/png,application/pdf" },
  { value: "reference", label: "Inspiration", hint: "Lighting you like from other spaces.", accept: "image/jpeg,image/png,image/webp" },
];

const MAX_BYTES = 15 * 1024 * 1024;

export function PhotosStep() {
  const p = useWorkspace((s) => s.project)!;
  const update = useWorkspace((s) => s.update);
  const setStep = useWorkspace((s) => s.setStep);
  const [kind, setKind] = useState<AssetKind>("room_photo");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);
  const meta = KINDS.find((k) => k.value === kind)!;
  const assets = p.assets.filter((a) => a.kind === kind);

  async function addFiles(files: FileList | File[]) {
    setError(null);
    const accepted = meta.accept.split(",");
    const added: AssetMeta[] = [];
    for (const file of Array.from(files)) {
      if (!accepted.includes(file.type)) {
        setError(`${file.name}: use ${kind === "floor_plan" ? "JPG, PNG or PDF" : "JPG, PNG or WebP"}.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is larger than 15 MB.`);
        continue;
      }
      const id = newId("a");
      try {
        await repository.putAsset(id, file);
      } catch {
        setError("Couldn't save the file in this browser. Storage may be full.");
        continue;
      }
      added.push({ id, kind, name: file.name, mime: file.type, size: file.size, addedAt: Date.now() });
    }
    const replacing = replaceTarget.current;
    replaceTarget.current = null;
    if (replacing && added[0]) {
      await repository.removeAsset(replacing);
      update((x) => ({ ...x, assets: x.assets.map((a) => (a.id === replacing ? added[0]! : a)) }));
    } else if (added.length) {
      update((x) => ({ ...x, assets: [...x.assets, ...added] }));
    }
  }

  async function remove(id: string) {
    await repository.removeAsset(id);
    update((x) => ({ ...x, assets: x.assets.filter((a) => a.id !== id) }));
  }

  const total = p.assets.length;

  return (
    <StepLayout
      eyebrow="Step 2 of 6"
      title="Show us the space"
      description="Photos help you compare the room before and after. Measurements come next — photos are never used as exact dimensions."
      onBack={() => setStep("project")}
      onNext={() => setStep("space")}
      nextLabel={total ? "Continue" : "Skip for now"}
    >
      <div className="flex flex-col gap-5">
        <Segmented
          ariaLabel="Upload type"
          value={kind}
          onChange={setKind}
          options={KINDS.map((k) => ({
            value: k.value,
            label: (
              <span className="flex items-center gap-1.5">
                {k.label}
                {p.assets.filter((a) => a.kind === k.value).length > 0 && (
                  <span className="tabular text-muted">{p.assets.filter((a) => a.kind === k.value).length}</span>
                )}
              </span>
            ),
          }))}
          className="w-full sm:w-auto"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
            dragging ? "border-brass bg-brass-soft/50" : "border-line-strong bg-surface",
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sunken text-ink-2">
            {kind === "floor_plan" ? <FileText className="h-5 w-5" strokeWidth={1.5} /> : <ImagePlus className="h-5 w-5" strokeWidth={1.5} />}
          </span>
          <div>
            <div className="text-[14px] font-medium">Drop {meta.label.toLowerCase()} here</div>
            <p className="mt-1 max-w-[46ch] text-[12.5px] text-muted">{meta.hint}</p>
          </div>
          <Button icon={<Upload className="h-4 w-4" />} onClick={() => input.current?.click()}>
            Choose files
          </Button>
          <input
            ref={input}
            type="file"
            multiple
            accept={meta.accept}
            className="sr-only"
            aria-label={`Upload ${meta.label.toLowerCase()}`}
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <span className="text-[11.5px] text-faint">
            {kind === "floor_plan" ? "JPG, PNG or PDF" : "JPG, PNG or WebP"} · up to 15 MB each · stored in this browser
          </span>
        </div>

        {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p>}

        {assets.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {assets.map((a) => (
              <AssetTile
                key={a.id}
                asset={a}
                onRemove={() => remove(a.id)}
                onReplace={() => {
                  replaceTarget.current = a.id;
                  input.current?.click();
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </StepLayout>
  );
}

function AssetTile({ asset, onRemove, onReplace }: { asset: AssetMeta; onRemove: () => void; onReplace: () => void }) {
  const url = useAssetUrl(asset.id);
  const isPdf = asset.mime === "application/pdf";
  return (
    <li className="group overflow-hidden rounded-lg border border-line bg-surface">
      <div className="relative aspect-[4/3] bg-sunken">
        {isPdf ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
            <FileText className="h-8 w-8" strokeWidth={1.25} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">PDF</span>
          </div>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={asset.name} className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-x-2 top-2 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button type="button" onClick={onReplace} aria-label={`Replace ${asset.name}`} className="flex h-7 w-7 items-center justify-center rounded-md bg-surface/95 text-ink-2 shadow-panel hover:text-ink">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onRemove} aria-label={`Remove ${asset.name}`} className="flex h-7 w-7 items-center justify-center rounded-md bg-surface/95 text-danger shadow-panel">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-[12.5px] font-medium">{asset.name}</span>
        <span className="shrink-0 text-[11.5px] text-muted tabular">{(asset.size / 1024 / 1024).toFixed(1)} MB</span>
      </div>
    </li>
  );
}
