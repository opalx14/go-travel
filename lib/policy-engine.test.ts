import { describe, expect, test } from "bun:test";
import {
  evaluateOption,
  runPolicyCheck,
  selectBestOption,
} from "./policy-engine";
import { ALTERNATIVES, DEFAULT_INTENT, ORIGINAL_FLIGHT } from "./scenario";

const [flightA, flightB, flightC] = ALTERNATIVES;

function evaluate(
  option: (typeof ALTERNATIVES)[number],
  intent = DEFAULT_INTENT
) {
  return evaluateOption(
    option,
    intent,
    ORIGINAL_FLIGHT.departure,
    ORIGINAL_FLIGHT.destination
  );
}

describe("evaluateOption — hard constraints vs spending authority", () => {
  test("over-authority option with hard constraints satisfied stays valid", () => {
    const evaluation = evaluate(flightB, {
      ...DEFAULT_INTENT,
      maxExtraSpendUsd: 10,
    });
    expect(evaluation.valid).toBe(true);
    expect(evaluation.reasons).toEqual([]);
    expect(evaluation.withinAuthority).toBe(false);
  });

  test("within-authority option reports withinAuthority true", () => {
    const evaluation = evaluate(flightB);
    expect(evaluation.valid).toBe(true);
    expect(evaluation.withinAuthority).toBe(true);
  });

  test("Flight C is denied on the arrival deadline", () => {
    const evaluation = evaluate(flightC);
    expect(evaluation.valid).toBe(false);
    expect(evaluation.reasons.join(" ")).toContain("19:40");
  });

  test("destination mismatch is a hard denial", () => {
    const evaluation = evaluate({ ...flightB, destination: "BKK" });
    expect(evaluation.valid).toBe(false);
    expect(evaluation.reasons.join(" ")).toContain("BKK");
  });

  test("baggage shortfall is a hard denial", () => {
    const evaluation = evaluate({ ...flightB, baggageKg: 15 });
    expect(evaluation.valid).toBe(false);
    expect(evaluation.reasons.join(" ")).toContain("15kg");
  });

  test("unknown baggage is informational, not a hard failure", () => {
    const evaluation = evaluate({ ...flightB, baggageKg: undefined });
    expect(evaluation.valid).toBe(true);
    expect(evaluation.reasons).toEqual([]);
    const baggage = evaluation.checks.find((c) => c.kind === "BAGGAGE");
    expect(baggage?.hard).toBe(false);
    expect(baggage?.passed).toBe(true);
    expect(baggage?.reason).toBeUndefined();
    expect(baggage?.detail).toBe(
      "Pending Atlas verification · must confirm ≥ 20kg"
    );
  });

  test("earlier departures are allowed because flexibility only caps lateness", () => {
    const evaluation = evaluate({ ...flightB, departure: "09:40" });
    expect(evaluation.valid).toBe(true);
    const flexibility = evaluation.checks.find((c) => c.kind === "FLEXIBILITY");
    expect(flexibility?.passed).toBe(true);
  });

  test("midnight-crossing arrival counts the day offset", () => {
    const evaluation = evaluate({
      ...flightB,
      arrival: "00:05",
      arrivalDayOffset: 1,
    });
    expect(evaluation.valid).toBe(false);
    const arrival = evaluation.checks.find((c) => c.kind === "ARRIVAL");
    expect(arrival?.detail).toContain("(+1d)");
    expect(evaluation.reasons.join(" ")).toContain("00:05 (+1d)");
  });
});

describe("selectBestOption", () => {
  test("picks lowest-cost hard-valid option even when over authority", () => {
    const evaluations = ALTERNATIVES.map((option) =>
      evaluate(option, { ...DEFAULT_INTENT, maxExtraSpendUsd: 10 })
    );
    expect(selectBestOption(evaluations)?.id).toBe(flightB.id);
  });

  test("never selects a hard-invalid option", () => {
    const evaluations = [evaluate(flightC)];
    expect(selectBestOption(evaluations)).toBeNull();
  });

  test("selects an unknown-baggage option when it is the only valid one", () => {
    const evaluations = [evaluate({ ...flightB, baggageKg: undefined })];
    expect(selectBestOption(evaluations)?.id).toBe(flightB.id);
  });
});

describe("runPolicyCheck", () => {
  test("within authority allows autonomous execution", () => {
    const check = runPolicyCheck(flightB, DEFAULT_INTENT);
    expect(check.withinAuthority).toBe(true);
    expect(check.summary).toContain("within the $50 spending authority");
  });

  test("over authority requires passenger approval, not denial", () => {
    const check = runPolicyCheck(flightA, {
      ...DEFAULT_INTENT,
      maxExtraSpendUsd: 10,
    });
    expect(check.withinAuthority).toBe(false);
    expect(check.summary).toContain("passenger approval required");
  });

  test("formats provider-adjusted spend without floating-point noise", () => {
    const check = runPolicyCheck(
      { ...flightB, extraCostUsd: 59.959999999999994 },
      DEFAULT_INTENT
    );
    expect(check.summary).toContain("+$59.96");
    expect(check.summary).not.toContain("59.959999");
  });
});
