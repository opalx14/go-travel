import type { RecoveryOutcome } from "./types";
import type { RuntimeMode } from "./runtime-mode";

export const OPEN_AGENT_TRACE_EVENT = "tripintent:open-agent-trace";

export type JudgeProofTone = "info" | "success" | "warning" | "danger";

export interface JudgeProofChip {
  label: string;
  value: string;
  state: "live" | "guarded" | "fallback" | "human";
}

export interface JudgeVisibleProof {
  tone: JudgeProofTone;
  eyebrow: string;
  headline: string;
  detail: string;
  chips: JudgeProofChip[];
}

function atlasValue(outcome: RecoveryOutcome | null): JudgeProofChip {
  const source = outcome?.verification?.source ?? outcome?.selected?.source;
  return source === "ATLAS_SANDBOX"
    ? { label: "Travel evidence", value: "Atlas Sandbox", state: "live" }
    : { label: "Travel evidence", value: "Demo fallback", state: "fallback" };
}

function qwenValue(outcome: RecoveryOutcome | null): JudgeProofChip {
  if (outcome?.reasoning?.source === "QWEN") {
    return { label: "AI explanation", value: "Qwen local", state: "live" };
  }
  return {
    label: "AI explanation",
    value: "Deterministic fallback",
    state: "fallback",
  };
}

export function buildJudgeVisibleProof(input: {
  phase: "idle" | "disrupted" | "running" | "complete";
  outcome: RecoveryOutcome | null;
  runtimeMode: RuntimeMode;
}): JudgeVisibleProof | null {
  if (input.phase === "idle") return null;

  const chips: JudgeProofChip[] = [
    qwenValue(input.outcome),
    atlasValue(input.outcome),
    { label: "Decision authority", value: "Deterministic policy", state: "guarded" },
  ];

  if (input.outcome?.status === "NEEDS_APPROVAL") {
    chips.push({ label: "Execution boundary", value: "Passenger approval", state: "human" });
  }

  if (input.phase === "disrupted") {
    return {
      tone: "danger",
      eyebrow: "Outcome contract breached",
      headline: "TripIntent detected a recovery-worthy disruption",
      detail: "The changed itinerary misses the passenger outcome. No booking action is taken until a policy-valid recovery is found.",
      chips,
    };
  }

  if (input.phase === "running" && !input.outcome) {
    return {
      tone: "info",
      eyebrow: "Bounded recovery running",
      headline: "Searching and verifying without relaxing the contract",
      detail: input.runtimeMode === "live"
        ? "Live mode requires connected Qwen and Atlas evidence; deterministic policy remains authoritative."
        : "Demo mode may use clearly labeled fallback evidence; deterministic policy remains authoritative.",
      chips,
    };
  }

  const outcome = input.outcome;
  if (!outcome) return null;

  if (outcome.status === "RECOVERED") {
    return {
      tone: "success",
      eyebrow: "Verified autonomous recovery",
      headline: `${outcome.selected?.flightNo ?? "Recovery"} satisfies the protected outcome`,
      detail: "Provider evidence was checked, the deterministic policy gate passed, and the recovery stayed inside delegated authority.",
      chips,
    };
  }

  if (outcome.status === "NEEDS_APPROVAL") {
    const scopeExpansion = outcome.approval === "SCOPE_EXPANSION";
    return {
      tone: "warning",
      eyebrow: "Human boundary reached",
      headline: scopeExpansion
        ? "Broader airport/date recovery needs passenger consent"
        : "The agent stopped before crossing delegated authority",
      detail: scopeExpansion
        ? "Exact and contract-preserving recovery scopes were exhausted. TripIntent will not widen airport or date constraints without explicit approval."
        : "The recovery remains on hold until the passenger approves the price, authority exception, or manual-control checkpoint.",
      chips,
    };
  }

  if (outcome.status === "DECLINED") {
    return {
      tone: "info",
      eyebrow: "Passenger decision preserved",
      headline: "Current itinerary kept unchanged",
      detail: "The passenger declined the proposed recovery; TripIntent did not execute a booking change.",
      chips,
    };
  }

  return {
    tone: "danger",
    eyebrow: "Safe stop",
    headline: "No policy-valid recovery was executed",
    detail: "TripIntent failed closed instead of inventing inventory, weakening the deadline, or bypassing baggage and authority constraints.",
    chips,
  };
}
