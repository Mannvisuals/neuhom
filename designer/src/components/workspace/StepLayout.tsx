"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button, SectionHeading, cn } from "@/components/ui/primitives";

/** Shared layout for the guided steps: a calm form column, optional side panel, and a sticky action bar. */
export function StepLayout({
  eyebrow,
  title,
  description,
  children,
  aside,
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  nextHint,
  secondary,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextHint?: string;
  secondary?: ReactNode;
}) {
  return (
    <>
      <div className="flex-1">
        <div
          className={cn(
            "mx-auto grid gap-10 px-4 pt-8 pb-28 sm:px-8 sm:pt-12",
            aside ? "max-w-[1120px] lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14" : "max-w-[760px]",
          )}
        >
          <div className="flex min-w-0 flex-col gap-9 animate-fade-up">
            <SectionHeading eyebrow={eyebrow} title={title} description={description} />
            {children}
          </div>
          {aside && <aside className="lg:sticky lg:top-36 lg:self-start">{aside}</aside>}
        </div>
      </div>
      <div className="sticky bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-8">
          <div>
            {onBack && (
              <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {nextHint && <span className="hidden text-[12.5px] text-muted sm:block">{nextHint}</span>}
            {secondary}
            {onNext && (
              <Button variant="primary" onClick={onNext} disabled={nextDisabled}>
                {nextLabel} <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** A labelled group of related fields. */
export function FormSection({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-7 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description && <p className="text-[13px] leading-snug text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
