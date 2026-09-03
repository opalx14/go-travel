"use client";

import { useEffect, useState } from "react";
import { Fingerprint, LoaderCircle, ShieldCheck, ShieldX } from "lucide-react";
import { useDemo } from "@/lib/demo-store";

interface AuditResponse {
  ok: boolean;
  verified: boolean;
  evidence?: {
    version: 1;
    algorithm: "SHA-256";
    decisionHash: string;
    shortId: string;
  };
}

export function AgentAuditPanel() {
  const { activeRun, outcome } = useDemo();
  const run = outcome ?? activeRun;
  const requestBody = run ? JSON.stringify({ outcome: run }) : null;
  const [state, setState] = useState<{
    requestBody: string;
    audit: AuditResponse | null;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!requestBody) return;
    const controller = new AbortController();
    void fetch("/api/agent/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("audit unavailable");
        return (await response.json()) as AuditResponse;
      })
      .then((audit) =>
        setState({ requestBody, audit, failed: false })
      )
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setState({ requestBody, audit: null, failed: true });
      });
    return () => controller.abort();
  }, [requestBody]);

  const current = requestBody && state?.requestBody === requestBody ? state : null;
  const audit = current?.audit ?? null;
  const failed = current?.failed ?? false;

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <Fingerprint className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Decision audit fingerprint</h3>
          </div>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            SHA-256 over decision-critical facts only. Read-only Qwen explanation wording is deliberately excluded from the fingerprint.
          </p>
        </div>
        {!run ? (
          <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Waiting for run</span>
        ) : !audit && !failed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            <LoaderCircle className="size-3 animate-spin" /> Hashing
          </span>
        ) : audit?.verified ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <ShieldCheck className="size-3" /> Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-200">
            <ShieldX className="size-3" /> Unverified
          </span>
        )}
      </header>

      <div className="px-4 py-4 sm:px-5">
        {audit?.evidence ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 text-[10px] font-semibold text-foreground">{audit.evidence.shortId}</code>
              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">{audit.evidence.algorithm} · v{audit.evidence.version}</span>
            </div>
            <code className="block break-all rounded-lg border bg-muted/20 p-3 text-[9px] leading-relaxed text-muted-foreground">
              {audit.evidence.decisionHash}
            </code>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Any change to selected flight, fare, policy, verification or replay steps changes this hash. Qwen prose can change without altering the decision evidence.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {failed ? "Audit endpoint unavailable." : "A completed or active recovery run is required to create the fingerprint."}
          </p>
        )}
      </div>
    </section>
  );
}
