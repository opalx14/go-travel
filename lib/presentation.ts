import type {
  Flight,
  OptionEvaluation,
  RecoveryOutcome,
  RecoveryStep,
  TravelIntent,
} from "./types";

/**
 * Presentation layer: derives the mission-control view model from domain data.
 * It never re-implements policy decisions — every value here is read from the
 * outcome, evaluations, or intent produced by the engines.
 */

export type PipelineStageId =
  | "OBSERVE"
  | "ASSESS"
  | "SEARCH"
  | "EVALUATE"
  | "POLICY"
  | "EXECUTE"
  | "VERIFY";

export type StageStatus = "pending" | "active" | "done" | "halted";

export interface PipelineStage {
  id: PipelineStageId;
  label: string;
  status: StageStatus;
  /** Short data-derived caption, empty until the stage is reached. */
  caption: string;
}

export const PIPELINE_ORDER: PipelineStageId[] = [
  "OBSERVE",
  "ASSESS",
  "SEARCH",
  "EVALUATE",
  "POLICY",
  "EXECUTE",
  "VERIFY",
];

/** Which pipeline stage each deterministic engine step belongs to. */
const STEP_STAGE: Record<string, PipelineStageId> = {
  "step-detect": "OBSERVE",
  "step-intent": "ASSESS",
  "step-evaluate": "SEARCH",
  "step-reject": "EVALUATE",
  "step-select": "EVALUATE",
  "step-policy": "POLICY",
  "step-execute": "EXECUTE",
  "step-verify": "VERIFY",
  "step-approved-execute": "EXECUTE",
  "step-approved-verify": "VERIFY",
  "step-declined": "EXECUTE",
  "step-failed": "SEARCH",
};

export function stageOfStep(stepId: string): PipelineStageId | undefined {
  return STEP_STAGE[stepId];
}

/** Whether the replay has already played a step belonging to `stage`. */
export function hasReachedStage(
  playedSteps: RecoveryStep[],
  stage: PipelineStageId
): boolean {
  return playedSteps.some((step) => stageOfStep(step.id) === stage);
}

/** How much more authority the agent would need to act on its own. */
export function authorityShortfall(
  outcome: RecoveryOutcome,
  intent: TravelIntent
): number {
  if (!outcome.selected) return 0;
  return Math.max(0, outcome.selected.extraCostUsd - intent.maxExtraSpendUsd);
}

/** Captions for each stage, all read from the run's own domain data. */
function stageCaptions(
  run: RecoveryOutcome,
  intent: TravelIntent,
  trip: Flight
): Record<PipelineStageId, string> {
  const validCount = run.evaluations.filter((e) => e.valid).length;
  const selected = run.selected;
  const within = run.policyCheck?.withinAuthority ?? false;
  const shortfall = authorityShortfall(run, intent);
  const declined = run.status === "DECLINED";
  const approved = run.approvedByPassenger === true;

  return {
    OBSERVE: `${trip.flightNo} moved to ${run.event.newDeparture} → ${run.event.newArrival}`,
    ASSESS: `Arrive ≤ ${intent.latestArrival} · ≥ ${intent.minBaggageKg}kg · +${intent.departureFlexibilityHours}h flex`,
    SEARCH: `${run.evaluations.length} alternatives returned`,
    EVALUATE: selected
      ? `${validCount} of ${run.evaluations.length} satisfy your outcome`
      : "No option satisfies your outcome",
    POLICY: selected
      ? within
        ? `${selected.label} · +$${selected.extraCostUsd} within $${intent.maxExtraSpendUsd} authority`
        : `${selected.label} · +$${selected.extraCostUsd} needs $${shortfall} more authority`
      : "No option to authorize",
    EXECUTE: !selected
      ? "Booking unchanged"
      : declined
        ? "Passenger kept the current trip"
        : run.status === "NEEDS_APPROVAL"
          ? "Paused at the authority boundary"
          : approved
            ? `Passenger approved · ${selected.flightNo} ready for booking`
            : `Autopilot selected ${selected.flightNo} for verification`,
    VERIFY:
      run.status === "RECOVERED" && selected
        ? run.verification
          ? `${selected.flightNo} fare verified · ${run.verification.priceChange}`
          : `${trip.destination} arrival confirmed · ${selected.arrival}`
        : declined
          ? "Original itinerary intact"
          : run.status === "NEEDS_APPROVAL"
            ? "Awaiting passenger decision"
            : run.status === "FAILED" && run.verification
              ? run.verification.summary
              : "Nothing to verify",
  };
}

/**
 * Build the pipeline view from the run being replayed plus the steps played
 * so far, so stages light up in step with the deterministic timeline.
 */
export function buildPipeline(
  run: RecoveryOutcome | null,
  playedSteps: RecoveryStep[],
  intent: TravelIntent,
  trip: Flight
): PipelineStage[] {
  const labels: Record<PipelineStageId, string> = {
    OBSERVE: "Observe",
    ASSESS: "Assess",
    SEARCH: "Search",
    EVALUATE: "Evaluate",
    POLICY: "Policy",
    EXECUTE: "Authorize",
    VERIFY: "Verify",
  };

  if (!run) {
    return PIPELINE_ORDER.map((id) => ({
      id,
      label: labels[id],
      status: "pending" as StageStatus,
      caption: "",
    }));
  }

  const captions = stageCaptions(run, intent, trip);
  const reached = new Set(
    playedSteps
      .map((step) => stageOfStep(step.id))
      .filter((stage): stage is PipelineStageId => Boolean(stage))
  );
  const lastReached = playedSteps
    .map((step) => stageOfStep(step.id))
    .filter((stage): stage is PipelineStageId => Boolean(stage))
    .at(-1);

  /**
   * Stages this run stops short of (no valid option, or held for approval).
   * A FAILED run only halts stages it never actually reached — a failure
   * after verify (offer expired / verification failed) must not rewrite the
   * POLICY and VERIFY stages that genuinely ran.
   */
  const halts: PipelineStageId[] =
    run.status === "FAILED"
      ? (["POLICY", "EXECUTE", "VERIFY"] as PipelineStageId[]).filter(
          (stage) => !reached.has(stage)
        )
      : run.status === "NEEDS_APPROVAL"
        ? reached.has("VERIFY")
          ? []
          : ["VERIFY"]
        : [];
  /** Only call a stage halted once the replay has nothing left to play. */
  const settled = playedSteps.length >= run.steps.length;

  return PIPELINE_ORDER.map((id) => {
    const done = reached.has(id);
    const active = id === lastReached;
    const halted = halts.includes(id) && (done || settled);

    return {
      id,
      label: labels[id],
      status: halted
        ? "halted"
        : active
          ? "active"
          : done
            ? "done"
            : "pending",
      caption: done || halted ? captions[id] : "",
    };
  });
}

export type GateDecision = "ALLOW" | "REQUIRE_APPROVAL" | "NO_OPTION";

export interface PolicyGateView {
  decision: GateDecision;
  /** Terminal action the decision leads to. */
  action: string;
  /** Extra authority the agent is short of; 0 when within authority. */
  shortfallUsd: number;
  hardConstraintsSatisfied: boolean;
  extraCostUsd: number;
  authorityUsd: number;
  autopilot: boolean;
}

/** The deterministic gate, expressed for display. */
export function buildPolicyGate(
  run: RecoveryOutcome,
  intent: TravelIntent
): PolicyGateView {
  const selected = run.selected;
  if (!selected || !run.policyCheck) {
    return {
      decision: "NO_OPTION",
      action: "Booking unchanged",
      shortfallUsd: 0,
      hardConstraintsSatisfied: false,
      extraCostUsd: 0,
      authorityUsd: intent.maxExtraSpendUsd,
      autopilot: intent.autopilot,
    };
  }

  const within = run.policyCheck.withinAuthority;
  const decision: GateDecision =
    within && intent.autopilot ? "ALLOW" : "REQUIRE_APPROVAL";

  return {
    decision,
    action:
      decision === "ALLOW"
        ? "Auto authorize"
        : within
          ? "Hold for passenger"
          : "Ask for authority",
    shortfallUsd: authorityShortfall(run, intent),
    hardConstraintsSatisfied: true,
    extraCostUsd: selected.extraCostUsd,
    authorityUsd: intent.maxExtraSpendUsd,
    autopilot: intent.autopilot,
  };
}

/** Headline for the resolved trip — autonomous and approved are not the same. */
export function recoveryHeadline(outcome: RecoveryOutcome): string {
  switch (outcome.status) {
    case "RECOVERED":
      return outcome.approvedByPassenger
        ? "Recovery ready with passenger approval"
        : "Recovery verified automatically";
    case "NEEDS_APPROVAL":
      return "Valid recovery awaiting approval";
    case "DECLINED":
      return "Original trip kept";
    case "FAILED":
      return "No valid recovery";
  }
}

/**
 * Passenger-facing scanner statuses, one line at a time. Each engine stage
 * maps to the consumer-language line(s) shown while it runs; stages with two
 * lines rotate on a cosmetic interval only.
 */
export const SCANNER_STATUSES: Record<PipelineStageId, string[]> = {
  OBSERVE: ["Checking your trip…"],
  ASSESS: ["Reading your trip priorities…"],
  SEARCH: ["Finding alternatives with Atlas…"],
  EVALUATE: ["Checking arrival times…", "Checking baggage…"],
  POLICY: ["Comparing total cost…"],
  EXECUTE: ["Checking your spend limit…"],
  VERIFY: ["Verifying fare with Atlas…"],
};

/** Ordered candidates with the winner flagged, for the evaluation grid. */
export interface CandidateView {
  evaluation: OptionEvaluation;
  isSelected: boolean;
}

export function buildCandidates(
  run: RecoveryOutcome | null
): CandidateView[] {
  if (!run) return [];
  return run.evaluations.map((evaluation) => ({
    evaluation,
    isSelected: evaluation.option.id === run.selected?.id,
  }));
}

/** Trace stage label shown in the operations audit view. */
export function traceLabel(step: RecoveryStep): string {
  const stage = stageOfStep(step.id);
  if (!stage) return step.title;
  if (step.id === "step-intent") return "LOAD INTENT";
  if (step.id === "step-select") return "SELECT";
  if (step.id === "step-declined") return "DECLINE";
  return stage;
}
