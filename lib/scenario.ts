import type {
  DisruptionEvent,
  Flight,
  FlightOption,
  TravelIntent,
} from "./types";

/**
 * The single deterministic demo scenario:
 * KUL → SIN, the airline reschedules the booking outside the traveler's
 * deadline, and the agent recovers via Atlas Sandbox search (with a
 * simulated fallback when the tool is unreachable).
 */

export const TRIP_ID = "trip-kul-sin-001";

export const ORIGINAL_FLIGHT: Flight = {
  id: TRIP_ID,
  flightNo: "QS 401",
  airline: "Quicksilver Air",
  origin: "KUL",
  destination: "SIN",
  departure: "13:05",
  arrival: "14:15",
  baggageKg: 20,
  priceUsd: 89,
  stops: 0,
};

export const DEFAULT_INTENT: TravelIntent = {
  latestArrival: "18:00",
  departureFlexibilityHours: 3,
  minBaggageKg: 20,
  maxExtraSpendUsd: 50,
  autopilot: true,
};

/**
 * SIMULATED disruption — the Atlas Skill does not provide schedule-change
 * monitoring; this event is NOT claimed to come from Atlas. Provenance in
 * the UI always labels it as simulated.
 */
export const SCHEDULE_CHANGE_EVENT: DisruptionEvent = {
  id: "evt-schedule-001",
  tripId: TRIP_ID,
  type: "SCHEDULE_CHANGED",
  summary:
    "QS 401 moved from 13:05→14:15 to 17:30→20:35 — arrives after the 18:00 limit",
  originalDeparture: "13:05",
  originalArrival: "14:15",
  newDeparture: "17:30",
  newArrival: "20:35",
};

/** Server-side search parameters for the Atlas CLI (date resolved per request). */
export const ATLAS_SEARCH = {
  origin: "KUL",
  destination: "SIN",
  adults: 1,
} as const;

/**
 * Scenario assumption: the disrupted ticket has no refundable value, so the
 * incremental cost of a replacement is `replacement − 0`. This is NOT the
 * real net recovery cost — it is the demo's working assumption.
 */
export const ASSUMED_RECOVERABLE_VALUE_USD = 0;

/**
 * Deterministic fallback candidates, used only when the Atlas CLI is
 * unreachable. Times keep the demo meaningful: A/B depart inside the +3h
 * flexibility and arrive before 18:00; C is a cheap trap that misses the
 * arrival deadline.
 */
export const ALTERNATIVES: FlightOption[] = [
  {
    id: "opt-a",
    label: "Flight A",
    flightNo: "MD 214",
    airline: "Meridian Air",
    destination: "SIN",
    departure: "14:40",
    arrival: "15:55",
    baggageKg: 20,
    extraCostUsd: 42,
    stops: 0,
    source: "SIMULATED_FALLBACK",
  },
  {
    id: "opt-b",
    label: "Flight B",
    flightNo: "CA 88",
    airline: "Coral Airways",
    destination: "SIN",
    departure: "15:20",
    arrival: "16:35",
    baggageKg: 20,
    extraCostUsd: 19,
    stops: 0,
    source: "SIMULATED_FALLBACK",
  },
  {
    id: "opt-c",
    label: "Flight C",
    flightNo: "SB 507",
    airline: "Skybridge Air",
    destination: "SIN",
    departure: "15:50",
    arrival: "19:40",
    baggageKg: 20,
    extraCostUsd: 5,
    stops: 1,
    source: "SIMULATED_FALLBACK",
  },
];
