/**
 * The Atlas flight tool: a thin, server-only adapter around the CLI.
 * Raw subprocess and wire types never leave this module — callers receive
 * domain types (`FlightOption`, `OfferVerification`) or typed errors.
 */
import type { FlightOption, OfferVerification } from "../types";
import {
  runCli,
  searchArgs,
  verifyArgs,
  CliError,
  type CliRunner,
} from "./cli-client";
import { parseCliOutput } from "./cli-parser";
import { mapOffer } from "./mapper";

/** Search command budget. */
export const SEARCH_TIMEOUT_MS = 40_000;
/** Verify command budget. */
export const VERIFY_TIMEOUT_MS = 20_000;

export interface AtlasSearchInput {
  origin: string;
  destination: string;
  /** YYYY-MM-DD */
  depart: string;
  adults: number;
}

export interface AtlasSearchResult {
  candidates: FlightOption[];
  /** null when the search succeeded but returned no offers. */
  searchId: string | null;
  offerCount: number;
  returnedCount: number;
  /** true when the CLI reported SEARCH_NO_RESULTS (still a success). */
  empty: boolean;
}

/** Classified failure — carries an internal code, never raw stderr/messages. */
export class AtlasToolError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? `Atlas tool error: ${code}`);
    this.code = code;
    this.name = "AtlasToolError";
  }
}

export interface AtlasFlightTool {
  searchFlights(input: AtlasSearchInput): Promise<AtlasSearchResult>;
  verifyOffer(offerId: string): Promise<OfferVerification>;
}

export interface AtlasFlightToolOptions {
  /** Test seam; production uses the real execFile-based runner. */
  runner?: CliRunner;
}

function usd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function createAtlasFlightTool(
  options: AtlasFlightToolOptions = {}
): AtlasFlightTool {
  const runner = options.runner;

  return {
    async searchFlights(input) {
      let stdout: string;
      try {
        stdout = await runCli(searchArgs(input), SEARCH_TIMEOUT_MS, runner);
      } catch (error) {
        throw new AtlasToolError(
          error instanceof CliError ? error.kind : "SERVICE_REQUEST_FAILED"
        );
      }

      const parsed = parseCliOutput(stdout);
      if (parsed.kind === "SEARCH_EMPTY") {
        return {
          candidates: [],
          searchId: null,
          offerCount: 0,
          returnedCount: 0,
          empty: true,
        };
      }
      if (parsed.kind === "SEARCH_OK") {
        const candidates = parsed.offers
          .map((offer, index) => mapOffer(offer, index))
          .filter((option): option is FlightOption => option !== null);
        return {
          candidates,
          searchId: parsed.searchId,
          offerCount: parsed.offerCount,
          returnedCount: candidates.length,
          empty: false,
        };
      }
      throw new AtlasToolError(
        parsed.kind === "FAILURE" ? parsed.code : "SERVICE_RESPONSE_INVALID"
      );
    },

    async verifyOffer(offerId) {
      let stdout: string;
      try {
        stdout = await runCli(verifyArgs(offerId), VERIFY_TIMEOUT_MS, runner);
      } catch (error) {
        throw new AtlasToolError(
          error instanceof CliError ? error.kind : "SERVICE_REQUEST_FAILED"
        );
      }

      const parsed = parseCliOutput(stdout);
      if (parsed.kind === "VERIFY_OK") {
        const { priceChange, previousPrice, currentPrice, currency } = parsed;
        const summary =
          priceChange === "increased"
            ? `Fare increased: ${usd(previousPrice ?? 0)} → ${usd(
                currentPrice ?? 0
              )}`
            : priceChange === "decreased"
              ? `Fare decreased to ${usd(currentPrice ?? 0)} (was ${usd(
                  previousPrice ?? 0
                )})`
              : `Fare unchanged at ${usd(currentPrice ?? previousPrice ?? 0)}`;
        return {
          priceChange,
          previousPrice,
          currentPrice,
          currency,
          source: "ATLAS_SANDBOX",
          summary,
        };
      }
      throw new AtlasToolError(
        parsed.kind === "FAILURE" ? parsed.code : "SERVICE_RESPONSE_INVALID"
      );
    },
  };
}

/** Shared singleton used by the route handlers. */
export const atlasFlightTool: AtlasFlightTool = createAtlasFlightTool();
