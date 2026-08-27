/**
 * Maps raw Atlas CLI offers into the TripIntent `FlightOption` domain.
 *
 * Honesty rules:
 * - `offer_id` is opaque and preserved verbatim in `atlasOfferId`.
 * - `baggageKg` stays undefined even when ancillary_supported lists
 *   "baggage": search results carry no allowance weight, and we refuse to
 *   invent one.
 * - `extraCostUsd` is the replacement price minus the assumed recoverable
 *   value of the disrupted ticket (a scenario assumption, see scenario.ts).
 */
import type { FlightOption } from "../types";
import { ASSUMED_RECOVERABLE_VALUE_USD } from "../scenario";
import type { RawAtlasOffer } from "./cli-types";

/** Parse an Atlas "YYYYMMDDHHMM" timestamp into clock time + date parts. */
export function parseAtlasTime(value: string): {
  hhmm: string;
  year: number;
  month: number;
  day: number;
} | null {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  return {
    hhmm: `${h}:${mi}`,
    year: Number(y),
    month: Number(mo),
    day: Number(d),
  };
}

/**
 * Days between departure and arrival dates. A 22:45 → 00:05 next-day flight
 * yields 1, so deadline math never false-passes a midnight-crossing arrival.
 */
export function arrivalDayOffsetOf(
  departureTime: string,
  arrivalTime: string
): number {
  const dep = parseAtlasTime(departureTime);
  const arr = parseAtlasTime(arrivalTime);
  if (!dep || !arr) return 0;
  const depDate = Date.UTC(dep.year, dep.month - 1, dep.day);
  const arrDate = Date.UTC(arr.year, arr.month - 1, arr.day);
  return Math.max(0, Math.round((arrDate - depDate) / 86_400_000));
}

function flightNoOf(carrier: string, flightNumber: string): string {
  // Some upstream payloads already fold the carrier into flight_number.
  return flightNumber.startsWith(carrier)
    ? flightNumber
    : `${carrier} ${flightNumber}`;
}

/** Map one raw offer; returns null when the payload lacks usable segments. */
export function mapOffer(
  raw: RawAtlasOffer,
  index: number
): FlightOption | null {
  // Guard the identity and price first: a missing id would be sent to
  // verify as undefined, and a non-finite price would poison sort/authority.
  if (typeof raw.offer_id !== "string" || raw.offer_id.length === 0) {
    return null;
  }
  if (typeof raw.total_price !== "number" || !Number.isFinite(raw.total_price)) {
    return null;
  }

  const first = raw.segments?.[0];
  const last = raw.segments?.[raw.segments.length - 1];
  if (!first || !last) return null;

  const departure = parseAtlasTime(first.departure_time);
  const arrival = parseAtlasTime(last.arrival_time);
  if (!departure || !arrival) return null;

  const replacementPriceUsd = raw.total_price;

  return {
    id: raw.offer_id,
    atlasOfferId: raw.offer_id,
    source: "ATLAS_SANDBOX",
    label: `Atlas offer ${index + 1}`,
    flightNo: flightNoOf(first.carrier, first.flight_number),
    airline: first.carrier,
    destination: last.arrival_airport,
    departure: departure.hhmm,
    arrival: arrival.hhmm,
    arrivalDayOffset: arrivalDayOffsetOf(
      first.departure_time,
      last.arrival_time
    ),
    // Deliberately undefined: the search result carries no allowance weight.
    baggageKg: undefined,
    currency: raw.currency,
    replacementPriceUsd,
    priceStatus: raw.price_status,
    bookable: raw.bookable,
    extraCostUsd: replacementPriceUsd - ASSUMED_RECOVERABLE_VALUE_USD,
    stops: raw.segments.length - 1,
  };
}
