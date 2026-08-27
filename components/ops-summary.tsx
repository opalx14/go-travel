"use client";

import { useDemo } from "@/lib/demo-store";

/** Compact operational counts — a status line, not a wall of cards. */
export function OpsSummary() {
  const { stats, phase } = useDemo();

  // `needsApproval` counts escalations raised, not a live queue — the store
  // never decrements it once the passenger decides.
  const items = [
    { label: "Cases", value: stats.exceptions },
    { label: "Autonomous", value: stats.autoResolved },
    { label: "Escalated", value: stats.needsApproval },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-4 rounded-xl border bg-card px-5 py-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-2.5">
          <span className="font-mono text-2xl leading-none font-semibold tabular-nums">
            {item.value}
          </span>
          <span className="label-caps text-muted-foreground">
            {item.label}
          </span>
        </div>
      ))}
      <div className="ml-auto flex items-center gap-2">
        <span
          className={
            phase === "running"
              ? "size-1.5 animate-pulse rounded-full bg-primary"
              : "size-1.5 rounded-full bg-emerald-500"
          }
        />
        <span className="label-caps text-muted-foreground">
          {phase === "running" ? "Agent working" : "Agent idle"}
        </span>
      </div>
    </div>
  );
}
