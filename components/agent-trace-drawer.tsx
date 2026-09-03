"use client";

import { useEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { AgentConsole } from "@/components/agent-console";
import { AgentEvalPanel } from "@/components/agent-eval-panel";
import { AgentFailureLab } from "@/components/agent-failure-lab";
import { AgentOrchestrationTrace } from "@/components/agent-orchestration-trace";
import { CaseCard } from "@/components/case-card";
import { DecisionTrace } from "@/components/decision-trace";
import { useDemo } from "@/lib/demo-store";

/**
 * Judge/technical proof is intentionally secondary to the passenger story.
 * It opens as a drawer instead of competing with the product as a top-level tab.
 */
export function AgentTraceDrawer() {
  const [open, setOpen] = useState(false);
  const { phase, activeRun } = useDemo();
  const available = phase !== "idle" || Boolean(activeRun);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!available) return null;

  return (
    <>
      <div className="mt-7 flex justify-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
        >
          View agent trace
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="Close agent trace"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Agent decision trace"
            className="animate-in slide-in-from-right absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l bg-background shadow-2xl duration-300"
          >
            <header className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
              <div>
                <p className="label-caps text-primary">Technical proof</p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
                  How TripIntent decided
                </h2>
                <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
                  Simulated disruption, real Atlas Sandbox search and verification,
                  deterministic TripIntent policy.
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-[11px] leading-tight">
                  <div>
                    <span className="block font-medium text-muted-foreground">Development</span>
                    <span className="text-foreground">Built with Qoder</span>
                  </div>
                  <div>
                    <span className="block font-medium text-muted-foreground">Travel capability</span>
                    <span className="text-foreground">Atlas Flight Booking Skill</span>
                  </div>
                  <div>
                    <span className="block font-medium text-muted-foreground">Environment</span>
                    <span className="text-foreground">Atlas Sandbox</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-5 lg:grid-cols-2">
                <CaseCard />
                <DecisionTrace />
              </div>
              <AgentOrchestrationTrace />
              <AgentFailureLab />
              <AgentEvalPanel />
              <AgentConsole />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
