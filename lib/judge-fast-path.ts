export interface JudgeFastPathSegment {
  id: string;
  startSecond: number;
  endSecond: number;
  title: string;
  proof: string;
  operatorCue: string;
}

export const JUDGE_FAST_PATH: JudgeFastPathSegment[] = [
  {
    id: "problem-contract",
    startSecond: 0,
    endSecond: 25,
    title: "Problem + Outcome Contract",
    proof: "Traveler sets arrival deadline, baggage, departure flexibility, and delegated spend before disruption.",
    operatorCue: "Protect trip and point to the contract, not the implementation.",
  },
  {
    id: "disruption",
    startSecond: 25,
    endSecond: 40,
    title: "Simulated disruption",
    proof: "Schedule change is explicitly labeled SIMULATED and breaks the arrival deadline.",
    operatorCue: "Trigger disruption and call out provenance.",
  },
  {
    id: "orchestration",
    startSecond: 40,
    endSecond: 75,
    title: "Qwen + Atlas orchestration",
    proof: "Qwen chooses bounded read-only tools while Atlas provides search/verification evidence and deterministic policy owns the decision.",
    operatorCue: "Open agent trace only after the traveler story is clear.",
  },
  {
    id: "reject-trap",
    startSecond: 75,
    endSecond: 100,
    title: "Cheapest trap rejected",
    proof: "A cheaper option cannot win when deadline, destination, baggage, or consented recovery scope fails.",
    operatorCue: "Point to one rejected candidate and its hard-check reason.",
  },
  {
    id: "repair",
    startSecond: 100,
    endSecond: 120,
    title: "Self-repair + bounded retry",
    proof: "Expired/failed offers and transient read-only provider errors recover inside a bounded retry budget.",
    operatorCue: "Use Failure Lab or trace evidence; do not narrate every internal step.",
  },
  {
    id: "human-boundary",
    startSecond: 120,
    endSecond: 145,
    title: "Human authority boundary",
    proof: "Over-authority spend, price increases, autopilot off, or broader airport/date scope stop for explicit passenger approval.",
    operatorCue: "Pause on NEEDS_APPROVAL and emphasize that Qwen cannot approve itself.",
  },
  {
    id: "proof-matrix",
    startSecond: 145,
    endSecond: 170,
    title: "Benchmarks + adversarial proof + audit",
    proof: "Safety evals, scenario benchmark, red-team matrix, SHA-256 audit, and preflight make the behavior reproducible.",
    operatorCue: "Show pass counts and audit identity; avoid opening every panel.",
  },
  {
    id: "business-outcome",
    startSecond: 170,
    endSecond: 180,
    title: "Business outcome",
    proof: "TripIntent recovers traveler outcomes while preserving delegated authority, auditability, and human control.",
    operatorCue: "Close on outcome value, not model size.",
  },
];

export function validateJudgeFastPath(
  segments: JudgeFastPathSegment[] = JUDGE_FAST_PATH
): string[] {
  const violations: string[] = [];
  if (segments.length === 0) return ["Fast path must contain at least one segment."];
  if (segments[0].startSecond !== 0) violations.push("Fast path must start at 0 seconds.");
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment.endSecond <= segment.startSecond) {
      violations.push(`${segment.id} must have a positive duration.`);
    }
    if (index > 0 && segment.startSecond !== segments[index - 1].endSecond) {
      violations.push(`${segment.id} must start when the previous segment ends.`);
    }
  }
  if (segments.at(-1)?.endSecond !== 180) {
    violations.push("Fast path must end exactly at 180 seconds.");
  }
  return violations;
}
