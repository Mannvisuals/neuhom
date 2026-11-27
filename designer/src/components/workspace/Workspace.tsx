"use client";

import Link from "next/link";
import { Check, ChevronLeft, CloudOff, Loader2 } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/components/ui/primitives";
import { useWorkspace, type SaveState } from "@/lib/project/store";
import { STEPS, type StepId } from "@/lib/project/types";
import { ProjectStep } from "./steps/ProjectStep";
import { PhotosStep } from "./steps/PhotosStep";
import { SpaceStep } from "./steps/SpaceStep";
import { NeedsStep } from "./steps/NeedsStep";
import { PlanStep } from "./plan/PlanStep";
import { DesignStudio } from "./studio/DesignStudio";

export function Workspace() {
  const project = useWorkspace((s) => s.project)!;
  const saveState = useWorkspace((s) => s.saveState);
  const setStep = useWorkspace((s) => s.setStep);
  // projects saved by earlier versions may be on the retired "analysis" step
  const step = project.step === "analysis" ? "plan" : project.step;

  return (
    <div className={cn("flex min-h-dvh flex-col", step === "design" && "lg:h-dvh lg:overflow-hidden")}>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur print:hidden">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
          <Link
            href="/projects"
            className="flex h-8 items-center gap-1 rounded-md pr-2 pl-1 text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
            aria-label="Back to projects"
          >
            <ChevronLeft className="h-4 w-4" />
            <Wordmark className="hidden h-[15px] text-ink sm:block" />
          </Link>
          <span className="hidden h-5 w-px bg-line sm:block" />
          <div className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{project.name || "Untitled project"}</div>
          <SaveIndicator state={saveState} />
        </div>
        <Stepper current={step === "design" ? "plan" : step} onSelect={setStep} canOpenPlan={!!project.design} />
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        {step === "project" && <ProjectStep />}
        {step === "photos" && <PhotosStep />}
        {step === "space" && <SpaceStep />}
        {step === "needs" && <NeedsStep />}
        {step === "plan" && <PlanStep />}
        {step === "design" && <DesignStudio />}
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] text-muted" aria-live="polite">
      {state === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving
        </>
      )}
      {state === "saved" && (
        <>
          <Check className="h-3.5 w-3.5 text-ok" /> Saved
        </>
      )}
      {state === "error" && (
        <span className="flex items-center gap-1.5 text-danger">
          <CloudOff className="h-3.5 w-3.5" /> Not saved
        </span>
      )}
    </div>
  );
}

function Stepper({ current, onSelect, canOpenPlan }: { current: StepId; onSelect: (s: StepId) => void; canOpenPlan: boolean }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Design steps" className="overflow-x-auto px-3 sm:px-5">
      <ol className="flex h-11 min-w-max items-stretch gap-1">
        {STEPS.map((s, i) => {
          const active = s.id === current;
          const done = i < idx;
          const disabled = s.id === "plan" && !canOpenPlan && !active;
          return (
            <li key={s.id} className="flex items-center">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(s.id)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "relative flex h-full items-center gap-2 px-2.5 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  active ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border text-[10.5px] font-semibold tabular transition-colors",
                    active ? "border-ink bg-ink text-canvas" : done ? "border-ink-2/40 text-ink-2" : "border-line-strong",
                  )}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                {s.label}
                {active && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-ink" />}
              </button>
              {i < STEPS.length - 1 && <span className="mx-0.5 h-px w-4 bg-line-strong" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
