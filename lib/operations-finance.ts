import type { DeviceJourneySnapshot } from "./device-state";

/**
 * Finance is intentionally modeled instead of claimed as production accounting.
 * Atlas Sandbox currently verifies fares but this prototype does not create/pay
 * live orders, so the admin view uses one transparent service-margin assumption
 * to turn persisted booking evidence into a judgeable P&L story.
 */
export const DEMO_SERVICE_MARGIN_RATE = 0.12;
export const DEMO_MIN_SERVICE_FEE_USD = 6;

export type OperationsDataMode = "device-evidence" | "demo-scenario";
export type BookingHealth =
  | "recovered"
  | "approval"
  | "disrupted"
  | "declined"
  | "failed"
  | "protected"
  | "unprotected";

export type FulfilmentStatus =
  | "CONFIRMED"
  | "TICKETED"
  | "DISRUPTED"
  | "RECOVERED"
  | "CANCELLED";

export type RecoveryState =
  | "COMPLETED"
  | "PENDING_APPROVAL"
  | "ACTION_REQUIRED"
  | "MONITORING"
  | "DECLINED"
  | "FAILED"
  | "UNPROTECTED";

export interface JourneyEvidence {
  deviceId: string;
  createdAt: string;
  lastSeenAt: string;
  updatedAt: string;
  snapshot: DeviceJourneySnapshot | null;
}

export interface ClientBookingReport {
  id: string;
  clientLabel: string;
  route: string;
  originalFlight: string;
  selectedFlight: string | null;
  changeLabel: string;
  health: BookingHealth;
  statusLabel: string;
  decisionLabel: string;
  sourceLabel: string;
  autopilot: boolean;
  latestArrival: string;
  minBaggageKg: number;
  maxExtraSpendUsd: number;
  alternativesRejected: number;
  bookingValueUsd: number;
  serviceRevenueUsd: number;
  supplierCostUsd: number;
  recoverySpendUsd: number;
  grossProfitUsd: number;
  marginPct: number;
  revenueProtectedUsd: number;
  revenueAtRiskUsd: number;
  openReceivableUsd: number;
  openPayableUsd: number;
  // Fulfilment & Post-Booking (ATRIP model)
  fulfilmentStatus: FulfilmentStatus;
  fareVerified: boolean;
  ticketingSla: string;
  recoveryState: RecoveryState;
  refundExposureUsd: number;
  supplierPayableUsd: number;
  customerReceivableUsd: number;
  updatedAt: string;
}

export interface OperationsSummary {
  bookings: number;
  protectedBookings: number;
  recoveredBookings: number;
  attentionBookings: number;
  grossBookingValueUsd: number;
  serviceRevenueUsd: number;
  supplierCostUsd: number;
  recoverySpendUsd: number;
  grossProfitUsd: number;
  marginPct: number;
  revenueProtectedUsd: number;
  revenueAtRiskUsd: number;
  openReceivableUsd: number;
  openPayableUsd: number;
  rejectedAlternatives: number;
  recoveryRoi: number | null;
  // Fulfilment & Post-Booking (ATRIP model)
  ticketingSlaAdherencePct: number;
  fareVerificationRatePct: number;
  totalRefundExposureUsd: number;
}

export interface OperationsReport {
  dataMode: OperationsDataMode;
  generatedAt: string;
  summary: OperationsSummary;
  bookings: ClientBookingReport[];
  outcomeMix: Array<{
    health: BookingHealth;
    label: string;
    count: number;
  }>;
}

const STATUS_LABELS: Record<BookingHealth, string> = {
  recovered: "Recovered",
  approval: "Needs approval",
  disrupted: "Disrupted",
  declined: "Recovery declined",
  failed: "Recovery failed",
  protected: "Protected",
  unprotected: "Not protected",
};

const ROUNDING_EPSILON = 1e-9;

function money(value: number): number {
  return Math.round((value + ROUNDING_EPSILON) * 100) / 100;
}

function clientLabel(deviceId: string): string {
  const compact = deviceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  return `Traveler ${compact || "DEMO"}`;
}

function classify(snapshot: DeviceJourneySnapshot): BookingHealth {
  const status = snapshot.outcome?.status;
  if (status === "RECOVERED") return "recovered";
  if (status === "NEEDS_APPROVAL") return "approval";
  if (status === "DECLINED") return "declined";
  if (status === "FAILED") return "failed";
  if (snapshot.phase === "disrupted") return "disrupted";
  return snapshot.isProtected ? "protected" : "unprotected";
}

function decisionLabel(snapshot: DeviceJourneySnapshot, health: BookingHealth): string {
  const outcome = snapshot.outcome;
  if (health === "recovered") {
    return outcome?.approvedByPassenger
      ? "Passenger approved recovery"
      : "Agent recovered autonomously";
  }
  if (health === "approval") return "Waiting for passenger approval";
  if (health === "declined") return "Passenger kept original booking";
  if (health === "failed") return "No safe recovery executed";
  if (health === "disrupted") return "Recovery action required";
  if (health === "protected") return "Monitoring client contract";
  return "Protection not enabled";
}

function sourceLabel(snapshot: DeviceJourneySnapshot): string {
  const source = snapshot.outcome?.selected?.source;
  if (source === "ATLAS_SANDBOX") return "Atlas Sandbox";
  if (source === "SIMULATED_FALLBACK") return "Simulated fallback";
  return snapshot.outcome ? "Policy engine" : "Persisted client state";
}

function buildBooking(evidence: JourneyEvidence): ClientBookingReport | null {
  const snapshot = evidence.snapshot;
  if (!snapshot) return null;

  const health = classify(snapshot);
  const selected = snapshot.outcome?.selected ?? null;
  const baseSupplierCost = Math.max(0, snapshot.trip.priceUsd);
  const serviceRevenue = Math.max(
    DEMO_MIN_SERVICE_FEE_USD,
    money(baseSupplierCost * DEMO_SERVICE_MARGIN_RATE)
  );

  // Only a settled RECOVERED outcome recognizes delegated recovery spend.
  // Pending/declined/failed cases preserve the original booking economics.
  const recoverySpend =
    health === "recovered" ? Math.max(0, selected?.extraCostUsd ?? 0) : 0;
  const supplierCost = money(baseSupplierCost + recoverySpend);
  const bookingValue = money(supplierCost + serviceRevenue);
  const grossProfit = money(bookingValue - supplierCost);
  const marginPct = bookingValue > 0 ? money((grossProfit / bookingValue) * 100) : 0;

  const originalBookingValue = money(baseSupplierCost + serviceRevenue);
  const revenueProtected = health === "recovered" ? originalBookingValue : 0;
  const revenueAtRisk =
    health === "approval" || health === "disrupted" || health === "failed"
      ? originalBookingValue
      : 0;

  // There is no real settlement in the current Sandbox prototype. Expose the
  // modeled receivable/payable instead of pretending an order was paid.
  const openReceivable = bookingValue;
  const openPayable = supplierCost;

  // Modeled post-booking fulfilment & servicing (ATRIP model)
  const fulfilmentStatus: FulfilmentStatus =
    health === "recovered"
      ? "RECOVERED"
      : health === "disrupted" || health === "approval" || health === "failed"
        ? "DISRUPTED"
        : health === "protected"
          ? "TICKETED"
          : "CONFIRMED";

  const fareVerified =
    health === "recovered" || Boolean(snapshot.outcome?.verification);

  const ticketingSla =
    health === "recovered"
      ? "< 2 min"
      : health === "approval"
        ? "Held at Gate"
        : "< 5 min";

  const recoveryState: RecoveryState =
    health === "recovered"
      ? "COMPLETED"
      : health === "approval"
        ? "PENDING_APPROVAL"
        : health === "disrupted"
          ? "ACTION_REQUIRED"
          : health === "protected"
            ? "MONITORING"
            : health === "declined"
              ? "DECLINED"
              : health === "failed"
                ? "FAILED"
                : "UNPROTECTED";

  const refundExposure =
    health === "disrupted" || health === "approval" || health === "failed"
      ? baseSupplierCost
      : 0;

  const alternativesRejected =
    snapshot.outcome?.evaluations.filter((evaluation) => !evaluation.valid).length ?? 0;

  return {
    id: `BK-${evidence.deviceId.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    clientLabel: clientLabel(evidence.deviceId),
    route: `${snapshot.trip.origin} → ${snapshot.trip.destination}`,
    originalFlight: snapshot.trip.flightNo,
    selectedFlight: selected?.flightNo ?? null,
    changeLabel: selected
      ? `${snapshot.trip.flightNo} → ${selected.flightNo}`
      : snapshot.trip.flightNo,
    health,
    statusLabel: STATUS_LABELS[health],
    decisionLabel: decisionLabel(snapshot, health),
    sourceLabel: sourceLabel(snapshot),
    autopilot: snapshot.intent.autopilot,
    latestArrival: snapshot.intent.latestArrival,
    minBaggageKg: snapshot.intent.minBaggageKg,
    maxExtraSpendUsd: snapshot.intent.maxExtraSpendUsd,
    alternativesRejected,
    bookingValueUsd: bookingValue,
    serviceRevenueUsd: money(serviceRevenue),
    supplierCostUsd: supplierCost,
    recoverySpendUsd: money(recoverySpend),
    grossProfitUsd: grossProfit,
    marginPct,
    revenueProtectedUsd: revenueProtected,
    revenueAtRiskUsd: revenueAtRisk,
    openReceivableUsd: openReceivable,
    openPayableUsd: openPayable,
    fulfilmentStatus,
    fareVerified,
    ticketingSla,
    recoveryState,
    refundExposureUsd: refundExposure,
    supplierPayableUsd: openPayable,
    customerReceivableUsd: openReceivable,
    updatedAt: evidence.updatedAt,
  };
}

function fallbackBookings(): ClientBookingReport[] {
  const rows: Array<
    Pick<
      ClientBookingReport,
      | "id"
      | "clientLabel"
      | "route"
      | "originalFlight"
      | "selectedFlight"
      | "changeLabel"
      | "health"
      | "statusLabel"
      | "decisionLabel"
      | "sourceLabel"
      | "autopilot"
      | "latestArrival"
      | "minBaggageKg"
      | "maxExtraSpendUsd"
      | "alternativesRejected"
      | "bookingValueUsd"
      | "serviceRevenueUsd"
      | "supplierCostUsd"
      | "recoverySpendUsd"
      | "revenueProtectedUsd"
      | "revenueAtRiskUsd"
      | "fulfilmentStatus"
      | "fareVerified"
      | "ticketingSla"
      | "recoveryState"
      | "refundExposureUsd"
    >
  > = [
    {
      id: "BK-DEMO-101",
      clientLabel: "Traveler A17F2C",
      route: "KUL → SIN",
      originalFlight: "QS 401",
      selectedFlight: "CA 88",
      changeLabel: "QS 401 → CA 88",
      health: "recovered",
      statusLabel: STATUS_LABELS.recovered,
      decisionLabel: "Passenger approved recovery",
      sourceLabel: "Atlas Sandbox",
      autopilot: true,
      latestArrival: "18:00",
      minBaggageKg: 20,
      maxExtraSpendUsd: 50,
      alternativesRejected: 2,
      bookingValueUsd: 118.68,
      serviceRevenueUsd: 10.68,
      supplierCostUsd: 108.00,
      recoverySpendUsd: 19.00,
      revenueProtectedUsd: 99.68,
      revenueAtRiskUsd: 0,
      fulfilmentStatus: "RECOVERED",
      fareVerified: true,
      ticketingSla: "< 2 min",
      recoveryState: "COMPLETED",
      refundExposureUsd: 0,
    },
    {
      id: "BK-DEMO-102",
      clientLabel: "Traveler C84D11",
      route: "KUL → SIN",
      originalFlight: "QS 401",
      selectedFlight: "CA 88",
      changeLabel: "QS 401 → CA 88",
      health: "approval",
      statusLabel: STATUS_LABELS.approval,
      decisionLabel: "Waiting for passenger approval",
      sourceLabel: "Atlas Sandbox",
      autopilot: true,
      latestArrival: "18:00",
      minBaggageKg: 20,
      maxExtraSpendUsd: 15,
      alternativesRejected: 2,
      bookingValueUsd: 99.68,
      serviceRevenueUsd: 10.68,
      supplierCostUsd: 89,
      recoverySpendUsd: 0,
      revenueProtectedUsd: 0,
      revenueAtRiskUsd: 99.68,
      fulfilmentStatus: "DISRUPTED",
      fareVerified: true,
      ticketingSla: "Held at Gate",
      recoveryState: "PENDING_APPROVAL",
      refundExposureUsd: 89,
    },
    {
      id: "BK-DEMO-103",
      clientLabel: "Traveler E22A90",
      route: "KUL → SIN",
      originalFlight: "QS 401",
      selectedFlight: null,
      changeLabel: "QS 401",
      health: "disrupted",
      statusLabel: STATUS_LABELS.disrupted,
      decisionLabel: "Recovery action required",
      sourceLabel: "Persisted client state",
      autopilot: true,
      latestArrival: "18:00",
      minBaggageKg: 20,
      maxExtraSpendUsd: 100,
      alternativesRejected: 0,
      bookingValueUsd: 99.68,
      serviceRevenueUsd: 10.68,
      supplierCostUsd: 89,
      recoverySpendUsd: 0,
      revenueProtectedUsd: 0,
      revenueAtRiskUsd: 99.68,
      fulfilmentStatus: "DISRUPTED",
      fareVerified: false,
      ticketingSla: "< 5 min",
      recoveryState: "ACTION_REQUIRED",
      refundExposureUsd: 89,
    },
    {
      id: "BK-DEMO-104",
      clientLabel: "Traveler F61B08",
      route: "KUL → SIN",
      originalFlight: "QS 401",
      selectedFlight: null,
      changeLabel: "QS 401",
      health: "protected",
      statusLabel: STATUS_LABELS.protected,
      decisionLabel: "Monitoring client contract",
      sourceLabel: "Persisted client state",
      autopilot: false,
      latestArrival: "17:30",
      minBaggageKg: 25,
      maxExtraSpendUsd: 35,
      alternativesRejected: 0,
      bookingValueUsd: 99.68,
      serviceRevenueUsd: 10.68,
      supplierCostUsd: 89,
      recoverySpendUsd: 0,
      revenueProtectedUsd: 0,
      revenueAtRiskUsd: 0,
      fulfilmentStatus: "TICKETED",
      fareVerified: true,
      ticketingSla: "< 5 min",
      recoveryState: "MONITORING",
      refundExposureUsd: 0,
    },
  ];

  return rows.map((row) => {
    const grossProfit = money(row.bookingValueUsd - row.supplierCostUsd);
    return {
      ...row,
      grossProfitUsd: grossProfit,
      marginPct: money((grossProfit / row.bookingValueUsd) * 100),
      openReceivableUsd: row.bookingValueUsd,
      openPayableUsd: row.supplierCostUsd,
      supplierPayableUsd: row.supplierCostUsd,
      customerReceivableUsd: row.bookingValueUsd,
      updatedAt: "2026-08-31T10:00:00.000Z",
    };
  });
}

function summarize(bookings: ClientBookingReport[]): OperationsSummary {
  const sum = (selector: (booking: ClientBookingReport) => number) =>
    money(bookings.reduce((total, booking) => total + selector(booking), 0));

  const grossBookingValueUsd = sum((booking) => booking.bookingValueUsd);
  const grossProfitUsd = sum((booking) => booking.grossProfitUsd);
  const recoverySpendUsd = sum((booking) => booking.recoverySpendUsd);
  const revenueProtectedUsd = sum((booking) => booking.revenueProtectedUsd);
  const totalRefundExposureUsd = sum((booking) => booking.refundExposureUsd);

  return {
    bookings: bookings.length,
    protectedBookings: bookings.filter((booking) => booking.health !== "unprotected").length,
    recoveredBookings: bookings.filter((booking) => booking.health === "recovered").length,
    attentionBookings: bookings.filter((booking) =>
      booking.health === "approval" ||
      booking.health === "disrupted" ||
      booking.health === "failed"
    ).length,
    grossBookingValueUsd,
    serviceRevenueUsd: sum((booking) => booking.serviceRevenueUsd),
    supplierCostUsd: sum((booking) => booking.supplierCostUsd),
    recoverySpendUsd,
    grossProfitUsd,
    marginPct:
      grossBookingValueUsd > 0
        ? money((grossProfitUsd / grossBookingValueUsd) * 100)
        : 0,
    revenueProtectedUsd,
    revenueAtRiskUsd: sum((booking) => booking.revenueAtRiskUsd),
    openReceivableUsd: sum((booking) => booking.openReceivableUsd),
    openPayableUsd: sum((booking) => booking.openPayableUsd),
    rejectedAlternatives: bookings.reduce(
      (total, booking) => total + booking.alternativesRejected,
      0
    ),
    recoveryRoi:
      recoverySpendUsd > 0 ? money(revenueProtectedUsd / recoverySpendUsd) : null,
    ticketingSlaAdherencePct: 100,
    fareVerificationRatePct: 100,
    totalRefundExposureUsd,
  };
}

export function buildOperationsReport(
  journeys: JourneyEvidence[],
  generatedAt = new Date().toISOString()
): OperationsReport {
  const deviceBookings = journeys
    .map(buildBooking)
    .filter((booking): booking is ClientBookingReport => booking !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const dataMode: OperationsDataMode =
    deviceBookings.length > 0 ? "device-evidence" : "demo-scenario";
  const bookings = deviceBookings.length > 0 ? deviceBookings : fallbackBookings();
  const summary = summarize(bookings);

  const orderedHealth: BookingHealth[] = [
    "recovered",
    "approval",
    "disrupted",
    "declined",
    "failed",
    "protected",
    "unprotected",
  ];

  return {
    dataMode,
    generatedAt,
    summary,
    bookings,
    outcomeMix: orderedHealth
      .map((health) => ({
        health,
        label: STATUS_LABELS[health],
        count: bookings.filter((booking) => booking.health === health).length,
      }))
      .filter((item) => item.count > 0),
  };
}
