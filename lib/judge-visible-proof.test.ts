import { describe, expect, test } from "bun:test";
import { buildJudgeVisibleProof } from "./judge-visible-proof";
import { DEFAULT_INTENT, SCHEDULE_CHANGE_EVENT } from "./scenario";
import type { RecoveryOutcome } from "./types";

function outcome(overrides: Partial<RecoveryOutcome>): RecoveryOutcome {
  return {
    status: "RECOVERED",
    intent: DEFAULT_INTENT,
    event: SCHEDULE_CHANGE_EVENT,
    evaluations: [],
    selected: null,
    policyCheck: null,
    steps: [],
    ...overrides,
  };
}

describe("judge-visible proof summary", () => {
  test("stays hidden before a disruption", () => {
    expect(
      buildJudgeVisibleProof({ phase: "idle", outcome: null, runtimeMode: "demo" })
    ).toBeNull();
  });

  test("shows a human boundary for scope expansion without pretending recovery failed", () => {
    const proof = buildJudgeVisibleProof({
      phase: "complete",
      runtimeMode: "live",
      outcome: outcome({
        status: "NEEDS_APPROVAL",
        approval: "SCOPE_EXPANSION",
      }),
    });

    expect(proof?.tone).toBe("warning");
    expect(proof?.headline).toContain("passenger consent");
    expect(proof?.chips.some((chip) => chip.value === "Passenger approval")).toBe(true);
  });

  test("labels real Atlas and Qwen evidence only when present", () => {
    const proof = buildJudgeVisibleProof({
      phase: "complete",
      runtimeMode: "live",
      outcome: outcome({
        selected: {
          id: "atlas-1",
          label: "Atlas 1",
          flightNo: "AK705",
          airline: "AirAsia",
          destination: "SIN",
          departure: "08:30",
          arrival: "09:40",
          extraCostUsd: 24.95,
          source: "ATLAS_SANDBOX",
        },
        verification: {
          priceChange: "unchanged",
          source: "ATLAS_SANDBOX",
          summary: "Fare unchanged",
        },
        reasoning: {
          source: "QWEN",
          model: "mlx-community/Qwen3.5-9B-MLX-4bit",
          headline: "Recovery verified",
          selectedReason: "Meets the contract",
          rejectedReason: "Late option rejected",
          authorityReason: "Inside authority",
          nextAction: "Continue",
        },
      }),
    });

    expect(proof?.chips.some((chip) => chip.value === "Atlas Sandbox")).toBe(true);
    expect(proof?.chips.some((chip) => chip.value === "Qwen local")).toBe(true);
  });
});
