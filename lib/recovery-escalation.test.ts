import { describe, expect, test } from "bun:test";
import { evaluateOption } from "./policy-engine";
import { buildRecoveryEscalationPlan } from "./recovery-escalation";
import { DEFAULT_INTENT, ORIGINAL_FLIGHT } from "./scenario";
import type { FlightOption } from "./types";

function option(overrides: Partial<FlightOption>): FlightOption {
  return {
    id: "opt",
    label: "Option",
    flightNo: "TT 1",
    airline: "Test Air",
    destination: ORIGINAL_FLIGHT.destination,
    departure: "13:40",
    arrival: "15:00",
    baggageKg: 20,
    extraCostUsd: 20,
    stops: 0,
    ...overrides,
  };
}

function evaluate(options: FlightOption[]) {
  return options.map((candidate) =>
    evaluateOption(
      candidate,
      DEFAULT_INTENT,
      ORIGINAL_FLIGHT.departure,
      ORIGINAL_FLIGHT.destination
    )
  );
}

describe("buildRecoveryEscalationPlan", () => {
  test("stops at EXACT before cheaper broader scopes", () => {
    const plan = buildRecoveryEscalationPlan(
      ORIGINAL_FLIGHT,
      DEFAULT_INTENT,
      evaluate([
        option({ id: "exact", departure: "13:40", extraCostUsd: 40 }),
        option({ id: "flex", departure: "15:00", extraCostUsd: 10 }),
        option({ id: "connection", departure: "14:00", stops: 1, extraCostUsd: 5 }),
      ])
    );

    expect(plan.selectedScope).toBe("EXACT");
    expect(plan.candidateIds).toEqual(["exact"]);
    expect(plan.requiresPassengerApproval).toBe(false);
  });

  test("escalates in order to departure flex, then connection", () => {
    const flexPlan = buildRecoveryEscalationPlan(
      ORIGINAL_FLIGHT,
      DEFAULT_INTENT,
      evaluate([
        option({ id: "flex", departure: "15:00" }),
        option({ id: "connection", departure: "14:00", stops: 1 }),
      ])
    );
    expect(flexPlan.selectedScope).toBe("DEPARTURE_FLEX");
    expect(flexPlan.candidateIds).toEqual(["flex"]);

    const connectionPlan = buildRecoveryEscalationPlan(
      ORIGINAL_FLIGHT,
      DEFAULT_INTENT,
      evaluate([option({ id: "connection", departure: "14:00", stops: 1 })])
    );
    expect(connectionPlan.selectedScope).toBe("CONNECTION");
    expect(connectionPlan.candidateIds).toEqual(["connection"]);
  });

  test("requires explicit approval before widening destination/departure constraints", () => {
    const plan = buildRecoveryEscalationPlan(
      ORIGINAL_FLIGHT,
      DEFAULT_INTENT,
      evaluate([
        option({
          id: "nearby-airport",
          destination: "JHB",
          departure: "17:00",
          arrival: "17:30",
        }),
      ])
    );

    expect(plan.selectedScope).toBeNull();
    expect(plan.requiresPassengerApproval).toBe(true);
    expect(plan.steps.at(-1)?.scope).toBe("NEARBY_AIRPORT_OR_DATE");
    expect(plan.steps.at(-1)?.status).toBe("REQUIRES_APPROVAL");
    expect(plan.steps.at(-1)?.provenance).toBe("HUMAN_BOUNDARY");
  });

  test("fails closed for deadline or baggage failures instead of weakening them", () => {
    const plan = buildRecoveryEscalationPlan(
      ORIGINAL_FLIGHT,
      DEFAULT_INTENT,
      evaluate([
        option({ id: "late", arrival: "20:00" }),
        option({ id: "no-bag", baggageKg: 0 }),
      ])
    );

    expect(plan.selectedScope).toBeNull();
    expect(plan.requiresPassengerApproval).toBe(false);
    expect(plan.steps.at(-1)?.status).toBe("EXHAUSTED");
    expect(plan.stopReason).toContain("no safe scope expansion");
  });
});
