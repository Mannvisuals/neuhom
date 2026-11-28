"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, History, Info, RotateCcw, Save } from "lucide-react";
import { Badge, Button, cn } from "@/components/ui/primitives";
import type { DesignMetrics } from "@/lib/design/evaluate";
import { CONCEPTS, LAYERS, type Design } from "@/lib/design/types";
import type { DesignVersion } from "@/lib/project/types";

const SOURCE: Record<string, string> = {
  neuhom_default: "Neuhom default",
  standard_guidance: "Standard",
  generic_model: "Generic model",
  photo_estimate: "From photo",
  user_estimate: "Your estimate",
};

export function SummaryPanel({
  m,
  design,
  versions,
  onSelectFixture,
  onSaveVersion,
  onRestore,
}: {
  m: DesignMetrics;
  design: Design;
  versions: DesignVersion[];
  onSelectFixture: (id: string) => void;
  onSaveVersion: () => void;
  onRestore: (id: string) => void;
}) {
  const a = m.ambient;
  const d = m.density;
  const byDensity = m.method === "density";
  // headline metric follows how the design was sized
  const h = byDensity
    ? { value: Math.round(d.effective), unit: "lm per sq ft", min: d.min, max: d.max, target: d.target, rangeUnit: "lm/sq ft", label: "Neuhom standard" }
    : { value: a.achievedLux, unit: "lux average", min: a.min, max: a.max, target: a.targetLux, rangeUnit: "lx", label: "Recommended" };
  const scaleMax = Math.max(h.max * 1.25, h.value * 1.05);
  const pct = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%`;
  const concept = CONCEPTS.find((c) => c.value === design.concept);

  return (
    <div className="flex flex-col">
      <div className="border-b border-line p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">General light</span>
          {m.quality.status === "preliminary" ? (
            <Badge tone="warn" className="cursor-help">
              <span title={m.quality.reasons.join("\n")}>Preliminary</span>
            </Badge>
          ) : (
            <Badge tone="neutral" className="cursor-help">
              <span title={m.quality.reasons.join("\n")}>Estimate</span>
            </Badge>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[40px] font-semibold leading-none tracking-[-0.03em] tabular">{h.value}</span>
          <span className="text-[13px] text-muted">{h.unit}</span>
        </div>
        <div className="relative mt-4 h-2 rounded-full bg-sunken" aria-hidden>
          <div className="absolute inset-y-0 rounded-full bg-ok-soft" style={{ left: pct(h.min), width: `calc(${pct(h.max)} - ${pct(h.min)})` }} />
          <div
            className={cn("absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface shadow", m.state === "ok" ? "bg-ok" : "bg-warn")}
            style={{ left: pct(h.value) }}
          />
          <div className="absolute -top-1 h-4 w-px bg-ink" style={{ left: pct(h.target) }} />
        </div>
        <div className="mt-2 flex justify-between text-[11.5px] text-muted tabular">
          <span>
            {h.label} {h.min}–{h.max} {h.rangeUnit}
          </span>
          <span>
            Target {h.target} {h.rangeUnit}
          </span>
        </div>
        <p className={cn("mt-3 text-[12.5px] leading-snug", m.state === "ok" ? "text-ok" : "text-warn")}>
          {m.state === "ok" ? "Within the range for this room." : m.state === "low" ? "Below the range for this room." : "Above the range for this room."}
          <span className="text-muted"> Ceiling lights only — cove, task and accent lights are extra.</span>
        </p>
        <p className="mt-2 text-[11.5px] leading-snug text-muted tabular">
          {byDensity ? (
            <>
              Cross-check: about {a.achievedLux} lux average with everything on (workplace guidance {a.min}–{a.max} lux).
            </>
          ) : (
            <>Neuhom standard: {Math.round(d.effective)} lm/sq ft (range {d.min}–{d.max}).</>
          )}
          {a.fromCoveLux > 0 && <> Cove adds about {a.fromCoveLux} lux.</>}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-px border-b border-line bg-line">
        <Stat label="Fittings" value={`${m.totalFixtures}`} sub={m.totalLinearMetres ? `+ ${m.totalLinearMetres} m linear` : undefined} />
        <Stat label="Connected load" value={`${Math.round(m.connectedLoadW)}`} unit="W" sub={`${m.lpdWPerM2} W/m²`} />
        <Stat label="Energy" value={`${Math.round(m.annualKWh)}`} unit="kWh/yr" />
        <Stat label="Running cost" value={`₹${m.annualCost.toLocaleString("en-IN")}`} unit="/yr" sub="at ₹8/kWh" />
      </dl>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-b border-line px-5 py-3 text-[12px] text-ink-2">
        {LAYERS.map((l) => (
          <span key={l.value} className="flex items-center gap-1.5 tabular">
            <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
            {l.label} {m.layerItems[l.value]}
          </span>
        ))}
      </div>

      {m.warnings.length > 0 && (
        <div className="border-b border-line p-5">
          <div className="mb-2.5 eyebrow">Check</div>
          <ul className="flex flex-col gap-2">
            {m.warnings.slice(0, 6).map((w, i) => (
              <li key={i}>
                <button
                  type="button"
                  disabled={!w.fixtureId}
                  onClick={() => w.fixtureId && onSelectFixture(w.fixtureId)}
                  className="flex w-full gap-2 text-left text-[12.5px] leading-snug text-ink-2 enabled:hover:text-ink"
                >
                  {w.severity === "warning" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />}
                  {w.message}
                </button>
              </li>
            ))}
            {m.warnings.length > 6 && <li className="text-[12px] text-muted">+ {m.warnings.length - 6} more</li>}
          </ul>
        </div>
      )}

      <Collapsible title={`Why this design · ${concept?.label}`} defaultOpen>
        <ul className="flex flex-col gap-2">
          {design.rationale.map((r) => (
            <li key={r} className="flex gap-2 text-[12.5px] leading-snug text-ink-2">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brass" />
              {r}
            </li>
          ))}
          {design.edited && <li className="text-[12px] text-muted">You have edited this design since it was generated.</li>}
        </ul>
      </Collapsible>

      <Collapsible title={`Assumptions · ${m.assumptions.length}`}>
        <ul className="flex flex-col divide-y divide-line">
          {m.assumptions.map((x) => (
            <li key={x.id} className="py-2 first:pt-0">
              <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                <span className="font-medium">{x.label}</span>
                <span className="shrink-0 text-[11px] text-muted">{SOURCE[x.source] ?? x.source}</span>
              </div>
              <div className="text-[12px] text-ink-2 tabular">
                {x.value}
                {x.unit ? ` ${x.unit}` : ""}
              </div>
              {x.note && <div className="text-[11.5px] leading-snug text-muted">{x.note}</div>}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11.5px] leading-snug text-muted">
          Light levels use the lumen method with generic data. They are estimates, not a photometric simulation.
        </p>
      </Collapsible>

      <Collapsible title={`Versions · ${versions.length}`}>
        <Button size="sm" icon={<Save className="h-3.5 w-3.5" />} onClick={onSaveVersion} className="mb-3">
          Save this version
        </Button>
        {versions.length === 0 ? (
          <p className="text-[12px] text-muted">Saved versions appear here so you can compare and restore.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-sunken">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate text-[12.5px] font-medium">
                    <History className="h-3 w-3 text-muted" />
                    {v.label}
                  </div>
                  <div className="text-[11px] text-muted tabular">
                    {new Date(v.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {v.design.fixtures.length} items
                  </div>
                </div>
                <Button size="sm" variant="ghost" icon={<RotateCcw className="h-3 w-3" />} onClick={() => onRestore(v.id)}>
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>
    </div>
  );
}

function Stat({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="bg-surface px-5 py-3.5">
      <dt className="text-[11.5px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-[17px] font-semibold tabular">
        {value}
        {unit && <span className="ml-1 text-[11.5px] font-normal text-muted">{unit}</span>}
      </dd>
      {sub && <dd className="text-[11px] text-muted tabular">{sub}</dd>}
    </div>
  );
}

function Collapsible({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-line">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
        <span className="eyebrow">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
