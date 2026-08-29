"use client";

import { useState } from "react";
import { CornerDownLeft, Plus, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProtectPanel } from "@/components/protect-panel";
import { useDemo } from "@/lib/demo-store";

const EXAMPLE_BRIEF =
  "I need to reach Singapore before 6 PM with at least 20kg checked baggage. If my flight changes, you can spend up to $50 extra without asking me. I can leave up to 3 hours later.";

/**
 * Conversation-first product entry. The passenger's free-form brief is
 * compiled into the deterministic TravelIntent contract used by the recovery
 * engine; the KUL→SIN itinerary itself remains the demo's protected booking.
 */
export function TravelBrief() {
  const {
    isProtected,
    intent,
    intentMatchedFields,
    intentSource,
    protectTrip,
  } = useDemo();
  const [brief, setBrief] = useState(EXAMPLE_BRIEF);
  const [submittedBrief, setSubmittedBrief] = useState(EXAMPLE_BRIEF);
  const [isParsing, setIsParsing] = useState(false);

  const submit = async () => {
    const value = brief.trim();
    if (!value || isProtected || isParsing) return;
    setIsParsing(true);
    setSubmittedBrief(value);
    try {
      await protectTrip(value);
    } finally {
      setIsParsing(false);
    }
  };

  if (isProtected) {
    return (
      <div className="space-y-3">
        <div className="choreo-reveal choreo-delay-1 ml-auto max-w-[88%] rounded-3xl rounded-br-lg bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm sm:max-w-xl sm:rounded-2xl sm:rounded-br-md">
          {submittedBrief}
        </div>
        <div className="choreo-reveal choreo-delay-2 max-w-[92%] rounded-3xl rounded-bl-lg border bg-card px-4 py-3 shadow-sm sm:max-w-xl sm:rounded-2xl sm:rounded-bl-md">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-3.5" />
            </span>
            <span className="sm:hidden">Got it</span>
            <span className="hidden sm:inline">Outcome captured</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:hidden">
            Arrive by {intent.latestArrival} · {intent.minBaggageKg} kg · +{intent.departureFlexibilityHours}h · auto ≤ ${intent.maxExtraSpendUsd}
          </p>
          <p className="mt-2 hidden text-sm leading-relaxed text-muted-foreground sm:block">
            Intent compiled: arrive by {intent.latestArrival}, at least {intent.minBaggageKg}kg baggage, departure flexibility +{intent.departureFlexibilityHours}h, and up to ${intent.maxExtraSpendUsd} delegated spend.
          </p>
          <p className="mt-2 hidden text-xs text-muted-foreground/80 sm:block">
            {intentMatchedFields.length} constraint{intentMatchedFields.length === 1 ? "" : "s"} read directly from your brief · {intentSource === "QWEN" ? "Qwen extraction" : "Deterministic fallback"} · Autopilot {intent.autopilot ? "on" : "off"}
          </p>
        </div>
        <div className="choreo-reveal choreo-delay-3 hidden sm:block">
          <ProtectPanel />
        </div>
      </div>
    );
  }

  return (
    <section className="fixed inset-x-0 bottom-0 z-40 bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:static sm:z-auto sm:overflow-hidden sm:rounded-[1.75rem] sm:border sm:border-border/70 sm:bg-card sm:px-0 sm:pb-0 sm:pt-0 sm:shadow-2xl sm:shadow-slate-200/50 sm:backdrop-blur-none dark:sm:shadow-black/25">
      <div className="relative mx-auto w-full max-w-4xl py-0 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_15%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_42%)] sm:block" />
        <div className="relative">
          <div className="hidden items-start gap-3 sm:flex">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-base font-semibold tracking-[-0.015em]">
                Where do you need to be?
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Tell TripIntent the outcome. Include where you’re going, when you must arrive, baggage and your budget.
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-card px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.10)] ring-1 ring-foreground/5 transition-all focus-within:ring-2 focus-within:ring-primary/20 sm:mt-5 sm:rounded-2xl sm:bg-background/80 sm:p-2 sm:shadow-sm sm:backdrop-blur-xl dark:sm:bg-background/60 dark:sm:ring-white/10">
            <div className="flex items-end gap-2 sm:block">
              <button
                type="button"
                aria-label="More options"
                className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground sm:hidden"
              >
                <Plus className="size-5" />
              </button>

              <textarea
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                rows={4}
                aria-label="Travel outcome"
                placeholder="Tell TripIntent your outcome…"
                className="min-h-12 max-h-32 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-2 text-[15px] leading-6 outline-none [field-sizing:content] placeholder:text-muted-foreground/55 sm:min-h-24 sm:max-h-52 sm:w-full sm:px-3 sm:py-2"
              />

              <Button
                type="button"
                size="lg"
                aria-label={isParsing ? "Reading intent" : "Start protecting"}
                className="mb-0.5 size-10 shrink-0 rounded-full p-0 sm:hidden"
                disabled={!brief.trim() || isParsing}
                onClick={() => void submit()}
              >
                <SendHorizontal className="size-4" />
              </Button>
            </div>

            <div className="hidden items-center justify-between gap-3 border-t px-2 pt-2 sm:flex">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CornerDownLeft className="size-3.5" />
                Press Enter to start
              </div>
              <Button
                type="button"
                size="lg"
                className="h-10 rounded-xl px-4"
                disabled={!brief.trim() || isParsing}
                onClick={() => void submit()}
              >
                {isParsing ? "Reading intent…" : "Start protecting"}
                <SendHorizontal className="size-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 hidden flex-wrap items-center gap-2 text-[11px] text-muted-foreground sm:flex">
            <span className="rounded-full border bg-background/70 px-2.5 py-1">KUL → SIN protected trip</span>
            <span className="rounded-full border bg-background/70 px-2.5 py-1">Natural-language intent</span>
            <span className="rounded-full border bg-background/70 px-2.5 py-1">Arrival deadline</span>
            <span className="rounded-full border bg-background/70 px-2.5 py-1">Baggage requirement</span>
            <span className="rounded-full border bg-background/70 px-2.5 py-1">Delegated spend</span>
          </div>
        </div>
      </div>
    </section>
  );
}
