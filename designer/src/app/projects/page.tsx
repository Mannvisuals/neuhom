"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge, Button } from "@/components/ui/primitives";
import { PlanIllustration } from "@/components/workspace/PlanIllustration";
import { repository } from "@/lib/project/repository";
import { blankProject } from "@/lib/project/store";
import { SPACE_TYPES } from "@/lib/project/options";
import { STEPS, type ProjectSummary } from "@/lib/project/types";
import { useAssetUrl } from "@/lib/project/useAssetUrl";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    repository.list().then(setProjects).catch(() => setProjects([]));
  }, []);

  async function create() {
    setCreating(true);
    const p = blankProject();
    await repository.save(p);
    router.push(`/projects/${p.id}`);
  }

  async function remove(id: string) {
    await repository.remove(id);
    setProjects((ps) => ps?.filter((p) => p.id !== id) ?? null);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Workspace</span>
            <h1 className="mt-1.5 font-display text-[34px] leading-tight tracking-[-0.01em]">Projects</h1>
          </div>
          {projects && projects.length > 0 && (
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={create} disabled={creating}>
              Design a new space
            </Button>
          )}
        </div>

        {projects === null ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[268px] animate-pulse rounded-lg border border-line bg-surface" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onCreate={create} creating={creating} />
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} p={p} onRemove={() => remove(p.id)} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function EmptyState({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <div className="mt-10 grid overflow-hidden rounded-lg border border-line bg-surface shadow-panel md:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col justify-center gap-5 p-8 sm:p-12">
        <span className="eyebrow text-brass">Start here</span>
        <h2 className="font-display text-[30px] leading-[1.15] tracking-[-0.01em]">
          Design the light for your first space.
        </h2>
        <p className="max-w-[44ch] text-[14.5px] leading-relaxed text-ink-2">
          Tell us about the room and how you use it. Neuhom calculates how much light it needs, places each fitting on a
          plan, and lets you refine everything.
        </p>
        <ol className="flex flex-col gap-2 text-[13.5px] text-ink-2">
          {["Describe the space and add photos", "Choose the mood and the fittings you like", "Refine the plan — numbers update as you edit"].map((t, i) => (
            <li key={t} className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line-strong text-[11.5px] font-semibold tabular text-ink">
                {i + 1}
              </span>
              {t}
            </li>
          ))}
        </ol>
        <div>
          <Button variant="primary" size="lg" onClick={onCreate} disabled={creating} className="mt-2">
            Start designing <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative hidden min-h-[360px] bg-[#1c1a15] md:block">
        <PlanIllustration className="absolute inset-0 h-full w-full" />
      </div>
    </div>
  );
}

function ProjectCard({ p, onRemove }: { p: ProjectSummary; onRemove: () => void }) {
  const cover = useAssetUrl(p.coverAssetId);
  const [menu, setMenu] = useState(false);
  const step = STEPS.find((s) => s.id === p.step);
  const space = SPACE_TYPES.find((s) => s.value === p.spaceType)?.label;
  return (
    <div className="group relative overflow-hidden rounded-lg border border-line bg-surface shadow-panel transition-[box-shadow,border-color] hover:border-line-strong hover:shadow-pop">
      <Link href={`/projects/${p.id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-[#1c1a15]">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
          ) : (
            <PlanIllustration className="h-full w-full" />
          )}
        </div>
        <div className="flex flex-col gap-1.5 p-4">
          <div className="truncate text-[15px] font-semibold">{p.name || "Untitled project"}</div>
          <div className="flex items-center gap-2 text-[12.5px] text-muted">
            <span>{space}</span>
            {p.city && (
              <>
                <span aria-hidden>·</span>
                <span>{p.city}</span>
              </>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            {p.hasDesign ? (
              <Badge tone="ok">Design ready · {p.fixtureCount} fittings</Badge>
            ) : (
              <Badge>In progress · {step?.label}</Badge>
            )}
            <span className="text-[12px] text-muted tabular">{new Date(p.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
          </div>
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <button
          type="button"
          aria-label="Project options"
          onClick={() => setMenu((m) => !m)}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-surface/90 text-ink-2 opacity-0 shadow-panel backdrop-blur transition-opacity focus:opacity-100 group-hover:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menu && (
          <div className="absolute right-0 mt-1 w-40 rounded-md border border-line bg-surface p-1 shadow-pop">
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete “${p.name || "Untitled project"}”? This can't be undone.`)) onRemove();
                setMenu(false);
              }}
              className="flex h-8 w-full items-center gap-2 rounded px-2 text-[13px] text-danger hover:bg-danger-soft"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
