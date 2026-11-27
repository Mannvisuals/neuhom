"use client";

import { Copy, Info, Trash2, X } from "lucide-react";
import type { ResolvedRoom } from "@/lib/lighting";
import { Button, Field, IconButton, NumberInput, Segmented, Select } from "@/components/ui/primitives";
import { fixtureLumens, fixtureWatts } from "@/lib/design/evaluate";
import { BEAM_OPTIONS, CCT_OPTIONS, CRI_OPTIONS, fittingsOfType, LINEAR_TYPES } from "@/lib/design/reference";
import { formatLength, fromDisplay, toDisplay } from "@/lib/design/room";
import { LAYERS, fixtureLength, isLinear, type Layer, type PlacedFixture } from "@/lib/design/types";
import { FIXTURE_TYPES, fixtureLabel } from "@/lib/project/options";
import type { FixtureType, Unit } from "@/lib/project/types";
import { FixtureGlyph } from "./FixtureSymbol";
import { changeType } from "./fixtureOps";

const IP = ["", "IP20", "IP44", "IP54", "IP65"];

export function Inspector({
  f,
  room,
  unit,
  onChange,
  onDuplicate,
  onDelete,
  onClose,
  onApplyCctToAll,
}: {
  f: PlacedFixture;
  room: ResolvedRoom;
  unit: Unit;
  onChange: (next: PlacedFixture) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
  onApplyCctToAll: (cct: number) => void;
}) {
  const linear = isLinear(f);
  const refs = fittingsOfType(f.type);
  const refMatch = refs.find((r) => r.lumens === f.lumens && r.watts === f.watts && r.beamAngle === f.beamAngle);
  const color = LAYERS.find((l) => l.value === f.layer)!.color;
  const per = linear ? "/m" : "";
  const set = (patch: Partial<PlacedFixture>) => onChange({ ...f, ...patch });
  const setSpec = (patch: Partial<PlacedFixture>) => onChange({ ...f, ...patch, specSource: "user_input", referenceId: undefined });

  return (
    <div className="flex flex-col animate-fade-up">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <FixtureGlyph type={f.type} color={color} linear={linear} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">
            {f.code} <span className="font-normal text-ink-2">· {fixtureLabel(f.type)}</span>
          </div>
          <div className="text-[12px] text-muted tabular">
            {Math.round(fixtureLumens(f))} lm · {Math.round(fixtureWatts(f) * 10) / 10} W{linear ? ` · ${formatLength(fixtureLength(f), unit)}` : ""}
          </div>
        </div>
        <IconButton label="Duplicate (Ctrl+D)" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </IconButton>
        <IconButton label="Delete (Del)" onClick={onDelete} className="hover:bg-danger-soft hover:text-danger">
          <Trash2 className="h-4 w-4" />
        </IconButton>
        <IconButton label="Close" onClick={onClose}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <Field label="Layer">
          <Segmented
            size="sm"
            ariaLabel="Layer"
            value={f.layer}
            onChange={(v: Layer) => set({ layer: v })}
            options={LAYERS.map((l) => ({ value: l.value, label: l.label }))}
            className="w-full"
          />
        </Field>

        <Field label="Fitting type" htmlFor="ftype">
          <Select id="ftype" value={f.type} onChange={(e) => onChange(changeType(f, e.target.value as FixtureType, room))}>
            {FIXTURE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.short}
                {LINEAR_TYPES.includes(t.value) ? " (linear)" : ""}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Output" htmlFor="fout" hint={f.specSource === "generic_reference" ? "Generic reference fitting — real products come with the catalogue." : "Custom values you entered."}>
          <Select
            id="fout"
            value={refMatch?.id ?? "custom"}
            onChange={(e) => {
              const r = refs.find((x) => x.id === e.target.value);
              if (r) set({ lumens: r.lumens, watts: r.watts, beamAngle: r.beamAngle, mounting: r.mounting, specSource: "generic_reference", referenceId: r.id });
            }}
          >
            {refs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} — {r.lumens} lm{per}
              </option>
            ))}
            <option value="custom" disabled={!!refMatch}>
              Custom
            </option>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Lumens${per}`} htmlFor="flm">
            <NumberInput id="flm" value={f.lumens} step={10} min={10} max={20000} onChange={(v) => v && v > 0 && setSpec({ lumens: Math.round(v) })} unit="lm" />
          </Field>
          <Field label={`Watts${per}`} htmlFor="fw">
            <NumberInput id="fw" value={f.watts} step={0.5} min={0.5} max={500} onChange={(v) => v && v > 0 && setSpec({ watts: v })} unit="W" />
          </Field>
        </div>

        {!linear && (
          <Field label="Beam angle" htmlFor="fbeam">
            <Select id="fbeam" value={String(f.beamAngle)} onChange={(e) => setSpec({ beamAngle: Number(e.target.value) })}>
              {[...new Set([...BEAM_OPTIONS, f.beamAngle])].sort((a, b) => a - b).map((b) => (
                <option key={b} value={b}>
                  {b}°{b <= 24 ? " — narrow spot" : b <= 40 ? " — spot" : b <= 70 ? " — flood" : " — wide"}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Colour temperature">
          <Segmented
            size="sm"
            ariaLabel="Colour temperature"
            value={f.cct}
            onChange={(v) => set({ cct: v })}
            options={[...new Set([...CCT_OPTIONS, f.cct])].sort().map((k) => ({ value: k, label: `${k} K` }))}
            className="w-full"
          />
          <button type="button" onClick={() => onApplyCctToAll(f.cct)} className="self-start text-[12px] font-medium text-brass-ink hover:underline">
            Apply {f.cct} K to all fittings
          </button>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="CRI" htmlFor="fcri">
            <Select id="fcri" value={String(f.cri)} onChange={(e) => set({ cri: Number(e.target.value) })}>
              {CRI_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  Ra {c}+
                </option>
              ))}
            </Select>
          </Field>
          <Field label="IP rating" htmlFor="fip">
            <Select id="fip" value={f.ipRating ?? ""} onChange={(e) => set({ ipRating: e.target.value || undefined })}>
              {IP.map((ip) => (
                <option key={ip} value={ip}>
                  {ip || "Not specified"}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {(f.mounting === "suspended" || f.type === "pendant" || f.type === "chandelier") && (
          <Field label="Drop below ceiling" htmlFor="fdrop">
            <NumberInput
              id="fdrop"
              value={Number(toDisplay(f.suspensionLength ?? 0.7, unit).toFixed(2))}
              unit={unit}
              step={unit === "ft" ? 0.25 : 0.05}
              onChange={(v) => v !== null && set({ suspensionLength: Math.max(0.1, Math.min(room.ceilingHeight - room.workPlaneHeight - 0.3, fromDisplay(v, unit))) })}
            />
          </Field>
        )}

        <Field label="Position from top-left corner" hint="Drag on the plan, or use arrow keys (Shift for bigger steps).">
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              aria-label="Distance from left wall"
              value={Number(toDisplay(f.x, unit).toFixed(2))}
              unit={`${unit} →`}
              step={unit === "ft" ? 0.25 : 0.05}
              onChange={(v) => {
                if (v === null) return;
                const nx = Math.max(0, Math.min(room.length, fromDisplay(v, unit)));
                set(linear ? { x: nx, x2: f.x2! + (nx - f.x) } : { x: nx });
              }}
            />
            <NumberInput
              aria-label="Distance from top wall"
              value={Number(toDisplay(f.y, unit).toFixed(2))}
              unit={`${unit} ↓`}
              step={unit === "ft" ? 0.25 : 0.05}
              onChange={(v) => {
                if (v === null) return;
                const ny = Math.max(0, Math.min(room.width, fromDisplay(v, unit)));
                set(linear ? { y: ny, y2: f.y2! + (ny - f.y) } : { y: ny });
              }}
            />
          </div>
        </Field>

        {linear && (
          <Field label="Run length" htmlFor="flen">
            <NumberInput
              id="flen"
              value={Number(toDisplay(fixtureLength(f), unit).toFixed(2))}
              unit={unit}
              step={unit === "ft" ? 0.5 : 0.1}
              onChange={(v) => {
                if (!v || v <= 0) return;
                const len = fromDisplay(v, unit);
                const ang = Math.atan2(f.y2! - f.y, f.x2! - f.x);
                set({
                  x2: Math.max(0, Math.min(room.length, f.x + Math.cos(ang) * len)),
                  y2: Math.max(0, Math.min(room.width, f.y + Math.sin(ang) * len)),
                });
              }}
            />
          </Field>
        )}

        <div className="flex gap-2 rounded-md bg-sunken px-3 py-2.5 text-[12px] leading-snug text-ink-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
          Changes recalculate light levels, energy and the fitting schedule instantly.
        </div>
        <Button variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={onDelete} className="self-start">
          Remove {f.code}
        </Button>
      </div>
    </div>
  );
}
