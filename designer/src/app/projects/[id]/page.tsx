"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/primitives";
import { Workspace } from "@/components/workspace/Workspace";
import { useWorkspace } from "@/lib/project/store";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { load, loading, notFound, project, flush } = useWorkspace();

  useEffect(() => {
    load(id);
  }, [id, load]);

  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-line-strong border-t-ink" aria-label="Loading project" />
      </div>
    );
  }
  if (notFound || !project) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-[28px]">Project not found</h1>
        <p className="max-w-[40ch] text-ink-2">
          It may have been deleted, or it was created in another browser. Projects are currently saved on this device only.
        </p>
        <Link href="/projects">
          <Button variant="primary">Back to projects</Button>
        </Link>
      </div>
    );
  }
  return <Workspace />;
}
