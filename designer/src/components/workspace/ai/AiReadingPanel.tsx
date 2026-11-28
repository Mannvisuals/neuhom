"use client";

import { useMemo, useState } from "react";
import { Check, Lightbulb, Loader2, RefreshCw, Ruler, ScanSearch, Sparkles, TriangleAlert } from "lucide-react";
import { Badge, Button, Panel, cn } from "@/components/ui/primitives";
import { analyseProject } from "@/lib/ai/client";
import { applyPlanSize, buildSuggestions, planSizes } from "@/lib/ai/suggestions";
import type { AnalyseResponse } from "@/lib/ai/roomReading";
import { formatLength } from "@/lib/design/room";
import { useWorkspace } from "@/lib/project/store";

type ErrorState = Extract<AnalyseResponse, { ok: false }>;

const CONF: Record<string, { label: string; tone: "ok" | "neutral" | "warn" }> = {
  high: { label: "Clear", tone: "ok" },
  medium: { label: "Likely", tone: "neutral" },
  low: { label: "Unsure", tone: "warn" },
};

export function AiReadingPanel() {
  const p = useWorkspace((s) => s.project)!;
  const update = useWorkspace((s) => s.update);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const stored = p.aiReading ?? null;
  const reading = stored?.reading;

  const suggestions = useMemo(() => (reading ? buildSuggestions(reading, p) : []), [reading, p]);
  const sizes = useMemo(() => (reading ? planSizes(reading) : []), [reading]);
  const pending = suggestions.filter((s) => !stored?.applied.includes(s.key) && !stored?.dismissed.includes(s.key));
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const selected = picked ?? new Set(pending.filter((s) => s.recommended).map((s) => s.key));
  const hasFiles = p.assets.length > 0;

  async function run() {
    setBusy(true);
    setError(null);
    const res = await analyseProject(p);
    setBusy(false);
    if (!res.ok) {
      setError(res);
      return;
    }
    setPicked(null);
    update((x) => ({
      ...x,
      aiReading: { reading: res.reading, model: res.model, createdAt: Date.now(), imageCount: res.imageCount ?? 0, applied: [], dismissed: [] },
    }));
  }

  function applySelected() {
    const chosen = pending.filter((s) => selected.has(s.key));
    const skipped = pending.filter((s) => !selected.has(s.key)).map((s) => s.key);
    update((x) => {
      const next = chosen.reduce((acc, s) => s.apply(acc), x);
      const prev = x.aiReading!;
      return { ...next, aiReading: { ...prev, applied: [...prev.applied, ...chosen.map((s) => s.key)], dismissed: [...prev.dismissed, ...skipped] } };
    });
    setPicked(null);
  }

  function useSize(key: string) {
    const s = sizes.find((z) => z.key === key);
    if (!s) return;
    update((x) => ({ ...applyPlanSize(x, s), aiReading: { ...x.aiReading!, applied: [...x.aiReading!.applied, key] } }));
  }

  if (!hasFiles) return null;

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brass-soft text-brass-ink">
            <ScanSearch className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[15px] font-semibold">{reading ? "What we noticed" : "Let Neuhom look at your photos"}</div>
            <p className="mt-0.5 max-w-[52ch] text-[12.5px] leading-snug text-muted">
              {reading
                ? `From ${stored!.imageCount} image${stored!.imageCount === 1 ? "" : "s"}. Check each suggestion — nothing changes until you accept it.`
                : "AI reads your photos and floor plan to suggest the ceiling, finishes and features to light. It never guesses sizes from photos."}
            </p>
          </div>
        </div>
        <Button
          variant={reading ? "ghost" : "primary"}
          size="sm"
          onClick={run}
          disabled={busy}
          icon={busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : reading ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        >
          {busy ? "Analysing…" : reading ? "Analyse again" : "Analyse my photos"}
        </Button>
      </div>

      {busy && (
        <div className="flex items-center gap-3 px-5 py-4 text-[13px] text-ink-2">
          <Loader2 className="h-4 w-4 animate-spin text-brass" />
          Looking at the ceiling, walls, floor and features… this takes about 20–40 seconds.
        </div>
      )}

      {error && !busy && (
        <div className="flex gap-2.5 px-5 py-4 text-[13px] leading-snug">
          <TriangleAlert className={cn("mt-0.5 h-4 w-4 shrink-0", error.code === "not_configured" ? "text-muted" : "text-warn")} />
          <span className="text-ink-2">
            {error.code === "not_configured" ? "AI analysis isn't switched on yet — you can fill in the details yourself in the next step." : error.message}
          </span>
        </div>
      )}

      {reading && !busy && (
        <div className="flex flex-col divide-y divide-line">
          {reading.observations.length > 0 && (
            <ul className="flex flex-col gap-2 px-5 py-4">
              {reading.observations.map((o, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-snug">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />
                  <span className="flex-1">{o.text}</span>
                  <Badge tone={CONF[o.confidence]!.tone}>{CONF[o.confidence]!.label}</Badge>
                </li>
              ))}
            </ul>
          )}

          {sizes.length > 0 && (
            <div className="px-5 py-4">
              <div className="mb-2 flex items-center gap-2 eyebrow">
                <Ruler className="h-3.5 w-3.5" /> Sizes written on your floor plan
              </div>
              <ul className="flex flex-col gap-2">
                {sizes.map((s) => {
                  const used = stored!.applied.includes(s.key);
                  return (
                    <li key={s.key} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-[13px]">
                      <span>
                        <span className="font-medium">{s.name}</span>{" "}
                        <span className="text-muted">
                          — “{s.writtenAs}” → {formatLength(s.lengthM, p.space.unit)} × {formatLength(s.widthM, p.space.unit)}
                        </span>
                      </span>
                      {used ? (
                        <span className="flex items-center gap-1 text-[12.5px] font-medium text-ok">
                          <Check className="h-3.5 w-3.5" /> Used
                        </span>
                      ) : (
                        <Button size="sm" onClick={() => useSize(s.key)}>
                          Use these sizes
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[11.5px] text-muted">Read from the text on the drawing. Please check they match your room.</p>
            </div>
          )}

          {pending.length > 0 && (
            <div className="px-5 py-4">
              <div className="mb-2 eyebrow">Suggested details</div>
              <ul className="flex flex-col gap-1.5">
                {pending.map((s) => {
                  const on = selected.has(s.key);
                  return (
                    <li key={s.key}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-sunken">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => {
                            const n = new Set(selected);
                            if (on) n.delete(s.key);
                            else n.add(s.key);
                            setPicked(n);
                          }}
                          className="mt-1 h-3.5 w-3.5 accent-[var(--color-ink)]"
                        />
                        <span className="flex-1 text-[13px] leading-snug">
                          <span className="font-medium">{s.label}:</span> <span className="text-ink-2">{s.value}</span>
                        </span>
                        <Badge tone={CONF[s.confidence]!.tone}>{CONF[s.confidence]!.label}</Badge>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <Button size="sm" variant="primary" className="mt-3" onClick={applySelected} icon={<Check className="h-3.5 w-3.5" />}>
                {selected.size ? `Use ${selected.size} selected` : "Dismiss these"}
              </Button>
            </div>
          )}

          {stored!.applied.length > 0 && pending.length === 0 && (
            <div className="flex items-center gap-2 px-5 py-3 text-[12.5px] text-ok">
              <Check className="h-3.5 w-3.5" /> Suggestions applied — you can review them in the next step.
            </div>
          )}

          {reading.suggestions.length > 0 && (
            <div className="px-5 py-4">
              <div className="mb-2 eyebrow">Lighting ideas for this room</div>
              <ul className="flex flex-col gap-1.5">
                {reading.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass" />
                    {s.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="border-t border-line bg-paper px-5 py-2.5 text-[11.5px] leading-snug text-muted">
        Photos are sent securely to our AI provider (Anthropic) only when you press Analyse, and are not used to train AI models.
      </p>
    </Panel>
  );
}
