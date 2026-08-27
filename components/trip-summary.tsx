"use client";

import { useDemo } from "@/lib/demo-store";
import { hasReachedStage } from "@/lib/presentation";
import { SCHEDULE_CHANGE_EVENT } from "@/lib/scenario";
import { cn } from "@/lib/utils";

const CITY: Record<string, string> = {
  KUL: "Kuala Lumpur",
  SIN: "Singapore",
};

/**
 * The trip itself, as a passenger reads it. A verified replacement is shown
 * below as "Recovery ready"; this summary keeps the currently booked schedule
 * honest until a later phase actually changes the booking.
 */
export function TripSummary() {
  const { trip, intent, phase, playedSteps, activeRun, outcome } = useDemo();

  const disrupted =
    phase === "disrupted" || hasReachedStage(playedSteps, "OBSERVE");
  const recoveryReady = outcome?.status === "RECOVERED";
  const kept = outcome?.status === "DECLINED";
  const event =
    activeRun?.event ??
    (disrupted ? SCHEDULE_CHANGE_EVENT : undefined);
  const changedBooking = Boolean(event) && !kept;

  const times = changedBooking && event
    ? { departure: event.newDeparture, arrival: event.newArrival }
    : { departure: trip.departure, arrival: trip.arrival };

  const status = recoveryReady
    ? { text: "Recovery ready", tone: "text-primary", dot: "bg-primary" }
    : kept
      ? { text: "Trip kept", tone: "text-muted-foreground", dot: "bg-muted-foreground/40" }
      : changedBooking
        ? { text: "Flight changed", tone: "text-rose-600", dot: "bg-rose-500" }
        : { text: "On track", tone: "text-muted-foreground", dot: "bg-emerald-500" };

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-sm font-medium text-muted-foreground">
          Trip to {CITY[trip.destination] ?? trip.destination}
        </h1>
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium transition-colors duration-500",
            status.tone
          )}
        >
          <span className={cn("size-1.5 rounded-full", status.dot)} />
          {status.text}
        </span>
      </div>

      <div className="mt-5 flex items-baseline gap-3 sm:gap-4">
        <p className="font-mono text-[3.25rem] leading-none font-semibold tracking-[-0.03em] sm:text-6xl">
          {trip.origin}
        </p>
        <span className="text-xl text-muted-foreground/60">→</span>
        <p className="font-mono text-[3.25rem] leading-none font-semibold tracking-[-0.03em] sm:text-6xl">
          {trip.destination}
        </p>
      </div>

      <p
        className={cn(
          "mt-4 text-2xl font-medium tabular-nums transition-colors duration-500 sm:text-[1.75rem]",
          recoveryReady
            ? "text-primary"
            : changedBooking
              ? "text-rose-600"
              : ""
        )}
      >
        {changedBooking && event && (
          <span className="mr-3 text-base text-muted-foreground/60 line-through decoration-rose-300">
            {event.originalDeparture} → {event.originalArrival}
          </span>
        )}
        {times.departure} → {times.arrival}
      </p>

      <p className="mt-3 text-sm text-muted-foreground">
        Arrive by {intent.latestArrival} · {intent.minBaggageKg} kg baggage
      </p>

      {recoveryReady ? (
        <p className="mt-4 text-sm font-medium text-primary">
          A verified replacement is ready below. Your current booking is still unchanged.
        </p>
      ) : changedBooking ? (
        <p className="animate-in fade-in mt-4 text-sm text-rose-600 duration-500">
          Your current flight no longer fits your trip.
        </p>
      ) : null}
    </section>
  );
}
