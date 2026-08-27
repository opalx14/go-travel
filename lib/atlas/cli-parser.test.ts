import { describe, expect, test } from "bun:test";
import { parseCliOutput } from "./cli-parser";

const OFFER = {
  offer_id: "off_abc123",
  currency: "USD",
  total_price: 42.5,
  segments: [
    {
      departure_airport: "KUL",
      arrival_airport: "SIN",
      departure_time: "202608271400",
      arrival_time: "202608271505",
      carrier: "OD",
      flight_number: "351",
    },
  ],
  ancillary_supported: ["baggage", "seat"],
  bookable: true,
  price_status: "current",
};

describe("parseCliOutput — search envelopes", () => {
  test("FLIGHT_SEARCHED returns search id, count, and offers", () => {
    const stdout = JSON.stringify({
      schema_version: "1",
      status: "success",
      code: "FLIGHT_SEARCHED",
      message: "Flight search completed",
      data: { search_id: "srch_1", offer_count: 1, offers: [OFFER] },
    });
    const result = parseCliOutput(stdout);
    expect(result.kind).toBe("SEARCH_OK");
    if (result.kind !== "SEARCH_OK") return;
    expect(result.searchId).toBe("srch_1");
    expect(result.offerCount).toBe(1);
    expect(result.offers[0]?.offer_id).toBe("off_abc123");
  });

  test("SEARCH_NO_RESULTS is an empty success, not a failure", () => {
    const stdout = JSON.stringify({
      status: "success",
      code: "SEARCH_NO_RESULTS",
      message: "Flight search completed with no results",
      data: { search_id: "srch_2", offer_count: 0, offers: [] },
    });
    expect(parseCliOutput(stdout).kind).toBe("SEARCH_EMPTY");
  });

  test("failure codes are classified with their code intact", () => {
    const stdout = JSON.stringify({
      status: "error",
      code: "SERVICE_REQUEST_FAILED",
      message: "something happened that we do not parse",
      retryable: true,
    });
    const result = parseCliOutput(stdout);
    expect(result.kind).toBe("FAILURE");
    if (result.kind !== "FAILURE") return;
    expect(result.code).toBe("SERVICE_REQUEST_FAILED");
  });
});

describe("parseCliOutput — verify envelopes", () => {
  test("OFFER_VERIFIED carries the price facts", () => {
    const stdout = JSON.stringify({
      status: "success",
      code: "OFFER_VERIFIED",
      data: {
        price_change: "unchanged",
        previous_price: 42.5,
        current_price: 42.5,
        currency: "USD",
        baggage_supported: true,
        seat_supported: false,
        booking_id: "book_1",
      },
    });
    const result = parseCliOutput(stdout);
    expect(result.kind).toBe("VERIFY_OK");
    if (result.kind !== "VERIFY_OK") return;
    expect(result.priceChange).toBe("unchanged");
    expect(result.currentPrice).toBe(42.5);
    expect(result.currency).toBe("USD");
  });

  test("PRICE_CONFIRMATION_REQUIRED is a price increase", () => {
    const stdout = JSON.stringify({
      status: "action_required",
      code: "PRICE_CONFIRMATION_REQUIRED",
      data: { previous_price: 42.5, current_price: 48.0 },
    });
    const result = parseCliOutput(stdout);
    expect(result.kind).toBe("VERIFY_OK");
    if (result.kind !== "VERIFY_OK") return;
    expect(result.priceChange).toBe("increased");
    expect(result.currentPrice).toBe(48);
  });

  test("OFFER_EXPIRED is a failure code", () => {
    const stdout = JSON.stringify({
      status: "error",
      code: "OFFER_EXPIRED",
      message: "ignored",
    });
    const result = parseCliOutput(stdout);
    expect(result.kind).toBe("FAILURE");
    if (result.kind !== "FAILURE") return;
    expect(result.code).toBe("OFFER_EXPIRED");
  });
});

describe("parseCliOutput — malformed output", () => {
  test("invalid JSON is MALFORMED", () => {
    expect(parseCliOutput("{not json").kind).toBe("MALFORMED");
  });

  test("JSON without a code is MALFORMED", () => {
    expect(parseCliOutput(JSON.stringify({ hello: 1 })).kind).toBe(
      "MALFORMED"
    );
  });

  test("FLIGHT_SEARCHED without search_id is MALFORMED", () => {
    const stdout = JSON.stringify({ code: "FLIGHT_SEARCHED", data: {} });
    expect(parseCliOutput(stdout).kind).toBe("MALFORMED");
  });
});
