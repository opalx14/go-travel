"use client";

import { Clock3, PlayCircle } from "lucide-react";
import { JUDGE_FAST_PATH } from "@/lib/judge-fast-path";

function mmss(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function JudgeFastPathPanel() {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <PlayCircle className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">3-minute judge fast path</h3>
          </div>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            Fixed 180-second demo choreography. It prioritizes outcome, Atlas/Qwen orchestration, safety boundaries, reproducible proof, and business value without adding demo-only behavior.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
          <Clock3 className="size-3" /> 3:00 total
        </span>
      </header>

      <div className="divide-y">
        {JUDGE_FAST_PATH.map((segment) => (
          <article key={segment.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[70px_1fr] sm:px-5">
            <div className="font-mono text-[10px] font-semibold text-primary">
              {mmss(segment.startSecond)}–{mmss(segment.endSecond)}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground">{segment.title}</h4>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{segment.proof}</p>
              <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Cue:</span> {segment.operatorCue}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
