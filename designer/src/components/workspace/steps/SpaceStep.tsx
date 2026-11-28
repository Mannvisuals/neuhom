"use client";

import { Info, Sparkles } from "lucide-react";
import { DEFAULT_CONFIG } from "@/lib/lighting";
import { Field, NumberInput, Panel, Segmented, Select, cn } from "@/components/ui/primitives";
import { fromDisplay, toDisplay } from "@/lib/design/room";
import { CEILING_TYPES, FLOOR_FINISHES, WALLS, WALL_FINISHES, spaceLabel } from "@/lib/project/options";
import { useWorkspace } from "@/lib/project/store";
import type { DimensionValue, SpaceDetails, Wall } from "@/lib/project/types";
import { RoomSketch } from "../RoomSketch";
import { FormSection, StepLayout } from "../StepLayout";

const FEATURE_LABEL: Record<string, string> = {
  living_room: "TV / feature wall",
  bedroom: "Bed wall",
  kitchen: "Counter wall",
  dining_room: "Feature wall",
  bathroom: "Vanity / mirror wall",
  balcony: "Main wall",
  office: "Main wall",
  retail: "Display wall",
  hospitality: "Feature wall",
  custom: "Feature wall",
};

export function SpaceStep() {
  const p = useWorkspace((s) => s.project)!;
  const update = useWorkspace((s) => s.update);
  const setStep = useWorkspace((s) => s.setStep);
  const sp = p.space;
  const unit = sp.unit;
  const set = (patch: Partial<SpaceDetails>) => update((x) => ({ ...x, space: { ...x.space, ...patch } }));

  const dims = ["length", "width", "ceilingHeight"] as const;
  const missing = dims.filter((d) => sp[d].value === null && !sp[d].unknown);
  const assumed = dims.some((d) => sp[d].unknown);
  const defaults = DEFAULT_CONFIG.defaultDimensions[p.spaceType];
  const sketchL = sp.length.unknown || sp.length.value === null ? defaults.length : sp.length.value;
  const sketchW = sp.width.unknown || sp.width.value === null ? defaults.width : sp.width.value;
  const featureLabel = FEATURE_LABEL[p.spaceType] ?? "Feature wall";

  const toggleWindow = (w: Wall) => set({ windows: sp.windows.includes(w) ? sp.windows.filter((x) => x !== w) : [...sp.windows, w] });

  return (
    <StepLayout
      eyebrow="Step 3 of 5"
      title={`Describe the ${spaceLabel(p).toLowerCase()}`}
      description="Measurements make the calculation accurate. If you don't know one, mark it — we'll use a typical size and clearly label the result as preliminary."
      onBack={() => setStep("photos")}
      onNext={() => setStep("needs")}
      nextDisabled={missing.length > 0}
      nextHint={missing.length ? "Enter or mark each dimension as unknown" : undefined}
      aside={
        <Panel className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="eyebrow">Plan preview</span>
            {assumed && <span className="text-[11.5px] font-medium text-warn">Typical size assumed</span>}
          </div>
          <RoomSketch length={sketchL} width={sketchW} unit={unit} windows={sp.windows} featureWall={sp.featureWall} featureLabel={featureLabel} assumed={assumed} />
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-muted">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-task" /> Windows</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-brass" /> {featureLabel}</span>
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[12px] leading-snug text-muted">
            Top of the plan is the wall you face when you walk in. You can adjust everything later.
          </p>
        </Panel>
      }
    >
      {p.aiReading && p.aiReading.applied.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-brass/25 bg-brass-soft/60 px-4 py-3 text-[13px] leading-snug text-brass-ink">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Some details below were filled in from your photo analysis. Please check they&apos;re right.
        </div>
      )}

      <FormSection title="Dimensions" description="Measure wall to wall, and floor to ceiling (or false ceiling).">
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-ink-2">Units</span>
          <Segmented
            size="sm"
            ariaLabel="Units"
            value={unit}
            onChange={(u) => set({ unit: u })}
            options={[
              { value: "ft", label: "Feet" },
              { value: "m", label: "Metres" },
            ]}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <DimensionField label="Length" value={sp.length} unit={unit} onChange={(v) => set({ length: v })} min={unit === "ft" ? 3 : 1} max={unit === "ft" ? 300 : 90} />
          <DimensionField label="Width" value={sp.width} unit={unit} onChange={(v) => set({ width: v })} min={unit === "ft" ? 3 : 1} max={unit === "ft" ? 300 : 90} />
          <DimensionField label="Ceiling height" value={sp.ceilingHeight} unit={unit} onChange={(v) => set({ ceilingHeight: v })} min={unit === "ft" ? 6 : 1.8} max={unit === "ft" ? 40 : 12} />
        </div>
      </FormSection>

      <FormSection title="Ceiling" description="This decides which fittings are possible.">
        <div role="radiogroup" aria-label="Ceiling type" className="grid gap-2.5 sm:grid-cols-2">
          {CEILING_TYPES.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={sp.ceilingType === c.value}
              onClick={() => set({ ceilingType: c.value })}
              className={cn(
                "flex flex-col items-start rounded-lg border bg-surface px-3.5 py-3 text-left transition-[border-color,box-shadow]",
                sp.ceilingType === c.value ? "border-ink shadow-[0_0_0_1px_var(--color-ink)]" : "border-line hover:border-line-strong",
              )}
            >
              <span className="text-[13.5px] font-medium">{c.label}</span>
              <span className="text-[12px] text-muted">{c.hint}</span>
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection title="Surfaces" description="Light walls and floors reflect more light, so fewer fittings are needed.">
        <Field label="Wall colour">
          <div role="radiogroup" aria-label="Wall colour" className="flex flex-wrap gap-2">
            {WALL_FINISHES.map((w) => (
              <button
                key={w.value}
                type="button"
                role="radio"
                aria-checked={sp.wallFinish === w.value}
                onClick={() => set({ wallFinish: w.value })}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md border bg-surface pr-3 pl-1.5 text-[13px] transition-colors",
                  sp.wallFinish === w.value ? "border-ink text-ink shadow-[0_0_0_1px_var(--color-ink)]" : "border-line-strong text-ink-2 hover:text-ink",
                )}
              >
                <span className="h-6 w-6 rounded-[4px] border border-black/10" style={{ background: w.swatch }} />
                {w.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Floor finish" htmlFor="floor">
            <Select id="floor" value={sp.floorFinish} onChange={(e) => set({ floorFinish: e.target.value as SpaceDetails["floorFinish"] })}>
              {FLOOR_FINISHES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Natural light">
            <Segmented
              ariaLabel="Natural light"
              value={sp.naturalLight}
              onChange={(v) => set({ naturalLight: v })}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
              className="w-full"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Layout" description="Used to place task and accent lights. Walls refer to the plan preview.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Windows on">
            <div className="flex flex-wrap gap-2">
              {WALLS.map((w) => (
                <WallChip key={w.value} active={sp.windows.includes(w.value)} onClick={() => toggleWindow(w.value)} role="checkbox">
                  {w.label}
                </WallChip>
              ))}
            </div>
          </Field>
          <Field label={featureLabel}>
            <div role="radiogroup" aria-label={featureLabel} className="flex flex-wrap gap-2">
              {WALLS.map((w) => (
                <WallChip key={w.value} active={sp.featureWall === w.value} onClick={() => set({ featureWall: w.value })} role="radio">
                  {w.label}
                </WallChip>
              ))}
            </div>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {p.kind === "renovation" && (
            <Field label="Existing ceiling light points" htmlFor="points" optional hint="Helps plan rewiring.">
              <NumberInput id="points" value={sp.existingLightPoints} onChange={(v) => set({ existingLightPoints: v === null ? null : Math.max(0, Math.round(v)) })} step={1} min={0} max={200} />
            </Field>
          )}
        </div>
        <Field label="Furniture and anything else we should know" htmlFor="notes" optional>
          <textarea
            id="notes"
            rows={3}
            value={sp.furnitureNotes}
            maxLength={600}
            onChange={(e) => set({ furnitureNotes: e.target.value })}
            placeholder="e.g. L-shaped sofa facing the TV wall, dining table near the window, artwork on the left wall"
            className="w-full rounded-md border border-line-strong bg-surface px-3 py-2.5 text-[14px] placeholder:text-faint focus:border-brass focus:outline-none focus:ring-3 focus:ring-brass/15"
          />
        </Field>
      </FormSection>
    </StepLayout>
  );
}

function WallChip({ active, onClick, children, role }: { active: boolean; onClick: () => void; children: React.ReactNode; role: "checkbox" | "radio" }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-md border px-3 text-[13px] font-medium transition-colors",
        active ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface text-ink-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function DimensionField({
  label,
  value,
  unit,
  onChange,
  min,
  max,
}: {
  label: string;
  value: DimensionValue;
  unit: "ft" | "m";
  onChange: (v: DimensionValue) => void;
  min: number;
  max: number;
}) {
  const id = `dim-${label.replace(/\s/g, "").toLowerCase()}`;
  const display = value.value === null ? null : Number(toDisplay(value.value, unit).toFixed(2));
  const outOfRange = display !== null && (display < min || display > max);
  return (
    <Field label={label} htmlFor={id} error={outOfRange ? `Between ${min} and ${max} ${unit}` : undefined}>
      <NumberInput
        id={id}
        value={value.unknown ? null : display}
        disabled={value.unknown}
        unit={unit}
        min={min}
        max={max}
        step={unit === "ft" ? 0.5 : 0.05}
        placeholder={value.unknown ? "Typical size" : undefined}
        onChange={(v) => onChange({ value: v === null ? null : fromDisplay(v, unit), unknown: false })}
      />
      <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
        <input
          type="checkbox"
          checked={value.unknown}
          onChange={(e) => onChange({ value: e.target.checked ? null : value.value, unknown: e.target.checked })}
          className="h-3.5 w-3.5 accent-[var(--color-ink)]"
        />
        I don&apos;t know
        {value.unknown && (
          <span title="A typical size is used and the result is marked preliminary">
            <Info className="h-3.5 w-3.5 text-muted" />
          </span>
        )}
      </label>
    </Field>
  );
}
