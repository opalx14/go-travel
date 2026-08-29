import type {
  ConstraintCheck,
  FlightOption,
  OptionEvaluation,
  PolicyCheckResult,
  TravelIntent,
} from "./types";

/** Parse "HH:MM" into minutes since midnight. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Add whole hours to an "HH:MM" clock time. */
function addHours(hhmm: string, hours: number): string {
  const total = toMinutes(hhmm) + hours * 60;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Score one alternative clause by clause. Hard clauses (arrival deadline,
 * departure flexibility, destination, minimum baggage) decide validity;
 * the authority clause reports delegated spend and is handled as an approval
 * gate downstream, never as a hard constraint.
 */
function scoreOption(
  option: FlightOption,
  intent: TravelIntent,
  originalDeparture: string,
  destination: string
): ConstraintCheck[] {
  const latestDepartureMinutes =
    toMinutes(originalDeparture) + intent.departureFlexibilityHours * 60;
  const latestDeparture = addHours(
    originalDeparture,
    intent.departureFlexibilityHours
  );

  const arrivalMinutes =
    toMinutes(option.arrival) + (option.arrivalDayOffset ?? 0) * 1440;
  const arrivalOk = arrivalMinutes <= toMinutes(intent.latestArrival);
  const arrivalLabel =
    (option.arrivalDayOffset ?? 0) > 0
      ? `${option.arrival} (+${option.arrivalDayOffset}d)`
      : option.arrival;
  // Flexibility is intentionally one-sided: it caps how much later the
  // replacement may depart. Earlier departures are allowed if the arrival,
  // destination and baggage outcomes still pass.
  const departureOk = toMinutes(option.departure) <= latestDepartureMinutes;
  const destinationOk = option.destination === destination;
  const baggageKnown = typeof option.baggageKg === "number";
  const baggageOk = baggageKnown
    ? (option.baggageKg as number) >= intent.minBaggageKg
    : true;
  const authorityOk = option.extraCostUsd <= intent.maxExtraSpendUsd;

  return [
    {
      kind: "ARRIVAL",
      label: "Arrival",
      detail: `${arrivalLabel} vs ${intent.latestArrival} deadline`,
      passed: arrivalOk,
      hard: true,
      reason: arrivalOk
        ? undefined
        : `Arrival ${arrivalLabel} is after the ${intent.latestArrival} deadline`,
    },
    {
      kind: "FLEXIBILITY",
      label: "Flexibility",
      detail: `departs ${option.departure} vs ${latestDeparture} limit`,
      passed: departureOk,
      hard: true,
      reason: departureOk
        ? undefined
        : `Departure ${option.departure} exceeds +${intent.departureFlexibilityHours}h flexibility`,
    },
    {
      kind: "DESTINATION",
      label: "Destination",
      detail: `${option.destination} vs ${destination} required`,
      passed: destinationOk,
      hard: true,
      reason: destinationOk
        ? undefined
        : `Flies to ${option.destination}, not ${destination}`,
    },
    baggageKnown
      ? {
          kind: "BAGGAGE",
          label: "Baggage",
          detail: `${option.baggageKg}kg vs ${intent.minBaggageKg}kg minimum`,
          passed: baggageOk,
          hard: true,
          reason: baggageOk
            ? undefined
            : `Baggage ${option.baggageKg}kg is below the ${intent.minBaggageKg}kg minimum`,
        }
      : {
          // Atlas search results carry no allowance weight. Keep the option
          // provisionally eligible, but make it explicit that the hard baggage
          // requirement must be confirmed through Atlas before recovery.
          kind: "BAGGAGE",
          label: "Baggage",
          detail: `Pending Atlas verification · must confirm ≥ ${intent.minBaggageKg}kg`,
          passed: true,
          hard: false,
        },
    {
      kind: "AUTHORITY",
      label: "Authority",
      detail: `+$${option.extraCostUsd} vs $${intent.maxExtraSpendUsd} delegated`,
      passed: authorityOk,
      hard: false,
      reason: authorityOk
        ? undefined
        : `+$${option.extraCostUsd} needs $${
            option.extraCostUsd - intent.maxExtraSpendUsd
          } more authority`,
    },
  ];
}

/**
 * Evaluate one alternative against the traveler's hard travel constraints
 * (arrival deadline, departure flexibility, destination, minimum baggage).
 * Spending authority is NOT a hard constraint: it is reported separately
 * via `withinAuthority` and handled as an approval gate downstream.
 */
export function evaluateOption(
  option: FlightOption,
  intent: TravelIntent,
  originalDeparture: string,
  destination: string
): OptionEvaluation {
  const checks = scoreOption(option, intent, originalDeparture, destination);
  const hardFailures = checks.filter((check) => check.hard && !check.passed);
  const authority = checks.find((check) => check.kind === "AUTHORITY");

  return {
    option,
    valid: hardFailures.length === 0,
    reasons: hardFailures.map((check) => check.reason as string),
    withinAuthority: authority?.passed ?? true,
    checks,
  };
}

/** Pick the valid option with the lowest additional cost. */
export function selectBestOption(
  evaluations: OptionEvaluation[]
): FlightOption | null {
  const valid = evaluations
    .filter((e) => e.valid)
    .sort((a, b) => a.option.extraCostUsd - b.option.extraCostUsd);
  return valid.length > 0 ? valid[0].option : null;
}

/**
 * Final deterministic policy gate on the selected option.
 * Hard constraints are already satisfied by construction; this gate only
 * decides whether the spend is autonomous (within authority) or needs
 * passenger approval (over authority).
 */
export function runPolicyCheck(
  selected: FlightOption,
  intent: TravelIntent
): PolicyCheckResult {
  const withinAuthority = selected.extraCostUsd <= intent.maxExtraSpendUsd;

  if (!withinAuthority) {
    return {
      withinAuthority: false,
      summary: `Travel constraints satisfied · +$${selected.extraCostUsd} exceeds the $${intent.maxExtraSpendUsd} authority — passenger approval required`,
    };
  }

  return {
    withinAuthority: true,
    summary: `+$${selected.extraCostUsd} is within the $${intent.maxExtraSpendUsd} spending authority · ${
      intent.autopilot ? "Autopilot authorized to execute" : "manual approval required"
    }`,
  };
}
