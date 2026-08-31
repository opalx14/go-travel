"use client";

import Link from "next/link";
import { CircleAlert, Target } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

/** Route mark: origin dot → path → destination pin, drawn with CSS only. */
function RouteMark() {
  return (
    <span aria-hidden className="flex items-center gap-[3px]">
      <span className="size-1.5 rounded-full ring-[1.5px] ring-primary" />
      <span className="h-[1.5px] w-2.5 rounded-full bg-primary/35" />
      <span className="size-2.5 rounded-full bg-primary" />
    </span>
  );
}

export function NavHeader() {
  const { trip, isProtected, evidenceView, setEvidenceView } = useDemo();

  return (
    <header className="sticky top-0 z-50 border-b ti-divider bg-[#070c18]/90 text-slate-100 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:h-16 sm:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <RouteMark />
          <span className="text-[17px] leading-none font-bold tracking-tight text-white">
            Trip<span className="text-sky-400">Intent</span>
          </span>
          <span className="hidden rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-sky-300 lg:inline-block">
            Autonomous Recovery Agent
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-2 lg:gap-3">
          {isProtected && (
            <div className="hidden items-center gap-2 md:flex">
              <span className="ti-control rounded-full px-3 py-1.5 font-mono text-[10px] font-semibold text-slate-300">
                {trip.origin} → {trip.destination}
              </span>

              <div className="ti-control flex items-center gap-1 rounded-full p-1">
                <button
                  type="button"
                  onClick={() => setEvidenceView("issue")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition",
                    evidenceView === "issue"
                      ? "bg-cyan-400 text-slate-950"
                      : "text-slate-500 hover:text-slate-200"
                  )}
                >
                  <CircleAlert className="size-3.5" />
                  Issue
                </button>
                <button
                  type="button"
                  onClick={() => setEvidenceView("goal")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition",
                    evidenceView === "goal"
                      ? "bg-cyan-400 text-slate-950"
                      : "text-slate-500 hover:text-slate-200"
                  )}
                >
                  <Target className="size-3.5" />
                  Goal
                </button>
              </div>
            </div>
          )}

          <Link
            href="/operations"
            prefetch={false}
            className="ti-control hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition lg:inline-flex"
          >
            Operations
          </Link>

          <div className="ti-status-success flex items-center gap-2 rounded-full border px-2.5 py-1 sm:px-3">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden font-mono text-[11px] font-medium text-emerald-300 sm:inline">
              Atlas Sandbox Live
            </span>
            <span className="font-mono text-[10px] font-medium text-emerald-300 sm:hidden">
              Live
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
