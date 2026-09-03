import { describe, expect, test } from "bun:test";
import { buildAgentRunTelemetry } from "./agent-telemetry";
import type { RecoveryOutcome } from "./types";
import { SCHEDULE_CHANGE_EVENT } from "./scenario";

const outcome: RecoveryOutcome = {
  status: "NEEDS_APPROVAL",
  event: SCHEDULE_CHANGE_EVENT,
  evaluations: [
    {
      option: {
        id: "atlas-a",
        label: "Atlas A",
        flightNo: "AA 1",
        airline: "AA",
        destination: "SIN",
        departure: "12:00",
        arrival: "13:00",
        extraCostUsd: 20,
        source: "ATLAS_SANDBOX",
      },
      valid: false,
      reasons: ["expired"],
      withinAuthority: true,
      checks: [],
    },
    {
      option: {
        id: "atlas-b",
        label: "Atlas B",
        flightNo: "BB 2",
        airline: "BB",
        destination: "SIN",
        departure: "13:00",
        arrival: "14:00",
        extraCostUsd: 55,
        source: "ATLAS_SANDBOX",
      },
      valid: true,
      reasons: [],
      withinAuthority: false,
      checks: [],
    },
  ],
  selected: null,
  policyCheck: { withinAuthority: false, summary: "approval required" },
  steps: [
    { id: "step-evaluate", title: "evaluate", detail: "", tone: "info" },
    { id: "step-provider-retry-1", title: "retry", detail: "", tone: "warning" },
    { id: "step-provider-reject-2", title: "repair", detail: "", tone: "danger" },
  ],
  verification: {
    priceChange: "unchanged",
    source: "ATLAS_SANDBOX",
    summary: "verified",
  },
  reasoning: {
    source: "QWEN",
    headline: "decision",
    selectedReason: "reason",
    rejectedReason: "reason",
    authorityReason: "reason",
    nextAction: "approve",
  },
};

describe("agent run telemetry", () => {
  test("derives replayable metrics from recovery evidence", () => {
    const telemetry = buildAgentRunTelemetry(outcome);
    expect(telemetry.candidatesEvaluated).toBe(2);
    expect(telemetry.hardRejected).toBe(1);
    expect(telemetry.atlasBackedCandidates).toBe(2);
    expect(telemetry.providerRetries).toBe(1);
    expect(telemetry.selfRepairs).toBe(1);
    expect(telemetry.approvalBoundary).toBe(true);
    expect(telemetry.fareVerified).toBe(true);
    expect(telemetry.explanationSource).toBe("QWEN");
    expect(telemetry.evidenceCoverage).toBe(100);
  });

  test("returns zero evidence before a run exists", () => {
    expect(buildAgentRunTelemetry(null).evidenceCoverage).toBe(0);
  });
});
