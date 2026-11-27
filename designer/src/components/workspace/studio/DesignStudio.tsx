"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Map as MapIcon, Image as ImageIcon, Plus, Undo2, Wand2 } from "lucide-react";
import { Button, IconButton, Segmented, Switch, cn } from "@/components/ui/primitives";
import { evaluateDesign } from "@/lib/design/evaluate";
import { generateDesign } from "@/lib/design/generate";
import { LINEAR_TYPES } from "@/lib/design/reference";
import { resolveProjectRoom } from "@/lib/design/room";
import { CONCEPTS, LAYERS, type Concept, type Layer, type PlacedFixture } from "@/lib/design/types";
import { FIXTURE_TYPES } from "@/lib/project/options";
import { useWorkspace } from "@/lib/project/store";
import type { FixtureType } from "@/lib/project/types";
import { Inspector } from "./Inspector";
import { PlanCanvas } from "./PlanCanvas";
import { PhotoView } from "./PhotoView";
import { LayerToggles, Schedule } from "./Schedule";
import { SummaryPanel } from "./SummaryPanel";
import { createFixture, duplicateFixture, moveFixture, recode } from "./fixtureOps";

const FEATURE_LABEL: Record<string, string> = {
  living_room: "TV / feature wall",
  bedroom: "Bed wall",
  kitchen: "Counter wall",
  bathroom: "Vanity wall",
  retail: "Display wall",
};

export function DesignStudio() {
  const p = useWorkspace((s) => s.project)!;
  const selectedId = useWorkspace((s) => s.selectedId);
  const select = useWorkspace((s) => s.select);
  const updateFixtures = useWorkspace((s) => s.updateFixtures);
  const checkpoint = useWorkspace((s) => s.checkpoint);
  const undo = useWorkspace((s) => s.undo);
  const canUndo = useWorkspace((s) => s.past.length > 0);
  const setDesign = useWorkspace((s) => s.setDesign);
  const saveVersion = useWorkspace((s) => s.saveVersion);
  const restoreVersion = useWorkspace((s) => s.restoreVersion);
  const setStep = useWorkspace((s) => s.setStep);

  // Generate a first design if the user arrives here without one.
  useEffect(() => {
    if (!p.design) setDesign(generateDesign(p, "tailored"), "First design");
  }, [p, setDesign]);

  const [tab, setTab] = useState<"plan" | "photos">("plan");
  const [visible, setVisible] = useState<Set<Layer>>(new Set(LAYERS.map((l) => l.value)));
  const [showPools, setShowPools] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [conceptOpen, setConceptOpen] = useState(false);

  const room = useMemo(() => resolveProjectRoom(p), [p]);
  const design = p.design;
  const metrics = useMemo(() => (design ? evaluateDesign(p, design) : null), [p, design]);
  const selected = design?.fixtures.find((f) => f.id === selectedId) ?? null;
  const warnIds = useMemo(() => new Set((metrics?.warnings ?? []).filter((w) => w.severity === "warning" && w.fixtureId).map((w) => w.fixtureId!)), [metrics]);

  // ── edit operations (each discrete edit is undoable) ──
  const edit = useCallback(
    (fn: (fs: PlacedFixture[]) => PlacedFixture[]) => {
      checkpoint();
      updateFixtures((fs) => recode(fn(fs)));
    },
    [checkpoint, updateFixtures],
  );
  const replace = (next: PlacedFixture) => edit((fs) => fs.map((f) => (f.id === next.id ? next : f)));
  const remove = (id: string) => {
    edit((fs) => fs.filter((f) => f.id !== id));
    if (selectedId === id) select(null);
  };
  const duplicate = (f: PlacedFixture) => {
    const copy = duplicateFixture(f, room);
    edit((fs) => [...fs, copy]);
    select(copy.id);
  };
  const add = (type: FixtureType) => {
    const f = createFixture(type, room, design?.cct ?? 3000, design?.fixtures[0]?.cri ?? 90);
    edit((fs) => [...fs, f]);
    select(f.id);
    setAddOpen(false);
    setTab("plan");
    setVisible((v) => new Set([...v, f.layer]));
  };
  const onMove = useCallback(
    (id: string, dx: number, dy: number) => updateFixtures((fs) => fs.map((f) => (f.id === id ? moveFixture(f, dx, dy, room) : f))),
    [updateFixtures, room],
  );

  function applyConcept(c: Concept) {
    setConceptOpen(false);
    if (design?.edited && !confirm("Replace the current design with a new concept? Your current design will be kept in Versions.")) return;
    if (design) saveVersion(design.edited ? "Edited design (before new concept)" : `${CONCEPTS.find((x) => x.value === design.concept)?.label} concept`);
    setDesign(generateDesign(p, c), `${CONCEPTS.find((x) => x.value === c)?.label} concept`);
  }

  // ── keyboard ──
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("input, select, textarea, [contenteditable]")) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
      return;
    }
    if (!selected) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(selected.id);
    } else if (e.key === "Escape") {
      select(null);
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      duplicate(selected);
    } else if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const step = e.shiftKey ? 0.25 : 0.05;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      checkpoint();
      onMove(selected.id, dx, dy);
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!design || !metrics) {
    return <div className="flex flex-1 items-center justify-center text-muted">Generating design…</div>;
  }

  const counts = metrics.counts;
  const concept = CONCEPTS.find((c) => c.value === design.concept)!;
  const roomPhotos = p.assets.filter((a) => a.kind === "room_photo");
  const toggleLayer = (l: Layer) =>
    setVisible((v) => {
      const n = new Set(v);
      if (n.has(l)) n.delete(l);
      else n.add(l);
      return n;
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[272px_minmax(0,1fr)_336px]">
      {/* ── Left: layers & schedule ── */}
      <aside className="order-3 flex min-h-0 flex-col border-line bg-canvas lg:order-1 lg:border-r">
        <div className="border-b border-line p-4">
          <div className="mb-2.5 eyebrow">Layers</div>
          <LayerToggles visible={visible} counts={counts} onToggle={toggleLayer} onAll={() => setVisible(new Set(LAYERS.map((l) => l.value)))} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="eyebrow">Fitting schedule</span>
            <span className="text-[11.5px] text-muted tabular">{metrics.totalFixtures} items</span>
          </div>
          <Schedule
            fixtures={design.fixtures.filter((f) => visible.has(f.layer))}
            unit={p.space.unit}
            selectedId={selectedId}
            onSelect={(id) => {
              select(id);
              setTab("plan");
            }}
            onAddLike={duplicate}
            onRemoveOne={(f) => remove(f.id)}
          />
        </div>
      </aside>

      {/* ── Centre: toolbar + canvas ── */}
      <section className="order-1 flex min-w-0 flex-col lg:order-2 lg:min-h-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper px-3 py-2">
          <Segmented
            size="sm"
            ariaLabel="View"
            value={tab}
            onChange={setTab}
            options={[
              { value: "plan", label: <span className="flex items-center gap-1.5"><MapIcon className="h-3.5 w-3.5" />Plan</span> },
              { value: "photos", label: <span className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" />Photos</span> },
            ]}
          />
          <div className="relative">
            <Button size="sm" variant="secondary" onClick={() => setConceptOpen((o) => !o)} aria-expanded={conceptOpen} icon={<Wand2 className="h-3.5 w-3.5 text-brass" />}>
              {concept.label}
              <ChevronDown className="h-3.5 w-3.5 text-muted" />
            </Button>
            {conceptOpen && (
              <Menu onClose={() => setConceptOpen(false)}>
                <div className="px-3 pt-2 pb-1 eyebrow">Design concepts</div>
                {CONCEPTS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => applyConcept(c.value)}
                    className={cn("flex w-full flex-col rounded px-3 py-2 text-left hover:bg-sunken", c.value === design.concept && "bg-sunken")}
                  >
                    <span className="text-[13px] font-medium">{c.label}</span>
                    <span className="text-[11.5px] text-muted">{c.description}</span>
                  </button>
                ))}
              </Menu>
            )}
          </div>
          <div className="relative">
            <Button size="sm" variant="primary" onClick={() => setAddOpen((o) => !o)} aria-expanded={addOpen} icon={<Plus className="h-3.5 w-3.5" />}>
              Add fitting
            </Button>
            {addOpen && (
              <Menu onClose={() => setAddOpen(false)} wide>
                <div className="grid grid-cols-2 gap-0.5 p-1">
                  {FIXTURE_TYPES.map((t) => (
                    <button key={t.value} type="button" onClick={() => add(t.value)} className="rounded px-2.5 py-2 text-left text-[12.5px] hover:bg-sunken">
                      {t.short}
                      {LINEAR_TYPES.includes(t.value) && <span className="text-muted"> · linear</span>}
                    </button>
                  ))}
                </div>
              </Menu>
            )}
          </div>
          <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
            <Undo2 className="h-4 w-4" />
          </IconButton>
          <div className="ml-auto flex items-center gap-4">
            <Switch checked={showPools} onChange={setShowPools} label="Light pools" />
            <span className="hidden sm:block">
              <Switch checked={showLabels} onChange={setShowLabels} label="Labels" />
            </span>
          </div>
        </div>
        <div className="relative h-[64vh] min-h-[380px] lg:h-auto lg:min-h-0 lg:flex-1">
          {tab === "plan" ? (
            <PlanCanvas
              room={room}
              unit={p.space.unit}
              fixtures={design.fixtures}
              visible={visible}
              showPools={showPools}
              showLabels={showLabels}
              windows={p.space.windows}
              featureWall={p.space.featureWall}
              featureLabel={FEATURE_LABEL[p.spaceType] ?? "Feature wall"}
              selectedId={selectedId}
              warnIds={warnIds}
              onSelect={select}
              onDragStart={checkpoint}
              onMove={onMove}
            />
          ) : (
            <PhotoView photos={roomPhotos} concept={design.concept} onAddPhotos={() => setStep("photos")} />
          )}
        </div>
      </section>

      {/* ── Right: inspector / summary ── */}
      <aside className="order-2 min-h-0 overflow-y-auto border-line bg-surface lg:order-3 lg:border-l">
        {selected ? (
          <Inspector
            key={selected.id}
            f={selected}
            room={room}
            unit={p.space.unit}
            onChange={replace}
            onDuplicate={() => duplicate(selected)}
            onDelete={() => remove(selected.id)}
            onClose={() => select(null)}
            onApplyCctToAll={(cct) => edit((fs) => fs.map((f) => ({ ...f, cct })))}
          />
        ) : (
          <SummaryPanel
            m={metrics}
            design={design}
            versions={p.versions}
            onSelectFixture={(id) => select(id)}
            onSaveVersion={() => saveVersion(`Saved ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`)}
            onRestore={restoreVersion}
          />
        )}
      </aside>
    </div>
  );
}

function Menu({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest("[aria-expanded]")) onClose();
    };
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", h);
    window.addEventListener("keydown", k);
    return () => {
      window.removeEventListener("pointerdown", h);
      window.removeEventListener("keydown", k);
    };
  }, [onClose]);
  return (
    <div ref={ref} className={cn("absolute left-0 top-full z-40 mt-1.5 rounded-lg border border-line bg-surface p-1 shadow-pop animate-fade-up", wide ? "w-[300px]" : "w-[260px]")}>
      {children}
    </div>
  );
}
