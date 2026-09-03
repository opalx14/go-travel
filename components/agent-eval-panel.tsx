"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FlaskConical, LoaderCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EvalResult {
  id: string;
  name: string;
  category: "CONTRACT" | "POLICY" | "TOOLING" | "PRIVACY" | "RESILIENCE";
  passed: boolean;
  detail: string;
}

interface EvalResponse {
  ok: boolean;
  passed: number;
  failed: number;
  total: number;
  gateStatus: "PASS" | "FAIL";
  results: EvalResult[];
}

export function AgentEvalPanel() {
  const [report, setReport] = useState<EvalResponse | null>(null);
  const [failedToLoad, setFailedToLoad] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/agent/evals", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Eval endpoint unavailable");
        return (await response.json()) as EvalResponse;
      })
      .then((payload) => setReport(payload))
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setFailedToLoad(true);
      });

    return () => controller.abort();
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Agent stress / safety evals</h3>
          </div>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            Reproducible deterministic gates for disruption recovery. Live Qwen + Atlas orchestration is tested separately so network availability cannot fake a safety pass.
          </p>
        </div>

        {!report && !failedToLoad ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            <LoaderCircle className="size-3 animate-spin" /> Running
          </span>
        ) : failedToLoad ? (
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-200">
            Eval unavailable
          </span>
        ) : (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1",
              report?.gateStatus === "PASS"
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-rose-50 text-rose-700 ring-rose-200"
            )}
          >
            {report?.passed}/{report?.total} gates passed
          </span>
        )}
      </header>

      {report && (
        <div className="grid gap-px bg-border sm:grid-cols-2">
          {report.results.map((item) => (
            <div key={item.id} className="bg-card px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                {item.passed ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-foreground">{item.name}</p>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] font-semibold tracking-wide text-muted-foreground">
                      {item.category}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {failedToLoad && (
        <p className="px-4 py-4 text-xs text-muted-foreground sm:px-5">
          The eval endpoint could not be loaded. Run <code className="font-mono">bun scripts/agent-evals.ts</code> from the repository for the same deterministic gate report.
        </p>
      )}
    </section>
  );
}
