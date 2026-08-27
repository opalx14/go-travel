"use client";

import { LoaderCircle } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { traceLabel } from "@/lib/presentation";
import type { StepTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE: Record<StepTone, string> = {
  info: "bg-secondary text-secondary-foreground",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

/**
 * The auditable decision trace: every step the deterministic engine emitted,
 * numbered in order, so an operator can replay exactly why the agent acted.
 */
export function DecisionTrace() {
  const { phase, playedSteps } = useDemo();

  return (
    <section className="rounded-2xl border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-[-0.01em]">
            Decision trace
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Deterministic, replayable, one line per agent action
          </p>
        </div>
        {phase === "running" && (
          <span className="label-caps flex items-center gap-1.5 text-primary">
            <LoaderCircle className="size-3 animate-spin" />
            Live
          </span>
        )}
      </header>

      {playedSteps.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          {phase === "running"
            ? "Detecting exception…"
            : "No agent activity recorded yet"}
        </p>
      ) : (
        <ol className="divide-y">
          {playedSteps.map((step, index) => (
            <li
              key={step.id}
              className="animate-in fade-in slide-in-from-bottom-1 flex gap-3.5 px-5 py-3.5 duration-500"
            >
              <span className="mt-0.5 font-mono text-[11px] leading-4 text-muted-foreground tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "label-caps rounded px-1.5 py-0.5 font-medium",
                      TONE[step.tone]
                    )}
                  >
                    {traceLabel(step)}
                  </span>
                  <span className="text-sm font-medium">{step.title}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
