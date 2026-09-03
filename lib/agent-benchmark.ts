import { runRecovery } from "./recovery-engine";
import { ALTERNATIVES, DEFAULT_INTENT, ORIGINAL_FLIGHT, SCHEDULE_CHANGE_EVENT } from "./scenario";
import type {
  ApprovalKind,
  FlightOption,
  OfferVerification,
  RecoveryStatus,
  TripDataProvider,
} from "./types";

export interface AgentBenchmarkCaseResult {
  id: string;
  name: string;
  expectedStatus: RecoveryStatus;
  expectedApproval?: ApprovalKind;
  actualStatus: RecoveryStatus;
  actualApproval?: ApprovalKind;
  passed: boolean;
  selectedFlightNo: string | null;
  steps: number;
  detail: string;
}

export interface AgentBenchmarkReport {
  passed: number;
  failed: number;
  total: number;
  passRate: number;
  cases: AgentBenchmarkCaseResult[];
}

function scriptedProvider(options: {
  alternatives?: FlightOption[];
  verification?: OfferVerification | ((option: FlightOption) => OfferVerification);
  search?: () => Promise<FlightOption[]>;
} = {}): TripDataProvider {
  return {
    async getDisruption() {
      return SCHEDULE_CHANGE_EVENT;
    },
    async searchAlternatives() {
      if (options.search) return options.search();
      return options.alternatives ?? ALTERNATIVES;
    },
    async verifyOffer(option) {
      if (typeof options.verification === "function") {
        return options.verification(option);
      }
      return (
        options.verification ?? {
          priceChange: "unchanged",
          source: "SIMULATED_FALLBACK",
          summary: `Fare for ${option.flightNo} unchanged`,
        }
      );
    },
  };
}

function atlasOption(
  id: string,
  flightNo: string,
  extraCostUsd: number
): FlightOption {
  return {
    ...ALTERNATIVES[1],
    id,
    label: id,
    flightNo,
    source: "ATLAS_SANDBOX",
    atlasOfferId: `offer_${id}`,
    baggageKg: undefined,
    replacementPriceUsd: extraCostUsd,
    extraCostUsd,
  };
}

async function executeCase(options: {
  id: string;
  name: string;
  expectedStatus: RecoveryStatus;
  expectedApproval?: ApprovalKind;
  intent?: typeof DEFAULT_INTENT;
  provider: TripDataProvider;
}): Promise<AgentBenchmarkCaseResult> {
  const outcome = await runRecovery(
    ORIGINAL_FLIGHT,
    options.intent ?? DEFAULT_INTENT,
    options.provider
  );
  const passed =
    outcome.status === options.expectedStatus &&
    (options.expectedApproval === undefined ||
      outcome.approval === options.expectedApproval);

  return {
    id: options.id,
    name: options.name,
    expectedStatus: options.expectedStatus,
    expectedApproval: options.expectedApproval,
    actualStatus: outcome.status,
    actualApproval: outcome.approval,
    passed,
    selectedFlightNo: outcome.selected?.flightNo ?? null,
    steps: outcome.steps.length,
    detail: passed
      ? `Expected ${options.expectedStatus}${options.expectedApproval ? `/${options.expectedApproval}` : ""} and received it.`
      : `Expected ${options.expectedStatus}${options.expectedApproval ? `/${options.expectedApproval}` : ""}, received ${outcome.status}${outcome.approval ? `/${outcome.approval}` : ""}.`,
  };
}

export async function runAgentBenchmark(): Promise<AgentBenchmarkReport> {
  const cases: AgentBenchmarkCaseResult[] = [];

  cases.push(
    await executeCase({
      id: "autonomous-recovery",
      name: "Autonomous recovery inside authority",
      expectedStatus: "RECOVERED",
      provider: scriptedProvider(),
    })
  );

  cases.push(
    await executeCase({
      id: "over-authority",
      name: "Over-authority recovery stops for passenger",
      expectedStatus: "NEEDS_APPROVAL",
      expectedApproval: "OVER_AUTHORITY",
      intent: { ...DEFAULT_INTENT, maxExtraSpendUsd: 10 },
      provider: scriptedProvider(),
    })
  );

  cases.push(
    await executeCase({
      id: "manual-control",
      name: "Autopilot-off recovery respects manual control",
      expectedStatus: "NEEDS_APPROVAL",
      expectedApproval: "AUTOPILOT_OFF",
      intent: { ...DEFAULT_INTENT, autopilot: false },
      provider: scriptedProvider(),
    })
  );

  cases.push(
    await executeCase({
      id: "impossible-deadline",
      name: "Impossible arrival deadline fails safely",
      expectedStatus: "FAILED",
      intent: { ...DEFAULT_INTENT, latestArrival: "07:00" },
      provider: scriptedProvider(),
    })
  );

  cases.push(
    await executeCase({
      id: "provider-price-jump",
      name: "Provider price jump creates a second human gate",
      expectedStatus: "NEEDS_APPROVAL",
      expectedApproval: "PRICE_INCREASED",
      intent: { ...DEFAULT_INTENT, minBaggageKg: 0, maxExtraSpendUsd: 200 },
      provider: scriptedProvider({
        alternatives: [atlasOption("price-jump", "PJ 20", 19)],
        verification: {
          priceChange: "increased",
          previousPrice: 19,
          currentPrice: 34,
          source: "ATLAS_SANDBOX",
          summary: "Fare increased",
          bookingId: "booking_price_jump",
        },
      }),
    })
  );

  const noBag = atlasOption("no-bag", "NB 10", 12);
  const bagBackup = atlasOption("bag-backup", "BB 20", 20);
  cases.push(
    await executeCase({
      id: "baggage-self-repair",
      name: "Missing baggage triggers candidate self-repair",
      expectedStatus: "RECOVERED",
      provider: scriptedProvider({
        alternatives: [noBag, bagBackup],
        verification: (option) =>
          option.id === noBag.id
            ? {
                priceChange: "unchanged",
                currentPrice: 12,
                source: "ATLAS_SANDBOX",
                summary: "Fare unchanged",
                baggageSupported: false,
                baggageStatus: "unavailable",
              }
            : {
                priceChange: "unchanged",
                currentPrice: 20,
                source: "ATLAS_SANDBOX",
                summary: "Backup verified",
                baggageSupported: true,
                baggageStatus: "available",
                baggageOptions: [
                  {
                    baggageId: "bag_20",
                    segmentId: "seg_20",
                    weightKg: 20,
                    price: 5,
                    currency: "USD",
                  },
                ],
              },
      }),
    })
  );

  let searchAttempts = 0;
  cases.push(
    await executeCase({
      id: "transient-search-retry",
      name: "Transient Atlas search recovers inside retry budget",
      expectedStatus: "RECOVERED",
      provider: scriptedProvider({
        search: async () => {
          searchAttempts += 1;
          if (searchAttempts === 1) throw new Error("transient search transport failure");
          return ALTERNATIVES;
        },
      }),
    })
  );

  const passed = cases.filter((item) => item.passed).length;
  const failed = cases.length - passed;
  return {
    passed,
    failed,
    total: cases.length,
    passRate: Math.round((passed / cases.length) * 100),
    cases,
  };
}
