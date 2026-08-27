/**
 * Client-side provider that talks to our own server routes, which in turn
 * drive the Atlas CLI. Browser-safe: no `node:*` imports here — all
 * subprocess work stays behind /api/atlas/*.
 *
 * Provenance honesty:
 * - The disruption event is SIMULATED (the Atlas Skill does not provide
 *   schedule-change monitoring yet).
 * - Candidates carry their own `source` (ATLAS_SANDBOX or
 *   SIMULATED_FALLBACK) set by the search route.
 */
import type {
  DisruptionEvent,
  FlightOption,
  OfferVerification,
  TripDataProvider,
} from "../types";
import { SCHEDULE_CHANGE_EVENT, TRIP_ID } from "../scenario";

const SEARCH_TIMEOUT_MS = 45_000;
const VERIFY_TIMEOUT_MS = 25_000;

interface SearchResponse {
  ok: boolean;
  fallback?: boolean;
  candidates?: FlightOption[];
}

interface VerifyResponse {
  ok: boolean;
  verification?: OfferVerification;
  error?: string;
}

function isFlightOptionArray(value: unknown): value is FlightOption[] {
  return Array.isArray(value);
}

async function fetchJson<T>(
  url: string,
  body: unknown,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Atlas route ${url} responded ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export class RemoteAtlasProvider implements TripDataProvider {
  async getDisruption(tripId: string): Promise<DisruptionEvent> {
    if (tripId !== TRIP_ID) {
      throw new Error(`RemoteAtlasProvider: unknown trip "${tripId}"`);
    }
    return SCHEDULE_CHANGE_EVENT;
  }

  /** Search via the server route; network failure/timeout propagates. */
  async searchAlternatives(tripId: string): Promise<FlightOption[]> {
    if (tripId !== TRIP_ID) {
      throw new Error(`RemoteAtlasProvider: unknown trip "${tripId}"`);
    }
    const result = await fetchJson<SearchResponse>(
      "/api/atlas/search",
      {},
      SEARCH_TIMEOUT_MS
    );
    if (!result.ok || !isFlightOptionArray(result.candidates)) {
      throw new Error("Atlas search route returned no usable candidates");
    }
    return result.candidates;
  }

  /**
   * Verify the selected offer. Real Atlas offers go through the CLI;
   * fallback candidates (no opaque offer id) get a clearly-labelled
   * simulated verification instead. Only network failures throw.
   */
  async verifyOffer(option: FlightOption): Promise<OfferVerification> {
    if (!option.atlasOfferId) {
      return {
        priceChange: "unchanged",
        source: "SIMULATED_FALLBACK",
        summary: "Simulated verification (fallback)",
      };
    }

    const result = await fetchJson<VerifyResponse>(
      "/api/atlas/verify",
      { offerId: option.atlasOfferId },
      VERIFY_TIMEOUT_MS
    );

    if (result.ok && result.verification) {
      return result.verification;
    }

    const code = result.error ?? "SERVICE_REQUEST_FAILED";
    return {
      priceChange: code === "OFFER_EXPIRED" ? "expired" : "failed",
      source: "ATLAS_SANDBOX",
      summary:
        code === "OFFER_EXPIRED"
          ? "Offer expired before it could be verified"
          : "Offer verification failed",
    };
  }
}

/** The active provider for the browser demo. */
export const remoteAtlas: TripDataProvider = new RemoteAtlasProvider();
