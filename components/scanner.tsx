"use client";

import { Plane } from "lucide-react";
import { useEffect, useState } from "react";
import { useDemo } from "@/lib/demo-store";
import {
  SCANNER_STATUSES,
  stageOfStep,
  type PipelineStageId,
} from "@/lib/presentation";

/**
 * The scanning state: one calm radar, one status line at a time.
 * The line follows the deterministic replay; rotation inside a stage is
 * cosmetic only and never affects state.
 */
export function Scanner() {
  const { playedSteps } = useDemo();

  const stage =
    [...playedSteps]
      .reverse()
      .map((step) => stageOfStep(step.id))
      .find((s): s is PipelineStageId => Boolean(s)) ?? "OBSERVE";

  // Remounting per stage resets the rotation without any effect bookkeeping.
  return <ScannerBody key={stage} statuses={SCANNER_STATUSES[stage]} />;
}

function ScannerBody({ statuses }: { statuses: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (statuses.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % statuses.length),
      1100
    );
    return () => clearInterval(timer);
  }, [statuses.length]);

  const status = statuses[Math.min(index, statuses.length - 1)];

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="relative flex size-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-primary/15" />
        <span className="absolute inset-0 animate-[radar-spin_1.4s_linear_infinite] rounded-full border-2 border-transparent border-t-primary" />
        <span className="absolute inset-3 animate-pulse rounded-full bg-primary/5" />
        <Plane className="relative size-5 text-primary" />
      </div>
      <div>
        <p className="text-base font-semibold tracking-[-0.01em]">
          Finding a recovery
        </p>
        <p
          key={status}
          className="animate-in fade-in mt-1.5 text-sm text-muted-foreground duration-300"
        >
          {status}
        </p>
      </div>
    </div>
  );
}
