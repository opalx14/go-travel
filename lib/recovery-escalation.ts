import type {
  Flight,
  OptionEvaluation,
  RecoveryEscalationPlan,
  RecoveryEscalationStep,
  RecoveryScope,
  TravelIntent,
} from "./types";

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function departureDelayMinutes(departure: string, originalDeparture: string): number {
  return timeToMinutes(departure) - timeToMinutes(originalDeparture);
}

/**
 * Build a deterministic recovery-scope ladder from already evaluated inventory.
 *
 * Safety properties:
 * - EXACT and DEPARTURE_FLEX stay inside the passenger's declared contract.
 * - CONNECTION only considers candidates that already satisfy all hard contract checks.
 * - Nearby-airport/date expansion is never auto-executed; it is proposal-only and HITL.
 * - Scope ordering is fixed and cannot be changed by an LLM.
 */
export function buildRecoveryEscalationPlan(
  trip: Flight,
  intent: TravelIntent,
  evaluations: OptionEvaluation[]
): RecoveryEscalationPlan {
  const valid = evaluations.filter((evaluation) => evaluation.valid);
  const direct = valid.filter((evaluation) => (evaluation.option.stops ?? 0) === 0);
  const exact = direct.filter((evaluation) => {
    const delay = departureDelayMinutes(evaluation.option.departure, trip.departure);
    return delay >= 0 && delay <= 60;
  });
  const flex = direct.filter((evaluation) => {
    const delay = departureDelayMinutes(evaluation.option.departure, trip.departure);
    return delay > 60 && delay <= intent.departureFlexibilityHours * 60;
  });
  const connections = valid.filter((evaluation) => (evaluation.option.stops ?? 0) > 0);

  const steps: RecoveryEscalationStep[] = [
    {
      scope: "EXACT",
      status: exact.length > 0 ? "AVAILABLE" : "EXHAUSTED",
      reason:
        exact.length > 0
          ? `${exact.length} direct candidate(s) preserve the original departure window (≤ 60 min delay) and satisfy the contract.`
          : "No direct candidate within 60 minutes of the original departure satisfies every hard contract clause.",
      provenance: "CANDIDATE_INVENTORY",
      candidateIds: exact.map((evaluation) => evaluation.option.id),
    },
    {
      scope: "DEPARTURE_FLEX",
      status: flex.length > 0 ? "AVAILABLE" : "EXHAUSTED",
      reason:
        flex.length > 0
          ? `${flex.length} direct candidate(s) require only the traveler-declared +${intent.departureFlexibilityHours}h departure flexibility.`
          : `No additional direct candidate fits the traveler-declared +${intent.departureFlexibilityHours}h departure flexibility.`,
      provenance: "TRAVELER_CONTRACT",
      candidateIds: flex.map((evaluation) => evaluation.option.id),
    },
    {
      scope: "CONNECTION",
      status: connections.length > 0 ? "AVAILABLE" : "EXHAUSTED",
      reason:
        connections.length > 0
          ? `${connections.length} connecting candidate(s) satisfy the existing destination, deadline, baggage, and departure-flex contract.`
          : "No connecting candidate satisfies the existing hard contract without widening airport/date constraints.",
      provenance: "CANDIDATE_INVENTORY",
      candidateIds: connections.map((evaluation) => evaluation.option.id),
    },
  ];

  const selectedStep = steps.find((step) => step.status === "AVAILABLE");
  if (selectedStep) {
    return {
      steps: [
        ...steps,
        {
          scope: "NEARBY_AIRPORT_OR_DATE",
          status: "REQUIRES_APPROVAL",
          reason:
            "Nearby-airport or date changes exceed the current Outcome Contract and remain proposal-only unless the passenger explicitly approves a wider search scope.",
          provenance: "HUMAN_BOUNDARY",
          candidateIds: [],
        },
      ],
      selectedScope: selectedStep.scope as Exclude<RecoveryScope, "NEARBY_AIRPORT_OR_DATE">,
      candidateIds: selectedStep.candidateIds,
      requiresPassengerApproval: false,
      stopReason: `Stopped at ${selectedStep.scope}: first recovery scope with policy-valid inventory.`,
    };
  }

  const scopeExpandable = evaluations.some((evaluation) => {
    if (evaluation.valid) return false;
    const failedHardKinds = evaluation.checks
      .filter((check) => check.hard && !check.passed)
      .map((check) => check.kind);
    return (
      failedHardKinds.length > 0 &&
      failedHardKinds.every(
        (kind) => kind === "FLEXIBILITY" || kind === "DESTINATION"
      )
    );
  });

  return {
    steps: [
      ...steps,
      {
        scope: "NEARBY_AIRPORT_OR_DATE",
        status: scopeExpandable ? "REQUIRES_APPROVAL" : "EXHAUSTED",
        reason: scopeExpandable
          ? "Contract-preserving scopes are exhausted, but inventory indicates a departure/destination scope change could help. TripIntent must ask the passenger before widening the search."
          : "No safe scope expansion is inferred: deadline, baggage, or other hard-contract failures remain fail-closed instead of being weakened automatically.",
        provenance: scopeExpandable ? "HUMAN_BOUNDARY" : "CANDIDATE_INVENTORY",
        candidateIds: [],
      },
    ],
    selectedScope: null,
    candidateIds: [],
    requiresPassengerApproval: scopeExpandable,
    stopReason: scopeExpandable
      ? "Contract-preserving scopes exhausted; stopped at the human boundary before widening departure/destination constraints."
      : "No policy-valid recovery exists and no safe scope expansion is justified by the evaluated inventory.",
  };
}
