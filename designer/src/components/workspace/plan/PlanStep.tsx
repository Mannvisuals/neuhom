"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Download, ImageIcon, MessageCircle, Moon, PencilRuler, RefreshCw, TriangleAlert } from "lucide-react";
import { DEFAULT_CONFIG } from "@/lib/lighting";
import { Badge, Button, Panel, cn } from "@/components/ui/primitives";
import { analyseSpaceRuleBased } from "@/lib/design/analysis";
import { evaluateDesign } from "@/lib/design/evaluate";
import { generateDesign } from "@/lib/design/generate";
import { designInputs } from "@/lib/design/inputs";
import {
  FEATURE_WALL_SHORT,
  NEUHOM_WHATSAPP,
  brightnessWord,
  colourWord,
  describeLights,
  fittingList,
  planHeadline,
  whatsappMessage,
} from "@/lib/design/plainPlan";
import { formatLength, resolveProjectRoom } from "@/lib/design/room";
import { CONCEPTS, LAYERS, type Concept } from "@/lib/design/types";
import { spaceLabel } from "@/lib/project/options";
import { useWorkspace } from "@/lib/project/store";
import { useAssetUrl } from "@/lib/project/useAssetUrl";
import { NightPreview } from "./NightPreview";

const STYLE_CHOICES: Concept[] = ["tailored", "warm_cosy", "minimal_functional", "premium_architectural", "bright_contemporary"];
const STYLE_LABEL: Partial<Record<Concept, string>> = { tailored: "Made for you", minimal_functional: "Minimal", premium_architectural: "Premium", bright_contemporary: "Bright" };

const SOURCE: Record<string, string> = {
  neuhom_default: "Neuhom default",
  standard_guidance: "Standard",
  generic_model: "Generic model",
  photo_estimate: "From photo",
  user_estimate: "Your estimate",
};

export function PlanStep() {
  const p = useWorkspace((s) => s.project)!;
  const setDesign = useWorkspace((s) => s.setDesign);
  const saveVersion = useWorkspace((s) => s.saveVersion);
  const setStep = useWorkspace((s) => s.setStep);
  const design = p.design;
  const inputs = useMemo(() => designInputs(p), [p]);
  const stale = !!design && design.inputs !== undefined && design.inputs !== inputs;

  // Create the plan on arrival; refresh it automatically if inputs changed and the user hasn't edited it.
  useEffect(() => {
    if (!design) setDesign(generateDesign(p, "tailored"), "First plan");
    else if (stale && !design.edited) setDesign(generateDesign(p, design.concept));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, stale]);

  const [view, setView] = useState<"night" | "photo">("night");
  const [techOpen, setTechOpen] = useState(false);
  const room = useMemo(() => resolveProjectRoom(p), [p]);
  const metrics = useMemo(() => (design ? evaluateDesign(p, design) : null), [p, design]);
  const analysis = useMemo(() => analyseSpaceRuleBased(p), [p]);
  const photo = p.assets.find((a) => a.kind === "room_photo");
  const photoUrl = useAssetUrl(photo?.id);

  if (!design || !metrics) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 text-muted">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-ink" /> Creating your lighting plan…
      </div>
    );
  }

  const unit = p.space.unit;
  const lines = fittingList(design, p);
  const sentences = describeLights(design, p);
  const bright = brightnessWord(metrics.ambient.state, metrics.ambient.achievedLux, metrics.ambient.targetLux);
  const colour = colourWord(design.cct);
  const featureLabel = FEATURE_WALL_SHORT[p.spaceType] ?? "Feature wall";
  const waText = whatsappMessage(design, p, metrics, (m) => formatLength(m, unit));
  const waHref = `https://wa.me/${NEUHOM_WHATSAPP}?text=${encodeURIComponent(waText)}`;
  const std = DEFAULT_CONFIG.standards[p.spaceType];

  function chooseStyle(c: Concept) {
    if (!design || c === design.concept) return;
    if (design.edited && !confirm("Switch style? Your customised plan will be kept in Versions inside the editor.")) return;
    if (design.edited) saveVersion("Customised plan (before style change)");
    setDesign(generateDesign(p, c), `${CONCEPTS.find((x) => x.value === c)?.label} style`);
  }

  function refresh() {
    if (!design) return;
    saveVersion("Customised plan (before update)");
    setDesign(generateDesign(p, design.concept), "Updated from new room details");
  }

  return (
    <>
      <div className="flex-1">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-4 pt-8 pb-28 sm:px-8 sm:pt-12 print:max-w-none print:p-0">
          {/* ── Heading ── */}
          <div className="flex flex-col gap-3 animate-fade-up">
            <span className="eyebrow text-brass">Your lighting plan</span>
            <h1 className="max-w-[24ch] font-display text-[30px] leading-[1.12] tracking-[-0.01em] sm:text-[38px]">{planHeadline(design, p, metrics)}</h1>
            <p className="max-w-[62ch] text-[14.5px] leading-relaxed text-ink-2">
              Based on the details you shared about your {spaceLabel(p).toLowerCase()}. Try another style below, share it with our team, or customise every light yourself.
            </p>
          </div>

          {stale && design.edited && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-[13.5px] text-warn print:hidden">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              <span className="flex-1">You changed your room details after customising this plan.</span>
              <Button size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={refresh}>
                Update plan
              </Button>
            </div>
          )}

          {/* ── Style choice ── */}
          <div className="flex flex-col gap-2.5 print:hidden">
            <span className="text-[13px] font-medium text-ink-2">Style</span>
            <div role="radiogroup" aria-label="Lighting style" className="flex flex-wrap gap-2">
              {STYLE_CHOICES.map((c) => {
                const meta = CONCEPTS.find((x) => x.value === c)!;
                const active = design.concept === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    title={meta.description}
                    onClick={() => chooseStyle(c)}
                    className={cn(
                      "h-9 rounded-full border px-4 text-[13px] font-medium transition-colors",
                      active ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface text-ink-2 hover:text-ink",
                    )}
                  >
                    {STYLE_LABEL[c] ?? meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Preview + feel ── */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            <Panel className="overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5 print:hidden">
                <div className="flex gap-1">
                  <ViewTab active={view === "night"} onClick={() => setView("night")} icon={<Moon className="h-3.5 w-3.5" />}>
                    Lighting preview
                  </ViewTab>
                  {photo && (
                    <ViewTab active={view === "photo"} onClick={() => setView("photo")} icon={<ImageIcon className="h-3.5 w-3.5" />}>
                      Your photo
                    </ViewTab>
                  )}
                </div>
              </div>
              <div className="bg-[#15130f]">
                {view === "night" || !photoUrl ? (
                  <NightPreview
                    room={room}
                    fixtures={design.fixtures}
                    unit={unit}
                    windows={p.space.windows}
                    featureWall={p.space.featureWall}
                    featureLabel={featureLabel}
                    className="mx-auto block max-h-[460px] w-full"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="Your room" className="mx-auto block max-h-[460px] w-full object-contain" />
                )}
              </div>
              <p className="border-t border-line px-4 py-2.5 text-[12px] text-muted">
                {view === "night" || !photoUrl
                  ? "Top view of your room at night, showing where light falls. An illustration, not a photo-realistic render."
                  : "Your photo. A relit version of it will appear here once image generation is connected."}
              </p>
            </Panel>

            <div className="flex flex-col gap-6">
              <Panel className="divide-y divide-line">
                <Feel label="Brightness" value={bright.label} note={bright.note} tone={metrics.ambient.state === "ok" ? "ok" : "warn"} />
                <Feel label="Light colour" value={colour.label} note={colour.note} swatch={design.cct} />
                <Feel label="Electricity" value={`About ₹${(Math.round(metrics.annualCost / 100) * 100 || metrics.annualCost).toLocaleString("en-IN")} a year`} note={`${Math.round(metrics.connectedLoadW)} W when everything is on`} />
              </Panel>
              {metrics.quality.status === "preliminary" && (
                <div className="flex gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-[12.5px] leading-snug text-ink-2">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
                  <span>
                    Some room sizes were estimated, so quantities may change. <button type="button" onClick={() => setStep("space")} className="font-medium text-brass-ink underline-offset-2 hover:underline print:hidden">Add measurements</button>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── What the lights do ── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[17px] font-semibold">What each light does</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {sentences.map((s, i) => (
                <li key={i} className="flex gap-3 rounded-lg border border-line bg-surface px-4 py-3.5 text-[14px] leading-snug">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: LAYERS.find((l) => l.value === s.layer)!.color }} />
                  {s.text}
                </li>
              ))}
            </ul>
          </section>

          {/* ── Fitting list (BOQ, quantities only) ── */}
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-[17px] font-semibold">What you&apos;ll need</h2>
                <p className="mt-0.5 text-[13px] text-muted">Fitting list with quantities. Prices will be added with the Neuhom product catalogue.</p>
              </div>
              <Badge tone="neutral">{lines.length} items</Badge>
            </div>
            <Panel className="overflow-hidden">
              <table className="w-full text-left text-[13.5px]">
                <thead className="border-b border-line bg-paper text-[11.5px] uppercase tracking-[0.06em] text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Item</th>
                    <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Where</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {lines.map((l) => (
                    <tr key={l.key} className="align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-medium">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: LAYERS.find((x) => x.value === l.layer)!.color }} />
                          {l.name}
                        </div>
                        <div className="mt-0.5 pl-4 text-[12px] text-muted tabular">{l.spec}</div>
                        <div className="mt-0.5 pl-4 text-[12px] text-ink-2 sm:hidden">{l.where}</div>
                      </td>
                      <td className="hidden px-4 py-3 text-ink-2 sm:table-cell">{l.where}</td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular">{l.unit === "m" ? formatLength(l.quantity, unit) : `${l.quantity} ${l.quantity === 1 ? "pc" : "pcs"}`}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-line bg-paper text-[13px]">
                  <tr>
                    <td className="px-4 py-3 font-semibold" colSpan={1}>
                      Total
                    </td>
                    <td className="hidden sm:table-cell" />
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular">
                      {metrics.totalFixtures} pcs{metrics.totalLinearMetres ? ` + ${formatLength(metrics.totalLinearMetres, unit)}` : ""}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Panel>
            <p className="text-[12px] text-muted">
              Fittings are typical LED specifications used to size your plan; a Neuhom expert can match them to specific products.
            </p>
          </section>

          {/* ── Technical details (collapsed) ── */}
          <section className="rounded-lg border border-line bg-surface">
            <button type="button" onClick={() => setTechOpen((o) => !o)} aria-expanded={techOpen} className="flex w-full items-center justify-between px-5 py-4 text-left print:hidden">
              <span>
                <span className="block text-[14.5px] font-semibold">Technical details</span>
                <span className="block text-[12.5px] text-muted">Light levels, power and assumptions — for your electrician or designer</span>
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", techOpen && "rotate-180")} />
            </button>
            <div className={cn("border-t border-line px-5 py-5", !techOpen && "hidden print:block")}>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[13px] sm:grid-cols-4">
                <Tech label="Average light level" value={`${metrics.ambient.achievedLux} lux`} sub={`target ${metrics.ambient.targetLux}, range ${metrics.ambient.min}–${metrics.ambient.max}`} />
                <Tech label="Colour temperature" value={`${design.cct} K`} sub={`${std.cct.min}–${std.cct.max} K for this room`} />
                <Tech label="Connected load" value={`${Math.round(metrics.connectedLoadW)} W`} sub={`${metrics.lpdWPerM2} W/m²`} />
                <Tech label="Energy" value={`${Math.round(metrics.annualKWh)} kWh/yr`} sub={`≈ ₹${metrics.annualCost.toLocaleString("en-IN")} at ₹8/kWh`} />
              </dl>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <div className="mb-2 eyebrow">Installation notes</div>
                  <ul className="flex flex-col gap-1.5 text-[12.5px] leading-snug text-ink-2">
                    {analysis.considerations.map((c) => (
                      <li key={c} className="flex gap-2">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-2 eyebrow">Assumptions</div>
                  <ul className="flex flex-col divide-y divide-line text-[12.5px]">
                    {metrics.assumptions.map((a) => (
                      <li key={a.id} className="flex items-baseline justify-between gap-3 py-1.5">
                        <span className="text-ink-2">
                          {a.label}: <span className="tabular text-ink">{a.value}{a.unit ? ` ${a.unit}` : ""}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-muted">{SOURCE[a.source] ?? a.source}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-5 text-[11.5px] leading-snug text-muted">
                Estimated with the lumen method using generic data — not a photometric simulation. Plan based on the details entered; AI photo analysis is not connected.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="sticky bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur print:hidden">
        <div className="mx-auto flex min-h-16 max-w-[1120px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-8">
          <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep("needs")} className="hidden sm:inline-flex">
            Back
          </Button>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => window.print()}>
              <span className="hidden sm:inline">Download</span> PDF
            </Button>
            <Button variant="secondary" icon={<PencilRuler className="h-4 w-4" />} onClick={() => setStep("design")}>
              Customise
            </Button>
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" icon={<MessageCircle className="h-4 w-4" />}>
                Talk to a Neuhom expert
              </Button>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function ViewTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors", active ? "bg-sunken text-ink" : "text-muted hover:text-ink")}
    >
      {icon}
      {children}
    </button>
  );
}

function Feel({ label, value, note, tone, swatch }: { label: string; value: string; note: string; tone?: "ok" | "warn"; swatch?: number }) {
  return (
    <div className="flex items-start gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-muted">{label}</div>
        <div className={cn("mt-0.5 flex items-center gap-2 text-[19px] font-semibold tracking-[-0.01em]", tone === "warn" && "text-warn")}>
          {swatch && <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: swatch <= 2700 ? "#f3c27e" : swatch <= 3000 ? "#f6d9a8" : swatch <= 3500 ? "#f7e6c6" : "#f4efe4" }} />}
          {value}
        </div>
        <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{note}</div>
      </div>
    </div>
  );
}

function Tech({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <dt className="text-[11.5px] text-muted">{label}</dt>
      <dd className="text-[15px] font-semibold tabular">{value}</dd>
      <dd className="text-[11.5px] text-muted">{sub}</dd>
    </div>
  );
}
