import { describe, expect, test } from "bun:test";
import { compileTravelIntent } from "./intent-parser";
import { DEFAULT_INTENT } from "./scenario";

describe("compileTravelIntent", () => {
  test("extracts an English outcome contract from natural language", () => {
    const result = compileTravelIntent(
      "I need to reach Singapore before 6 PM with at least 20kg checked baggage. If my flight changes, you can spend up to $50 extra without asking me. I can leave up to 3 hours later.",
      DEFAULT_INTENT
    );

    expect(result.intent).toEqual({
      latestArrival: "18:00",
      departureFlexibilityHours: 3,
      minBaggageKg: 20,
      maxExtraSpendUsd: 50,
      autopilot: true,
    });
    expect(result.matched).toContain("latestArrival");
    expect(result.matched).toContain("minBaggageKg");
    expect(result.matched).toContain("maxExtraSpendUsd");
    expect(result.matched).toContain("departureFlexibilityHours");
    expect(result.matched).toContain("autopilot");
  });

  test("supports Vietnamese phrasing", () => {
    const result = compileTravelIntent(
      "Tôi phải có mặt trước 17h30, tối thiểu 25kg hành lý. Có thể bay trễ 2 giờ và tự động xử lý nếu phát sinh không quá 40 USD.",
      DEFAULT_INTENT
    );

    expect(result.intent.latestArrival).toBe("17:30");
    expect(result.intent.minBaggageKg).toBe(25);
    expect(result.intent.departureFlexibilityHours).toBe(2);
    expect(result.intent.maxExtraSpendUsd).toBe(40);
    expect(result.intent.autopilot).toBe(true);
  });

  test("unmentioned fields inherit the existing contract", () => {
    const result = compileTravelIntent("Arrive by 19:15.", DEFAULT_INTENT);
    expect(result.intent.latestArrival).toBe("19:15");
    expect(result.intent.minBaggageKg).toBe(DEFAULT_INTENT.minBaggageKg);
    expect(result.intent.maxExtraSpendUsd).toBe(DEFAULT_INTENT.maxExtraSpendUsd);
    expect(result.matched).toEqual(["latestArrival"]);
  });

  test("explicit manual approval turns autopilot off", () => {
    const result = compileTravelIntent(
      "Keep the same constraints but ask me first before any recovery.",
      DEFAULT_INTENT
    );
    expect(result.intent.autopilot).toBe(false);
    expect(result.matched).toContain("autopilot");
  });
});
