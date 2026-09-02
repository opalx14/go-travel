import type {
  DecisionExplanation,
  RecoveryOutcome,
} from "./types";

export interface DecisionExplanationCandidate {
  headline?: unknown;
  selectedReason?: unknown;
  rejectedReason?: unknown;
  authorityReason?: unknown;
  nextAction?: unknown;
}

function text(value: unknown, fallback: string, max = 220) {
  if (typeof value !== "string") return fallback;
  const compact = value.replace(/\s+/g, " ").trim();
  return compact ? compact.slice(0, max) : fallback;
}

function selectedReason(outcome: RecoveryOutcome) {
  const selected = outcome.selected;
  if (!selected) return "No replacement satisfies every hard traveler constraint.";

  const baggage =
    selected.baggageKg === undefined
      ? "baggage pending"
      : `${selected.baggageKg}kg baggage`;
  return `${selected.flightNo} arrives ${selected.arrival}, keeps ${baggage}, and costs +$${selected.extraCostUsd.toFixed(2)}.`;
}

function rejectedReason(outcome: RecoveryOutcome) {
  const rejected = outcome.evaluations.filter((evaluation) => !evaluation.valid);
  if (rejected.length === 0) return "No hard-invalid alternatives were found.";

  const cheapestRejected = [...rejected].sort(
    (a, b) => a.option.extraCostUsd - b.option.extraCostUsd
  )[0];
  return `${cheapestRejected.option.flightNo} at +$${cheapestRejected.option.extraCostUsd.toFixed(2)} was rejected: ${cheapestRejected.reasons.join("; ")}.`;
}

function authorityReason(outcome: RecoveryOutcome) {
  if (outcome.status === "NEEDS_APPROVAL") {
    if (outcome.approval === "OVER_AUTHORITY") {
      return "The recovery is valid, but its cost exceeds the traveler’s delegated spending authority.";
    }
    if (outcome.approval === "PRICE_INCREASED") {
      return "Atlas reported a fare increase, so explicit passenger confirmation is required.";
    }
    return "Autopilot is disabled, so the valid recovery is paused for passenger approval.";
  }

  if (outcome.status === "RECOVERED") {
    return outcome.policyCheck?.withinAuthority
      ? "The selected recovery is inside delegated authority and can proceed autonomously."
      : "The recovery completed only after the required approval gate.";
  }

  if (outcome.status === "DECLINED") {
    return "The passenger declined the proposed change, so the original booking remains unchanged.";
  }

  return "The workflow failed safely without changing the booking.";
}

function nextAction(outcome: RecoveryOutcome) {
  if (outcome.status === "RECOVERED") return "Recovery ready; keep monitoring the protected outcome.";
  if (outcome.status === "NEEDS_APPROVAL") return "Wait for passenger approval before any booking action.";
  if (outcome.status === "DECLINED") return "Keep the current itinerary and continue monitoring.";
  return "Review the failed constraint or provider step before retrying.";
}

export function buildDeterministicDecisionExplanation(
  outcome: RecoveryOutcome
): DecisionExplanation {
  const selected = outcome.selected;
  return {
    source: "DETERMINISTIC_FALLBACK",
    headline: selected
      ? `${selected.flightNo} is the best policy-valid recovery.`
      : "No policy-valid recovery is available.",
    selectedReason: selectedReason(outcome),
    rejectedReason: rejectedReason(outcome),
    authorityReason: authorityReason(outcome),
    nextAction: nextAction(outcome),
  };
}

export function normalizeDecisionExplanation(
  candidate: DecisionExplanationCandidate,
  fallback: DecisionExplanation,
  model?: string
): DecisionExplanation {
  return {
    source: "QWEN",
    model,
    headline: text(candidate.headline, fallback.headline, 140),
    selectedReason: text(candidate.selectedReason, fallback.selectedReason),
    rejectedReason: text(candidate.rejectedReason, fallback.rejectedReason),
    authorityReason: text(candidate.authorityReason, fallback.authorityReason),
    nextAction: text(candidate.nextAction, fallback.nextAction, 160),
  };
}
