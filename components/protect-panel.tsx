"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <p className="text-sm text-muted-foreground">{term}</p>
      <div className="text-sm font-medium tabular-nums">{children}</div>
    </div>
  );
}

/**
 * Trip priorities stay available, but they no longer dominate the product.
 * The default view is one concise outcome sentence; details expand on demand.
 */
export function ProtectPanel() {
  const [expanded, setExpanded] = useState(false);
  const { intent, phase, isProtected, setAutopilot, setMaxExtraSpend } =
    useDemo();
  const editable = phase === "idle";

  return (
    <section className="overflow-hidden rounded-2xl border bg-card/80 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/35"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/8 text-primary">
            <SlidersHorizontal className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-[-0.01em]">
                Trip priorities
              </span>
              {isProtected && (
                <span className="label-caps text-emerald-600">Protected</span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground sm:text-sm">
              Arrive by {intent.latestArrival} · +{intent.departureFlexibilityHours}h flex · {intent.minBaggageKg} kg · up to ${intent.maxExtraSpendUsd} · Autopilot {intent.autopilot ? "on" : "off"}
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="animate-in slide-in-from-top-1 border-t px-5 pb-4 duration-200">
          <div className="divide-y">
            <Row term="Arrive by">{intent.latestArrival}</Row>
            <Row term="Baggage">{intent.minBaggageKg} kg minimum</Row>
            <Row term="Departure flexibility">+{intent.departureFlexibilityHours} hours</Row>
            <Row term="Extra spend">
              {editable ? (
                <select
                  aria-label="Extra spend"
                  value={intent.maxExtraSpendUsd}
                  onChange={(event) => setMaxExtraSpend(Number(event.target.value))}
                  className="rounded-md border border-border bg-card px-1.5 py-0.5 text-sm font-semibold text-primary tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {Array.from(new Set([10, 30, 50, 75, 100, intent.maxExtraSpendUsd])).sort((a, b) => a - b).map((usd) => (
                    <option key={usd} value={usd}>
                      Up to ${usd}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-primary">Up to ${intent.maxExtraSpendUsd}</span>
              )}
            </Row>
            <Row term="Trip Autopilot">
              <span className="flex items-center gap-2.5">
                {intent.autopilot ? "ON" : "OFF"}
                <Switch
                  checked={intent.autopilot}
                  onCheckedChange={setAutopilot}
                  aria-label="Trip Autopilot"
                  disabled={!editable}
                />
              </span>
            </Row>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            TripIntent can choose within this limit. Booking remains a separate confirmation step.
          </p>
        </div>
      )}
    </section>
  );
}
