import type { TravelIntent } from "./types";
import { DEFAULT_INTENT } from "./scenario";

export type IntentExtractionSource = "QWEN" | "DETERMINISTIC_FALLBACK";
export type IntentField = keyof TravelIntent;

export interface CompiledTravelIntent {
  intent: TravelIntent;
  matched: IntentField[];
}

export interface ParsedTravelBrief extends CompiledTravelIntent {
  source: IntentExtractionSource;
}

export interface IntentExtractionCandidate {
  latestArrival?: unknown;
  departureFlexibilityHours?: unknown;
  minBaggageKg?: unknown;
  maxExtraSpendUsd?: unknown;
  autopilot?: unknown;
}

const HHMM_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeTime(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return HHMM_PATTERN.test(trimmed) ? trimmed : undefined;
}

/** Merge an extraction result with safe demo defaults and hard bounds. */
export function normalizeIntentCandidate(
  candidate: IntentExtractionCandidate,
  defaults: TravelIntent = DEFAULT_INTENT
): TravelIntent {
  const flexibility = finiteNumber(candidate.departureFlexibilityHours);
  const baggage = finiteNumber(candidate.minBaggageKg);
  const authority = finiteNumber(candidate.maxExtraSpendUsd);

  return {
    latestArrival: normalizeTime(candidate.latestArrival) ?? defaults.latestArrival,
    departureFlexibilityHours:
      flexibility === undefined
        ? defaults.departureFlexibilityHours
        : clamp(Math.round(flexibility * 2) / 2, 0, 24),
    minBaggageKg:
      baggage === undefined ? defaults.minBaggageKg : clamp(Math.round(baggage), 0, 80),
    maxExtraSpendUsd:
      authority === undefined
        ? defaults.maxExtraSpendUsd
        : clamp(Math.round(authority * 100) / 100, 0, 10_000),
    autopilot:
      typeof candidate.autopilot === "boolean" ? candidate.autopilot : defaults.autopilot,
  };
}

function to24Hour(hour: number, minute: number, meridiem?: string): string | undefined {
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return undefined;
  }

  let h = hour;
  const marker = meridiem?.toLowerCase();
  if (marker === "pm" && h < 12) h += 12;
  if (marker === "am" && h === 12) h = 0;
  if (!marker && (h < 0 || h > 23)) return undefined;
  if (marker && (hour < 1 || hour > 12)) return undefined;

  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function extractArrival(brief: string): string | undefined {
  const english = /(?:arriv(?:e|al)|reach|be there)[^.!?]{0,45}?(?:before|by|no later than)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(
    brief
  );
  if (english) {
    return to24Hour(Number(english[1]), Number(english[2] ?? 0), english[3]);
  }

  const vietnamese = /(?:đến|có mặt)[^.!?]{0,35}?(?:trước|chậm nhất)?\s*(\d{1,2})(?:[:h](\d{2}))?\s*(?:giờ)?\s*(sáng|chiều|tối)?/i.exec(
    brief
  );
  if (vietnamese) {
    const marker = vietnamese[3]?.toLowerCase();
    const meridiem = marker === "sáng" ? "am" : marker === "chiều" || marker === "tối" ? "pm" : undefined;
    return to24Hour(Number(vietnamese[1]), Number(vietnamese[2] ?? 0), meridiem);
  }

  return undefined;
}

function extractBaggage(brief: string): number | undefined {
  const beforeUnit = /(\d{1,2}(?:\.\d+)?)\s*kg\s*(?:checked\s*)?(?:baggage|bag|luggage|hành\s*lý)?/i.exec(
    brief
  );
  if (beforeUnit) return Number(beforeUnit[1]);

  const afterLabel = /(?:baggage|luggage|hành\s*lý)[^\d]{0,12}(\d{1,2}(?:\.\d+)?)\s*kg/i.exec(
    brief
  );
  return afterLabel ? Number(afterLabel[1]) : undefined;
}

function extractAuthority(brief: string): number | undefined {
  const focusedPatterns = [
    /\$\s*(\d+(?:\.\d+)?)\s*(?:extra|additional)[^.!?]{0,45}(?:without asking|automatically|auto)/i,
    /(?:up to|max(?:imum)?|at most)[^.!?]{0,20}\$\s*(\d+(?:\.\d+)?)\s*(?:extra|additional)/i,
    /(?:tối đa|được phép)[^\d.!?]{0,25}\$?\s*(\d+(?:\.\d+)?)\s*(?:usd|đô|dollar)?[^.!?]{0,35}(?:không cần hỏi|tự xử lý|tự động)/i,
    /(?:không quá|tối đa)[^\d.!?]{0,20}\$?\s*(\d+(?:\.\d+)?)\s*(?:usd|đô|dollar)/i,
    /\$\s*(\d+(?:\.\d+)?)\s*(?:extra|additional)/i,
  ];

  for (const pattern of focusedPatterns) {
    const match = pattern.exec(brief);
    if (match) return Number(match[1]);
  }
  return undefined;
}

function extractFlexibility(brief: string): number | undefined {
  const english = /(?:within|up to|max(?:imum)?)[^.!?]{0,18}(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)[^.!?]{0,25}(?:later|delay|flex|departure)/i.exec(
    brief
  );
  if (english) return Number(english[1]);

  const englishReversed = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)[^.!?]{0,20}(?:flex|later|delay)/i.exec(
    brief
  );
  if (englishReversed) return Number(englishReversed[1]);

  const vietnamese = /(\d+(?:\.\d+)?)\s*(?:giờ|h)[^.!?]{0,22}(?:linh hoạt|trễ|muộn|lệch)/i.exec(
    brief
  );
  if (vietnamese) return Number(vietnamese[1]);

  const vietnameseReversed = /(?:bay|khởi hành)[^.!?]{0,15}(?:trễ|muộn|lệch)[^\d]{0,8}(\d+(?:\.\d+)?)\s*(?:giờ|h)/i.exec(
    brief
  );
  return vietnameseReversed ? Number(vietnameseReversed[1]) : undefined;
}

function extractAutopilot(brief: string): boolean | undefined {
  if (/(?:without asking|automatically|auto[- ]?handle|take care of it|tự xử lý|tự động|không cần hỏi)/i.test(brief)) {
    return true;
  }
  if (/(?:ask me first|always ask|manual approval|phải hỏi|luôn hỏi)/i.test(brief)) {
    return false;
  }
  return undefined;
}

/**
 * Dependency-free parser used as a resilient fallback when Qwen is not
 * configured or temporarily unavailable. It intentionally extracts only the
 * recovery contract fields the deterministic policy engine understands.
 */
function localCandidate(brief: string): IntentExtractionCandidate {
  return {
    latestArrival: extractArrival(brief),
    departureFlexibilityHours: extractFlexibility(brief),
    minBaggageKg: extractBaggage(brief),
    maxExtraSpendUsd: extractAuthority(brief),
    autopilot: extractAutopilot(brief),
  };
}

export function matchedIntentFields(candidate: IntentExtractionCandidate): IntentField[] {
  const fields: IntentField[] = [];
  if (normalizeTime(candidate.latestArrival)) fields.push("latestArrival");
  if (finiteNumber(candidate.departureFlexibilityHours) !== undefined) {
    fields.push("departureFlexibilityHours");
  }
  if (finiteNumber(candidate.minBaggageKg) !== undefined) fields.push("minBaggageKg");
  if (finiteNumber(candidate.maxExtraSpendUsd) !== undefined) fields.push("maxExtraSpendUsd");
  if (typeof candidate.autopilot === "boolean") fields.push("autopilot");
  return fields;
}

export function compileTravelIntent(
  brief: string,
  defaults: TravelIntent = DEFAULT_INTENT
): CompiledTravelIntent {
  const candidate = localCandidate(brief);
  return {
    intent: normalizeIntentCandidate(candidate, defaults),
    matched: matchedIntentFields(candidate),
  };
}

export function parseTravelBriefLocally(
  brief: string,
  defaults: TravelIntent = DEFAULT_INTENT
): ParsedTravelBrief {
  const compiled = compileTravelIntent(brief, defaults);
  return {
    source: "DETERMINISTIC_FALLBACK",
    ...compiled,
  };
}
