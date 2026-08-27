import { describe, expect, test } from "bun:test";
import { arrivalDayOffsetOf, mapOffer, parseAtlasTime } from "./mapper";
import { ASSUMED_RECOVERABLE_VALUE_USD } from "../scenario";
import type { RawAtlasOffer } from "./cli-types";

const ODD_TOKEN = "off_9f3-KUL_SIN-2026.08:27#xY";

function rawOffer(overrides: Partial<RawAtlasOffer> = {}): RawAtlasOffer {
  return {
    offer_id: ODD_TOKEN,
    currency: "USD",
    total_price: 131,
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
    ...overrides,
  };
}

describe("parseAtlasTime", () => {
  test("parses YYYYMMDDHHMM into HH:MM and date parts", () => {
    const parsed = parseAtlasTime("202608271400");
    expect(parsed).toEqual({ hhmm: "14:00", year: 2026, month: 8, day: 27 });
  });

  test("rejects non-conforming strings", () => {
    expect(parseAtlasTime("2026-08-27 14:00")).toBeNull();
    expect(parseAtlasTime("")).toBeNull();
  });
});

describe("arrivalDayOffsetOf — midnight crossings", () => {
  test("same-day flight has offset 0", () => {
    expect(arrivalDayOffsetOf("202608271400", "202608271505")).toBe(0);
  });

  test("22:45 → 00:05 next day has offset 1", () => {
    expect(arrivalDayOffsetOf("202608272245", "202608280005")).toBe(1);
  });
});

describe("mapOffer", () => {
  test("maps all domain fields from a raw offer", () => {
    const option = mapOffer(rawOffer(), 0);
    expect(option).not.toBeNull();
    if (!option) return;

    // Opaque id preserved verbatim — never reconstructed.
    expect(option.atlasOfferId).toBe(ODD_TOKEN);
    expect(option.id).toBe(ODD_TOKEN);
    expect(option.source).toBe("ATLAS_SANDBOX");
    expect(option.currency).toBe("USD");
    expect(option.flightNo).toBe("OD 351");
    expect(option.airline).toBe("OD");
    expect(option.destination).toBe("SIN");
    expect(option.departure).toBe("14:00");
    expect(option.arrival).toBe("15:05");
    expect(option.arrivalDayOffset).toBe(0);
    expect(option.replacementPriceUsd).toBe(131);
    expect(option.bookable).toBe(true);
    expect(option.priceStatus).toBe("current");
    expect(option.stops).toBe(0);
    expect(option.extraCostUsd).toBe(131 - ASSUMED_RECOVERABLE_VALUE_USD);
    expect(option.label.length).toBeGreaterThan(0);
  });

  test("never invents baggage, even when ancillary_supported lists it", () => {
    const option = mapOffer(rawOffer(), 0);
    expect(option?.baggageKg).toBeUndefined();
  });

  test("multi-segment offer uses first departure and last arrival", () => {
    const option = mapOffer(
      rawOffer({
        segments: [
          {
            departure_airport: "KUL",
            arrival_airport: "CGK",
            departure_time: "202608272245",
            arrival_time: "202608272355",
            carrier: "OD",
            flight_number: "301",
          },
          {
            departure_airport: "CGK",
            arrival_airport: "SIN",
            departure_time: "202608272359",
            arrival_time: "202608280005",
            carrier: "OD",
            flight_number: "302",
          },
        ],
      }),
      1
    );
    expect(option?.departure).toBe("22:45");
    expect(option?.arrival).toBe("00:05");
    // Midnight-crossing arrival — mandatory so deadline checks don't false-pass.
    expect(option?.arrivalDayOffset).toBe(1);
    expect(option?.stops).toBe(1);
    expect(option?.label).toBe("Atlas offer 2");
  });

  test("carrier already folded into flight_number is not duplicated", () => {
    const option = mapOffer(
      rawOffer({
        segments: [
          {
            departure_airport: "KUL",
            arrival_airport: "SIN",
            departure_time: "202608271400",
            arrival_time: "202608271505",
            carrier: "AK",
            flight_number: "AK701",
          },
        ],
      }),
      0
    );
    expect(option?.flightNo).toBe("AK701");
  });

  test("offers without segments are skipped", () => {
    expect(mapOffer(rawOffer({ segments: [] }), 0)).toBeNull();
  });

  test("offers with an empty offer_id are skipped", () => {
    expect(mapOffer(rawOffer({ offer_id: "" }), 0)).toBeNull();
  });

  test("offers with a non-finite price are skipped", () => {
    expect(mapOffer(rawOffer({ total_price: Number.NaN }), 0)).toBeNull();
    expect(
      mapOffer(rawOffer({ total_price: Number.POSITIVE_INFINITY }), 0)
    ).toBeNull();
  });
});
