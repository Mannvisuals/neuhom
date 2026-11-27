"use client";

import { create } from "zustand";
import { newId } from "@/lib/design/generate";
import type { Design, PlacedFixture } from "@/lib/design/types";
import { defaultRequirements, defaultSpace } from "./options";
import { repository } from "./repository";
import type { Project, StepId } from "./types";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface WorkspaceState {
  project: Project | null;
  loading: boolean;
  notFound: boolean;
  saveState: SaveState;
  selectedId: string | null;
  /** undo history of fixture lists for the current design */
  past: PlacedFixture[][];
  checkpoint: () => void;
  undo: () => void;
  load: (id: string) => Promise<void>;
  update: (fn: (p: Project) => Project) => void;
  setStep: (step: StepId) => void;
  setDesign: (design: Design, label?: string) => void;
  updateFixtures: (fn: (f: PlacedFixture[]) => PlacedFixture[]) => void;
  select: (id: string | null) => void;
  saveVersion: (label: string) => void;
  restoreVersion: (versionId: string) => void;
  flush: () => Promise<void>;
}

let timer: ReturnType<typeof setTimeout> | null = null;
const MAX_VERSIONS = 20;

export function blankProject(): Project {
  const now = Date.now();
  return {
    id: newId("p"),
    name: "",
    spaceType: "living_room",
    style: "contemporary",
    city: "",
    kind: "new_construction",
    createdAt: now,
    updatedAt: now,
    step: "project",
    assets: [],
    space: defaultSpace(),
    requirements: defaultRequirements("living_room"),
    analysis: null,
    design: null,
    versions: [],
  };
}

export const useWorkspace = create<WorkspaceState>((set, get) => {
  const persist = () => {
    if (timer) clearTimeout(timer);
    set({ saveState: "saving" });
    timer = setTimeout(async () => {
      const p = get().project;
      if (!p) return;
      try {
        await repository.save(p);
        set({ saveState: "saved" });
      } catch {
        set({ saveState: "error" });
      }
    }, 500);
  };

  return {
    project: null,
    loading: true,
    notFound: false,
    saveState: "idle",
    selectedId: null,
    past: [],

    checkpoint() {
      const f = get().project?.design?.fixtures;
      if (f) set({ past: [...get().past, f].slice(-60) });
    },

    undo() {
      const past = get().past;
      const prev = past[past.length - 1];
      if (!prev) return;
      set({ past: past.slice(0, -1) });
      get().update((p) => (p.design ? { ...p, design: { ...p.design, fixtures: prev, edited: true } } : p));
      const sel = get().selectedId;
      if (sel && !prev.some((f) => f.id === sel)) set({ selectedId: null });
    },

    async load(id) {
      set({ loading: true, notFound: false, project: null, selectedId: null, saveState: "idle", past: [] });
      const p = await repository.get(id);
      set({ project: p, loading: false, notFound: !p });
    },

    update(fn) {
      const p = get().project;
      if (!p) return;
      set({ project: { ...fn(p), updatedAt: Date.now() } });
      persist();
    },

    setStep(step) {
      get().update((p) => ({ ...p, step }));
    },

    setDesign(design, label) {
      get().update((p) => ({
        ...p,
        design,
        versions: label
          ? [{ id: newId("v"), label, createdAt: Date.now(), design }, ...p.versions].slice(0, MAX_VERSIONS)
          : p.versions,
      }));
      set({ selectedId: null, past: [] });
    },

    updateFixtures(fn) {
      get().update((p) => (p.design ? { ...p, design: { ...p.design, fixtures: fn(p.design.fixtures), edited: true } } : p));
    },

    select(id) {
      set({ selectedId: id });
    },

    saveVersion(label) {
      const p = get().project;
      if (!p?.design) return;
      get().update((proj) => ({
        ...proj,
        versions: [{ id: newId("v"), label, createdAt: Date.now(), design: proj.design! }, ...proj.versions].slice(0, MAX_VERSIONS),
      }));
    },

    restoreVersion(versionId) {
      const v = get().project?.versions.find((x) => x.id === versionId);
      if (v) {
        get().checkpoint();
        get().update((p) => ({ ...p, design: v.design }));
        set({ selectedId: null });
      }
    },

    async flush() {
      if (timer) clearTimeout(timer);
      const p = get().project;
      if (p) await repository.save(p);
      set({ saveState: "saved" });
    },
  };
});
