import type {
  DisruptionEvent,
  FlightOption,
  OfferVerification,
  TripDataProvider,
} from "./types";
import { ALTERNATIVES, SCHEDULE_CHANGE_EVENT, TRIP_ID } from "./scenario";

export type { TripDataProvider } from "./types";

/**
 * Mock Atlas provider.
 *
 * Implements the TripDataProvider contract with deterministic demo data.
 * Phase 2 uses it as the fallback data source (and in tests); the live
 * path is RemoteAtlasProvider in lib/atlas/remote-provider.ts, which talks
 * to the server routes that drive the real Atlas CLI.
 */
export class MockAtlasProvider implements TripDataProvider {
  async getDisruption(tripId: string): Promise<DisruptionEvent> {
    if (tripId !== TRIP_ID) {
      throw new Error(`MockAtlasProvider: unknown trip "${tripId}"`);
    }
    return SCHEDULE_CHANGE_EVENT;
  }

  async searchAlternatives(tripId: string): Promise<FlightOption[]> {
    if (tripId !== TRIP_ID) {
      throw new Error(`MockAtlasProvider: unknown trip "${tripId}"`);
    }
    return ALTERNATIVES;
  }

  async verifyOffer(option: FlightOption): Promise<OfferVerification> {
    return {
      priceChange: "unchanged",
      source: "SIMULATED_FALLBACK",
      summary: `Simulated verification (fallback): fare for ${option.flightNo} unchanged`,
    };
  }
}

/** Deterministic provider instance: fallback data source and test double. */
export const atlas: TripDataProvider = new MockAtlasProvider();
