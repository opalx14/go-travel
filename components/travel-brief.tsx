"use client";

import { useState } from "react";
import { CornerDownLeft, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProtectPanel } from "@/components/protect-panel";
import { useDemo } from "@/lib/demo-store";

const EXAMPLE_BRIEF =
  "I need to fly from Kuala Lumpur to Singapore on Aug 28 and arrive before 6 PM. I have 20kg baggage, want to keep the ticket around $100, and you can spend up to $50 extra without asking me if my flight changes.";

/**
 * Conversation-first product entry. For the current prototype the prepared
 * brief maps to the KUL→SIN protected-trip scenario; Qwen will later replace
 * this scenario mapping with real free-form intent extraction.
 */
export function TravelBrief() {
  const { isProtected, protectTrip } = useDemo();
  const [brief, setBrief] = useState(EXAMPLE_BRIEF);
  const [submittedBrief, setSubmittedBrief] = useState(EXAMPLE_BRIEF);

  const submit = () => {
    const value = brief.trim();
    if (!value || isProtected) return;
    setSubmittedBrief(value);
    protectTrip();
  };

  if (isProtected) {
    return (
      <div className="space-y-3">
        <div className="choreo-reveal choreo-delay-1 ml-auto max-w-xl rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm">
          {submittedBrief}
        </div>
        <div className="choreo-reveal choreo-delay-2 max-w-xl rounded-2xl rounded-bl-md border bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-3.5" />
            </span>
            Outcome captured
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            I’ll protect the arrival deadline, baggage requirement and your $50 recovery authority.
          </p>
        </div>
        <div className="choreo-reveal choreo-delay-3">
          <ProtectPanel />
        </div>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border bg-card shadow-[0_24px_70px_rgba(27,42,73,0.09)]">
      <div className="relative px-5 py-5 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_42%)]" />
        <div className="relative">
          <div className="flex items-start gap-3">
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

          <div className="mt-5 rounded-2xl border bg-background/80 p-2 shadow-inner ring-1 ring-primary/5 transition focus-within:border-primary/35 focus-within:ring-4 focus-within:ring-primary/8">
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              rows={4}
              aria-label="Travel outcome"
              className="w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground/55"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-2 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CornerDownLeft className="size-3.5" />
                Press Enter to start
              </div>
              <Button
                type="button"
                size="lg"
                className="h-10 rounded-xl px-4"
                disabled={!brief.trim()}
                onClick={submit}
              >
                Start protecting
                <SendHorizontal className="size-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full border bg-background/70 px-2.5 py-1">KUL → SIN</span>
            <span className="rounded-full border bg-background/70 px-2.5 py-1">Aug 28</span>
            <span className="rounded-full border bg-background/70 px-2.5 py-1">Arrive ≤ 18:00</span>
            <span className="rounded-full border bg-background/70 px-2.5 py-1">20 kg</span>
            <span className="rounded-full border bg-background/70 px-2.5 py-1">+$50 authority</span>
          </div>
        </div>
      </div>
    </section>
  );
}
