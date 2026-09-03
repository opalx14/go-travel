/**
 * Core domain types for TripIntent.
 * Pure TypeScript — no framework dependencies, so the engines can be
 * reused server-side or against a real Atlas integration later.
 */

/** A booked flight leg, e.g. the passenger's original itinerary. */
export interface Flight {
  id: string;
  flightNo: string;
  airline: string;
  origin: string; // IATA code, e.g. "KUL"
  destination: string; // IATA code, e.g. "SIN"
  departure: string; // "HH:MM" local time
  arrival: string; // "HH:MM" local time
  baggageKg: number;
  priceUsd: number;
  stops?: number;
}

/** The traveler's constraints and automation preferences. */
export interface TravelIntent {
  /** Hard deadline: must arrive by this time ("HH:MM"). */
  latestArrival: string;
  /**
   * Maximum delay versus the original departure, in hours.
   * Earlier departures are allowed when every other hard outcome still passes.
   */
  departureFlexibilityHours: number;
  /** Minimum checked baggage in kg. */
  minBaggageKg: number;
  /** Maximum additional spending authority in USD. */
  maxExtraSpendUsd: number;
  /** When on, valid recoveries execute automatically. */
  autopilot: boolean;
}

/** A candidate replacement flight returned by the data provider. */
export interface FlightOption {
  id: string;
  label: string; // "Flight A"
  flightNo: string;
  airline: string;
  destination: string; // IATA code, e.g. "SIN"
  departure: string; // "HH:MM"
  arrival: string; // "HH:MM"
  /**
   * Checked baggage allowance in kg. Optional until Atlas verification and
   * baggage-option lookup confirm a usable allowance.
   */
  baggageKg?: number;
  /** Selected baggage add-on price when required by the passenger contract. */
  baggagePriceUsd?: number;
  /** Opaque Atlas baggage option/segment ids retained for a later booking step. */
  atlasBaggageId?: string;
  atlasBaggageSegmentId?: string;
  /** Additional cost versus the original booking, in USD. */
  extraCostUsd: number;
  stops?: number;
  /** Opaque Atlas offer id, preserved verbatim. Absent on fallback options. */
  atlasOfferId?: string;
  /** Where this candidate came from. */
  source?: "ATLAS_SANDBOX" | "SIMULATED_FALLBACK";
  /** Pricing currency as reported by Atlas (sandbox = USD). */
  currency?: string;
  /** Full replacement price of the new itinerary. */
  replacementPriceUsd?: number;
  /** Atlas price freshness: "reference" | "current" | "verified". */
  priceStatus?: string;
  /** Whether Atlas allows continuing this offer to booking. */
  bookable?: boolean;
  /** Calendar days between departure and arrival (midnight crossings). */
  arrivalDayOffset?: number;
}

/** A disruption detected on the current booking. */
export interface DisruptionEvent {
  id: string;
  tripId: string;
  type: "SCHEDULE_CHANGED";
  summary: string;
  originalDeparture: string;
  originalArrival: string;
  /** The airline's new schedule, which breaks the traveler's deadline. */
  newDeparture: string;
  newArrival: string;
}

/** The individual clauses of the traveler's contract an option is scored against. */
export type ConstraintKind =
  | "ARRIVAL"
  | "FLEXIBILITY"
  | "DESTINATION"
  | "BAGGAGE"
  | "AUTHORITY";

/**
 * One scored clause of the contract. `hard` clauses gate validity;
 * the AUTHORITY clause is delegated spend and only gates autonomous execution.
 */
export interface ConstraintCheck {
  kind: ConstraintKind;
  /** Short label for display, e.g. "Arrival". */
  label: string;
  /** The comparison made, e.g. "16:30 ≤ 18:00". */
  detail: string;
  passed: boolean;
  hard: boolean;
  /** Rejection reason, present only when a check fails. */
  reason?: string;
}

/** Result of evaluating one option against the travel intent. */
export interface OptionEvaluation {
  option: FlightOption;
  /** Hard travel constraints satisfied (arrival, departure, destination, baggage). */
  valid: boolean;
  /** Concise rejection reasons for hard constraints; empty when valid. */
  reasons: string[];
  /** Whether the extra cost is within the delegated spending authority. */
  withinAuthority: boolean;
  /** Per-clause scoring, so the UI can show reasoning without re-deriving it. */
  checks: ConstraintCheck[];
}

/** Final policy gate applied to the selected option. */
export interface PolicyCheckResult {
  /** Extra cost is within the delegated spending authority. */
  withinAuthority: boolean;
  summary: string;
}

export type RecoveryStatus =
  | "RECOVERED"
  | "NEEDS_APPROVAL"
  | "DECLINED"
  | "FAILED";

/** Why a recovery is waiting on the passenger. */
export type ApprovalKind =
  | "OVER_AUTHORITY"
  | "AUTOPILOT_OFF"
  | "PRICE_INCREASED"
  | "SCOPE_EXPANSION";

/** Deterministic recovery-scope ladder used before any broader search is allowed. */
export type RecoveryScope =
  | "EXACT"
  | "DEPARTURE_FLEX"
  | "CONNECTION"
  | "NEARBY_AIRPORT_OR_DATE";

export type EscalationStatus = "AVAILABLE" | "EXHAUSTED" | "REQUIRES_APPROVAL";

export interface RecoveryEscalationStep {
  scope: RecoveryScope;
  status: EscalationStatus;
  reason: string;
  provenance: "TRAVELER_CONTRACT" | "CANDIDATE_INVENTORY" | "HUMAN_BOUNDARY";
  candidateIds: string[];
}

export interface RecoveryEscalationPlan {
  steps: RecoveryEscalationStep[];
  selectedScope: Exclude<RecoveryScope, "NEARBY_AIRPORT_OR_DATE"> | null;
  candidateIds: string[];
  requiresPassengerApproval: boolean;
  stopReason: string;
}

/** Visual tone for timeline rendering. */
export type StepTone = "info" | "success" | "danger" | "warning";

/** One entry in the agent activity timeline. */
export interface RecoveryStep {
  id: string;
  title: string;
  detail: string;
  tone: StepTone;
}

/** Explanation layer: Qwen explains a deterministic decision but never controls it. */
export interface DecisionExplanation {
  source: "QWEN" | "DETERMINISTIC_FALLBACK";
  model?: string;
  headline: string;
  selectedReason: string;
  rejectedReason: string;
  authorityReason: string;
  nextAction: string;
}

/** Full outcome of one recovery run, including the decision timeline. */
export interface RecoveryOutcome {
  status: RecoveryStatus;
  /** Recovery contract used for this run. */
  intent?: TravelIntent;
  event: DisruptionEvent;
  evaluations: OptionEvaluation[];
  selected: FlightOption | null;
  policyCheck: PolicyCheckResult | null;
  steps: RecoveryStep[];
  /** Set when status is NEEDS_APPROVAL. */
  approval?: ApprovalKind;
  /** Set when the passenger approved an over-authority recovery. */
  approvedByPassenger?: boolean;
  /** Deterministic evidence showing which recovery scope was allowed and why. */
  escalation?: RecoveryEscalationPlan;
  /** Set once the selected offer's fare was verified with the provider. */
  verification?: OfferVerification;
  /** Optional AI explanation of the deterministic policy result. */
  reasoning?: DecisionExplanation;
}

/** One checked-baggage option normalized from Atlas. */
export interface BaggageOption {
  /** Opaque Atlas baggage id, preserved verbatim. */
  baggageId: string;
  /** Opaque segment id this option belongs to. */
  segmentId: string;
  weightKg: number;
  price: number;
  currency: string;
}

/**
 * Provider-side verification of the selected offer. Besides fare freshness,
 * Atlas can expose optional-service capability and normalized baggage options.
 */
export interface OfferVerification {
  priceChange: "unchanged" | "decreased" | "increased" | "expired" | "failed";
  previousPrice?: number;
  currentPrice?: number;
  currency?: string;
  source: "ATLAS_SANDBOX" | "SIMULATED_FALLBACK";
  summary: string;
  /** Opaque Atlas booking id returned after verification. */
  bookingId?: string;
  baggageSupported?: boolean;
  seatSupported?: boolean;
  /** Whether baggage options could be inspected after verification. */
  baggageStatus?: "available" | "unavailable" | "unknown";
  baggageOptions?: BaggageOption[];
  /** True only after Atlas booking confirm-price succeeds. */
  priceConfirmed?: boolean;
}

/** Provider abstraction — mock for fallback/tests, remote for Atlas. */
export interface TripDataProvider {
  getDisruption(tripId: string): Promise<DisruptionEvent>;
  searchAlternatives(tripId: string): Promise<FlightOption[]>;
  /** Verify the selected offer's fare; the engine never assumes success. */
  verifyOffer(option: FlightOption): Promise<OfferVerification>;
  /** Confirm an already-reported fare increase after explicit passenger approval. */
  confirmPrice?(verification: OfferVerification): Promise<OfferVerification>;
}
