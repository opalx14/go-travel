"use client";

import {
  ArrowRight,
  Check,
  Plane,
  SearchX,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Scanner } from "@/components/scanner";
import { useDemo } from "@/lib/demo-store";
import { authorityShortfall } from "@/lib/presentation";
import { SCHEDULE_CHANGE_EVENT } from "@/lib/scenario";

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function lateBy(arrival: string, deadline: string): string {
  const minutes = Math.max(0, toMinutes(arrival) - toMinutes(deadline));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m late`;
  return `${hours}h ${String(rest).padStart(2, "0")}m late`;
}

/**
 * The passenger story lives here: disruption → one action → agent work →
 * verified recovery. Technical evidence is deliberately moved out of this
 * surface and into the agent trace drawer.
 */
export function ActionZone() {
  const {
    intent,
    phase,
    outcome,
    isProtected,
    protectTrip,
    findRecovery,
    approveRecovery,
    declineRecovery,
  } = useDemo();

  if (phase === "running") {
    return <Scanner />;
  }

  if (phase === "disrupted") {
    return (
      <section className="ti-surface disruption-card overflow-hidden rounded-2xl border-rose-500/25">
        <div className="relative px-6 py-8 text-center sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px animate-disruption-scan bg-gradient-to-r from-transparent via-rose-400/70 to-transparent" />

          <span className="choreo-reveal choreo-delay-1 mx-auto flex size-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 ring-8 ring-rose-500/5 dark:text-rose-300">
            <TriangleAlert className="size-5" />
          </span>
          <div className="choreo-reveal choreo-delay-2">
            <p className="mt-5 text-xs font-semibold tracking-[0.16em] text-rose-600 uppercase">
              Airline signal detected
            </p>
            <p className="mt-1 text-base font-semibold tracking-[-0.01em] text-rose-800 dark:text-rose-300">
              Your flight no longer meets the outcome
            </p>
          </div>

          <div className="mt-7 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-5">
            <div className="ti-surface-subtle choreo-reveal choreo-delay-3 rounded-xl px-4 py-3 text-center sm:text-right">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em]">Original</p>
              <p className="mt-1 font-mono text-lg font-medium tabular-nums text-muted-foreground line-through decoration-rose-300 decoration-2">
                {SCHEDULE_CHANGE_EVENT.originalDeparture} → {SCHEDULE_CHANGE_EVENT.originalArrival}
              </p>
            </div>

            <span className="ti-control choreo-reveal choreo-delay-4 mx-auto flex size-8 items-center justify-center rounded-full text-rose-400">
              <ArrowRight className="size-3.5" />
            </span>

            <div className="ti-status-danger choreo-reveal choreo-delay-5 rounded-xl border px-4 py-3 text-center sm:text-left">
              <p className="text-[11px] font-medium text-rose-600 uppercase tracking-[0.12em]">Changed</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                {SCHEDULE_CHANGE_EVENT.newDeparture} → {SCHEDULE_CHANGE_EVENT.newArrival}
              </p>
            </div>
          </div>

          <div className="ti-surface-subtle choreo-reveal choreo-delay-6 mx-auto mt-5 max-w-md rounded-xl px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Arrival goal <span className="font-mono font-medium text-foreground">{intent.latestArrival}</span>
              <span className="mx-2 text-muted-foreground/45">•</span>
              <span className="font-semibold text-rose-700 dark:text-rose-300">
                {lateBy(SCHEDULE_CHANGE_EVENT.newArrival, intent.latestArrival)}
              </span>
            </p>
          </div>

          <div className="choreo-reveal choreo-delay-7">
            <Button
              size="lg"
              className="mt-6 h-12 rounded-xl px-8 text-[15px] shadow-[0_10px_24px_rgba(37,99,235,0.20)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(37,99,235,0.25)]"
              onClick={findRecovery}
            >
              Find a recovery
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (phase === "complete" && outcome) {
    const selected = outcome.selected;

    if (outcome.status === "RECOVERED" && selected) {
      const verification = outcome.verification;
      const fromAtlas = verification?.source === "ATLAS_SANDBOX";
      const onTime =
        (selected.arrivalDayOffset ?? 0) === 0 &&
        toMinutes(selected.arrival) <= toMinutes(intent.latestArrival);

      return (
        <section className="ti-surface animate-in fade-in overflow-hidden rounded-2xl border-emerald-500/25 duration-500">
          <div className="border-b ti-divider bg-emerald-500/[0.035] px-6 py-5 text-center sm:px-8">
            <p className="flex items-center justify-center gap-2 text-lg font-bold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="size-5 text-emerald-500" />
              Verified Recovery Ready
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              TripIntent autonomous agent found a verified replacement meeting your {intent.latestArrival} arrival deadline.
            </p>
          </div>

          <div className="grid sm:grid-cols-[1fr_auto_1fr]">
            <div className="px-6 py-6 sm:px-8 bg-rose-500/[0.02]">
              <div className="flex items-center justify-between gap-2">
                <p className="label-caps font-bold text-rose-600">Disrupted Flight</p>
                <span className="rounded-md bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] text-rose-600 font-bold">
                  Gate A12 · Delayed
                </span>
              </div>
              <p className="mt-3 font-mono text-xl font-bold tabular-nums text-foreground">
                {SCHEDULE_CHANGE_EVENT.newDeparture} → {SCHEDULE_CHANGE_EVENT.newArrival}
              </p>
              <p className="mt-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
                {lateBy(SCHEDULE_CHANGE_EVENT.newArrival, intent.latestArrival)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Misses your {intent.latestArrival} arrival limit
              </p>
            </div>

            <div className="hidden items-center justify-center px-2 sm:flex">
              <span className="flex size-10 items-center justify-center rounded-full border border-emerald-500/30 bg-background text-emerald-600 shadow-md">
                <ArrowRight className="size-4.5" />
              </span>
            </div>

            <div className="border-t ti-divider bg-emerald-500/[0.025] px-6 py-6 sm:border-t-0 sm:px-8">
              <div className="flex items-center justify-between gap-3">
                <p className="label-caps font-bold text-emerald-600">Best Recovery Flight</p>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  Recovery option · Ready
                </span>
              </div>
              <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-foreground">
                {selected.departure} → {selected.arrival}
                {(selected.arrivalDayOffset ?? 0) > 0
                  ? ` (+${selected.arrivalDayOffset}d)`
                  : ""}
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {onTime ? `Arrives before ${intent.latestArrival} goal (On-Time)` : "Matches your travel constraints"}
              </p>
              <p className="mt-1 text-xs font-mono text-muted-foreground tabular-nums">
                {selected.airline ?? "Atlas Partner"} · {selected.flightNo} ·{" "}
                {selected.replacementPriceUsd !== undefined
                  ? `Fare $${selected.replacementPriceUsd.toFixed(2)}`
                  : `+$${selected.extraCostUsd}`}{" "}
                · {selected.baggageKg !== undefined ? `${selected.baggageKg} kg bag` : "Baggage unconfirmed"}
              </p>
              {verification && (
                <div className="mt-3.5 flex items-center gap-2">
                  <span
                    className={
                      fromAtlas
                        ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        : "label-caps inline-flex rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700"
                    }
                  >
                    {fromAtlas && <Check className="size-3.5" />}
                    {fromAtlas
                      ? "Fare Verified via Atlas Sandbox"
                      : "SIMULATED FALLBACK — Atlas unreachable"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t ti-divider bg-white/[0.018] px-6 py-3.5 text-center text-xs text-muted-foreground sm:px-8">
            Verified recovery is ready for the next booking step · Monitored by TripIntent.
          </div>
        </section>
      );
    }

    if (outcome.status === "NEEDS_APPROVAL" && selected) {
      if (outcome.approval === "PRICE_INCREASED") {
        const verification = outcome.verification;
        return (
          <div className="ti-surface animate-in fade-in flex flex-col items-center gap-1.5 rounded-2xl px-6 py-7 text-center duration-500">
            <p className="flex items-center gap-2 text-lg font-semibold text-amber-700">
              <UserCheck className="size-5" />
              Price changed — approval required
            </p>
            <p className="mt-2 font-mono text-xl font-semibold tabular-nums">
              {selected.flightNo} · {selected.departure} → {selected.arrival}
            </p>
            {verification && (
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                ${(verification.previousPrice ?? 0).toFixed(2)} → ${
                  (verification.currentPrice ?? 0).toFixed(2)
                }
              </p>
            )}
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              The fare increased after selection. Approve the new price to keep this recovery ready for the next booking step.
            </p>
            <div className="mt-5 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
              <Button size="lg" onClick={approveRecovery}>
                Approve new price
              </Button>
              <Button size="lg" variant="outline" onClick={declineRecovery}>
                Keep current flight
              </Button>
            </div>
          </div>
        );
      }

      const shortfall = authorityShortfall(outcome, intent);
      return (
        <div className="ti-surface animate-in fade-in flex flex-col items-center gap-1.5 rounded-2xl px-6 py-7 text-center duration-500">
          <p className="flex items-center gap-2 text-lg font-semibold text-amber-700">
            <UserCheck className="size-5" />
            Approval needed
          </p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums">
            {selected.flightNo}
          </p>
          <p className="text-lg font-medium tabular-nums">
            {selected.departure} → {selected.arrival} · +${selected.extraCostUsd}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {shortfall > 0
              ? `Your auto limit is $${intent.maxExtraSpendUsd}. This recovery is $${shortfall} above it.`
              : "Trip Autopilot is off."}
          </p>
          <div className="mt-5 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
            <Button size="lg" onClick={approveRecovery}>
              Approve ${selected.extraCostUsd}
            </Button>
            <Button size="lg" variant="outline" onClick={declineRecovery}>
              Keep current flight
            </Button>
          </div>
        </div>
      );
    }

    if (outcome.status === "DECLINED") {
      return (
        <div className="ti-surface animate-in fade-in flex flex-col items-center gap-1.5 rounded-2xl py-7 text-center duration-500">
          <p className="text-lg font-semibold">Current trip kept</p>
          <p className="text-sm text-muted-foreground">
            No booking change was made.
          </p>
        </div>
      );
    }

    const failureDetail = outcome.steps.at(-1)?.detail;
    return (
      <div className="ti-surface animate-in fade-in flex flex-col items-center gap-1.5 rounded-2xl py-7 text-center duration-500">
        <p className="flex items-center gap-2 text-lg font-semibold text-rose-700">
          <SearchX className="size-5" />
          Recovery unavailable
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          {failureDetail ?? "No flight fit your limits. Your booking is unchanged."}
        </p>
      </div>
    );
  }

  if (!isProtected) {
    return (
      <div className="flex flex-col items-center gap-3 py-5 text-center">
        <Button
          size="lg"
          className="h-12 rounded-xl px-8 text-[15px] shadow-sm"
          onClick={() =>
            void protectTrip(
              `Protect my current trip. Arrive by ${intent.latestArrival}, minimum ${intent.minBaggageKg}kg baggage, allow up to ${intent.departureFlexibilityHours} hours later departure, and spend up to $${intent.maxExtraSpendUsd} extra ${intent.autopilot ? "without asking me" : "but ask me first"}.`
            )
          }
        >
          Protect my trip
        </Button>
        <p className="text-xs text-muted-foreground">
          TripIntent watches this outcome and steps in when the itinerary breaks it.
        </p>
      </div>
    );
  }

  return (
    <div className="ti-surface animate-in fade-in overflow-hidden rounded-2xl duration-700">
      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Check className="size-4" strokeWidth={2.5} />
              Protection armed
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Watching airline schedule changes against your {intent.latestArrival} arrival goal.
            </p>
          </div>
          <span className="flex items-center gap-2 text-xs font-medium text-emerald-700">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-55" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>

        <div className="ti-surface-subtle relative mt-5 h-16 overflow-hidden rounded-xl">
          <div className="absolute inset-0 monitoring-grid opacity-55" />
          <div className="absolute inset-x-5 top-1/2 border-t border-dashed border-primary/20" />
          <span className="absolute left-5 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary/30 ring-4 ring-primary/5" />
          <span className="absolute right-5 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-primary/8" />
          <span className="ti-control animate-monitor-plane absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-primary">
            <Plane className="size-3.5" fill="currentColor" />
          </span>
          <span className="animate-monitor-sweep pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-primary/10 to-transparent blur-sm" />
          <div className="absolute inset-x-5 bottom-1.5 flex justify-between font-mono text-[9px] tracking-[0.08em] text-muted-foreground/70">
            <span>KUL</span>
            <span>SIN</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>Schedule feed connected</span>
          <span className="font-mono">checking continuously…</span>
        </div>
      </div>
    </div>
  );
}
