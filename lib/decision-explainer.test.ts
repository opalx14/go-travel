import { describe, expect, test } from "bun:test";
import {
  buildDeterministicDecisionExplanation,
  normalizeDecisionExplanation,
} from "./decision-explainer";
import type { RecoveryOutcome } from "./types";

const outcome: RecoveryOutcome = {
  status: "RECOVERED",
  event: {
    id: "evt-1",
    tripId: "trip-1",
    type: "SCHEDULE_CHANGED",
    summary: "Arrival moved beyond deadline",
    originalDeparture: "13:05",
    originalArrival: "14:15",
    newDeparture: "17:30",
    newArrival: "20:35",
  },
  intent: {
    latestArrival: "18:00",
    departureFlexibilityHours: 3,
    minBaggageKg: 20,
    maxExtraSpendUsd: 50,
    autopilot: true,
  },
  evaluations: [
    {
      option: {
        id: "cheap-late",
        label: "Flight C",
        flightNo: "SB 507",
        airline: "Skybridge Air",
        destination: "SIN",
        departure: "15:50",
        arrival: "19:40",
        baggageKg: 20,
        extraCostUsd: 5,
      },
      valid: false,
      reasons: ["Arrives after 18:00 deadline"],
      withinAuthority: true,
      checks: [],
    },
    {
      option: {
        id: "valid",
        label: "Flight B",
        flightNo: "CA 88",
        airline: "Coral Airways",
        destination: "SIN",
        departure: "15:20",
        arrival: "16:35",
        baggageKg: 20,
        extraCostUsd: 19,
      },
      valid: true,
      reasons: [],
      withinAuthority: true,
      checks: [],
    },
  ],
  selected: {
    id: "valid",
    label: "Flight B",
    flightNo: "CA 88",
    airline: "Coral Airways",
    destination: "SIN",
    departure: "15:20",
    arrival: "16:35",
    baggageKg: 20,
    extraCostUsd: 19,
  },
  policyCheck: {
    withinAuthority: true,
    summary: "Within delegated authority",
  },
  steps: [],
};

describe("decision explainer", () => {
  test("makes the cheapest rejected option explicit without changing the decision", () => {
    const explanation = buildDeterministicDecisionExplanation(outcome);
    expect(explanation.selectedReason).toContain("CA 88");
    expect(explanation.rejectedReason).toContain("SB 507");
    expect(explanation.rejectedReason).toContain("Arrives after 18:00 deadline");
    expect(explanation.authorityReason).toContain("inside delegated authority");
  });

  test("normalizes Qwen wording while preserving a deterministic fallback", () => {
    const fallback = buildDeterministicDecisionExplanation(outcome);
    const explanation = normalizeDecisionExplanation(
      {
        headline: "CA 88 preserves the protected outcome.",
        selectedReason: "It arrives before 18:00 and stays inside authority.",
      },
      fallback,
      "qwen-flash"
    );

    expect(explanation.source).toBe("QWEN");
    expect(explanation.model).toBe("qwen-flash");
    expect(explanation.headline).toContain("CA 88");
    expect(explanation.rejectedReason).toBe(fallback.rejectedReason);
  });
});
