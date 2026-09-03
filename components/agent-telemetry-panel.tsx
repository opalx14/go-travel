"use client";

import { Activity, CheckCircle2, Gauge, RotateCcw, ShieldAlert } from "lucide-react";
import { buildAgentRunTelemetry } from "@/lib/agent-telemetry";
import { useDemo } from "@/lib/demo-store";

export function AgentTelemetryPanel() {
  const { activeRun, outcome } = useDemo();
  const telemetry = buildAgentRunTelemetry(outcome ?? activeRun);

  const metrics = [
    ["Candidates", telemetry.candidatesEvaluated],
    ["Hard rejects", telemetry.hardRejected],
    ["Atlas-backed", telemetry.atlasBackedCandidates],
    ["Provider retries", telemetry.providerRetries],
    ["Self-repairs", telemetry.selfRepairs],
    ["Decision steps", telemetry.decisionSteps],
  ] as const;

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Run telemetry</h3>
          </div>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            Replayable counts derived from the recovery outcome itself — no synthetic latency or invented provider metrics.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
          <Gauge className="size-3" /> {telemetry.evidenceCoverage}% evidence coverage
        </div>
      </header>

      <div className="grid gap-px bg-border sm:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-3">
            <p className="font-mono text-lg font-semibold tabular-nums text-foreground">{value}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 border-t px-4 py-3 sm:grid-cols-3 sm:px-5">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {telemetry.approvalBoundary ? <ShieldAlert className="size-3.5 text-amber-600" /> : <CheckCircle2 className="size-3.5 text-emerald-600" />}
          {telemetry.approvalBoundary ? "Human boundary active" : "No approval boundary"}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <RotateCcw className="size-3.5" />
          {telemetry.fareVerified ? "Fare evidence present" : "Fare evidence pending"}
        </div>
        <div className="text-[10px] text-muted-foreground">
          Explanation: <span className="font-mono font-semibold text-foreground">{telemetry.explanationSource}</span>
        </div>
      </div>
    </section>
  );
}
