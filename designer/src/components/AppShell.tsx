"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, Layers3, LayoutGrid, UserRound } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/components/ui/primitives";

const NAV = [
  { href: "/projects", label: "Projects", icon: FolderOpen, ready: true },
  { href: "#", label: "Catalogue", icon: LayoutGrid, ready: false },
  { href: "#", label: "Saved designs", icon: Layers3, ready: false },
  { href: "#", label: "Profile", icon: UserRound, ready: false },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="hidden border-r border-line bg-paper lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex h-16 items-center px-6">
          <Link href="/projects" className="text-ink" aria-label="Neuhom home">
            <Wordmark className="h-[18px]" />
          </Link>
        </div>
        <div className="px-6 pb-3 eyebrow">Lighting Designer</div>
        <nav className="flex flex-col gap-0.5 px-3">
          {NAV.map((n) => {
            const active = n.ready && path.startsWith(n.href);
            return n.ready ? (
              <Link
                key={n.label}
                href={n.href}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-md px-3 text-[13.5px] font-medium transition-colors",
                  active ? "bg-sunken text-ink" : "text-ink-2 hover:bg-sunken/60 hover:text-ink",
                )}
              >
                <n.icon className="h-4 w-4" strokeWidth={1.75} />
                {n.label}
              </Link>
            ) : (
              <span key={n.label} className="flex h-9 cursor-default items-center gap-3 rounded-md px-3 text-[13.5px] font-medium text-faint">
                <n.icon className="h-4 w-4" strokeWidth={1.75} />
                {n.label}
                <span className="ml-auto text-[10.5px] font-semibold uppercase tracking-wider">Soon</span>
              </span>
            );
          })}
        </nav>
        <div className="mt-auto p-4">
          <DemoNotice />
        </div>
      </aside>

      <header className="flex h-14 items-center justify-between border-b border-line bg-paper px-4 lg:hidden">
        <Link href="/projects" className="text-ink" aria-label="Neuhom home">
          <Wordmark className="h-4" />
        </Link>
        <span className="eyebrow">Lighting Designer</span>
      </header>

      <main className="min-w-0">{children}</main>
    </div>
  );
}

export function DemoNotice({ compact }: { compact?: boolean }) {
  const [ai, setAi] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/analyse", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { configured?: boolean }) => setAi(!!j.configured))
      .catch(() => setAi(false));
  }, []);
  return (
    <div className={cn("rounded-md border border-line bg-surface text-[12px] leading-snug text-ink-2", compact ? "px-2.5 py-1.5" : "p-3")}>
      <div className="flex items-center gap-1.5 font-semibold text-ink">
        <span className={cn("h-1.5 w-1.5 rounded-full", ai ? "bg-ok" : "bg-brand")} />
        Early access
      </div>
      {!compact && (
        <p className="mt-1 text-muted">
          {ai === null ? "Checking AI…" : ai ? "AI photo analysis is on." : "AI photo analysis is not connected yet."} Projects are saved in this browser.
        </p>
      )}
    </div>
  );
}
