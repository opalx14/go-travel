"use client";

import type { PipelineStage } from "@/lib/presentation";
import { cn } from "@/lib/utils";

const DOT: Record<PipelineStage["status"], string> = {
  pending: "border-border bg-card",
  active: "border-primary bg-primary",
  done: "border-primary/30 bg-primary/70",
  halted: "border-amber-400 bg-amber-400",
};

/**
 * The agent's fixed decision pipeline. Every recovery walks the same stages,
 * so the viewer sees a controlled process rather than a black box.
 */
export function AgentPipeline({ stages }: { stages: PipelineStage[] }) {
  return (
    <ol className="relative">
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;
        const reached = stage.status !== "pending";

        return (
          <li key={stage.id} className="relative flex gap-3.5 pb-3.5 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-3.5 left-[5px] h-full w-px",
                  reached ? "bg-primary/25" : "pipeline-rail",
                  stage.status === "active" &&
                    "animate-[trace-dash_600ms_linear_infinite]"
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 mt-1 size-2.5 shrink-0 rounded-full border-2 transition-colors duration-300",
                DOT[stage.status],
                stage.status === "active" &&
                  "ring-4 ring-primary/15 animate-pulse"
              )}
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "label-caps transition-colors duration-300",
                  reached ? "text-foreground" : "text-muted-foreground/50"
                )}
              >
                {stage.label}
              </p>
              {stage.caption && (
                <p className="animate-in fade-in mt-0.5 text-xs leading-relaxed text-muted-foreground duration-500">
                  {stage.caption}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
