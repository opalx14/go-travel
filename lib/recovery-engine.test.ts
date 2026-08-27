import { describe, expect, test } from "bun:test";
import { atlas } from "./atlas";
import {
  approveRecovery,
  declineRecovery,
  runRecovery,
} from "./recovery-engine";
import { DEFAULT_INTENT, ORIGINAL_FLIGHT } from "./scenario";
import type {
  DisruptionEvent,
  FlightOption,
  OfferVerification,
  TripDataProvider,
} from "./types";
import { SCHEDULE_CHANGE_EVENT } from "./scenario";

const OVER_AUTHORITY_INTENT = { ...DEFAULT_INTENT, maxExtraSpendUsd: 10 };

/** Build a provider with scripted alternatives and verification results. */
function fakeProvider(
  options: FlightOption[],
  verification: OfferVerification | (() => OfferVerification)
): TripDataProvider {
  return {
    async getDisruption(): Promise<DisruptionEvent> {
      return SCHEDULE_CHANGE_EVENT;
    },
    async searchAlternatives(): Promise<FlightOption[]> {
      return options;
    },
    async verifyOffer(): Promise<OfferVerification> {
      return typeof verification === "function" ? verification() : verification;
    },
  };
}

function option(overrides: Partial<FlightOption>): FlightOption {
  return {
    id: "opt-x",
    label: "Flight X",
    flightNo: "XX 1",
    airline: "Test Air",
    destination: "SIN",
    departure: "14:00",
    arrival: "15:30",
    baggageKg: 20,
    extraCostUsd: 20,
    ...overrides,
  };
}

const UNCHANGED: OfferVerification = {
  priceChange: "unchanged",
  currentPrice: 20,
  currency: "USD",
  source: "ATLAS_SANDBOX",
  summary: "Fare unchanged at $20.00",
};

describe("runRecovery — evaluation and selection", () => {
  test("arrival filtering keeps valid flights and rejects deadline breakers", async () => {
    const provider = fakeProvider(
      [
        option({ id: "ok", label: "Flight OK", arrival: "17:55", extraCostUsd: 30 }),
        option({ id: "late", label: "Flight Late", arrival: "18:05", extraCostUsd: 1 }),
      ],
      UNCHANGED
    );
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    expect(outcome.status).toBe("RECOVERED");
    expect(outcome.selected?.id).toBe("ok");
    const rejected = outcome.evaluations.filter((e) => !e.valid);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].option.id).toBe("late");
  });

  test("midnight-crossing arrival 00:05(+1d) is rejected, not false-passed", async () => {
    const provider = fakeProvider(
      [
        option({
          id: "night",
          label: "Flight Night",
          departure: "15:00",
          arrival: "00:05",
          arrivalDayOffset: 1,
          extraCostUsd: 1,
        }),
        option({ id: "day", label: "Flight Day", arrival: "17:00", extraCostUsd: 25 }),
      ],
      UNCHANGED
    );
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    expect(outcome.selected?.id).toBe("day");
    const night = outcome.evaluations.find((e) => e.option.id === "night");
    expect(night?.valid).toBe(false);
  });

  test("selects the cheapest valid option", async () => {
    const provider = fakeProvider(
      [
        option({ id: "pricy", arrival: "15:00", extraCostUsd: 45 }),
        option({ id: "cheap", label: "Flight Cheap", arrival: "16:00", extraCostUsd: 12 }),
      ],
      UNCHANGED
    );
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    expect(outcome.selected?.id).toBe("cheap");
  });
});

describe("runRecovery — fare verification branches", () => {
  test("unchanged verification => RECOVERED with 'Fare verified' step", async () => {
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, atlas);
    expect(outcome.status).toBe("RECOVERED");
    expect(outcome.verification?.priceChange).toBe("unchanged");
    expect(outcome.steps.at(-1)?.title).toBe("Fare verified");
    expect(outcome.steps.at(-1)?.detail).toContain("simulated fallback");
  });

  test("decreased verification updates the selected price and RECOVERS", async () => {
    const provider = fakeProvider([option({ extraCostUsd: 20 })], {
      priceChange: "decreased",
      previousPrice: 20,
      currentPrice: 15,
      currency: "USD",
      source: "ATLAS_SANDBOX",
      summary: "Fare decreased to $15.00",
    });
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    expect(outcome.status).toBe("RECOVERED");
    expect(outcome.selected?.replacementPriceUsd).toBe(15);
    expect(outcome.selected?.extraCostUsd).toBe(15);
    expect(outcome.steps.at(-1)?.detail).toContain("decreased");
  });

  test("increased verification => NEEDS_APPROVAL PRICE_INCREASED", async () => {
    const provider = fakeProvider([option({ extraCostUsd: 20 })], {
      priceChange: "increased",
      previousPrice: 20,
      currentPrice: 28,
      currency: "USD",
      source: "ATLAS_SANDBOX",
      summary: "Fare increased",
    });
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    expect(outcome.status).toBe("NEEDS_APPROVAL");
    expect(outcome.approval).toBe("PRICE_INCREASED");
    expect(outcome.verification?.previousPrice).toBe(20);
    expect(outcome.verification?.currentPrice).toBe(28);
    expect(outcome.steps.at(-1)?.detail).toContain("$20.00");
  });

  test("expired verification => FAILED", async () => {
    const provider = fakeProvider([option({ extraCostUsd: 20 })], {
      priceChange: "expired",
      source: "ATLAS_SANDBOX",
      summary: "Offer expired before it could be verified",
    });
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    expect(outcome.status).toBe("FAILED");
    expect(outcome.steps.at(-1)?.title).toBe("Offer expired");
  });

  test("failed verification => FAILED", async () => {
    const provider = fakeProvider([option({ extraCostUsd: 20 })], {
      priceChange: "failed",
      source: "ATLAS_SANDBOX",
      summary: "Offer verification failed",
    });
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    expect(outcome.status).toBe("FAILED");
  });
});

describe("runRecovery — authority and autopilot gates", () => {
  test("$10 authority + Autopilot ON => NEEDS_APPROVAL OVER_AUTHORITY (no verify yet)", async () => {
    const outcome = await runRecovery(
      ORIGINAL_FLIGHT,
      OVER_AUTHORITY_INTENT,
      atlas
    );
    expect(outcome.status).toBe("NEEDS_APPROVAL");
    expect(outcome.approval).toBe("OVER_AUTHORITY");
    expect(outcome.selected?.label).toBe("Flight B");
    expect(outcome.verification).toBeUndefined();
    // Flight C still hard-denied on arrival deadline.
    const rejected = outcome.evaluations.filter((e) => !e.valid);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].option.label).toBe("Flight C");
  });

  test("$50 authority + Autopilot OFF => NEEDS_APPROVAL AUTOPILOT_OFF", async () => {
    const outcome = await runRecovery(
      ORIGINAL_FLIGHT,
      { ...DEFAULT_INTENT, autopilot: false },
      atlas
    );
    expect(outcome.status).toBe("NEEDS_APPROVAL");
    expect(outcome.approval).toBe("AUTOPILOT_OFF");
  });

  test("impossible deadline => FAILED with no selected option", async () => {
    const outcome = await runRecovery(
      ORIGINAL_FLIGHT,
      { ...DEFAULT_INTENT, latestArrival: "14:00" },
      atlas
    );
    expect(outcome.status).toBe("FAILED");
    expect(outcome.selected).toBeNull();
  });
});

describe("passenger decision on pending recoveries", () => {
  test("approving PRICE_INCREASED accepts the increase without another CLI call", async () => {
    const provider = fakeProvider([option({ extraCostUsd: 20 })], {
      priceChange: "increased",
      previousPrice: 20,
      currentPrice: 28,
      currency: "USD",
      source: "ATLAS_SANDBOX",
      summary: "Fare increased",
    });
    const pending = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    const approved = await approveRecovery(ORIGINAL_FLIGHT, pending, provider);
    expect(approved.status).toBe("RECOVERED");
    expect(approved.approvedByPassenger).toBe(true);
    expect(approved.verification?.priceChange).toBe("increased");
    expect(approved.steps.at(-1)?.detail).toContain(
      "price confirmation and booking deferred"
    );
  });

  test("approving OVER_AUTHORITY verifies then RECOVERS when unchanged", async () => {
    const pending = await runRecovery(
      ORIGINAL_FLIGHT,
      OVER_AUTHORITY_INTENT,
      atlas
    );
    const approved = await approveRecovery(ORIGINAL_FLIGHT, pending, atlas);
    expect(approved.status).toBe("RECOVERED");
    expect(approved.approvedByPassenger).toBe(true);
    expect(approved.steps.slice(-2).map((step) => step.title)).toEqual([
      "Recovery approved",
      "Fare verified",
    ]);
    expect(approved.steps.at(-2)?.detail).toContain("Passenger approved +$19");
  });

  test("approving with a decreased fare refreshes the selected price", async () => {
    const provider = fakeProvider([option({ extraCostUsd: 20 })], {
      priceChange: "decreased",
      previousPrice: 20,
      currentPrice: 14,
      currency: "USD",
      source: "ATLAS_SANDBOX",
      summary: "Fare decreased to $14.00",
    });
    const pending = await runRecovery(ORIGINAL_FLIGHT, {
      ...DEFAULT_INTENT,
      autopilot: false,
    }, provider);
    expect(pending.approval).toBe("AUTOPILOT_OFF");
    const approved = await approveRecovery(ORIGINAL_FLIGHT, pending, provider);
    expect(approved.status).toBe("RECOVERED");
    // No stale price survives approval-time verification.
    expect(approved.selected?.replacementPriceUsd).toBe(14);
    expect(approved.selected?.extraCostUsd).toBe(14);
  });

  test("approving OVER_AUTHORITY escalates to PRICE_INCREASED when the fare moved", async () => {
    let calls = 0;
    const provider = fakeProvider([option({ extraCostUsd: 20 })], () => {
      calls += 1;
      return calls === 1
        ? {
            priceChange: "increased" as const,
            previousPrice: 20,
            currentPrice: 31,
            currency: "USD",
            source: "ATLAS_SANDBOX" as const,
            summary: "Fare increased",
          }
        : UNCHANGED;
    });
    // Autopilot off so the first run pauses without verifying.
    const pending = await runRecovery(ORIGINAL_FLIGHT, {
      ...DEFAULT_INTENT,
      autopilot: false,
    }, provider);
    expect(pending.approval).toBe("AUTOPILOT_OFF");
    const approved = await approveRecovery(ORIGINAL_FLIGHT, pending, provider);
    expect(approved.status).toBe("NEEDS_APPROVAL");
    expect(approved.approval).toBe("PRICE_INCREASED");
  });

  test("approving OVER_AUTHORITY FAILS when the offer expired", async () => {
    const provider = fakeProvider([option({ extraCostUsd: 20 })], {
      priceChange: "expired",
      source: "ATLAS_SANDBOX",
      summary: "Offer expired before it could be verified",
    });
    const pending = await runRecovery(ORIGINAL_FLIGHT, {
      ...DEFAULT_INTENT,
      autopilot: false,
    }, provider);
    const approved = await approveRecovery(ORIGINAL_FLIGHT, pending, provider);
    expect(approved.status).toBe("FAILED");
    expect(approved.steps.at(-1)?.title).toBe("Offer expired");
  });

  test("declineRecovery keeps the current trip => DECLINED", async () => {
    const pending = await runRecovery(
      ORIGINAL_FLIGHT,
      OVER_AUTHORITY_INTENT,
      atlas
    );
    const declined = declineRecovery(pending);
    expect(declined.status).toBe("DECLINED");
    expect(declined.approvedByPassenger).toBeUndefined();
    expect(declined.steps.at(-1)?.title).toBe("Passenger kept current trip");
  });
});
