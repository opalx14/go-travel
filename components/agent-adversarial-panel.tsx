"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, ShieldAlert, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdversarialResult {
  id: string;
  name: string;
  category: "PLANNER" | "POLICY" | "PRIVACY" | "TOOL_OUTPUT";
  passed: boolean;
  detail: string;
  attack: string;
  expectedBoundary: string;
}

interface AdversarialReport {
  passed: number;
  failed: number;
  total: number;
  gateStatus: "PASS" | "FAIL";
  results: AdversarialResult[];
}

export function AgentAdversarialPanel() {
  const [report, setReport] = useState<AdversarialReport | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/agent/adversarial", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Adversarial eval endpoint unavailable");
        return (await response.json()) as AdversarialReport;
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
            <ShieldAlert className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Adversarial planner / policy matrix</h3>
          </div>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            Red-team cases are isolated from normal safety evals: approval bypass, invented tools, direct price confirmation, malformed JSON, hallucinated fare claims, PII override prompts, and conflicting provider output.
          </p>
        </div>
        {!report && !failed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            <LoaderCircle className="size-3 animate-spin" /> Running
          </span>
        ) : failed ? (
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-200">Unavailable</span>
        ) : (
          <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1", report?.gateStatus === "PASS" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200")}>{report?.passed}/{report?.total} red-team gates</span>
        )}
      </header>

      {report && (
        <div className="grid gap-px bg-border sm:grid-cols-2">
          {report.results.map((item) => (
            <article key={item.id} className="bg-card px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                {item.passed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold">{item.name}</p>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] font-semibold text-muted-foreground">{item.category}</span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{item.detail}</p>
                  <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">Attack:</span> {item.attack}</p>
                  <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">Boundary:</span> {item.expectedBoundary}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
