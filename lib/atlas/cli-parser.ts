/**
 * Pure parser: CLI stdout JSON → discriminated union keyed off `code`.
 * Branches on `code` only; `message` is never parsed. Malformed JSON is a
 * distinct MALFORMED result so callers can classify it without sniffing text.
 */
import type {
  AtlasEnvelope,
  AtlasPriceChange,
  RawAtlasOffer,
  RawAtlasSearchData,
  RawAtlasVerifyData,
} from "./cli-types";

export type CliParseResult =
  | {
      kind: "SEARCH_OK";
      searchId: string;
      offerCount: number;
      offers: RawAtlasOffer[];
    }
  | { kind: "SEARCH_EMPTY" }
  | {
      kind: "VERIFY_OK";
      priceChange: AtlasPriceChange;
      previousPrice?: number;
      currentPrice?: number;
      currency?: string;
    }
  | { kind: "FAILURE"; code: string }
  | { kind: "MALFORMED" };

const PRICE_CHANGES: readonly string[] = [
  "unchanged",
  "decreased",
  "increased",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function parseVerifyData(
  data: unknown,
  defaultChange: AtlasPriceChange
): {
  priceChange: AtlasPriceChange;
  previousPrice?: number;
  currentPrice?: number;
  currency?: string;
} {
  const record: RawAtlasVerifyData = isRecord(data)
    ? (data as RawAtlasVerifyData)
    : {};
  const priceChange = PRICE_CHANGES.includes(record.price_change ?? "")
    ? (record.price_change as AtlasPriceChange)
    : defaultChange;
  return {
    priceChange,
    previousPrice: optionalNumber(record.previous_price),
    currentPrice: optionalNumber(record.current_price),
    currency: typeof record.currency === "string" ? record.currency : undefined,
  };
}

export function parseCliOutput(stdout: string): CliParseResult {
  let envelope: AtlasEnvelope;
  try {
    envelope = JSON.parse(stdout) as AtlasEnvelope;
  } catch {
    return { kind: "MALFORMED" };
  }
  if (!isRecord(envelope) || typeof envelope.code !== "string") {
    return { kind: "MALFORMED" };
  }

  switch (envelope.code) {
    case "FLIGHT_SEARCHED": {
      const data = isRecord(envelope.data)
        ? (envelope.data as unknown as RawAtlasSearchData)
        : null;
      if (!data || typeof data.search_id !== "string") {
        return { kind: "MALFORMED" };
      }
      return {
        kind: "SEARCH_OK",
        searchId: data.search_id,
        offerCount:
          typeof data.offer_count === "number"
            ? data.offer_count
            : (data.offers?.length ?? 0),
        offers: Array.isArray(data.offers) ? data.offers : [],
      };
    }
    case "SEARCH_NO_RESULTS":
      return { kind: "SEARCH_EMPTY" };
    case "OFFER_VERIFIED":
      return { kind: "VERIFY_OK", ...parseVerifyData(envelope.data, "unchanged") };
    case "PRICE_CONFIRMATION_REQUIRED":
      // Price went up at verification time; the envelope still carries the
      // price facts, and confirm-price is deliberately out of scope here.
      return { kind: "VERIFY_OK", ...parseVerifyData(envelope.data, "increased") };
    default:
      return { kind: "FAILURE", code: envelope.code };
  }
}
