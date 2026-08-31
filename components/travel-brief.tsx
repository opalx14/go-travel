"use client";

import { useState } from "react";
import { CornerDownLeft, Plus, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    intentSource,
    protectTrip,
  } = useDemo();
  const [brief, setBrief] = useState(EXAMPLE_BRIEF);
  const [isParsing, setIsParsing] = useState(false);

  const submit = async () => {
    const value = brief.trim();
    if (!value || isProtected || isParsing) return;
    setIsParsing(true);
    try {
      await protectTrip(value);
    } finally {
      setIsParsing(false);
    }
  };

  if (isProtected) {
    return (
      <div className="ti-surface-subtle flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2.5 text-[11px] sm:px-4">
        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Sparkles className="size-3.5 text-sky-400" />
          Outcome
        </span>
        <span className="font-mono text-slate-400">≤ {intent.latestArrival}</span>
        <span className="font-mono text-slate-400">· {intent.minBaggageKg}kg</span>
        <span className="font-mono text-slate-400">· +{intent.departureFlexibilityHours}h</span>
        <span className="font-mono text-emerald-300">· ${intent.maxExtraSpendUsd}</span>
        <span className="ml-auto hidden font-mono text-[10px] text-slate-500 sm:inline">
          {intentSource === "QWEN" ? "Qwen" : "Parser"} · {intent.autopilot ? "Auto" : "Manual"}
        </span>
      </div>
    );
  }

  return (
    <section className="ti-surface relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6">
      <div className="relative mx-auto w-full max-w-4xl">
        <div className="relative">
          <div className="hidden items-start gap-3 sm:flex">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-base font-semibold tracking-[-0.015em]">Define your outcome</p>
            </div>
          </div>

          <div className="ti-surface-subtle rounded-[1.75rem] px-3 py-2.5 transition-all focus-within:border-sky-400/40 sm:mt-5 sm:rounded-2xl sm:p-2">
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


        </div>
      </div>
    </section>
  );
}
