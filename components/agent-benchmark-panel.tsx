"use client";

import { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BenchmarkCase {
  id: string;
  name: string;
  expectedStatus: string;
  expectedApproval?: string;
  actualStatus: string;
  actualApproval?: string;
  passed: boolean;
  selectedFlightNo: string | null;
  steps: number;
}

interface BenchmarkResponse {
  ok: boolean;
  passed: number;
  failed: number;
  total: number;
  passRate: number;
  cases: BenchmarkCase[];
}

export function AgentBenchmarkPanel() {
  const [report, setReport] = useState<BenchmarkResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/agent/benchmark", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("benchmark unavailable");
        return (await response.json()) as BenchmarkResponse;
      })
      .then(setReport)
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setFailed(true);
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Scenario benchmark matrix</h3>
          </div>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            End-to-end deterministic recovery scenarios covering autonomous success, HITL, hard failure and self-repair.
          </p>
        </div>
        {!report && !failed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            <LoaderCircle className="size-3 animate-spin" /> Benchmarking
          </span>
        ) : report ? (
          <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1", report.failed === 0 ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200")}>
            {report.passed}/{report.total} · {report.passRate}%
          </span>
        ) : (
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-200">Unavailable</span>
        )}
      </header>

      {report && (
        <div className="grid gap-px bg-border sm:grid-cols-2">
          {report.cases.map((item) => (
            <div key={item.id} className="bg-card px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                {item.passed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{item.name}</p>
                  <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                    expected {item.expectedStatus}{item.expectedApproval ? `/${item.expectedApproval}` : ""}
                  </p>
                  <p className="mt-0.5 font-mono text-[9px] text-foreground">
                    actual {item.actualStatus}{item.actualApproval ? `/${item.actualApproval}` : ""} · {item.selectedFlightNo ?? "no flight"} · {item.steps} steps
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
