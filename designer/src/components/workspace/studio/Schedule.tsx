"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/components/ui/primitives";
import { fixtureLength } from "@/lib/design/types";
import { LAYERS, type Layer, type PlacedFixture } from "@/lib/design/types";
import { formatLength } from "@/lib/design/room";
import { fixtureLabel } from "@/lib/project/options";
import type { Unit } from "@/lib/project/types";
import { FixtureGlyph } from "./FixtureSymbol";
import { groupFixtures } from "./fixtureOps";

export function LayerToggles({
  visible,
  counts,
  onToggle,
  onAll,
}: {
  visible: Set<Layer>;
  counts: Record<Layer, number>;
  onToggle: (l: Layer) => void;
  onAll: () => void;
}) {
  const all = visible.size === LAYERS.length;
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lighting layers">
      <button
        type="button"
        aria-pressed={all}
        onClick={onAll}
        className={cn(
          "h-7 rounded-full border px-3 text-[12px] font-medium transition-colors",
          all ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface text-ink-2 hover:text-ink",
        )}
      >
        All
      </button>
      {LAYERS.map((l) => {
        const on = visible.has(l.value);
        return (
          <button
            key={l.value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(l.value)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors",
              on ? "border-line-strong bg-surface text-ink" : "border-dashed border-line-strong bg-transparent text-faint",
            )}
          >
            <span className="h-2 w-2 rounded-full transition-opacity" style={{ background: l.color, opacity: on ? 1 : 0.35 }} />
            {l.label}
            <span className="tabular text-muted">{counts[l.value]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Schedule({
  fixtures,
  unit,
  selectedId,
  onSelect,
  onResize,
}: {
  fixtures: PlacedFixture[];
  unit: Unit;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** set the number of fittings in a group; the group is re-spaced evenly */
  onResize: (items: PlacedFixture[], n: number) => void;
}) {
  const groups = groupFixtures(fixtures);
  if (!fixtures.length) {
    return <p className="px-1 text-[12.5px] text-muted">No fittings yet. Use “Add fitting” to place one.</p>;
  }
  return (
    <div className="flex flex-col gap-5">
      {LAYERS.map((layer) => {
        const gs = groups.filter((g) => g.layer === layer.value);
        if (!gs.length) return null;
        return (
          <div key={layer.value}>
            <div className="mb-1.5 flex items-center gap-2 px-1 eyebrow">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: layer.color }} />
              {layer.label}
            </div>
            <ul className="flex flex-col gap-1">
              {gs.map((g) => {
                const first = g.items[0]!;
                const selected = g.items.some((i) => i.id === selectedId);
                const qty = g.linear ? formatLength(g.items.reduce((s, i) => s + fixtureLength(i), 0), unit) : `× ${g.items.length}`;
                return (
                  <li
                    key={g.key}
                    className={cn(
                      "group rounded-md border transition-colors",
                      selected ? "border-line-strong bg-surface shadow-panel" : "border-transparent hover:bg-surface/70",
                    )}
                  >
                    <div className="flex items-center gap-2.5 px-2 py-2">
                      <button type="button" onClick={() => onSelect(first.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                        <FixtureGlyph type={g.type} color={layer.color} linear={g.linear} />
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-medium">{fixtureLabel(g.type)}</span>
                          <span className="block truncate text-[11.5px] text-muted tabular">
                            {first.lumens} lm{g.linear ? "/m" : ""} · {first.watts} W{g.linear ? "/m" : ""}
                            {!g.linear && ` · ${first.beamAngle}°`} · {first.cct} K
                          </span>
                        </span>
                      </button>
                      <span className="shrink-0 text-[12.5px] font-semibold tabular">{qty}</span>
                      {!g.linear && (
                        <span className="flex shrink-0 items-center rounded-md border border-line bg-surface">
                          <button type="button" aria-label={`Remove one ${fixtureLabel(g.type)}`} onClick={() => onResize(g.items, g.items.length - 1)} className="flex h-6 w-6 items-center justify-center text-ink-2 hover:text-ink">
                            <Minus className="h-3 w-3" />
                          </button>
                          <button type="button" aria-label={`Add one ${fixtureLabel(g.type)}`} onClick={() => onResize(g.items, g.items.length + 1)} className="flex h-6 w-6 items-center justify-center border-l border-line text-ink-2 hover:text-ink">
                            <Plus className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 px-2 pb-2 pl-[38px]">
                      {g.items.map((i) => (
                        <button
                          key={i.id}
                          type="button"
                          onClick={() => onSelect(i.id)}
                          className={cn(
                            "rounded-[3px] px-1 text-[10.5px] font-semibold tabular transition-colors",
                            i.id === selectedId ? "bg-ink text-canvas" : "bg-sunken text-ink-2 hover:text-ink",
                          )}
                        >
                          {i.code}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
