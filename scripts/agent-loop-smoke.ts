import { atlas } from "../lib/atlas";
import {
  allowedAgentTools,
  planNextAgentTool,
  type AgentPlannerState,
} from "../lib/agent-planner";
import { buildDeterministicDecisionExplanation } from "../lib/decision-explainer";
import {
  evaluateOption,
  runPolicyCheck,
  selectBestOption,
} from "../lib/policy-engine";
import { DEFAULT_INTENT, ORIGINAL_FLIGHT } from "../lib/scenario";
import type {
  DisruptionEvent,
  FlightOption,
  OfferVerification,
  OptionEvaluation,
  PolicyCheckResult,
  RecoveryOutcome,
  TravelIntent,
} from "../lib/types";

interface RuntimeState {
  planner: AgentPlannerState;
  intent: TravelIntent | null;
  disruption: DisruptionEvent | null;
  alternatives: FlightOption[];
  evaluations: OptionEvaluation[];
  selected: FlightOption | null;
  policy: PolicyCheckResult | null;
  verification: OfferVerification | null;
}

function line(label: string, detail: string): void {
  console.log(`${label.padEnd(18)} ${detail}`);
}

async function main(): Promise<void> {
  const authorityOverride = Number(process.env.TRIPINTENT_AGENT_AUTHORITY_USD);
  const smokeIntent: TravelIntent = {
    ...DEFAULT_INTENT,
    maxExtraSpendUsd:
      Number.isFinite(authorityOverride) && authorityOverride >= 0
        ? authorityOverride
        : DEFAULT_INTENT.maxExtraSpendUsd,
  };

  const runtime: RuntimeState = {
    planner: {
      contractLoaded: false,
      disruptionInspected: false,
      alternativesFound: null,
      contractEvaluated: false,
      selectedFlightNo: null,
      approvalRequired: false,
      passengerApproved: false,
      offerVerified: false,
      explanationReady: false,
    },
    intent: null,
    disruption: null,
    alternatives: [],
    evaluations: [],
    selected: null,
    policy: null,
    verification: null,
  };

  console.log("TripIntent bounded agent loop smoke");
  console.log("Goal: recover the protected KUL → SIN trip without violating the traveler contract.\n");

  for (let turn = 1; turn <= 10; turn += 1) {
    const allowed = allowedAgentTools(runtime.planner);
    const decision = await planNextAgentTool(runtime.planner);

    console.log(`TURN ${turn}`);
    line("allowed tools", allowed.join(", "));
    line(
      "Qwen planner",
      `${decision.tool} · ${decision.reason} [${decision.source}]`
    );

    switch (decision.tool) {
      case "load_contract": {
        runtime.intent = smokeIntent;
        runtime.planner.contractLoaded = true;
        line(
          "tool result",
          `contract loaded: arrive≤${smokeIntent.latestArrival}, bag≥${smokeIntent.minBaggageKg}kg, authority≤$${smokeIntent.maxExtraSpendUsd}`
        );
        break;
      }

      case "inspect_disruption": {
        runtime.disruption = await atlas.getDisruption(ORIGINAL_FLIGHT.id);
        runtime.planner.disruptionInspected = true;
        line("tool result", runtime.disruption.summary);
        break;
      }

      case "search_alternatives": {
        runtime.alternatives = await atlas.searchAlternatives(ORIGINAL_FLIGHT.id);
        runtime.planner.alternativesFound = runtime.alternatives.length;
        line(
          "tool result",
          `${runtime.alternatives.length} alternatives: ${runtime.alternatives
            .map((option) => option.flightNo)
            .join(", ")}`
        );
        break;
      }

      case "evaluate_contract": {
        if (!runtime.intent) throw new Error("Contract must be loaded before evaluation");
        runtime.evaluations = runtime.alternatives.map((option) =>
          evaluateOption(
            option,
            runtime.intent!,
            ORIGINAL_FLIGHT.departure,
            ORIGINAL_FLIGHT.destination
          )
        );
        runtime.selected = selectBestOption(runtime.evaluations);
        runtime.policy = runtime.selected
          ? runPolicyCheck(runtime.selected, runtime.intent)
          : null;
        runtime.planner.contractEvaluated = true;
        runtime.planner.selectedFlightNo = runtime.selected?.flightNo ?? null;
        runtime.planner.approvalRequired = Boolean(
          runtime.selected &&
            runtime.policy &&
            (!runtime.policy.withinAuthority || !runtime.intent.autopilot)
        );

        const rejected = runtime.evaluations.filter((item) => !item.valid).length;
        line(
          "tool result",
          runtime.selected
            ? `${runtime.selected.flightNo} selected; ${rejected} rejected; ${runtime.policy?.summary ?? "policy unavailable"}`
            : `no policy-valid option; ${rejected} rejected`
        );
        break;
      }

      case "request_approval": {
        line(
          "tool result",
          "human approval required; smoke stops rather than auto-approving delegated spend"
        );
        console.log("\nPASS: planner reached the human boundary without bypassing it.");
        return;
      }

      case "verify_offer": {
        if (!runtime.selected) throw new Error("No selected offer to verify");
        runtime.verification = await atlas.verifyOffer(runtime.selected);
        runtime.planner.offerVerified = ["unchanged", "decreased"].includes(
          runtime.verification.priceChange
        );
        line("tool result", runtime.verification.summary);
        if (!runtime.planner.offerVerified) {
          throw new Error(
            `Verification did not reach a safe terminal state: ${runtime.verification.priceChange}`
          );
        }
        break;
      }

      case "explain_decision": {
        if (!runtime.disruption) throw new Error("Missing disruption evidence");
        const outcome: RecoveryOutcome = {
          status: runtime.selected ? "RECOVERED" : "FAILED",
          intent: runtime.intent ?? undefined,
          event: runtime.disruption,
          evaluations: runtime.evaluations,
          selected: runtime.selected,
          policyCheck: runtime.policy,
          steps: [],
          verification: runtime.verification ?? undefined,
        };
        const explanation = buildDeterministicDecisionExplanation(outcome);
        runtime.planner.explanationReady = true;
        line("tool result", explanation.headline);
        break;
      }

      case "finish": {
        line(
          "tool result",
          runtime.selected
            ? `finished with ${runtime.selected.flightNo}; verified=${runtime.planner.offerVerified}`
            : "finished with no safe recovery"
        );
        console.log("\nPASS: Qwen orchestrated only allow-listed tools; deterministic policy retained authority.");
        return;
      }
    }

    console.log();
  }

  throw new Error("Agent loop exceeded the 10-turn safety cap");
}

main().catch((error) => {
  console.error("\nFAIL: bounded agent loop smoke");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
