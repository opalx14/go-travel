import type { IntentExtractionSource, IntentField } from "./intent-parser";
import type {
  DisruptionEvent,
  Flight,
  RecoveryOutcome,
  RecoveryStep,
  TravelIntent,
} from "./types";

export type PersistedDemoPhase = "idle" | "disrupted" | "complete";

export interface PersistedOpsStats {
  exceptions: number;
  autoResolved: number;
  needsApproval: number;
}

export interface DeviceJourneySnapshot {
  version: 1;
  trip: Flight;
  intent: TravelIntent;
  phase: PersistedDemoPhase;
  playedSteps: RecoveryStep[];
  outcome: RecoveryOutcome | null;
  isProtected: boolean;
  exceptions: DisruptionEvent[];
  stats: PersistedOpsStats;
  intentMatchedFields: IntentField[];
  intentSource: IntentExtractionSource | null;
  savedAt: string;
}

export interface DeviceJourneyResponse {
  ok: boolean;
  restored: boolean;
  snapshot: DeviceJourneySnapshot | null;
}

export function isDeviceJourneySnapshot(value: unknown): value is DeviceJourneySnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DeviceJourneySnapshot>;
  return (
    candidate.version === 1 &&
    !!candidate.trip &&
    typeof candidate.trip === "object" &&
    typeof candidate.trip.id === "string" &&
    typeof candidate.trip.flightNo === "string" &&
    !!candidate.intent &&
    typeof candidate.intent === "object" &&
    typeof candidate.intent.latestArrival === "string" &&
    typeof candidate.intent.autopilot === "boolean" &&
    (candidate.phase === "idle" ||
      candidate.phase === "disrupted" ||
      candidate.phase === "complete") &&
    typeof candidate.isProtected === "boolean" &&
    Array.isArray(candidate.playedSteps) &&
    Array.isArray(candidate.exceptions) &&
    !!candidate.stats &&
    typeof candidate.stats === "object" &&
    Array.isArray(candidate.intentMatchedFields) &&
    (candidate.intentSource === null ||
      candidate.intentSource === "QWEN" ||
      candidate.intentSource === "DETERMINISTIC_FALLBACK")
  );
}
