import type {
  Flight,
  FlightOption,
  OfferVerification,
  OptionEvaluation,
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

function replaceEvaluation(
  evaluations: OptionEvaluation[],
  next: OptionEvaluation
): OptionEvaluation[] {
  return evaluations.map((evaluation) =>
    evaluation.option.id === next.option.id ? next : evaluation
  );
}

function rejectForUnconfirmedBaggage(
  evaluation: OptionEvaluation,
  intent: TravelIntent,
  reason: string
): OptionEvaluation {
  return {
    ...evaluation,
    valid: false,
    reasons: [...evaluation.reasons, reason],
    checks: evaluation.checks.map((check) =>
      check.kind === "BAGGAGE"
        ? {
            ...check,
            detail: `Atlas could not confirm ≥ ${intent.minBaggageKg}kg checked baggage`,
            passed: false,
            hard: true,
            reason,
          }
        : check
    ),
  };
}

function rejectForVerificationFailure(
  evaluation: OptionEvaluation,
  reason: string
): OptionEvaluation {
  return {
    ...evaluation,
    valid: false,
    reasons: [...evaluation.reasons, reason],
  };
}

function applyBaggageRequirement(
  selected: FlightOption,
  verification: OfferVerification,
  intent: TravelIntent
): { option: FlightOption | null; reason?: string } {
  if (selected.baggageKg !== undefined) {
    return selected.baggageKg >= intent.minBaggageKg
      ? { option: selected }
      : {
          option: null,
          reason: `Confirmed baggage ${selected.baggageKg}kg is below the ${intent.minBaggageKg}kg minimum`,
        };
  }

  if (intent.minBaggageKg <= 0) return { option: selected };

  if (verification.baggageStatus === "unavailable") {
    return {
      option: null,
      reason: "Atlas reports no checked-baggage service for this offer",
    };
  }

  if (verification.baggageStatus !== "available") {
    return {
      option: null,
      reason: "Atlas could not confirm checked-baggage options for this offer",
    };
  }

  const eligible = (verification.baggageOptions ?? [])
    .filter(
      (option) =>
        option.weightKg >= intent.minBaggageKg && option.currency === "USD"
    )
    .sort((a, b) => a.price - b.price || a.weightKg - b.weightKg);
  const baggage = eligible[0];
  if (!baggage) {
    return {
      option: null,
      reason: `No Atlas baggage option meets the ${intent.minBaggageKg}kg minimum`,
    };
  }

  const verifiedFare =
    verification.currentPrice ??
    selected.replacementPriceUsd ??
    selected.extraCostUsd + ASSUMED_RECOVERABLE_VALUE_USD;

  return {
    option: {
      ...selected,
      baggageKg: baggage.weightKg,
      baggagePriceUsd: baggage.price,
      atlasBaggageId: baggage.baggageId,
      atlasBaggageSegmentId: baggage.segmentId,
      replacementPriceUsd: verifiedFare,
      extraCostUsd:
        verifiedFare + baggage.price - ASSUMED_RECOVERABLE_VALUE_USD,
    },
  };
}

/**
 * Recovery engine: detects the disruption through the data provider,
 * evaluates every alternative against the travel intent, selects the
 * cheapest valid option, runs the policy gate, and verifies the selected
 * fare when allowed to act.
 *
 * The current phase searches, verifies fares, confirms required baggage,
 * and supports Atlas's explicit price-increase confirmation checkpoint.
 * Order creation/payment still remain out of scope. Fully deterministic: returns the complete
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
  let evaluations = alternatives.map((option) =>
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

  // 5. Select the best currently valid option. Atlas search results do not
  // include baggage weight, so an Atlas winner may still need a read-only
  // verification + baggage lookup before it can truly satisfy the contract.
  let selected = selectBestOption(evaluations);
  if (!selected) {
    steps.push({
      id: "step-select",
      title: "No valid option found",
      detail: "No alternative satisfies the hard travel constraints",
      tone: "danger",
    });
    return {
      status: "FAILED",
      intent,
      event,
      evaluations,
      selected: null,
      policyCheck: null,
      steps,
    };
  }

  const announceSelection = (option: FlightOption, suffix = "") => {
    const runnerUp = evaluations
      .filter((e) => e.valid && e.option.id !== option.id)
      .sort((a, b) => a.option.extraCostUsd - b.option.extraCostUsd)[0];
    steps.push({
      id: `step-select-${steps.length}`,
      title: "Best valid option selected",
      detail: runnerUp
        ? `${option.label} at +$${option.extraCostUsd} beats ${runnerUp.option.label} (+$${runnerUp.option.extraCostUsd}) on extra cost${suffix}`
        : `${option.label} is the only option satisfying the travel intent${suffix}`,
      tone: "success",
    });
  };

  announceSelection(selected);

  let preverified: OfferVerification | undefined;

  while (
    selected &&
    selected.source === "ATLAS_SANDBOX" &&
    selected.baggageKg === undefined &&
    intent.minBaggageKg > 0
  ) {
    const verification = await provider.verifyOffer(selected);

    // A price increase is a mandatory passenger checkpoint. Expired/failed
    // offers are treated as candidate-local failures: reject that offer and
    // self-repair by trying the next policy-valid candidate when one exists.
    if (verification.priceChange === "increased") {
      return verifyOutcome(verification, selected, {
        intent,
        event,
        evaluations,
        policyCheck: null,
        steps,
      });
    }

    if (
      verification.priceChange === "expired" ||
      verification.priceChange === "failed"
    ) {
      const failedSelection = selected;
      const currentEvaluation = evaluations.find(
        (evaluation) => evaluation.option.id === failedSelection.id
      );
      const failureReason =
        verification.priceChange === "expired"
          ? "Atlas offer expired during verification"
          : "Atlas offer verification failed";

      if (currentEvaluation) {
        evaluations = replaceEvaluation(
          evaluations,
          rejectForVerificationFailure(currentEvaluation, failureReason)
        );
      }

      steps.push({
        id: `step-provider-reject-${steps.length}`,
        title: `${failedSelection.label} rejected after verification`,
        detail: `${failureReason} · trying the next policy-valid candidate`,
        tone: "danger",
      });

      selected = selectBestOption(evaluations);
      if (!selected) {
        return verifyOutcome(verification, failedSelection, {
          intent,
          event,
          evaluations,
          policyCheck: null,
          steps,
        });
      }

      announceSelection(selected, " after provider verification failure");
      continue;
    }

    const baggageResult = applyBaggageRequirement(selected, verification, intent);
    if (!baggageResult.option) {
      const currentEvaluation = evaluations.find(
        (evaluation) => evaluation.option.id === selected?.id
      );
      if (currentEvaluation) {
        evaluations = replaceEvaluation(
          evaluations,
          rejectForUnconfirmedBaggage(
            currentEvaluation,
            intent,
            baggageResult.reason ?? "Baggage requirement could not be confirmed"
          )
        );
      }

      steps.push({
        id: `step-baggage-reject-${steps.length}`,
        title: `${selected.label} rejected on baggage`,
        detail:
          baggageResult.reason ??
          `Atlas could not confirm the ${intent.minBaggageKg}kg baggage requirement`,
        tone: "danger",
      });

      selected = selectBestOption(evaluations);
      if (!selected) {
        steps.push({
          id: "step-select-none-after-baggage",
          title: "No valid option found",
          detail: `No alternative can confirm the ${intent.minBaggageKg}kg baggage requirement`,
          tone: "danger",
        });
        return {
          status: "FAILED",
          intent,
          event,
          evaluations,
          selected: null,
          policyCheck: null,
          steps,
        };
      }
      announceSelection(selected, " after baggage validation");
      continue;
    }

    selected = baggageResult.option;
    const confirmedEvaluation = evaluateOption(
      selected,
      intent,
      trip.departure,
      trip.destination
    );
    evaluations = replaceEvaluation(evaluations, confirmedEvaluation);
    preverified = verification;

    steps.push({
      id: "step-baggage",
      title: "Baggage requirement verified",
      detail: `${selected.baggageKg}kg checked baggage available for ${usd(
        selected.baggagePriceUsd ?? 0
      )} · total recovery cost ${usd(selected.extraCostUsd)}`,
      tone: "success",
    });
    break;
  }

  // 6. Deterministic policy gate. For Atlas offers with a baggage requirement,
  // this now runs against fare + the cheapest baggage option that satisfies
  // the passenger contract.
  const policyCheck = runPolicyCheck(selected, intent);
  steps.push({
    id: "step-policy",
    title: "Policy check passed",
    detail: policyCheck.summary,
    tone: policyCheck.withinAuthority ? "success" : "warning",
  });

  if (policyCheck.withinAuthority && intent.autopilot) {
    // If baggage validation already verified the fare, reuse that same fresh
    // verification. Otherwise perform the normal verification now.
    const verification = preverified ?? (await provider.verifyOffer(selected));
    return verifyOutcome(verification, selected, {
      intent,
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
      ? `Additional ${usd(selected.extraCostUsd)} is beyond the $${intent.maxExtraSpendUsd} authority — passenger approval required`
      : "Autopilot is off — recovery paused for passenger approval",
    tone: "warning",
  });
  steps.push({
    id: "step-verify",
    title: preverified ? "Verified recovery on hold" : "Trip on hold",
    detail: preverified
      ? `Fare and ${selected.baggageKg ?? intent.minBaggageKg}kg baggage are confirmed; booking remains unchanged until passenger approval`
      : `Booking unchanged until the passenger approves ${selected.label}`,
    tone: "warning",
  });

  return {
    status: "NEEDS_APPROVAL",
    intent,
    event,
    evaluations,
    selected,
    policyCheck,
    steps,
    approval: overAuthority ? "OVER_AUTHORITY" : "AUTOPILOT_OFF",
    verification: preverified,
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
 * Refresh the verified fare while preserving any already-confirmed baggage
 * add-on in the total recovery cost.
 */
function withVerifiedPrice(
  selected: FlightOption,
  verification: OfferVerification
): FlightOption {
  if (
    (verification.priceChange === "unchanged" ||
      verification.priceChange === "decreased" ||
      verification.priceConfirmed === true) &&
    verification.currentPrice !== undefined
  ) {
    return {
      ...selected,
      replacementPriceUsd: verification.currentPrice,
      extraCostUsd:
        verification.currentPrice +
        (selected.baggagePriceUsd ?? 0) -
        ASSUMED_RECOVERABLE_VALUE_USD,
    };
  }
  return selected;
}

/** Branch on a fare verification result and finish the outcome. */
function verifyOutcome(
  verification: OfferVerification,
  selected: FlightOption,
  base: {
    intent: TravelIntent;
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
      intent: base.intent,
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
      detail: `${source}: fare changed ${usd(verification.previousPrice ?? 0)} → ${usd(verification.currentPrice ?? 0)} — passenger must approve before Atlas confirms the new price`,
      tone: "warning",
    });
    return {
      status: "NEEDS_APPROVAL",
      intent: base.intent,
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
    intent: base.intent,
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
 * - PRICE_INCREASED: real Atlas providers call booking confirm-price using
 *   the retained booking id; simulated providers accept locally for tests/demo fallback.
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
    const priorVerification = outcome.verification;
    if (
      priorVerification?.source === "ATLAS_SANDBOX" &&
      priorVerification.bookingId &&
      provider.confirmPrice
    ) {
      const confirmed = await provider.confirmPrice(priorVerification);
      if (!confirmed.priceConfirmed || confirmed.priceChange === "failed") {
        return {
          ...outcome,
          status: "FAILED",
          verification: confirmed,
          steps: [
            ...outcome.steps,
            {
              id: "step-approved-confirm-price-failed",
              title: "Price confirmation failed",
              detail: `${verificationSourceLabel(confirmed)}: ${confirmed.summary} — booking unchanged`,
              tone: "danger",
            },
          ],
        };
      }

      let finalSelected = withVerifiedPrice(selected, confirmed);
      let evaluations = outcome.evaluations;
      let policyCheck = outcome.policyCheck;
      const intent = outcome.intent;

      if (intent && finalSelected.baggageKg === undefined && intent.minBaggageKg > 0) {
        const baggageResult = applyBaggageRequirement(
          finalSelected,
          confirmed,
          intent
        );
        if (!baggageResult.option) {
          return {
            ...outcome,
            status: "FAILED",
            verification: confirmed,
            steps: [
              ...outcome.steps,
              {
                id: "step-approved-baggage-failed",
                title: "Baggage requirement not confirmed",
                detail:
                  baggageResult.reason ??
                  `Atlas could not confirm the ${intent.minBaggageKg}kg baggage requirement after price confirmation`,
                tone: "danger",
              },
            ],
          };
        }

        finalSelected = baggageResult.option;
        const evaluated = evaluateOption(
          finalSelected,
          intent,
          trip.departure,
          trip.destination
        );
        evaluations = replaceEvaluation(evaluations, evaluated);
        policyCheck = runPolicyCheck(finalSelected, intent);

        if (!policyCheck.withinAuthority) {
          return {
            ...outcome,
            status: "NEEDS_APPROVAL",
            evaluations,
            selected: finalSelected,
            policyCheck,
            verification: confirmed,
            approval: "OVER_AUTHORITY",
            approvedByPassenger: true,
            steps: [
              ...outcome.steps,
              {
                id: "step-approved-confirm-price",
                title: "Price increase confirmed",
                detail: `${verificationSourceLabel(confirmed)}: fare confirmed at ${usd(
                  confirmed.currentPrice ?? confirmed.previousPrice ?? 0
                )}`,
                tone: "success",
              },
              {
                id: "step-approved-baggage",
                title: "Baggage requirement verified",
                detail: `${finalSelected.baggageKg}kg checked baggage adds ${usd(
                  finalSelected.baggagePriceUsd ?? 0
                )} · total recovery cost ${usd(finalSelected.extraCostUsd)}`,
                tone: "success",
              },
              {
                id: "step-approved-authority",
                title: "Additional approval required",
                detail: policyCheck.summary,
                tone: "warning",
              },
            ],
          };
        }
      }

      return {
        ...outcome,
        status: "RECOVERED",
        evaluations,
        selected: finalSelected,
        policyCheck,
        verification: confirmed,
        approvedByPassenger: true,
        steps: [
          ...outcome.steps,
          {
            id: "step-approved-confirm-price",
            title: "Price increase confirmed",
            detail: `${verificationSourceLabel(confirmed)}: fare confirmed at ${usd(
              confirmed.currentPrice ?? confirmed.previousPrice ?? 0
            )}${
              finalSelected.baggageKg !== undefined
                ? ` · ${finalSelected.baggageKg}kg baggage confirmed`
                : ""
            }`,
            tone: "success",
          },
        ],
      };
    }

    // Simulated/test providers may not expose Atlas's confirm-price operation.
    return {
      ...outcome,
      status: "RECOVERED",
      approvedByPassenger: true,
      steps: [
        ...outcome.steps,
        {
          id: "step-approved-execute",
          title: "Price increase accepted",
          detail: "Price increase accepted in the simulated provider path",
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
