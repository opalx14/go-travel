"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  BadgeCheck,
  Check,
  CircleDot,
  Plane,
  Radio,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  RotateCcw,
} from "lucide-react";
import { ActionZone } from "@/components/action-zone";
import { TravelBrief } from "@/components/travel-brief";
import { useDemo } from "@/lib/demo-store";
import { hasReachedStage } from "@/lib/presentation";
import { SCHEDULE_CHANGE_EVENT } from "@/lib/scenario";
import { cn } from "@/lib/utils";

const CITY: Record<string, string> = {
  KUL: "Kuala Lumpur",
  SIN: "Singapore",
};

function TimelineNode({
  state,
  children,
}: {
  state: "done" | "active" | "danger" | "pending";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm transition-all duration-500",
        state === "done" && "border-emerald-200 text-emerald-600",
        state === "active" && "border-primary/30 text-primary ring-4 ring-primary/8",
        state === "danger" && "border-rose-200 text-rose-600 ring-4 ring-rose-100",
        state === "pending" && "border-border text-muted-foreground/45"
      )}
    >
      {state === "active" && (
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/10" />
      )}
      {children}
    </span>
  );
}

function RouteHero() {
  const { trip, intent, phase, outcome, isProtected } = useDemo();
  const changed = phase !== "idle";
  const ready = outcome?.status === "RECOVERED";
  const moving = isProtected && !ready;

  return (
    <section className="overflow-hidden rounded-[2rem] border bg-card shadow-[0_24px_70px_rgba(27,42,73,0.08)]">
      <div className="relative overflow-hidden px-6 py-7 sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_58%)]" />

        <div className="relative flex items-start justify-between gap-6">
          <div>
            <p className="label-caps text-muted-foreground">Protected journey</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              {CITY[trip.origin] ?? trip.origin} → {CITY[trip.destination] ?? trip.destination}
            </h1>
          </div>
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              ready
                ? "border-primary/20 bg-primary/5 text-primary"
                : changed
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}
          >
            {ready ? "Recovery ready" : changed ? "Action required" : isProtected ? "Monitoring" : "Ready to protect"}
          </span>
        </div>

        <div className="relative mt-9 grid grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-6">
          <div>
            <p className="font-mono text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {trip.origin}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{CITY[trip.origin]}</p>
          </div>

          <div className="relative h-16 min-w-0 overflow-hidden">
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
            {moving && (
              <span className="animate-route-scan absolute top-1/2 h-px w-16 -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/70 to-transparent blur-[0.5px]" />
            )}
            <span className="absolute left-0 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary/25 ring-4 ring-primary/5" />
            <span className="absolute right-0 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-primary/8" />
            <span
              className={cn(
                "absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-primary shadow-[0_8px_22px_rgba(27,42,73,0.16)] before:absolute before:-inset-3 before:-z-10 before:rounded-full before:bg-primary/8 before:blur-md",
                moving ? "animate-plane-shuttle" : ready ? "left-[82%]" : "left-[18%]"
              )}
            >
              <Plane className="size-4" fill="currentColor" />
            </span>
          </div>

          <div className="text-right">
            <p className="font-mono text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {trip.destination}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{CITY[trip.destination]}</p>
          </div>
        </div>

        <div className="relative mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-5 text-sm text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground">
            {changed ? SCHEDULE_CHANGE_EVENT.newDeparture : trip.departure} → {changed ? SCHEDULE_CHANGE_EVENT.newArrival : trip.arrival}
          </span>
          <span>Arrive by {intent.latestArrival}</span>
          <span>{intent.minBaggageKg} kg baggage</span>
          <span>Autopilot {intent.autopilot ? "on" : "off"}</span>
        </div>
      </div>
    </section>
  );
}

export function JourneyTimeline() {
  const { phase, isProtected, playedSteps, outcome, resetDemo } = useDemo();
  const watchRef = useRef<HTMLDivElement>(null);
  const recoveryRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const lastScrollKeyRef = useRef("");
  const searched = hasReachedStage(playedSteps, "SEARCH") || phase === "complete";
  const verified = hasReachedStage(playedSteps, "VERIFY") || outcome?.status === "RECOVERED";
  const disrupted = phase !== "idle";
  const running = phase === "running";
  const completed = phase === "complete";

  useEffect(() => {
    let target: HTMLDivElement | null = null;
    let key = "";

    if (completed) {
      target = resultRef.current;
      key = `result-${outcome?.status ?? "complete"}`;
    } else if (running) {
      target = recoveryRef.current;
      key = searched ? "recovery-searched" : "recovery-running";
    } else if (phase === "disrupted") {
      target = watchRef.current;
      key = "watch-disrupted";
    } else if (isProtected) {
      target = watchRef.current;
      key = "watch-protected";
    }

    if (!target || !key || lastScrollKeyRef.current === key) return;
    lastScrollKeyRef.current = key;

    const delayMs =
      key === "watch-protected"
        ? 1450
        : key === "watch-disrupted"
          ? 650
          : key.startsWith("recovery-")
            ? 520
            : 620;

    const timer = window.setTimeout(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "center",
      });
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [completed, isProtected, outcome?.status, phase, running, searched]);

  return (
    <div>
      {!isProtected ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="mb-7 text-center">
            <p className="label-caps text-primary">Outcome-first travel</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Book the outcome, not the flight.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Describe what your trip needs to achieve. TripIntent protects the outcome and steps in when the itinerary breaks it.
            </p>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in-95 duration-500">
          <RouteHero />
        </div>
      )}

      <section className={cn("relative", isProtected ? "mt-8" : "mt-7")}>
        <div className="absolute bottom-10 left-[17px] top-4 w-px overflow-hidden bg-gradient-to-b from-emerald-200 via-border to-primary/20">
          {isProtected && (
            <span className="absolute inset-x-0 top-0 h-24 animate-timeline-flow bg-gradient-to-b from-transparent via-primary/45 to-transparent" />
          )}
        </div>

        <div className="relative grid grid-cols-[36px_1fr] gap-x-4 pb-7 sm:gap-x-5">
          <TimelineNode state={isProtected ? "done" : "active"}>
            {isProtected ? <ShieldCheck className="size-4" /> : <CircleDot className="size-4" />}
          </TimelineNode>
          <div className="min-w-0 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">1. Define the outcome</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  TripIntent protects what matters, not a specific flight number.
                </p>
              </div>
              {isProtected && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <Check className="size-3.5" /> Protected
                </span>
              )}
            </div>
            <div className="mt-3">
              <TravelBrief />
            </div>
          </div>
        </div>

        {isProtected && (
          <div
            ref={watchRef}
            className="animate-in fade-in slide-in-from-bottom-3 relative grid scroll-mt-24 grid-cols-[36px_1fr] gap-x-4 pb-7 duration-500 sm:gap-x-5"
          >
            <TimelineNode state={disrupted ? "danger" : "active"}>
              {disrupted ? <TriangleAlert className="size-4" /> : <Radio className="size-4" />}
            </TimelineNode>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">2. Watch the journey</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Airline changes are monitored against your arrival goal.
                  </p>
                </div>
                {!disrupted && (
                  <span className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                    Monitoring active
                  </span>
                )}
              </div>
              <div className="mt-3">
                {!disrupted || phase === "disrupted" ? (
                  <ActionZone />
                ) : (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-rose-700">
                        Airline update received
                      </p>
                      <span className="label-caps text-rose-600">Schedule changed</span>
                    </div>
                    <p className="mt-1.5 font-mono text-sm tabular-nums text-foreground">
                      {SCHEDULE_CHANGE_EVENT.originalDeparture} → {SCHEDULE_CHANGE_EVENT.originalArrival}
                      <span className="mx-2 text-muted-foreground">⇒</span>
                      <span className="text-rose-700">
                        {SCHEDULE_CHANGE_EVENT.newDeparture} → {SCHEDULE_CHANGE_EVENT.newArrival}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {disrupted && (
          <div
            ref={recoveryRef}
            className="animate-in fade-in slide-in-from-bottom-3 relative grid scroll-mt-24 grid-cols-[36px_1fr] gap-x-4 pb-7 duration-500 sm:gap-x-5"
          >
            <TimelineNode state={searched ? "done" : "active"}>
              <Sparkles className="size-4" />
            </TimelineNode>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">3. Recover with Atlas</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Search real alternatives, filter them by intent, then verify the chosen fare.
                  </p>
                </div>
                {searched && (
                  <span className="text-xs font-medium text-primary">Atlas search complete</span>
                )}
              </div>
              {running && (
                <div className="mt-3 rounded-2xl border bg-card/70 p-1 shadow-sm">
                  <ActionZone />
                </div>
              )}
            </div>
          </div>
        )}

        {completed && (
          <div
            ref={resultRef}
            className="animate-in fade-in slide-in-from-bottom-4 relative grid scroll-mt-24 grid-cols-[36px_1fr] gap-x-4 duration-700 sm:gap-x-5"
          >
            <TimelineNode
              state={
                outcome?.status === "FAILED"
                  ? "danger"
                  : outcome?.status === "NEEDS_APPROVAL"
                    ? "active"
                    : "done"
              }
            >
              {verified ? <BadgeCheck className="size-4" /> : <CircleDot className="size-4" />}
            </TimelineNode>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">4. Present the recovery</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    The passenger sees one clear next step instead of another search problem.
                  </p>
                </div>
                {outcome?.status === "RECOVERED" && (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <Check className="size-3.5" /> Fare verified
                  </span>
                )}
              </div>
              <div className="mt-3">
                <ActionZone />
              </div>
            </div>
          </div>
        )}
      </section>

      {completed && (
        <div className="animate-in fade-in mt-8 flex justify-center duration-500">
          <button
            type="button"
            onClick={resetDemo}
            className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm transition hover:-translate-y-0.5 hover:text-foreground hover:shadow-md"
          >
            <RotateCcw className="size-3.5" />
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
