import type {
  Flight,
  FlightOption,
  OfferVerification,
  RecoveryOutcome,
  RecoveryStep,
  TravelIntent,
  TripDataProvider,
} from "./types";
import {
  evaluateOption,
  runPolicyCheck,
  selectBestOption,
} from "./policy-engine";
import { ASSUMED_RECOVERABLE_VALUE_USD } from "./scenario";

/**
 * Recovery engine: detects the disruption through the data provider,
 * evaluates every alternative against the travel intent, selects the
 * cheapest valid option, runs the policy gate, and verifies the selected
 * fare when allowed to act.
 *
 * Phase 2 stops at fare verification — price confirmation and booking are
 * deferred to a later phase. Fully deterministic: returns the complete
 * decision timeline; the UI layer handles replay pacing.
 */
export async function runRecovery(
  trip: Flight,
  intent: TravelIntent,
  provider: TripDataProvider
): Promise<RecoveryOutcome> {
  const steps: RecoveryStep[] = [];

  // 1. Detect the exception.
  const event = await provider.getDisruption(trip.id);
  steps.push({
    id: "step-detect",
    title: "Flight change detected",
    detail: event.summary,
    tone: "danger",
  });

  // 2. Load travel intent.
  steps.push({
    id: "step-intent",
    title: "Travel intent loaded",
    detail: `Arrive by ${intent.latestArrival} · departure +${intent.departureFlexibilityHours}h · baggage ≥ ${intent.minBaggageKg}kg · extra spend ≤ $${intent.maxExtraSpendUsd}`,
    tone: "info",
  });

  // 3. Evaluate every alternative.
  const alternatives = await provider.searchAlternatives(trip.id);
  const evaluations = alternatives.map((option) =>
    evaluateOption(option, intent, trip.departure, trip.destination)
  );
  steps.push({
    id: "step-evaluate",
    title: `${alternatives.length} alternatives evaluated`,
    detail: `${alternatives.map((a) => a.label).join(", ")} scored against travel intent`,
    tone: "info",
  });

  // 4. Report rejections.
  const rejected = evaluations.filter((e) => !e.valid);
  steps.push({
    id: "step-reject",
    title:
      rejected.length > 0
        ? `${rejected.length} option${rejected.length > 1 ? "s" : ""} rejected`
        : "No options rejected",
    detail:
      rejected.length > 0
        ? rejected
            .map((r) => `${r.option.label}: ${r.reasons.join("; ")}`)
            .join(" · ")
        : "All options satisfy the travel intent",
    tone: rejected.length > 0 ? "danger" : "success",
  });

  // 5. Select the best valid option.
  const selected = selectBestOption(evaluations);
  if (!selected) {
    steps.push({
      id: "step-select",
      title: "No valid option found",
      detail: "No alternative satisfies the hard travel constraints",
      tone: "danger",
    });
    return {
      status: "FAILED",
      event,
      evaluations,
      selected: null,
      policyCheck: null,
      steps,
    };
  }

  const runnerUp = evaluations
    .filter((e) => e.valid && e.option.id !== selected.id)
    .sort((a, b) => a.option.extraCostUsd - b.option.extraCostUsd)[0];
  steps.push({
    id: "step-select",
    title: "Best valid option selected",
    detail: runnerUp
      ? `${selected.label} at +$${selected.extraCostUsd} beats ${runnerUp.option.label} (+$${runnerUp.option.extraCostUsd}) on extra cost`
      : `${selected.label} is the only option satisfying the travel intent`,
    tone: "success",
  });

  // 6. Deterministic policy gate: hard constraints passed by construction;
  // authority decides autonomous action vs passenger approval.
  const policyCheck = runPolicyCheck(selected, intent);
  steps.push({
    id: "step-policy",
    title: "Policy check passed",
    detail: policyCheck.summary,
    tone: policyCheck.withinAuthority ? "success" : "warning",
  });

  if (policyCheck.withinAuthority && intent.autopilot) {
    // 7. Verify the selected fare — the engine never assumes success.
    // Booking/payment remain out of scope for this phase.
    const verification = await provider.verifyOffer(selected);
    return verifyOutcome(verification, selected, {
      event,
      evaluations,
      policyCheck,
      steps,
    });
  }

  const overAuthority = !policyCheck.withinAuthority;
  steps.push({
    id: "step-execute",
    title: "Approval required",
    detail: overAuthority
      ? `Additional $${selected.extraCostUsd} is beyond the $${intent.maxExtraSpendUsd} authority — passenger approval required`
      : "Autopilot is off — recovery paused for passenger approval",
    tone: "warning",
  });
  steps.push({
    id: "step-verify",
    title: "Trip on hold",
    detail: `Booking unchanged until the passenger approves ${selected.label}`,
    tone: "warning",
  });

  return {
    status: "NEEDS_APPROVAL",
    event,
    evaluations,
    selected,
    policyCheck,
    steps,
    approval: overAuthority ? "OVER_AUTHORITY" : "AUTOPILOT_OFF",
  };
}

function verificationSourceLabel(verification: OfferVerification): string {
  return verification.source === "ATLAS_SANDBOX"
    ? "Atlas Sandbox"
    : "simulated fallback";
}

function usd(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * When verification reports a lower fare, refresh the selected option's
 * prices so no stale amount survives (autopilot and approval paths alike).
 */
function withVerifiedPrice(
  selected: FlightOption,
  verification: OfferVerification
): FlightOption {
  if (
    verification.priceChange === "decreased" &&
    verification.currentPrice !== undefined
  ) {
    return {
      ...selected,
      replacementPriceUsd: verification.currentPrice,
      extraCostUsd:
        verification.currentPrice - ASSUMED_RECOVERABLE_VALUE_USD,
    };
  }
  return selected;
}

/** Branch on a fare verification result and finish the outcome. */
function verifyOutcome(
  verification: OfferVerification,
  selected: FlightOption,
  base: {
    event: RecoveryOutcome["event"];
    evaluations: RecoveryOutcome["evaluations"];
    policyCheck: RecoveryOutcome["policyCheck"];
    steps: RecoveryStep[];
  }
): RecoveryOutcome {
  const steps = [...base.steps];
  const source = verificationSourceLabel(verification);

  if (
    verification.priceChange === "unchanged" ||
    verification.priceChange === "decreased"
  ) {
    const decreased = verification.priceChange === "decreased";
    steps.push({
      id: "step-verify",
      title: "Fare verified",
      detail: decreased
        ? `${source}: fare decreased to ${usd(verification.currentPrice ?? 0)} (was ${usd(verification.previousPrice ?? 0)}) — recovery confirmed`
        : `${source}: fare ${
            verification.currentPrice !== undefined
              ? `unchanged at ${usd(verification.currentPrice)}`
              : "unchanged"
          } — recovery confirmed`,
      tone: "success",
    });

    const finalSelected = withVerifiedPrice(selected, verification);

    return {
      status: "RECOVERED",
      event: base.event,
      evaluations: base.evaluations,
      selected: finalSelected,
      policyCheck: base.policyCheck,
      steps,
      verification,
    };
  }

  if (verification.priceChange === "increased") {
    steps.push({
      id: "step-verify",
      title: "Fare increased — approval required",
      detail: `${source}: fare changed ${usd(verification.previousPrice ?? 0)} → ${usd(verification.currentPrice ?? 0)} — passenger must approve the increase (price confirmation deferred)`,
      tone: "warning",
    });
    return {
      status: "NEEDS_APPROVAL",
      event: base.event,
      evaluations: base.evaluations,
      selected,
      policyCheck: base.policyCheck,
      steps,
      approval: "PRICE_INCREASED",
      verification,
    };
  }

  steps.push({
    id: "step-verify",
    title:
      verification.priceChange === "expired"
        ? "Offer expired"
        : "Verification failed",
    detail:
      verification.priceChange === "expired"
        ? `${source}: the selected offer expired before it could be verified — no action taken`
        : `${source}: ${verification.summary} — no action taken`,
    tone: "danger",
  });
  return {
    status: "FAILED",
    event: base.event,
    evaluations: base.evaluations,
    selected,
    policyCheck: base.policyCheck,
    steps,
    verification,
  };
}

/**
 * Passenger approved a pending recovery.
 * - PRICE_INCREASED: the increase is accepted; price confirmation and
 *   booking are deferred to a later phase (no CLI call here).
 * - OVER_AUTHORITY / AUTOPILOT_OFF: the fare is verified now, and the
 *   outcome follows the verification result.
 */
export async function approveRecovery(
  trip: Flight,
  outcome: RecoveryOutcome,
  provider: TripDataProvider
): Promise<RecoveryOutcome> {
  const selected = outcome.selected;
  if (!selected) return outcome;

  if (outcome.approval === "PRICE_INCREASED") {
    return {
      ...outcome,
      status: "RECOVERED",
      approvedByPassenger: true,
      steps: [
        ...outcome.steps,
        {
          id: "step-approved-execute",
          title: "Price increase accepted",
          detail:
            "Price increase accepted — price confirmation and booking deferred to a later phase",
          tone: "success",
        },
      ],
    };
  }

  const verification = await provider.verifyOffer(selected);
  const source = verificationSourceLabel(verification);

  if (
    verification.priceChange === "unchanged" ||
    verification.priceChange === "decreased"
  ) {
    const finalSelected = withVerifiedPrice(selected, verification);
    return {
      ...outcome,
      status: "RECOVERED",
      approvedByPassenger: true,
      selected: finalSelected,
      verification,
      steps: [
        ...outcome.steps,
        {
          id: "step-approved-execute",
          title: "Recovery approved",
          detail: `Passenger approved +$${selected.extraCostUsd} for ${selected.label} (${selected.flightNo})`,
          tone: "success",
        },
        {
          id: "step-approved-verify",
          title: "Fare verified",
          detail: `${source}: ${verification.summary}`,
          tone: "success",
        },
      ],
    };
  }

  if (verification.priceChange === "increased") {
    return {
      ...outcome,
      status: "NEEDS_APPROVAL",
      approval: "PRICE_INCREASED",
      verification,
      steps: [
        ...outcome.steps,
        {
          id: "step-approved-verify",
          title: "Fare increased — approval required",
          detail: `${source}: fare changed ${usd(verification.previousPrice ?? 0)} → ${usd(verification.currentPrice ?? 0)} since approval — passenger must approve the increase`,
          tone: "warning",
        },
      ],
    };
  }

  return {
    ...outcome,
    status: "FAILED",
    verification,
    steps: [
      ...outcome.steps,
      {
        id: "step-approved-verify",
        title:
          verification.priceChange === "expired"
            ? "Offer expired"
            : "Verification failed",
        detail: `${source}: ${verification.summary} — approval not applied`,
        tone: "danger",
      },
    ],
  };
}

/** Passenger kept the current trip; no recovery is executed. */
export function declineRecovery(outcome: RecoveryOutcome): RecoveryOutcome {
  return {
    ...outcome,
    status: "DECLINED",
    steps: [
      ...outcome.steps,
      {
        id: "step-declined",
        title: "Passenger kept current trip",
        detail: "Approval declined — original booking unchanged",
        tone: "info",
      },
    ],
  };
}
