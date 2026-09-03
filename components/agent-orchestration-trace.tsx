"use client";

import {
  Bot,
  Check,
  CircleDot,
  DatabaseZap,
  GitBranch,
  Hand,
  LockKeyhole,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

interface TraceNode {
  id: string;
  label: string;
  detail: string;
  icon: typeof Bot;
  state: "done" | "active" | "pending" | "blocked";
  provenance: string;
}

function hasStep(ids: string[], prefix: string): boolean {
  return ids.some((id) => id === prefix || id.startsWith(prefix));
}

export function AgentOrchestrationTrace() {
  const { phase, playedSteps, activeRun, outcome } = useDemo();
  const run = outcome ?? activeRun;
  const ids = playedSteps.map((step) => step.id);
  const hasAtlas = Boolean(
    run?.evaluations.some(({ option }) => option.source === "ATLAS_SANDBOX")
  );
  const searchDone = hasStep(ids, "step-evaluate") || hasStep(ids, "step-select");
  const policyDone = hasStep(ids, "step-policy");
  const verifyDone = Boolean(run?.verification) || hasStep(ids, "step-verify");
  const selfRepairTriggered =
    hasStep(ids, "step-provider-reject") || hasStep(ids, "step-baggage-reject");
  const transientRetryTriggered = hasStep(ids, "step-retry");
  const recoverySupervisorTriggered = selfRepairTriggered || transientRetryTriggered;
  const approvalBlocked = run?.status === "NEEDS_APPROVAL" && phase === "complete";
  const explanationDone = Boolean(run?.reasoning);

  const nodes: TraceNode[] = [
    {
      id: "planner",
      label: "Qwen planner",
      detail: "Chooses only from the runtime allow-list; invalid tool names are rejected.",
      icon: Bot,
      state: phase === "running" ? "active" : phase === "idle" ? "pending" : "done",
      provenance: "Qwen 9B shadow planner · live-smoke validated",
    },
    {
      id: "signal",
      label: "Inspect disruption",
      detail: "Reads the protected-trip exception. The demo disruption remains explicitly simulated.",
      icon: CircleDot,
      state: phase === "idle" ? "pending" : "done",
      provenance: "Simulated signal",
    },
    {
      id: "search",
      label: "Atlas search",
      detail: "Retrieves replacement inventory; Live evidence refuses simulated search fallback.",
      icon: Search,
      state: searchDone ? "done" : phase === "running" ? "active" : "pending",
      provenance: hasAtlas ? "Atlas Sandbox" : searchDone ? "Simulated fallback" : "Pending",
    },
    {
      id: "policy",
      label: "Policy Guardian",
      detail: "Deterministic deadline, baggage and delegated-spend checks. Qwen cannot override them.",
      icon: LockKeyhole,
      state: policyDone ? "done" : searchDone ? "active" : "pending",
      provenance: "Deterministic TypeScript",
    },
    {
      id: "verify",
      label: "Fare + baggage verify",
      detail: "Provider verification can change the effective recovery cost before execution.",
      icon: DatabaseZap,
      state: verifyDone ? "done" : policyDone && !approvalBlocked ? "active" : "pending",
      provenance: run?.verification
        ? run.verification.source === "ATLAS_SANDBOX"
          ? "Atlas Sandbox"
          : "Simulated fallback"
        : "Pending",
    },
    {
      id: "repair",
      label: "Recovery supervisor",
      detail: selfRepairTriggered && transientRetryTriggered
        ? "Retried a transient read within budget, then rejected the unusable candidate and re-selected the next policy-valid recovery."
        : transientRetryTriggered
          ? "Recovered from a transient Atlas read failure with one bounded retry; no state-changing action was retried."
          : selfRepairTriggered
            ? "Rejected a provider-invalid candidate and re-selected the next policy-valid recovery without relaxing the contract."
            : "Armed for one bounded read-only retry and candidate self-repair when Atlas evidence becomes unusable.",
      icon: RotateCcw,
      state: recoverySupervisorTriggered ? "done" : "pending",
      provenance: selfRepairTriggered && transientRetryTriggered
        ? "Retry + self-repair executed"
        : transientRetryTriggered
          ? "Bounded retry executed"
          : selfRepairTriggered
            ? "Self-repair executed"
            : "Retry/self-repair armed",
    },
    {
      id: "approval",
      label: "Human boundary",
      detail: approvalBlocked
        ? "Execution is stopped here until the passenger explicitly approves the new spend."
        : "Only appears when authority, autopilot or a provider price checkpoint requires approval.",
      icon: Hand,
      state: approvalBlocked ? "blocked" : run?.status === "RECOVERED" ? "done" : "pending",
      provenance: approvalBlocked ? "Passenger required" : "Guarded",
    },
    {
      id: "explain",
      label: "Decision explanation",
      detail: "Explains the immutable recovery result after policy/tool evidence exists.",
      icon: Sparkles,
      state: explanationDone ? "done" : run ? "active" : "pending",
      provenance:
        run?.reasoning?.source === "QWEN"
          ? "Qwen Local · read-only"
          : explanationDone
            ? "Deterministic fallback"
            : "Pending",
    },
  ];

  return (
    <section className="rounded-2xl border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="size-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-[-0.01em]">
              Agent orchestration evidence
            </h3>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Qwen can propose the next tool, but the runtime executes only allow-listed actions.
            The traveler flow remains deterministic-first while this planner runs as guarded
            orchestration evidence.
          </p>
        </div>
        <div className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">
          Bounded · shadow planner
        </div>
      </header>

      <div className="overflow-x-auto px-5 py-5">
        <div className="flex min-w-[820px] items-stretch gap-2">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            return (
              <div key={node.id} className="contents">
                <article
                  className={cn(
                    "min-w-0 flex-1 rounded-xl border p-3 transition-colors",
                    node.state === "done" && "border-emerald-200 bg-emerald-50/60",
                    node.state === "active" && "border-primary/30 bg-primary/5",
                    node.state === "blocked" && "border-amber-300 bg-amber-50",
                    node.state === "pending" && "border-border bg-muted/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Icon
                      className={cn(
                        "size-3.5",
                        node.state === "done" && "text-emerald-600",
                        node.state === "active" && "text-primary",
                        node.state === "blocked" && "text-amber-600",
                        node.state === "pending" && "text-muted-foreground/60"
                      )}
                    />
                    {node.state === "done" && <Check className="size-3 text-emerald-600" />}
                    {node.state === "blocked" && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-amber-700">
                        stop
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-foreground">{node.label}</p>
                  <p className="mt-1 min-h-12 text-[9px] leading-relaxed text-muted-foreground">
                    {node.detail}
                  </p>
                  <p className="mt-2 truncate font-mono text-[8px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    {node.provenance}
                  </p>
                </article>
                {index < nodes.length - 1 && (
                  <div className="flex shrink-0 items-center text-muted-foreground/35" aria-hidden>
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
