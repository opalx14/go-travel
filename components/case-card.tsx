"use client";

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import {
  buildPolicyGate,
  hasReachedStage,
  recoveryHeadline,
} from "@/lib/presentation";
import { ORIGINAL_FLIGHT, SCHEDULE_CHANGE_EVENT } from "@/lib/scenario";
import { cn } from "@/lib/utils";

function Row({
  term,
  children,
  tone,
}: {
  term: string;
  children: ReactNode;
  tone?: "muted" | "success" | "warning" | "danger";
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[168px_1fr] sm:gap-4">
      <p className="label-caps pt-0.5 text-muted-foreground">{term}</p>
      <p
        className={cn(
          "text-sm leading-relaxed",
          tone === "muted" && "text-muted-foreground",
          tone === "success" && "font-medium text-emerald-700",
          tone === "warning" && "font-medium text-amber-700",
          tone === "danger" && "font-medium text-rose-700"
        )}
      >
        {children}
      </p>
    </div>
  );
}

/**
 * The single open case, written as an operator would read it: what broke,
 * what the passenger asked for, what the agent chose, and who authorized it.
 */
export function CaseCard() {
  const { intent, phase, playedSteps, activeRun, outcome } = useDemo();

  if (!activeRun) {
    // A disruption has been recorded but the passenger has not asked for a
    // recovery yet — show the event, not "no open cases".
    if (phase === "disrupted") {
      return (
        <section className="rounded-2xl border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="border-b px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs font-medium tracking-wide uppercase">
                {SCHEDULE_CHANGE_EVENT.tripId}
              </p>
              <span className="label-caps rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">
                {SCHEDULE_CHANGE_EVENT.type}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium">
              {ORIGINAL_FLIGHT.flightNo} · {ORIGINAL_FLIGHT.origin} →{" "}
              {ORIGINAL_FLIGHT.destination}
            </p>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {SCHEDULE_CHANGE_EVENT.originalDeparture} →{" "}
              {SCHEDULE_CHANGE_EVENT.originalArrival} ⇒{" "}
              <span className="text-rose-600">
                {SCHEDULE_CHANGE_EVENT.newDeparture} →{" "}
                {SCHEDULE_CHANGE_EVENT.newArrival}
              </span>
            </p>
          </header>
          <div className="px-5 py-4">
            <p className="text-sm font-medium">Disruption recorded</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Awaiting passenger request — the agent holds the case until the
              passenger asks for a recovery.
            </p>
          </div>
        </section>
      );
    }
    return (
      <section className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-card/50 px-5 py-10 text-center">
        <Inbox className="size-5 text-muted-foreground" />
        <p className="text-sm font-medium">No open cases</p>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          Simulate a schedule change to open a recovery case.
        </p>
      </section>
    );
  }

  const { event } = activeRun;
  const gate = buildPolicyGate(activeRun, intent);
  const decided = hasReachedStage(playedSteps, "EVALUATE");
  const gated = hasReachedStage(playedSteps, "POLICY");
  const settled = phase === "complete" && outcome;

  // Provenance: where every fact came from — no raw payloads, just sources.
  const searchSource = activeRun.evaluations.some(
    (e) => e.option.source === "ATLAS_SANDBOX"
  )
    ? "ATLAS SANDBOX"
    : activeRun.evaluations.length > 0
      ? "SIMULATED FALLBACK"
      : "—";
  const verification = activeRun.verification;
  const verificationSource = verification
    ? `${verification.source === "ATLAS_SANDBOX" ? "ATLAS SANDBOX" : "SIMULATED FALLBACK"} · ${verification.priceChange}`
    : "—";

  return (
    <section className="rounded-2xl border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <header className="border-b px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs font-medium tracking-wide uppercase">
            {event.tripId}
          </p>
          <span className="label-caps rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">
            {event.type}
          </span>
        </div>
        <p className="mt-2 text-sm font-medium">
          {ORIGINAL_FLIGHT.flightNo} · {ORIGINAL_FLIGHT.origin} →{" "}
          {ORIGINAL_FLIGHT.destination}
        </p>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {event.originalDeparture} → {event.originalArrival} ⇒{" "}
          <span className="text-rose-600">
            {event.newDeparture} → {event.newArrival}
          </span>
        </p>
      </header>

      <div className="divide-y px-5 py-2">
        <Row term="Passenger outcome">
          Arrive {ORIGINAL_FLIGHT.destination} before {intent.latestArrival} ·
          baggage ≥ {intent.minBaggageKg} kg · departure +
          {intent.departureFlexibilityHours}h
        </Row>
        <Row term="Agent decision" tone={decided ? undefined : "muted"}>
          {!decided
            ? "Evaluating alternatives…"
            : activeRun.selected
              ? `${activeRun.selected.label} (${activeRun.selected.flightNo}) · arrives ${activeRun.selected.arrival} · +$${activeRun.selected.extraCostUsd}`
              : "No alternative satisfied the hard constraints"}
        </Row>
        <Row term="Policy" tone={gated ? undefined : "muted"}>
          {!gated
            ? "Not yet reached"
            : `+$${gate.extraCostUsd} vs $${gate.authorityUsd} delegated authority · autopilot ${
                gate.autopilot ? "on" : "off"
              } → ${gate.decision.replace("_", " ").toLowerCase()}`}
        </Row>
        <Row
          term="Result"
          tone={
            !settled
              ? "muted"
              : outcome.status === "RECOVERED"
                ? "success"
                : outcome.status === "FAILED"
                  ? "danger"
                  : outcome.status === "NEEDS_APPROVAL"
                    ? "warning"
                    : undefined
          }
        >
          {settled ? recoveryHeadline(outcome) : "In progress"}
        </Row>
        <Row term="Provenance">
          Disruption source: SIMULATED · Flight search: {searchSource} ·
          Offers found: {activeRun.evaluations.length} · Decision: TRIPINTENT
          (policy gate) · Verification: {verificationSource}
        </Row>
      </div>
    </section>
  );
}
