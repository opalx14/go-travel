"use client";

import { KeyRound, LockKeyhole } from "lucide-react";
import { AGENT_TOOL_MANIFEST, AGENT_TOOL_NAMES } from "@/lib/agent-tool-manifest";
import { cn } from "@/lib/utils";

export function AgentToolManifestPanel() {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Tool permission manifest</h3>
          </div>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            Qwen may choose sequencing, but every capability has an explicit executor, effect and retry policy. There is no autonomous booking/payment tool in the planner surface.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
          <LockKeyhole className="size-3" /> capability-scoped
        </span>
      </header>

      <div className="grid gap-px bg-border sm:grid-cols-2">
        {AGENT_TOOL_NAMES.map((name) => {
          const tool = AGENT_TOOL_MANIFEST[name];
          return (
            <div key={name} className="bg-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-[10px] font-semibold text-foreground">{tool.name}</code>
                <span className={cn("rounded px-1.5 py-0.5 font-mono text-[8px] font-semibold", tool.effect === "HUMAN_BOUNDARY" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground")}>{tool.effect}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] font-semibold text-muted-foreground">{tool.executor}</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tool.description}</p>
              <p className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.06em] text-muted-foreground">
                auto={String(tool.autoExecutable)} · retry={tool.retryPolicy}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
