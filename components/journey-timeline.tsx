"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  BadgeCheck,
  Check,
  CircleDot,
  Clock,
  Luggage,
  Plane,
  Radio,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { ActionZone } from "@/components/action-zone";
import { AirportScene } from "@/components/airport-scene";
import { TravelBrief } from "@/components/travel-brief";
import { useDemo } from "@/lib/demo-store";
import { hasReachedStage } from "@/lib/presentation";
import { SCHEDULE_CHANGE_EVENT } from "@/lib/scenario";
import { cn } from "@/lib/utils";

const CITY: Record<string, string> = {
  KUL: "Kuala Lumpur",
  SIN: "Singapore",
};

const AIRPORT_FULL: Record<string, { name: string; terminal: string }> = {
  KUL: { name: "Kuala Lumpur International Airport", terminal: "Terminal 1 · Pier Alpha" },
  SIN: { name: "Singapore Changi Airport", terminal: "Terminal 3 · Jewel Concourse" },
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
        "ti-surface relative z-10 hidden size-10 shrink-0 items-center justify-center rounded-full transition-all duration-500 sm:flex",
        state === "done" && "border-emerald-300 text-emerald-600 bg-emerald-500/5 ring-4 ring-emerald-500/10",
        state === "active" && "border-primary/40 text-primary ring-4 ring-primary/10 shadow-primary/10",
        state === "danger" && "border-rose-300 text-rose-600 ring-4 ring-rose-500/15 bg-rose-500/5",
        state === "pending" && "border-border text-muted-foreground/45"
      )}
    >
      {state === "active" && (
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/15" />
      )}
      {children}
    </span>
  );
}

function RouteHero() {
  const { trip, intent, phase, outcome, isProtected, persistenceStatus } = useDemo();
  const changed = phase !== "idle";
  const ready = outcome?.status === "RECOVERED";
  const moving = isProtected && !ready;
  const selectedFlight = outcome?.selected;

  return (
    <section className="overflow-hidden rounded-[2.2rem] border border-border/80 bg-card shadow-[0_30px_90px_rgba(15,23,42,0.12)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.4)]">
      <div className="relative overflow-hidden p-4 sm:p-7">
        {/* Ambient Top Background Glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_65%)]" />

        {/* HERO HEADER: Route & Live Status Pill */}
        <div className="relative flex flex-col justify-between gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="label-caps font-bold tracking-widest text-primary">
                {isProtected ? "Outcome-Protected Journey" : "Journey Preview"}
              </span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="font-mono text-xs text-muted-foreground">
                ID: {trip.id}
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-bold tracking-[-0.03em] sm:text-3xl text-foreground">
              {CITY[trip.origin] ?? trip.origin}{" "}
              <span className="text-primary font-normal">→</span>{" "}
              {CITY[trip.destination] ?? trip.destination}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {AIRPORT_FULL[trip.origin]?.terminal} → {AIRPORT_FULL[trip.destination]?.terminal}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all duration-300",
                ready
                  ? "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                  : changed
                    ? "border-rose-300 bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20"
                    : isProtected
                      ? "border-primary/30 bg-primary/5 text-primary ring-2 ring-primary/10"
                      : "border-border bg-muted/60 text-muted-foreground"
              )}
            >
              {ready ? (
                <>
                  <Sparkles className="size-3.5 text-emerald-500" />
                  <span>Recovery Secured · Gate A18 Docked</span>
                </>
              ) : changed ? (
                <>
                  <TriangleAlert className="size-3.5 animate-pulse text-rose-500" />
                  <span>Schedule Disrupted · Action Required</span>
                </>
              ) : isProtected ? (
                <>
                  <Zap className="size-3.5 text-primary" />
                  <span>Autonomous Monitoring Live</span>
                </>
              ) : (
                <>
                  <CircleDot className="size-3.5" />
                  <span>Not protected yet</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* 2D AIRPORT OPERATIONS MAP */}
        <div className="relative mt-5">
          <AirportScene
            origin={trip.origin}
            destination={trip.destination}
            moving={moving}
            disrupted={changed && !ready}
            recovered={ready}
            flight={trip}
            disruptedFlight={{
              departure: SCHEDULE_CHANGE_EVENT.newDeparture,
              arrival: SCHEDULE_CHANGE_EVENT.newArrival,
            }}
            recoveredFlight={selectedFlight}
            phase={phase}
            isProtected={isProtected}
            intent={intent}
          />
        </div>

        {/* INTERACTIVE FLIGHT SCHEDULE & TIMETABLE COMPARISON */}
        <div className="relative mt-5 rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm backdrop-blur-md">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6">
            {/* Origin Card */}
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-mono text-base font-bold">
                {trip.origin}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {CITY[trip.origin]} · {AIRPORT_FULL[trip.origin]?.name}
                </p>
                <div className="mt-1 flex items-center gap-2 font-mono text-sm">
                  {changed && !ready ? (
                    <>
                      <span className="line-through text-muted-foreground">
                        {trip.departure}
                      </span>
                      <span className="text-rose-600 font-bold dark:text-rose-400">
                        {SCHEDULE_CHANGE_EVENT.newDeparture}
                      </span>
                    </>
                  ) : ready && selectedFlight ? (
                    <>
                      <span className="line-through text-muted-foreground">
                        {trip.departure}
                      </span>
                      <span className="text-emerald-600 font-bold dark:text-emerald-400">
                        {selectedFlight.departure}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-foreground">
                      {trip.departure}
                    </span>
                  )}
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                    Gate {ready ? "A18" : "A12"}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Flight Path Arc */}
            <div className="flex flex-col items-center justify-center px-2">
              <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase">
                {ready
                  ? `${selectedFlight?.airline ?? "Atlas Verified"} · ${selectedFlight?.flightNo ?? "CA 88"}`
                  : changed
                    ? `${trip.airline} · ${trip.flightNo} (Delayed)`
                    : `${trip.airline} · ${trip.flightNo}`}
              </span>
              <div className="mt-1 flex items-center gap-2 text-primary">
                <span className="h-0.5 w-10 sm:w-16 bg-primary/40 rounded-full" />
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Plane className="size-3.5 rotate-45" fill="currentColor" />
                </span>
                <span className="h-0.5 w-10 sm:w-16 bg-primary/40 rounded-full" />
              </div>
              <span className="mt-1 text-[10px] text-muted-foreground">
                Nonstop · 1h 10m
              </span>
            </div>

            {/* Destination Card */}
            <div className="flex items-center justify-start sm:justify-end gap-3 text-left sm:text-right">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {CITY[trip.destination]} · {AIRPORT_FULL[trip.destination]?.name}
                </p>
                <div className="mt-1 flex items-center justify-start sm:justify-end gap-2 font-mono text-sm">
                  {changed && !ready ? (
                    <>
                      <span className="line-through text-muted-foreground">
                        {trip.arrival}
                      </span>
                      <span className="text-rose-600 font-bold dark:text-rose-400">
                        {SCHEDULE_CHANGE_EVENT.newArrival} ❌
                      </span>
                    </>
                  ) : ready && selectedFlight ? (
                    <>
                      <span className="line-through text-muted-foreground">
                        {trip.arrival}
                      </span>
                      <span className="text-emerald-600 font-bold dark:text-emerald-400">
                        {selectedFlight.arrival} ✅
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-foreground">
                      {trip.arrival}
                    </span>
                  )}
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    T3 Jewel
                  </span>
                </div>
              </div>
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-mono text-base font-bold">
                {trip.destination}
              </div>
            </div>
          </div>
        </div>

        {/* INTENT CONTRACT & POLICY CHIPS */}
        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 font-mono text-[11px] text-foreground">
              <Clock className="size-3 text-primary" /> Must arrive by {intent.latestArrival}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 font-mono text-[11px] text-foreground">
              <Luggage className="size-3 text-primary" /> {intent.minBaggageKg} kg checked bag
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 font-mono text-[11px] text-foreground">
              <ShieldCheck className="size-3 text-emerald-600" /> Autopilot ≤ ${intent.maxExtraSpendUsd}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span>Airport map positions are simulated</span>
            <span className="hidden sm:inline">·</span>
            <span>
              {persistenceStatus === "loading"
                ? "Loading saved trip…"
                : persistenceStatus === "saving"
                  ? "Saving on this device…"
                  : persistenceStatus === "error"
                    ? "Device save unavailable"
                    : "Trip saved on this device"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function JourneyTimeline({ showHero = false }: { showHero?: boolean }) {
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
    <div className="space-y-6">
      {showHero && (
        <div className="animate-in fade-in zoom-in-95 duration-500">
          <RouteHero />
        </div>
      )}

      {/* TIMELINE SECTION */}
      <section className="relative">
        {/* Continuous Flowing Rail */}
        <div className="absolute bottom-10 left-[19px] top-4 hidden w-px overflow-hidden bg-gradient-to-b from-emerald-400/40 via-white/10 to-sky-400/30 sm:block">
          {isProtected && (
            <span className="absolute inset-x-0 top-0 h-32 animate-timeline-flow bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
          )}
        </div>

        {/* STEP 1: Define Outcome */}
        <div className="relative grid grid-cols-1 pb-0 sm:grid-cols-[40px_1fr] sm:gap-x-5 sm:pb-7">
          <TimelineNode state={isProtected ? "done" : "active"}>
            {isProtected ? <ShieldCheck className="size-4.5" /> : <CircleDot className="size-4.5" />}
          </TimelineNode>
          <div className="min-w-0 pt-1">
            <div className="hidden flex-wrap items-center justify-between gap-2 sm:flex">
              <p className="text-sm font-bold text-foreground">1. Outcome</p>
              {isProtected && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3.5" /> Protected
                </span>
              )}
            </div>
            <div className="mt-0 sm:mt-3">
              <TravelBrief />
            </div>
          </div>
        </div>

        {/* STEP 2: Watch Journey */}
        {isProtected && (
          <div
            ref={watchRef}
            className="animate-in fade-in slide-in-from-bottom-3 relative grid scroll-mt-24 grid-cols-1 pb-6 duration-500 sm:grid-cols-[40px_1fr] sm:gap-x-5 sm:pb-7"
          >
            <TimelineNode state={disrupted ? "danger" : "active"}>
              {disrupted ? <TriangleAlert className="size-4.5" /> : <Radio className="size-4.5" />}
            </TimelineNode>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-foreground">2. Monitor</p>
                {!disrupted && (
                  <span className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                    Live
                  </span>
                )}
              </div>
              <div className="mt-3">
                {!disrupted || phase === "disrupted" ? (
                  <ActionZone />
                ) : (
                  <div className="ti-surface rounded-2xl border-rose-500/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                        Schedule changed
                      </p>
                      <span className="label-caps font-bold text-rose-600 dark:text-rose-400">
                        Goal missed
                      </span>
                    </div>
                    <p className="mt-1.5 font-mono text-sm tabular-nums text-foreground">
                      {SCHEDULE_CHANGE_EVENT.originalDeparture} → {SCHEDULE_CHANGE_EVENT.originalArrival}
                      <span className="mx-2 text-muted-foreground">⇒</span>
                      <span className="text-rose-600 dark:text-rose-300 font-bold">
                        {SCHEDULE_CHANGE_EVENT.newDeparture} → {SCHEDULE_CHANGE_EVENT.newArrival}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Recover with Atlas */}
        {disrupted && (
          <div
            ref={recoveryRef}
            className="animate-in fade-in slide-in-from-bottom-3 relative grid scroll-mt-24 grid-cols-1 pb-6 duration-500 sm:grid-cols-[40px_1fr] sm:gap-x-5 sm:pb-7"
          >
            <TimelineNode state={searched ? "done" : "active"}>
              <Sparkles className="size-4.5" />
            </TimelineNode>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-foreground">3. Recover</p>
                {searched && (
                  <span className="text-xs font-semibold text-primary">
                    Atlas verified
                  </span>
                )}
              </div>
              {running && (
                <div className="ti-surface mt-3 rounded-2xl p-1">
                  <ActionZone />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Present Recovery */}
        {completed && (
          <div
            ref={resultRef}
            className="animate-in fade-in slide-in-from-bottom-4 relative grid scroll-mt-24 grid-cols-1 duration-700 sm:grid-cols-[40px_1fr] sm:gap-x-5"
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
              {verified ? <BadgeCheck className="size-4.5" /> : <CircleDot className="size-4.5" />}
            </TimelineNode>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-foreground">4. Result</p>
                {outcome?.status === "RECOVERED" && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
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

      {/* START OVER BUTTON */}
      {completed && (
        <div className="animate-in fade-in mt-8 flex justify-center duration-500">
          <button
            type="button"
            onClick={resetDemo}
            className="ti-control inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-muted-foreground transition-all hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            New demo
          </button>
        </div>
      )}
    </div>
  );
}
