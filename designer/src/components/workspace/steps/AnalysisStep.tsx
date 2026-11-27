"use client";

import { useEffect, useMemo } from "react";
import { AlertTriangle, Pencil, ScanSearch, Sparkles } from "lucide-react";
import { Badge, Button, Panel } from "@/components/ui/primitives";
import { analyseSpaceRuleBased } from "@/lib/design/analysis";
import { generateDesign } from "@/lib/design/generate";
import { useWorkspace } from "@/lib/project/store";
import type { Project } from "@/lib/project/types";
import { StepLayout } from "../StepLayout";

const SOURCE_LABEL: Record<string, string> = {
  neuhom_default: "Neuhom default",
  standard_guidance: "Standard guidance",
  generic_model: "Generic model",
  photo_estimate: "From photo",
  user_estimate: "Your estimate",
};

/** Inputs that affect the analysis; when they change the analysis is recomputed. */
const fingerprint = (p: Project) => JSON.stringify([p.spaceType, p.style, p.kind, p.space, p.requirements]);

export function AnalysisStep() {
  const p = useWorkspace((s) => s.project)!;
  const update = useWorkspace((s) => s.update);
  const setStep = useWorkspace((s) => s.setStep);
  const setDesign = useWorkspace((s) => s.setDesign);
  const fp = useMemo(() => fingerprint(p), [p]);

  useEffect(() => {
    // Rule-based analysis is deterministic and instant; refresh it whenever the inputs change.
    update((x) => ({ ...x, analysis: analyseSpaceRuleBased(x) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fp]);

  const a = p.analysis;

  function generate() {
    const design = generateDesign(p, "tailored");
    setDesign(design, p.design ? "Regenerated from requirements" : "First design");
    setStep("design");
  }

  return (
    <StepLayout
      eyebrow="Step 5 of 6"
      title="Space analysis"
      description="What Neuhom understood about the space, and the lighting approach it recommends. Check it before generating the design."
      onBack={() => setStep("needs")}
      onNext={generate}
      nextLabel={p.design ? "Regenerate design" : "Generate lighting design"}
      secondary={
        p.design ? (
          <Button variant="secondary" onClick={() => setStep("design")}>
            Open current design
          </Button>
        ) : undefined
      }
    >
      <div className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3">
        <ScanSearch className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
        <div className="text-[13px] leading-snug text-ink-2">
          <span className="font-semibold text-ink">Rule-based analysis.</span> AI photo analysis is not connected, so this is
          built only from the details you entered. Your photos have not been analysed.
        </div>
      </div>

      {!a ? (
        <div className="h-64 animate-pulse rounded-lg bg-surface" />
      ) : (
        <div className="flex flex-col gap-6 animate-fade-up">
          <Panel className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="eyebrow">Space summary</span>
              {a.status === "preliminary" ? <Badge tone="warn">Preliminary — some sizes assumed</Badge> : <Badge tone="ok">Based on your measurements</Badge>}
            </div>
            <p className="mt-3 text-[15.5px] leading-relaxed">{a.summary}</p>
          </Panel>

          <div className="grid gap-6 md:grid-cols-3">
            <Metric label="Target general light" value={`${a.brightness.targetLux}`} unit="lux" note={`Range ${a.brightness.rangeLux[0]}–${a.brightness.rangeLux[1]} lux`} />
            <Metric label="Colour temperature" value={`${a.cct.kelvin}`} unit="K" note={a.cct.rationale} />
            <Metric label="Fitting types" value={`${a.fixtureTypes.length}`} unit="types" note={a.fixtureTypes.join(", ")} />
          </div>

          <Panel className="divide-y divide-line">
            <Block title="Lighting objectives">
              <ul className="flex flex-col gap-1.5">
                {a.objectives.map((o) => (
                  <li key={o} className="flex gap-2.5 text-[14px]">
                    <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-brass" />
                    {o}
                  </li>
                ))}
              </ul>
            </Block>
            <Block title="Recommended layers">
              <dl className="grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ["Ambient", a.layers.ambient, "var(--color-ambient)"],
                    ["Task", a.layers.task, "var(--color-task)"],
                    ["Accent", a.layers.accent, "var(--color-accent)"],
                  ] as const
                ).map(([k, v, c]) => (
                  <div key={k}>
                    <dt className="flex items-center gap-2 text-[12.5px] font-semibold">
                      <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                      {k}
                    </dt>
                    <dd className="mt-1 text-[13px] leading-snug text-ink-2">{v}</dd>
                  </div>
                ))}
              </dl>
            </Block>
            <Block title="Installation considerations">
              <ul className="flex flex-col gap-2">
                {a.considerations.map((c) => (
                  <li key={c} className="flex gap-2.5 text-[13.5px] leading-snug text-ink-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                    {c}
                  </li>
                ))}
              </ul>
            </Block>
          </Panel>

          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Assumptions</span>
              <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setStep("space")}>
                Edit details
              </Button>
            </div>
            <p className="mt-1 text-[12.5px] text-muted">Values Neuhom used that you didn't provide. Correct any of them in the earlier steps.</p>
            <ul className="mt-4 divide-y divide-line">
              {a.assumptions.map((x) => (
                <li key={x.label} className="grid gap-1 py-2.5 text-[13px] sm:grid-cols-[180px_1fr_auto] sm:items-baseline sm:gap-4">
                  <span className="font-medium">{x.label}</span>
                  <span className="text-ink-2">
                    <span className="tabular">{x.value}</span>
                    {x.note && <span className="block text-[12px] text-muted">{x.note}</span>}
                  </span>
                  <Badge tone={x.source === "photo_estimate" || x.source === "neuhom_default" ? "brass" : "neutral"}>{SOURCE_LABEL[x.source] ?? x.source}</Badge>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="flex items-center gap-2 text-[12.5px] text-muted">
            <Sparkles className="h-3.5 w-3.5" />
            Next, Neuhom calculates quantities and places every fitting on a plan you can edit.
          </div>
        </div>
      )}
    </StepLayout>
  );
}

function Metric({ label, value, unit, note }: { label: string; value: string; unit: string; note: string }) {
  return (
    <Panel className="p-5">
      <div className="text-[12.5px] text-muted">{label}</div>
      <div className="mt-1 text-[28px] font-semibold leading-none tracking-[-0.02em] tabular">
        {value} <span className="text-[13px] font-normal tracking-normal text-muted">{unit}</span>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-muted">{note}</p>
    </Panel>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6">
      <div className="mb-3 eyebrow">{title}</div>
      {children}
    </div>
  );
}
