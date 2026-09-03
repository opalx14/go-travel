import type { RecoveryOutcome } from "./types";

export interface AgentAuditEvidence {
  version: 1;
  algorithm: "SHA-256";
  decisionHash: string;
  shortId: string;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)])
    );
  }
  return value;
}

/**
 * Only facts that can affect the recovery decision belong in the fingerprint.
 * Qwen reasoning text is intentionally excluded because it is read-only prose.
 */
export function decisionCriticalFacts(outcome: RecoveryOutcome) {
  return stableValue({
    status: outcome.status,
    approval: outcome.approval,
    approvedByPassenger: outcome.approvedByPassenger,
    intent: outcome.intent,
    event: {
      id: outcome.event.id,
      tripId: outcome.event.tripId,
      type: outcome.event.type,
      originalDeparture: outcome.event.originalDeparture,
      originalArrival: outcome.event.originalArrival,
      newDeparture: outcome.event.newDeparture,
      newArrival: outcome.event.newArrival,
    },
    evaluations: outcome.evaluations.map((evaluation) => ({
      option: evaluation.option,
      valid: evaluation.valid,
      reasons: evaluation.reasons,
      withinAuthority: evaluation.withinAuthority,
      checks: evaluation.checks,
    })),
    selected: outcome.selected,
    policyCheck: outcome.policyCheck,
    verification: outcome.verification,
    steps: outcome.steps,
  });
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export async function createAgentAuditEvidence(
  outcome: RecoveryOutcome
): Promise<AgentAuditEvidence> {
  const payload = JSON.stringify(decisionCriticalFacts(outcome));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload)
  );
  const decisionHash = toHex(digest);
  return {
    version: 1,
    algorithm: "SHA-256",
    decisionHash,
    shortId: `TI-${decisionHash.slice(0, 16)}`,
  };
}

export async function verifyAgentAuditEvidence(
  outcome: RecoveryOutcome,
  evidence: AgentAuditEvidence
): Promise<boolean> {
  const current = await createAgentAuditEvidence(outcome);
  return (
    evidence.version === current.version &&
    evidence.algorithm === current.algorithm &&
    evidence.decisionHash === current.decisionHash
  );
}
