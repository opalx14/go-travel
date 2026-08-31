import { describe, expect, test } from "bun:test";
import type { DeviceJourneySnapshot } from "./device-state";
import { buildOperationsReport } from "./operations-finance";
import {
  DEFAULT_INTENT,
  ORIGINAL_FLIGHT,
  SCHEDULE_CHANGE_EVENT,
} from "./scenario";
import type { FlightOption, RecoveryOutcome } from "./types";

const SELECTED_OPTION: FlightOption = {
  id: "opt-test",
  label: "Flight Test",
  flightNo: "AK 701",
  airline: "AirAsia",
  destination: "SIN",
  departure: "14:00",
  arrival: "15:15",
  baggageKg: 20,
  extraCostUsd: 42,
  source: "ATLAS_SANDBOX",
};

function snapshot(outcome: RecoveryOutcome | null, phase: DeviceJourneySnapshot["phase"]): DeviceJourneySnapshot {
  return {
    version: 1,
    trip: ORIGINAL_FLIGHT,
    intent: DEFAULT_INTENT,
    phase,
    playedSteps: [],
    outcome,
    isProtected: true,
    exceptions: phase === "idle" ? [] : [SCHEDULE_CHANGE_EVENT],
    stats: { exceptions: phase === "idle" ? 0 : 1, autoResolved: 0, needsApproval: 0 },
    intentMatchedFields: [],
    intentSource: null,
    savedAt: "2026-08-31T10:00:00.000Z",
  };
}

function evidence(value: DeviceJourneySnapshot) {
  return {
    deviceId: "12345678-abcd-4000-9000-123456789abc",
    createdAt: "2026-08-31T09:00:00.000Z",
    lastSeenAt: "2026-08-31T10:00:00.000Z",
    updatedAt: "2026-08-31T10:00:00.000Z",
    snapshot: value,
  };
}

describe("operations finance report", () => {
  test("recognizes delegated recovery spend only after a successful recovery", () => {
    const recovered: RecoveryOutcome = {
      status: "RECOVERED",
      event: SCHEDULE_CHANGE_EVENT,
      evaluations: [],
      selected: SELECTED_OPTION,
      policyCheck: null,
      steps: [],
      approvedByPassenger: true,
    };

    const report = buildOperationsReport(
      [evidence(snapshot(recovered, "complete"))],
      "2026-08-31T10:01:00.000Z"
    );
    const booking = report.bookings[0];

    expect(report.dataMode).toBe("device-evidence");
    expect(booking.recoverySpendUsd).toBe(42);
    expect(booking.supplierCostUsd).toBe(131);
    expect(booking.serviceRevenueUsd).toBe(10.68);
    expect(booking.bookingValueUsd).toBe(141.68);
    expect(booking.grossProfitUsd).toBe(10.68);
    expect(booking.revenueProtectedUsd).toBe(99.68);
    expect(report.summary.recoveryRoi).toBe(2.37);
  });

  test("keeps pending recovery spend out of P&L and marks original value at risk", () => {
    const pending: RecoveryOutcome = {
      status: "NEEDS_APPROVAL",
      event: SCHEDULE_CHANGE_EVENT,
      evaluations: [],
      selected: SELECTED_OPTION,
      policyCheck: null,
      steps: [],
      approval: "OVER_AUTHORITY",
    };

    const report = buildOperationsReport([evidence(snapshot(pending, "complete"))]);
    const booking = report.bookings[0];

    expect(booking.health).toBe("approval");
    expect(booking.recoverySpendUsd).toBe(0);
    expect(booking.bookingValueUsd).toBe(99.68);
    expect(booking.revenueProtectedUsd).toBe(0);
    expect(booking.revenueAtRiskUsd).toBe(99.68);
  });

  test("falls back to a deterministic judge-ready cohort when storage is empty", () => {
    const report = buildOperationsReport([], "2026-08-31T10:01:00.000Z");

    expect(report.dataMode).toBe("demo-scenario");
    expect(report.bookings.length).toBeGreaterThan(0);
    expect(report.summary.serviceRevenueUsd).toBeGreaterThan(0);
    expect(report.summary.revenueProtectedUsd).toBeGreaterThan(0);
  });
});
