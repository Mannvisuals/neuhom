"use client";

import { DEFAULT_CONFIG } from "@/lib/lighting";
import { Chip, ChoiceTile, Panel, Segmented, cn } from "@/components/ui/primitives";
import { resolvePreferences } from "@/lib/design/preferences";
import { ACTIVITIES, AMBIENCES, BUDGETS, FIXTURE_TYPES, fixtureLabel, spaceLabel } from "@/lib/project/options";
import { useWorkspace } from "@/lib/project/store";
import type { Activity, CctPreference, FixtureType, Requirements } from "@/lib/project/types";
import { FormSection, StepLayout } from "../StepLayout";

const CCT: { value: CctPreference; label: string; swatch?: string }[] = [
  { value: "auto", label: "Recommend" },
  { value: 2700, label: "Warm 2700 K", swatch: "#f3c27e" },
  { value: 3000, label: "Soft 3000 K", swatch: "#f6d9a8" },
  { value: 4000, label: "Neutral 4000 K", swatch: "#f4efe4" },
];

export function NeedsStep() {
  const p = useWorkspace((s) => s.project)!;
  const update = useWorkspace((s) => s.update);
  const setStep = useWorkspace((s) => s.setStep);
  const r = p.requirements;
  const set = (patch: Partial<Requirements>) => update((x) => ({ ...x, requirements: { ...x.requirements, ...patch } }));
  const std = DEFAULT_CONFIG.standards[p.spaceType];
  const prefs = resolvePreferences(p, "tailored");

  const toggleFixture = (t: FixtureType) => set({ fixtures: r.fixtures.includes(t) ? r.fixtures.filter((x) => x !== t) : [...r.fixtures, t] });
  const toggleActivity = (a: Activity) => set({ activities: r.activities.includes(a) ? r.activities.filter((x) => x !== a) : [...r.activities, a] });

  return (
    <StepLayout
      eyebrow="Step 4 of 5"
      title="How should it feel?"
      description="Choose the mood and how you'll use the space. Sensible defaults are already selected."
      onBack={() => setStep("space")}
      onNext={() => setStep("plan")}
      nextLabel="See my lighting plan"
      nextDisabled={!r.autoFixtures && r.fixtures.length === 0}
      nextHint={!r.autoFixtures && r.fixtures.length === 0 ? "Pick at least one fitting, or let Neuhom choose" : undefined}
      aside={
        <Panel className="p-5">
          <span className="eyebrow">What this means</span>
          <dl className="mt-4 flex flex-col gap-4 text-[13px]">
            <div>
              <dt className="text-muted">General light for a {spaceLabel(p).toLowerCase()}</dt>
              <dd className="mt-0.5 text-[20px] font-semibold tabular">
                {std.ambient.min}–{std.ambient.max} <span className="text-[13px] font-normal text-muted">lux</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted">Colour temperature</dt>
              <dd className="mt-0.5 flex items-center gap-2 text-[20px] font-semibold tabular">
                <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: prefs.cct <= 2700 ? "#f3c27e" : prefs.cct <= 3000 ? "#f6d9a8" : prefs.cct <= 3500 ? "#f7e6c6" : "#f4efe4" }} />
                {prefs.cct} K
              </dd>
            </div>
            <div>
              <dt className="text-muted">Likely fittings</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {prefs.types.map((t) => (
                  <span key={t} className="rounded-sm bg-sunken px-1.5 py-0.5 text-[12px] font-medium text-ink-2">
                    {fixtureLabel(t)}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
          <p className="mt-5 border-t border-line pt-3 text-[12px] leading-snug text-muted">{std.reference}</p>
        </Panel>
      }
    >
      <FormSection title="Ambience">
        <div role="radiogroup" aria-label="Ambience" className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {AMBIENCES.map((a) => (
            <ChoiceTile
              key={a.value}
              selected={r.ambience === a.value}
              title={a.label}
              description={a.description}
              icon={<span className="block h-6 w-6 rounded-full border border-black/10 shadow-[0_0_14px_2px_var(--glow)]" style={{ background: a.tone, ["--glow" as string]: `${a.tone}99` }} />}
              onClick={() => set({ ambience: a.value })}
            />
          ))}
        </div>
      </FormSection>

      <FormSection title="Light colour and brightness">
        <div role="radiogroup" aria-label="Colour temperature" className="flex flex-wrap gap-2">
          {CCT.map((c) => (
            <button
              key={String(c.value)}
              type="button"
              role="radio"
              aria-checked={r.cct === c.value}
              onClick={() => set({ cct: c.value })}
              className={cn(
                "flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-medium transition-colors",
                r.cct === c.value ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface text-ink-2 hover:text-ink",
              )}
            >
              {c.swatch && <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: c.swatch }} />}
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-20 text-[13px] text-ink-2">Brightness</span>
          <Segmented
            ariaLabel="Brightness"
            value={r.brightness}
            onChange={(v) => set({ brightness: v })}
            options={[
              { value: "soft", label: "Soft" },
              { value: "balanced", label: "Balanced" },
              { value: "bright", label: "Bright" },
            ]}
          />
        </div>
      </FormSection>

      <FormSection title="How will you use it?" description="Adds focused light where it's needed.">
        <div className="flex flex-wrap gap-2">
          {ACTIVITIES.map((a) => (
            <Chip key={a.value} active={r.activities.includes(a.value)} onClick={() => toggleActivity(a.value)}>
              {a.label}
            </Chip>
          ))}
        </div>
      </FormSection>

      <FormSection title="Budget">
        <div role="radiogroup" aria-label="Budget" className="grid gap-2.5 sm:grid-cols-3">
          {BUDGETS.map((b) => (
            <ChoiceTile key={b.value} selected={r.budget === b.value} title={b.label} description={b.description} onClick={() => set({ budget: b.value })} />
          ))}
        </div>
      </FormSection>

      <FormSection title="Preferred fittings">
        <Segmented
          ariaLabel="Fixture selection"
          value={r.autoFixtures ? "auto" : "manual"}
          onChange={(v) => set({ autoFixtures: v === "auto" })}
          options={[
            { value: "auto", label: "Let Neuhom recommend" },
            { value: "manual", label: "I'll choose" },
          ]}
          className="w-full sm:w-auto"
        />
        {!r.autoFixtures && (
          <div className="flex flex-wrap gap-2 animate-fade-up">
            {FIXTURE_TYPES.map((f) => (
              <Chip key={f.value} active={r.fixtures.includes(f.value)} onClick={() => toggleFixture(f.value)}>
                {f.label}
              </Chip>
            ))}
          </div>
        )}
      </FormSection>
    </StepLayout>
  );
}
