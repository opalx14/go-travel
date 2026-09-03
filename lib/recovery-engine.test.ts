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
  verification:
    | OfferVerification
    | ((option: FlightOption) => OfferVerification)
): TripDataProvider {
  return {
    async getDisruption(): Promise<DisruptionEvent> {
      return SCHEDULE_CHANGE_EVENT;
    },
    async searchAlternatives(): Promise<FlightOption[]> {
      return options;
    },
    async verifyOffer(selected): Promise<OfferVerification> {
      return typeof verification === "function"
        ? verification(selected)
        : verification;
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

describe("runRecovery — Atlas baggage validation", () => {
  test("self-repairs when the cheapest Atlas offer expires during verification", async () => {
    const provider = fakeProvider(
      [
        option({
          id: "atlas-expired",
          label: "Atlas Expired",
          source: "ATLAS_SANDBOX",
          baggageKg: undefined,
          replacementPriceUsd: 12,
          extraCostUsd: 12,
        }),
        option({
          id: "atlas-repair",
          label: "Atlas Repair",
          source: "ATLAS_SANDBOX",
          baggageKg: undefined,
          replacementPriceUsd: 20,
          extraCostUsd: 20,
        }),
      ],
      (selected) =>
        selected.id === "atlas-expired"
          ? {
              priceChange: "expired",
              source: "ATLAS_SANDBOX",
              summary: "Offer expired before verification",
            }
          : {
              priceChange: "unchanged",
              previousPrice: 20,
              currentPrice: 20,
              currency: "USD",
              source: "ATLAS_SANDBOX",
              summary: "Fare unchanged",
              baggageSupported: true,
              baggageStatus: "available",
              baggageOptions: [
                {
                  baggageId: "bag-repair",
                  segmentId: "seg-repair",
                  weightKg: 20,
                  price: 5,
                  currency: "USD",
                },
              ],
            }
    );

    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    expect(outcome.status).toBe("RECOVERED");
    expect(outcome.selected?.id).toBe("atlas-repair");
    expect(outcome.evaluations.find((item) => item.option.id === "atlas-expired")?.valid).toBe(false);
    expect(outcome.steps.some((step) => step.title === "Atlas Expired rejected after verification")).toBe(true);
  });

  test("self-repairs when Atlas verification fails for the first candidate", async () => {
    const provider = fakeProvider(
      [
        option({
          id: "atlas-failed",
          label: "Atlas Failed",
          source: "ATLAS_SANDBOX",
          baggageKg: undefined,
          replacementPriceUsd: 10,
          extraCostUsd: 10,
        }),
        option({
          id: "atlas-second",
          label: "Atlas Second",
          source: "ATLAS_SANDBOX",
          baggageKg: undefined,
          replacementPriceUsd: 18,
          extraCostUsd: 18,
        }),
      ],
      (selected) =>
        selected.id === "atlas-failed"
          ? {
              priceChange: "failed",
              source: "ATLAS_SANDBOX",
              summary: "Provider verification unavailable",
            }
          : {
              priceChange: "unchanged",
              previousPrice: 18,
              currentPrice: 18,
              currency: "USD",
              source: "ATLAS_SANDBOX",
              summary: "Fare unchanged",
              baggageSupported: true,
              baggageStatus: "available",
              baggageOptions: [
                {
                  baggageId: "bag-second",
                  segmentId: "seg-second",
                  weightKg: 20,
                  price: 4,
                  currency: "USD",
                },
              ],
            }
    );

    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    expect(outcome.status).toBe("RECOVERED");
    expect(outcome.selected?.id).toBe("atlas-second");
    expect(outcome.steps.some((step) => step.detail.includes("provider verification failure"))).toBe(true);
  });

  test("baggage cost is added before the spending-authority gate", async () => {
    const atlasOption = option({
      id: "atlas-20kg",
      label: "Atlas 20kg",
      source: "ATLAS_SANDBOX",
      baggageKg: undefined,
      replacementPriceUsd: 24.98,
      extraCostUsd: 24.98,
    });
    const provider = fakeProvider([atlasOption], {
      priceChange: "unchanged",
      currentPrice: 24.98,
      previousPrice: 24.98,
      currency: "USD",
      source: "ATLAS_SANDBOX",
      summary: "Fare unchanged at $24.98",
      baggageSupported: true,
      baggageStatus: "available",
      baggageOptions: [
        {
          baggageId: "bag-20",
          segmentId: "seg-1",
          weightKg: 20,
          price: 25.98,
          currency: "USD",
        },
      ],
    });

    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    expect(outcome.status).toBe("NEEDS_APPROVAL");
    expect(outcome.approval).toBe("OVER_AUTHORITY");
    expect(outcome.selected?.baggageKg).toBe(20);
    expect(outcome.selected?.baggagePriceUsd).toBe(25.98);
    expect(outcome.selected?.extraCostUsd).toBeCloseTo(50.96, 2);
    expect(outcome.verification?.priceChange).toBe("unchanged");
    expect(outcome.steps.some((step) => step.title === "Baggage requirement verified")).toBe(true);
  });

  test("rejects a cheaper offer that cannot meet baggage and tries the next candidate", async () => {
    const provider = fakeProvider(
      [
        option({
          id: "atlas-light",
          label: "Atlas Light",
          source: "ATLAS_SANDBOX",
          baggageKg: undefined,
          replacementPriceUsd: 20,
          extraCostUsd: 20,
        }),
        option({
          id: "atlas-fit",
          label: "Atlas Fit",
          source: "ATLAS_SANDBOX",
          baggageKg: undefined,
          replacementPriceUsd: 30,
          extraCostUsd: 30,
        }),
      ],
      (selected) => ({
        priceChange: "unchanged",
        currentPrice: selected.id === "atlas-light" ? 20 : 30,
        previousPrice: selected.id === "atlas-light" ? 20 : 30,
        currency: "USD",
        source: "ATLAS_SANDBOX",
        summary: "Fare unchanged",
        baggageSupported: true,
        baggageStatus: "available",
        baggageOptions:
          selected.id === "atlas-light"
            ? [
                {
                  baggageId: "bag-10",
                  segmentId: "seg-light",
                  weightKg: 10,
                  price: 10,
                  currency: "USD",
                },
              ]
            : [
                {
                  baggageId: "bag-20",
                  segmentId: "seg-fit",
                  weightKg: 20,
                  price: 5,
                  currency: "USD",
                },
              ],
      })
    );

    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    expect(outcome.status).toBe("RECOVERED");
    expect(outcome.selected?.id).toBe("atlas-fit");
    expect(outcome.selected?.extraCostUsd).toBe(35);
    const rejected = outcome.evaluations.find(
      (evaluation) => evaluation.option.id === "atlas-light"
    );
    expect(rejected?.valid).toBe(false);
    expect(rejected?.reasons.join(" ")).toContain("20kg");
  });

  test("fails safely when Atlas cannot confirm required baggage", async () => {
    const provider = fakeProvider(
      [
        option({
          id: "atlas-unknown",
          source: "ATLAS_SANDBOX",
          baggageKg: undefined,
          replacementPriceUsd: 20,
          extraCostUsd: 20,
        }),
      ],
      {
        priceChange: "unchanged",
        currentPrice: 20,
        currency: "USD",
        source: "ATLAS_SANDBOX",
        summary: "Fare unchanged",
        baggageSupported: true,
        baggageStatus: "unknown",
      }
    );

    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    expect(outcome.status).toBe("FAILED");
    expect(outcome.selected).toBeNull();
    expect(outcome.steps.at(-1)?.detail).toContain("20kg baggage requirement");
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
  test("approving PRICE_INCREASED in a simulated provider accepts the increase locally", async () => {
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
      "simulated provider path"
    );
  });

  test("approving an Atlas PRICE_INCREASED checkpoint calls confirm-price", async () => {
    let confirmCalls = 0;
    const provider: TripDataProvider = {
      async getDisruption() {
        return SCHEDULE_CHANGE_EVENT;
      },
      async searchAlternatives() {
        return [option({ id: "atlas-price-up", extraCostUsd: 20 })];
      },
      async verifyOffer() {
        return {
          priceChange: "increased",
          previousPrice: 20,
          currentPrice: 28,
          currency: "USD",
          source: "ATLAS_SANDBOX",
          summary: "Fare increased",
          bookingId: "book_price_up",
        };
      },
      async confirmPrice(verification) {
        confirmCalls += 1;
        expect(verification.bookingId).toBe("book_price_up");
        return {
          ...verification,
          priceConfirmed: true,
          summary: "Fare increase confirmed at $28.00",
        };
      },
    };

    const pending = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, provider);
    expect(pending.approval).toBe("PRICE_INCREASED");
    const approved = await approveRecovery(ORIGINAL_FLIGHT, pending, provider);

    expect(confirmCalls).toBe(1);
    expect(approved.status).toBe("RECOVERED");
    expect(approved.verification?.priceConfirmed).toBe(true);
    expect(approved.steps.at(-1)?.title).toBe("Price increase confirmed");
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
