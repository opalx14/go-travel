"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Luggage,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CaseId =
  | "bounded-search-retry"
  | "self-repair-expired"
  | "price-increase-checkpoint"
  | "baggage-unavailable-repair";

interface CaseResult {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
  outcome?: "RECOVERED" | "HUMAN_STOP" | "SAFE_FAIL";
  trace?: string[];
}

interface CaseResponse {
  ok: boolean;
  case?: CaseResult;
}

const scenarios: Array<{
  id: CaseId;
  label: string;
  detail: string;
  icon: typeof Clock3;
}> = [
  {
    id: "bounded-search-retry",
    label: "Atlas timeout",
    detail: "Transient search failure → bounded retry",
    icon: Clock3,
  },
  {
    id: "self-repair-expired",
    label: "Offer expired",
    detail: "Reject stale offer → choose backup",
    icon: RotateCcw,
  },
  {
    id: "price-increase-checkpoint",
    label: "Fare increased",
    detail: "Provider price jump → human stop",
    icon: ShieldAlert,
  },
  {
    id: "baggage-unavailable-repair",
    label: "Baggage unavailable",
    detail: "Reject mismatch → choose bag-valid offer",
    icon: Luggage,
  },
];

export function AgentFailureLab() {
  const [selected, setSelected] = useState<CaseId>("bounded-search-retry");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runScenario(id: CaseId) {
    setSelected(id);
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch(`/api/agent/evals?case=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failure case endpoint unavailable");
      const payload = (await response.json()) as CaseResponse;
      if (!payload.case) throw new Error("Failure case returned no evidence");
      setResult(payload.case);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failure case unavailable");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Interactive failure lab</h3>
          </div>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            Inject one controlled travel-provider failure and re-run the same deterministic recovery/eval code. No UI-only fake success states.
          </p>
        </div>
        <span className="rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Failure injection
        </span>
      </header>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          const active = selected === scenario.id;
          return (
            <button
              key={scenario.id}
              type="button"
              disabled={running}
              onClick={() => void runScenario(scenario.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors disabled:cursor-wait disabled:opacity-60",
                active ? "border-primary/30 bg-primary/5" : "bg-background hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("size-3.5", active ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs font-semibold">{scenario.label}</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{scenario.detail}</p>
            </button>
          );
        })}
      </div>

      <div className="border-t bg-muted/10 px-4 py-4 sm:px-5">
        {!result && !error && (
          <p className="text-[11px] text-muted-foreground">
            {running ? "Running injected scenario against the server eval engine…" : "Choose a failure above to generate a replayable recovery trace."}
          </p>
        )}

        {error && <p className="text-[11px] font-medium text-rose-700">{error}</p>}

        {result && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={cn("size-4", result.passed ? "text-emerald-600" : "text-rose-600")} />
                <p className="text-xs font-semibold">{result.name}</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-1 font-mono text-[9px] font-semibold ring-1",
                  result.outcome === "HUMAN_STOP"
                    ? "bg-amber-50 text-amber-700 ring-amber-200"
                    : result.passed
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-rose-50 text-rose-700 ring-rose-200"
                )}
              >
                {result.outcome ?? (result.passed ? "PASS" : "FAIL")}
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{result.detail}</p>
            {result.trace && (
              <div className="mt-3 space-y-1.5 rounded-xl border bg-background p-3 font-mono text-[9px] leading-relaxed">
                {result.trace.map((line, index) => (
                  <div key={`${index}-${line}`} className="flex gap-2">
                    <span className="shrink-0 text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                    <span className="text-foreground">{line}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
