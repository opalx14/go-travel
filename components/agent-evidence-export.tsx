"use client";

import { useState } from "react";
import { Download, FileJson2, FileText, LoaderCircle } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { runtimeModeHeaders } from "@/lib/runtime-mode";
import type { JudgeEvidenceBundle } from "@/lib/agent-evidence";

interface EvidenceResponse {
  ok: boolean;
  bundle: JudgeEvidenceBundle;
  markdown: string;
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AgentEvidenceExport() {
  const { activeRun, runtimeMode } = useDemo();
  const [loading, setLoading] = useState<"json" | "markdown" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!activeRun) return null;

  async function exportEvidence(format: "json" | "markdown") {
    setLoading(format);
    setError(null);
    try {
      const response = await fetch("/api/agent/evidence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...runtimeModeHeaders(runtimeMode),
        },
        body: JSON.stringify({ outcome: activeRun }),
      });
      if (!response.ok) throw new Error("Evidence export unavailable");
      const payload = (await response.json()) as EvidenceResponse;
      const stamp = payload.bundle.audit.shortId.toLowerCase();
      if (format === "json") {
        downloadText(
          `tripintent-evidence-${stamp}.json`,
          JSON.stringify(payload.bundle, null, 2),
          "application/json"
        );
      } else {
        downloadText(
          `tripintent-evidence-${stamp}.md`,
          payload.markdown,
          "text/markdown;charset=utf-8"
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Evidence export failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-2xl border bg-card px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Download className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Judge evidence export</h3>
          </div>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            Snapshot this exact run with Outcome Contract, candidate evidence, provider verification, policy result, retries/self-repair, human boundary, SHA-256 audit, Qwen runtime, and judge preflight.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void exportEvidence("json")}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold disabled:opacity-50"
          >
            {loading === "json" ? <LoaderCircle className="size-3 animate-spin" /> : <FileJson2 className="size-3" />}
            JSON
          </button>
          <button
            type="button"
            onClick={() => void exportEvidence("markdown")}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold disabled:opacity-50"
          >
            {loading === "markdown" ? <LoaderCircle className="size-3 animate-spin" /> : <FileText className="size-3" />}
            Markdown
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-[10px] text-rose-600">{error}</p>}
    </section>
  );
}
