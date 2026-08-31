import type { DeviceJourneyRow } from "./device-state-db";
import type { RecoveryStep } from "./types";
import type { OperationsReport } from "./operations-finance";

export type AdminJourneyStage =
  | "WAITING_FOR_INTENT"
  | "MONITORING"
  | "DISRUPTED"
  | "RECOVERING"
  | "NEEDS_APPROVAL"
  | "RECOVERED"
  | "FAILED"
  | "DECLINED";

export interface AdminLiveSession {
  deviceId: string;
  travelerLabel: string;
  tripId: string;
  route: string;
  flightNo: string;
  phase: DeviceJourneyRow["phase"];
  stage: AdminJourneyStage;
  isProtected: boolean;
  updatedAt: string;
  latestArrival: string;
  minBaggageKg: number;
  maxExtraSpendUsd: number;
  autopilot: boolean;
  exceptionsCount: number;
  playedSteps: RecoveryStep[];
  selectedFlight: string | null;
  approval: string | null;
  outcomeStatus: string | null;
  verificationSource: string | null;
}

export interface AdminLivePayload {
  ok: true;
  generatedAt: string;
  report: OperationsReport;
  sessions: AdminLiveSession[];
}

function travelerLabel(deviceId: string) {
  const compact = deviceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  return `Traveler ${compact || "DEMO"}`;
}

function stageOf(row: DeviceJourneyRow): AdminJourneyStage {
  const snapshot = row.snapshot;
  if (!snapshot?.isProtected) return "WAITING_FOR_INTENT";
  if (snapshot.outcome?.status === "RECOVERED") return "RECOVERED";
  if (snapshot.outcome?.status === "NEEDS_APPROVAL") return "NEEDS_APPROVAL";
  if (snapshot.outcome?.status === "FAILED") return "FAILED";
  if (snapshot.outcome?.status === "DECLINED") return "DECLINED";
  if (snapshot.phase === "running") return "RECOVERING";
  if (snapshot.phase === "disrupted" || snapshot.exceptions.length > 0) return "DISRUPTED";
  return "MONITORING";
}

export function toAdminLiveSession(row: DeviceJourneyRow): AdminLiveSession | null {
  const snapshot = row.snapshot;
  if (!snapshot) return null;

  return {
    deviceId: row.deviceId,
    travelerLabel: travelerLabel(row.deviceId),
    tripId: row.tripId,
    route: `${row.origin} → ${row.destination}`,
    flightNo: row.flightNo,
    phase: row.phase,
    stage: stageOf(row),
    isProtected: snapshot.isProtected,
    updatedAt: row.updatedAt,
    latestArrival: snapshot.intent.latestArrival,
    minBaggageKg: snapshot.intent.minBaggageKg,
    maxExtraSpendUsd: snapshot.intent.maxExtraSpendUsd,
    autopilot: snapshot.intent.autopilot,
    exceptionsCount: snapshot.exceptions.length,
    playedSteps: snapshot.playedSteps,
    selectedFlight: snapshot.outcome?.selected?.flightNo ?? null,
    approval: snapshot.outcome?.approval ?? null,
    outcomeStatus: snapshot.outcome?.status ?? null,
    verificationSource: snapshot.outcome?.verification?.source ?? null,
  };
}
