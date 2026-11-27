"use client";

import { Bath, BedDouble, Briefcase, Building2, CookingPot, Flower2, Hammer, Hotel, Shapes, ShoppingBag, Sofa, UtensilsCrossed } from "lucide-react";
import type { SpaceType } from "@/lib/lighting";
import { ChoiceTile, Field, TextInput, cn } from "@/components/ui/primitives";
import { CITIES, PROJECT_KINDS, SPACE_TYPES, STYLES, defaultRequirements } from "@/lib/project/options";
import { useWorkspace } from "@/lib/project/store";
import { FormSection, StepLayout } from "../StepLayout";

const SPACE_ICONS: Record<SpaceType, typeof Sofa> = {
  living_room: Sofa,
  bedroom: BedDouble,
  kitchen: CookingPot,
  dining_room: UtensilsCrossed,
  bathroom: Bath,
  balcony: Flower2,
  office: Briefcase,
  retail: ShoppingBag,
  hospitality: Hotel,
  custom: Shapes,
};

export function ProjectStep() {
  const p = useWorkspace((s) => s.project)!;
  const update = useWorkspace((s) => s.update);
  const setStep = useWorkspace((s) => s.setStep);

  const nameMissing = !p.name.trim();
  const customMissing = p.spaceType === "custom" && !p.customSpaceName?.trim();

  return (
    <StepLayout
      eyebrow="Step 1 of 6"
      title="Start a new lighting project"
      description="A few basics so Neuhom can apply the right lighting guidance for this space."
      onNext={() => setStep("photos")}
      nextDisabled={nameMissing || customMissing}
      nextHint={nameMissing ? "Give the project a name to continue" : undefined}
    >
      <FormSection title="Project">
        <Field label="Project name" htmlFor="name" hint="For example “Sharma residence — living room”.">
          <TextInput
            id="name"
            autoFocus
            value={p.name}
            placeholder="Name this project"
            maxLength={80}
            onChange={(e) => update((x) => ({ ...x, name: e.target.value }))}
          />
        </Field>
      </FormSection>

      <FormSection title="Type of space" description="Each space type has its own recommended light levels.">
        <div role="radiogroup" aria-label="Type of space" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
          {SPACE_TYPES.map((s) => {
            const Icon = SPACE_ICONS[s.value];
            return (
              <ChoiceTile
                key={s.value}
                selected={p.spaceType === s.value}
                title={s.label}
                description={s.hint}
                icon={<Icon className="h-5 w-5" strokeWidth={1.5} />}
                onClick={() =>
                  update((x) =>
                    x.spaceType === s.value
                      ? x
                      : { ...x, spaceType: s.value, requirements: { ...defaultRequirements(s.value), budget: x.requirements.budget } },
                  )
                }
              />
            );
          })}
        </div>
        {p.spaceType === "custom" && (
          <Field label="What is this space?" htmlFor="custom">
            <TextInput
              id="custom"
              value={p.customSpaceName ?? ""}
              placeholder="e.g. Pooja room, home theatre, studio"
              onChange={(e) => update((x) => ({ ...x, customSpaceName: e.target.value }))}
            />
          </Field>
        )}
      </FormSection>

      <FormSection title="Design style">
        <div role="radiogroup" aria-label="Design style" className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={p.style === s.value}
              onClick={() => update((x) => ({ ...x, style: s.value }))}
              className={cn(
                "h-9 rounded-md border px-4 text-[13px] font-medium transition-colors",
                p.style === s.value ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface text-ink-2 hover:text-ink",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection title="Location and project type">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="City" htmlFor="city" optional hint="Used later for product availability and pricing.">
            <TextInput
              id="city"
              list="cities"
              value={p.city}
              placeholder="Start typing a city"
              onChange={(e) => update((x) => ({ ...x, city: e.target.value }))}
            />
            <datalist id="cities">
              {CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>
        <div role="radiogroup" aria-label="Project type" className="grid gap-2.5 sm:grid-cols-2">
          {PROJECT_KINDS.map((k) => (
            <ChoiceTile
              key={k.value}
              selected={p.kind === k.value}
              title={k.label}
              description={k.hint}
              icon={k.value === "new_construction" ? <Building2 className="h-5 w-5" strokeWidth={1.5} /> : <Hammer className="h-5 w-5" strokeWidth={1.5} />}
              onClick={() => update((x) => ({ ...x, kind: k.value }))}
            />
          ))}
        </div>
      </FormSection>
    </StepLayout>
  );
}
