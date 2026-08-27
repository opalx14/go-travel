/**
 * Raw wire types of the `atlas-flight` CLI.
 *
 * Every CLI command emits one JSON envelope; consumers branch on `code`
 * and never parse `message`. All IDs (search_id, offer_id, booking_id, …)
 * are opaque and must be preserved exactly as returned.
 */

export interface AtlasEnvelope {
  schema_version?: string;
  status?: string;
  code: string;
  /** Human-readable; never parsed for control flow. */
  message?: string;
  retryable?: boolean;
  request_id?: string;
  data?: unknown;
  details?: unknown;
}

export type AtlasSearchSuccessCode = "FLIGHT_SEARCHED" | "SEARCH_NO_RESULTS";
export type AtlasVerifySuccessCode = "OFFER_VERIFIED";
export type AtlasFailureCode =
  | "AUTHORIZATION_REQUIRED"
  | "AUTH_PENDING"
  | "SEARCH_LIMIT_REACHED"
  | "SERVICE_TEMPORARILY_UNAVAILABLE"
  | "SERVICE_REQUEST_FAILED"
  | "SERVICE_RESPONSE_INVALID"
  | "OFFER_EXPIRED"
  | "PRICE_CONFIRMATION_REQUIRED";

/** One flight leg; times are "YYYYMMDDHHMM" strings. */
export interface RawAtlasSegment {
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  carrier: string;
  operating_carrier?: string | null;
  flight_number: string;
  duration_minutes?: number;
  cabin_class?: number | null;
  direction?: string;
}

/** One search offer as persisted by the CLI (snake_case wire format). */
export interface RawAtlasOffer {
  offer_id: string;
  currency: string;
  total_price: number;
  transaction_fee_total?: number;
  passenger_prices?: unknown[];
  segments: RawAtlasSegment[];
  ancillary_supported?: string[];
  bookable: boolean;
  price_status: string;
  refresh_time?: string | null;
  expire_time?: string | null;
}

export interface RawAtlasSearchData {
  search_id: string;
  offer_count: number;
  offers: RawAtlasOffer[];
}

export type AtlasPriceChange = "unchanged" | "decreased" | "increased";

export interface RawAtlasVerifyData {
  price_change?: AtlasPriceChange;
  previous_price?: number;
  current_price?: number;
  currency?: string;
  baggage_supported?: boolean;
  seat_supported?: boolean;
  booking_id?: string;
}
