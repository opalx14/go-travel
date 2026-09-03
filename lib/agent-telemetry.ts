import type { RecoveryOutcome } from "./types";

export interface AgentRunTelemetry {
  decisionSteps: number;
  candidatesEvaluated: number;
  hardRejected: number;
  atlasBackedCandidates: number;
  providerRetries: number;
  selfRepairs: number;
  approvalBoundary: boolean;
  fareVerified: boolean;
  explanationSource: "QWEN" | "DETERMINISTIC_FALLBACK" | "PENDING";
  evidenceCoverage: number;
}

function countSteps(outcome: RecoveryOutcome, prefix: string): number {
  return outcome.steps.filter((step) => step.id.startsWith(prefix)).length;
}

export function buildAgentRunTelemetry(
  outcome: RecoveryOutcome | null
): AgentRunTelemetry {
  if (!outcome) {
    return {
      decisionSteps: 0,
      candidatesEvaluated: 0,
      hardRejected: 0,
      atlasBackedCandidates: 0,
      providerRetries: 0,
      selfRepairs: 0,
      approvalBoundary: false,
      fareVerified: false,
      explanationSource: "PENDING",
      evidenceCoverage: 0,
    };
  }

  const candidatesEvaluated = outcome.evaluations.length;
  const hardRejected = outcome.evaluations.filter((item) => !item.valid).length;
  const atlasBackedCandidates = outcome.evaluations.filter(
    (item) => item.option.source === "ATLAS_SANDBOX"
  ).length;
  const providerRetries = countSteps(outcome, "step-provider-retry");
  const selfRepairs =
    countSteps(outcome, "step-provider-reject") +
    countSteps(outcome, "step-baggage-reject");
  const approvalBoundary = outcome.status === "NEEDS_APPROVAL";
  const fareVerified = Boolean(outcome.verification);
  const explanationSource = outcome.reasoning?.source ?? "PENDING";

  const evidenceSignals = [
    candidatesEvaluated > 0,
    atlasBackedCandidates > 0,
    outcome.policyCheck !== null,
    fareVerified,
    explanationSource !== "PENDING",
  ];
  const evidenceCoverage = Math.round(
    (evidenceSignals.filter(Boolean).length / evidenceSignals.length) * 100
  );

  return {
    decisionSteps: outcome.steps.length,
    candidatesEvaluated,
    hardRejected,
    atlasBackedCandidates,
    providerRetries,
    selfRepairs,
    approvalBoundary,
    fareVerified,
    explanationSource,
    evidenceCoverage,
  };
}
