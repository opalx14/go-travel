"use client";

import {
  Bot,
  CircleDot,
  DatabaseZap,
  LoaderCircle,
  Scale,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { AgentPipeline } from "@/components/agent-pipeline";
import { CandidateList } from "@/components/candidate-list";
import { PolicyGate } from "@/components/policy-gate";
import { useDemo } from "@/lib/demo-store";
import {
  buildCandidates,
  buildPipeline,
  buildPolicyGate,
  hasReachedStage,
  recoveryHeadline,
} from "@/lib/presentation";
import { cn } from "@/lib/utils";

/** Header status chip — one glance tells you what the agent is doing. */
function StatusChip() {
  const { phase, outcome } = useDemo();

  if (phase === "running") {
    return (
      <span className="label-caps flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
        <LoaderCircle className="size-3 animate-spin" />
        Working
      </span>
    );
  }

  if (phase === "disrupted") {
    return (
      <span className="label-caps rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
        Waiting on passenger
      </span>
    );
  }

  if (phase === "complete" && outcome) {
    const style =
      outcome.status === "RECOVERED"
        ? "bg-emerald-100 text-emerald-700"
        : outcome.status === "NEEDS_APPROVAL"
          ? "bg-amber-100 text-amber-700"
          : outcome.status === "FAILED"
            ? "bg-rose-100 text-rose-700"
            : "bg-secondary text-secondary-foreground";
    return (
      <span
        className={cn(
          "label-caps rounded-full px-2.5 py-1 font-medium",
          style
        )}
      >
        {outcome.status.replace("_", " ")}
      </span>
    );
  }

  return (
    <span className="label-caps rounded-full bg-secondary px-2.5 py-1 font-medium text-muted-foreground">
      Standing by
    </span>
  );
}

function ProvenanceRail() {
  const { phase, intentSource, activeRun, outcome } = useDemo();
  const run = outcome ?? activeRun;
  const hasSearchEvidence = Boolean(run?.evaluations.length);
  const searchSource = run?.evaluations.some(
    ({ option }) => option.source === "ATLAS_SANDBOX"
  )
    ? "Atlas Sandbox"
    : hasSearchEvidence
      ? "Simulated fallback"
      : "Pending";
  const reasoning = run?.reasoning;

  const items = [
    {
      label: "Intent",
      value:
        intentSource === "QWEN"
          ? "Qwen Local"
          : intentSource
            ? "Deterministic fallback"
            : "Pending",
      detail: "Natural-language contract",
      icon: Bot,
      active: Boolean(intentSource),
    },
    {
      label: "Disruption",
      value: phase === "idle" ? "Demo signal armed" : "Simulated event",
      detail: "Never claimed as Atlas data",
      icon: CircleDot,
      active: phase !== "idle",
    },
    {
      label: "Search",
      value: searchSource,
      detail: "Replacement inventory",
      icon: DatabaseZap,
      active: hasSearchEvidence,
    },
    {
      label: "Decision",
      value: run ? "Deterministic policy" : "Pending",
      detail: "Deadline · baggage · authority",
      icon: Scale,
      active: Boolean(run),
    },
    {
      label: "Explanation",
      value:
        reasoning?.source === "QWEN"
          ? `Qwen Local${reasoning.model ? ` · ${reasoning.model}` : ""}`
          : reasoning
            ? "Deterministic fallback"
            : "Pending",
      detail: "Read-only rationale",
      icon: Sparkles,
      active: Boolean(reasoning),
    },
  ];

  return (
    <div className="grid gap-2 border-b bg-muted/20 px-5 py-3 sm:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={cn(
              "rounded-lg border px-2.5 py-2 transition-colors",
              item.active
                ? "border-primary/20 bg-background/80"
                : "border-border/70 bg-background/35"
            )}
          >
            <div className="flex items-center gap-1.5">
              <Icon
                className={cn(
                  "size-3",
                  item.active ? "text-primary" : "text-muted-foreground/55"
                )}
              />
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {item.label}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] font-semibold text-foreground">
              {item.value}
            </p>
            <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
              {item.detail}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Agent decision console: the same seven-stage pipeline runs on every
 * disruption, with the candidate evaluation and the policy gate revealed in
 * step with the deterministic timeline.
 */
export function AgentConsole() {
  const {
    trip,
    intent,
    phase,
    playedSteps,
    activeRun,
    outcome,
    approveRecovery,
    declineRecovery,
  } = useDemo();

  const stages = buildPipeline(activeRun, playedSteps, intent, trip);
  const candidates = buildCandidates(activeRun);
  const showCandidates = hasReachedStage(playedSteps, "SEARCH");
  const showVerdict = hasReachedStage(playedSteps, "EVALUATE");
  const showGate = hasReachedStage(playedSteps, "POLICY");
  const gate = activeRun ? buildPolicyGate(activeRun, intent) : null;
  const awaitingDecision =
    phase === "complete" && outcome?.status === "NEEDS_APPROVAL";

  return (
    <section className="rounded-2xl border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-[-0.01em]">
              Agent decision console
            </h2>
            <StatusChip />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Observe → assess → search → evaluate → policy → authorize → verify
          </p>
        </div>
      </header>

      <ProvenanceRail />

      <div className="grid gap-6 px-5 py-5 lg:grid-cols-[184px_1fr] lg:gap-8">
        <AgentPipeline stages={stages} />

        <div className="min-w-0 space-y-3.5">
          {!showCandidates && (
            <div className="flex h-full min-h-[220px] flex-col justify-center rounded-xl border border-dashed px-5 py-8 text-center">
              <p className="text-sm font-medium">
                {phase === "idle"
                  ? "Monitoring your booking"
                  : phase === "disrupted"
                    ? "Disruption recorded"
                    : "Reading your contract"}
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                {phase === "idle"
                  ? "Simulate a disruption to watch the agent evaluate real alternatives against the contract and stop at the authority boundary."
                  : phase === "disrupted"
                    ? "The schedule change is logged. The agent is waiting for the passenger to request a recovery."
                    : "The agent is loading the hard constraints before it searches."}
              </p>
            </div>
          )}

          {showCandidates && (
            <div>
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <p className="label-caps text-foreground">
                  Candidate evaluation
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {candidates.length} from{" "}
                  {candidates.some(
                    ({ evaluation }) =>
                      evaluation.option.source === "ATLAS_SANDBOX"
                  )
                    ? "Atlas Sandbox"
                    : "simulated fallback"}
                </p>
              </div>
              <CandidateList
                candidates={candidates}
                showVerdict={showVerdict}
              />
            </div>
          )}

          {showGate && gate && (
            <PolicyGate
              gate={gate}
              option={activeRun?.selected ?? null}
              awaitingDecision={Boolean(awaitingDecision)}
              onApprove={approveRecovery}
              onDecline={declineRecovery}
            />
          )}

          {phase === "complete" && outcome?.status === "RECOVERED" && (
            <div className="animate-in fade-in flex items-start gap-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200 duration-500">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="label-caps font-medium text-emerald-700">
                  {recoveryHeadline(outcome)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800/90">
                  {outcome.approvedByPassenger
                    ? `Replacement itinerary ${outcome.selected?.flightNo} is verified and ready after the passenger approved +$${outcome.selected?.extraCostUsd}.`
                    : `Replacement itinerary ${outcome.selected?.flightNo} is verified and ready at +$${outcome.selected?.extraCostUsd}, inside the $${intent.maxExtraSpendUsd} authority. Nothing was asked of the passenger.`}
                  {outcome.verification &&
                    ` Fare verified via ${
                      outcome.verification.source === "ATLAS_SANDBOX"
                        ? "Atlas Sandbox"
                        : "simulated fallback"
                    } (${outcome.verification.priceChange}).`}
                </p>
              </div>
            </div>
          )}

          {phase === "complete" && outcome?.status === "DECLINED" && (
            <div className="animate-in fade-in rounded-xl bg-muted/50 p-4 ring-1 ring-border duration-500">
              <p className="label-caps text-foreground">Trip kept</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                You declined the extra spend, so the agent left the booking
                untouched and went back to monitoring.
              </p>
            </div>
          )}

          {phase === "complete" && outcome?.status === "FAILED" && (
            <div className="animate-in fade-in flex items-start gap-3 rounded-xl bg-rose-50 p-4 ring-1 ring-rose-200 duration-500">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-600" />
              <div className="min-w-0">
                <p className="label-caps font-medium text-rose-700">
                  No valid recovery
                </p>
                <p className="mt-1 text-xs leading-relaxed text-rose-800/90">
                  {outcome.steps.at(-1)?.detail ??
                    "The recovery could not be completed. Your booking is unchanged."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
