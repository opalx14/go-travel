import {
  planNextAgentTool,
  type AgentPlannerState,
} from "../lib/agent-planner";
import {
  evaluateOption,
  runPolicyCheck,
  selectBestOption,
} from "../lib/policy-engine";
import {
  ASSUMED_RECOVERABLE_VALUE_USD,
  DEFAULT_INTENT,
  ORIGINAL_FLIGHT,
  SCHEDULE_CHANGE_EVENT,
} from "../lib/scenario";
import type {
  FlightOption,
  OfferVerification,
  OptionEvaluation,
  PolicyCheckResult,
} from "../lib/types";
import { buildDeterministicDecisionExplanation } from "../lib/decision-explainer";

const APP_BASE = process.env.TRIPINTENT_APP_BASE_URL?.trim() || "http://127.0.0.1:3020";
const MAX_TURNS = 20;

interface SearchResponse {
  ok: boolean;
  fallback?: boolean;
  candidates?: FlightOption[];
  searchId?: string | null;
  offerCount?: number;
  returnedCount?: number;
  error?: string;
}

interface VerifyResponse {
  ok: boolean;
  verification?: OfferVerification;
  error?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${APP_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tripintent-mode": "live",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function initialState(): AgentPlannerState {
  return {
    contractLoaded: false,
    disruptionInspected: false,
    alternativesFound: null,
    contractEvaluated: false,
    selectedFlightNo: null,
    approvalRequired: false,
    passengerApproved: false,
    offerVerified: false,
    explanationReady: false,
  };
}

function compactOption(option: FlightOption): string {
  return `${option.flightNo} ${option.departure}→${option.arrival}${option.arrivalDayOffset ? `(+${option.arrivalDayOffset}d)` : ""} +$${option.extraCostUsd.toFixed(2)}`;
}

function eligibleBaggage(
  verification: OfferVerification,
  minKg: number
) {
  return (verification.baggageOptions ?? [])
    .filter((item) => item.currency === "USD" && item.weightKg >= minKg)
    .sort((a, b) => a.price - b.price || a.weightKg - b.weightKg)[0];
}

function applyVerifiedBaggage(
  option: FlightOption,
  verification: OfferVerification
): FlightOption | null {
  if (DEFAULT_INTENT.minBaggageKg <= 0) return option;

  if (option.baggageKg !== undefined) {
    return option.baggageKg >= DEFAULT_INTENT.minBaggageKg ? option : null;
  }

  if (verification.baggageStatus !== "available") return null;
  const baggage = eligibleBaggage(verification, DEFAULT_INTENT.minBaggageKg);
  if (!baggage) return null;

  const verifiedFare =
    verification.currentPrice ??
    option.replacementPriceUsd ??
    option.extraCostUsd + ASSUMED_RECOVERABLE_VALUE_USD;

  return {
    ...option,
    baggageKg: baggage.weightKg,
    baggagePriceUsd: baggage.price,
    atlasBaggageId: baggage.baggageId,
    atlasBaggageSegmentId: baggage.segmentId,
    replacementPriceUsd: verifiedFare,
    extraCostUsd: verifiedFare + baggage.price - ASSUMED_RECOVERABLE_VALUE_USD,
  };
}

async function main() {
  const state = initialState();
  let candidates: FlightOption[] = [];
  let evaluations: OptionEvaluation[] = [];
  let selected: FlightOption | null = null;
  let policyCheck: PolicyCheckResult | null = null;
  let verification: OfferVerification | null = null;
  const rejectedOfferIds = new Set<string>();

  console.log("TripIntent Qwen + Atlas Live bounded agent loop");
  console.log(`App: ${APP_BASE}`);
  console.log("Goal: recover KUL → SIN while preserving the traveler contract.\n");

  for (let turn = 1; turn <= MAX_TURNS; turn += 1) {
    const decision = await planNextAgentTool(state);
    console.log(`TURN ${turn}`);
    console.log(`Qwen planner       ${decision.tool} · ${decision.reason} [${decision.source}]`);

    switch (decision.tool) {
      case "load_contract": {
        state.contractLoaded = true;
        console.log(
          `tool result        contract loaded: arrive≤${DEFAULT_INTENT.latestArrival}, bag≥${DEFAULT_INTENT.minBaggageKg}kg, authority≤$${DEFAULT_INTENT.maxExtraSpendUsd}`
        );
        break;
      }

      case "inspect_disruption": {
        state.disruptionInspected = true;
        console.log(`tool result        ${SCHEDULE_CHANGE_EVENT.summary}`);
        break;
      }

      case "search_alternatives": {
        const result = await postJson<SearchResponse>("/api/atlas/search", {});
        if (!result.ok) throw new Error(result.error ?? "Atlas live search failed");
        if (result.fallback) {
          throw new Error("Atlas Live smoke received fallback data; refusing to claim live evidence");
        }
        candidates = result.candidates ?? [];
        state.alternativesFound = candidates.length;
        console.log(
          `tool result        Atlas Live search ${result.searchId ?? "(no search id)"}: ${candidates.length} candidates / ${result.offerCount ?? "?"} offers`
        );
        console.log(
          `                   ${candidates.slice(0, 5).map(compactOption).join(" · ")}${candidates.length > 5 ? " · …" : ""}`
        );
        break;
      }

      case "evaluate_contract": {
        evaluations = candidates
          .filter((option) => !rejectedOfferIds.has(option.id))
          .map((option) =>
            evaluateOption(
              option,
              DEFAULT_INTENT,
              ORIGINAL_FLIGHT.departure,
              ORIGINAL_FLIGHT.destination
            )
          );

        selected = selectBestOption(evaluations);
        state.contractEvaluated = true;
        state.selectedFlightNo = selected?.flightNo ?? null;
        state.offerVerified = false;
        verification = null;
        state.explanationReady = false;

        if (!selected) {
          policyCheck = null;
          state.approvalRequired = false;
          console.log("tool result        no policy-valid Atlas candidate remains");
          break;
        }

        policyCheck = runPolicyCheck(selected, DEFAULT_INTENT);
        state.approvalRequired =
          !policyCheck.withinAuthority || !DEFAULT_INTENT.autopilot;
        const rejectedCount = evaluations.filter((item) => !item.valid).length;
        console.log(
          `tool result        selected ${compactOption(selected)} · ${rejectedCount} rejected · ${policyCheck.summary}`
        );
        break;
      }

      case "request_approval": {
        console.log(
          `tool result        HUMAN BOUNDARY reached for ${selected?.flightNo ?? "current recovery"}; planner stops instead of auto-approving`
        );
        console.log("\nPASS: Qwen + Atlas Live reached the passenger approval boundary without bypassing policy.");
        return;
      }

      case "verify_offer": {
        if (!selected?.atlasOfferId) {
          throw new Error("Planner attempted live verification without an Atlas offer id");
        }

        const result = await postJson<VerifyResponse>("/api/atlas/verify", {
          offerId: selected.atlasOfferId,
        });

        if (!result.ok || !result.verification) {
          console.log(
            `tool result        Atlas verify rejected ${selected.flightNo}: ${result.error ?? "unknown error"}; trying next policy-valid offer`
          );
          rejectedOfferIds.add(selected.id);
          selected = null;
          policyCheck = null;
          state.contractEvaluated = false;
          state.selectedFlightNo = null;
          state.approvalRequired = false;
          state.offerVerified = false;
          break;
        }

        verification = result.verification;
        if (
          verification.priceChange === "expired" ||
          verification.priceChange === "failed"
        ) {
          console.log(
            `tool result        ${selected.flightNo} ${verification.priceChange}; trying next policy-valid offer`
          );
          rejectedOfferIds.add(selected.id);
          selected = null;
          policyCheck = null;
          state.contractEvaluated = false;
          state.selectedFlightNo = null;
          state.approvalRequired = false;
          state.offerVerified = false;
          break;
        }

        if (verification.priceChange === "increased") {
          state.approvalRequired = true;
          state.offerVerified = true;
          console.log(
            `tool result        ${verification.summary} · mandatory human price-confirmation boundary`
          );
          break;
        }

        const withBaggage = applyVerifiedBaggage(selected, verification);
        if (!withBaggage) {
          console.log(
            `tool result        ${selected.flightNo} rejected: Atlas could not confirm ≥${DEFAULT_INTENT.minBaggageKg}kg baggage; trying next offer`
          );
          rejectedOfferIds.add(selected.id);
          selected = null;
          policyCheck = null;
          state.contractEvaluated = false;
          state.selectedFlightNo = null;
          state.approvalRequired = false;
          state.offerVerified = false;
          break;
        }

        selected = withBaggage;
        const reevaluated = evaluateOption(
          selected,
          DEFAULT_INTENT,
          ORIGINAL_FLIGHT.departure,
          ORIGINAL_FLIGHT.destination
        );
        if (!reevaluated.valid) {
          console.log(
            `tool result        ${selected.flightNo} invalid after provider verification: ${reevaluated.reasons.join("; ")}`
          );
          rejectedOfferIds.add(selected.id);
          selected = null;
          policyCheck = null;
          state.contractEvaluated = false;
          state.selectedFlightNo = null;
          state.approvalRequired = false;
          state.offerVerified = false;
          break;
        }

        policyCheck = runPolicyCheck(selected, DEFAULT_INTENT);
        state.selectedFlightNo = selected.flightNo;
        state.offerVerified = true;
        state.approvalRequired =
          !policyCheck.withinAuthority || !DEFAULT_INTENT.autopilot;
        console.log(
          `tool result        ${verification.summary} · baggage ${selected.baggageKg ?? "?"}kg confirmed · recovery +$${selected.extraCostUsd.toFixed(2)} · ${policyCheck.summary}`
        );
        break;
      }

      case "explain_decision": {
        const explanation = buildDeterministicDecisionExplanation({
          status: selected ? "RECOVERED" : "FAILED",
          intent: DEFAULT_INTENT,
          event: SCHEDULE_CHANGE_EVENT,
          evaluations,
          selected,
          policyCheck,
          steps: [],
          verification: verification ?? undefined,
        });
        state.explanationReady = true;
        console.log(`tool result        ${explanation.headline}`);
        break;
      }

      case "finish": {
        console.log(
          selected
            ? `tool result        finished with ${selected.flightNo}; Atlas verified=${state.offerVerified}; fallback=false`
            : "tool result        finished safely with no policy-valid recovery"
        );
        console.log(
          "\nPASS: Qwen orchestrated only allow-listed tools over Atlas Live; deterministic policy retained authority."
        );
        return;
      }
    }

    console.log();
  }

  throw new Error(`Agent loop exceeded ${MAX_TURNS} turns`);
}

main().catch((error) => {
  console.error("\nFAIL: Atlas Live bounded agent loop");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
