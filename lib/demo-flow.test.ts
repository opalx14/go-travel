import { describe, expect, test } from "bun:test";
import { atlas } from "./atlas";
import { canSimulateDisruption, INITIAL_IS_PROTECTED } from "./demo-store";
import { toMinutes } from "./policy-engine";
import { runRecovery } from "./recovery-engine";
import { DEFAULT_INTENT, ORIGINAL_FLIGHT, SCHEDULE_CHANGE_EVENT } from "./scenario";

describe("protection gate", () => {
  test("trip starts unprotected", () => {
    expect(INITIAL_IS_PROTECTED).toBe(false);
  });

  test("unprotected trip cannot start a disruption run", () => {
    expect(canSimulateDisruption(false, "idle")).toBe(false);
  });

  test("protected idle trip can start a disruption run", () => {
    expect(canSimulateDisruption(true, "idle")).toBe(true);
  });

  test("protected but running/disrupted/settled trip cannot restart", () => {
    expect(canSimulateDisruption(true, "running")).toBe(false);
    expect(canSimulateDisruption(true, "disrupted")).toBe(false);
    expect(canSimulateDisruption(true, "complete")).toBe(false);
  });
});

describe("KUL → SIN scenario invariants", () => {
  test("the trip is KUL → SIN with a fictional carrier", () => {
    expect(ORIGINAL_FLIGHT.origin).toBe("KUL");
    expect(ORIGINAL_FLIGHT.destination).toBe("SIN");
  });

  test("original arrival met the deadline before the disruption", () => {
    expect(
      toMinutes(ORIGINAL_FLIGHT.arrival) <= toMinutes(DEFAULT_INTENT.latestArrival)
    ).toBe(true);
  });

  test("the simulated new arrival breaks the deadline", () => {
    expect(
      toMinutes(SCHEDULE_CHANGE_EVENT.newArrival) >
        toMinutes(DEFAULT_INTENT.latestArrival)
    ).toBe(true);
    expect(SCHEDULE_CHANGE_EVENT.newDeparture).toBe("17:30");
    expect(SCHEDULE_CHANGE_EVENT.newArrival).toBe("20:35");
    expect(SCHEDULE_CHANGE_EVENT.tripId).toBe(ORIGINAL_FLIGHT.id);
  });
});

describe("protected disruption runs the recovery", () => {
  test("recovery verifies the fare through the provider", async () => {
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, atlas);
    expect(outcome.status).toBe("RECOVERED");
    expect(outcome.selected?.label).toBe("Flight B");
    expect(outcome.verification?.priceChange).toBe("unchanged");
    expect(outcome.verification?.source).toBe("SIMULATED_FALLBACK");
    expect(outcome.steps.at(-1)?.title).toBe("Fare verified");
  });
});
