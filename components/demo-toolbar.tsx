"use client";

import { canSimulateDisruption, useDemo } from "@/lib/demo-store";

const toolbarButton =
  "rounded-full border border-dashed border-border px-3 py-1 text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

/**
 * Quiet demo controls, deliberately below the product UI in visual weight.
 */
export function DemoToolbar() {
  const { phase, isProtected, simulateDisruption, resetDemo } = useDemo();

  return (
    <div className="mt-16 flex items-center justify-center gap-3">
      {phase === "idle" && (
        <button
          type="button"
          className={toolbarButton}
          disabled={!canSimulateDisruption(isProtected, phase)}
          onClick={simulateDisruption}
        >
          Demo: Simulate disruption
        </button>
      )}
      {(isProtected || phase !== "idle") && (
        <button type="button" className={toolbarButton} onClick={resetDemo}>
          Reset
        </button>
      )}
    </div>
  );
}
