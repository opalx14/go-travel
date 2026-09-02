import { afterEach, describe, expect, test } from "bun:test";
import {
  allowedAgentTools,
  deterministicPlannerFallback,
  planNextAgentTool,
  type AgentPlannerState,
} from "./agent-planner";

const ORIGINAL_ENDPOINT = process.env.LOCAL_QWEN_CHAT_COMPLETIONS_URL;
const ORIGINAL_MODEL = process.env.LOCAL_QWEN_MODEL;

const baseState = (): AgentPlannerState => ({
  contractLoaded: false,
  disruptionInspected: false,
  alternativesFound: null,
  contractEvaluated: false,
  selectedFlightNo: null,
  approvalRequired: false,
  passengerApproved: false,
  offerVerified: false,
  explanationReady: false,
});

afterEach(() => {
  if (ORIGINAL_ENDPOINT === undefined) delete process.env.LOCAL_QWEN_CHAT_COMPLETIONS_URL;
  else process.env.LOCAL_QWEN_CHAT_COMPLETIONS_URL = ORIGINAL_ENDPOINT;

  if (ORIGINAL_MODEL === undefined) delete process.env.LOCAL_QWEN_MODEL;
  else process.env.LOCAL_QWEN_MODEL = ORIGINAL_MODEL;
});

describe("bounded agent planner", () => {
  test("offers two safe starting actions but never execution tools", () => {
    expect(allowedAgentTools(baseState())).toEqual([
      "load_contract",
      "inspect_disruption",
    ]);
  });

  test("forces approval before verification when policy requires it", () => {
    const state: AgentPlannerState = {
      ...baseState(),
      contractLoaded: true,
      disruptionInspected: true,
      alternativesFound: 3,
      contractEvaluated: true,
      selectedFlightNo: "CA 88",
      approvalRequired: true,
    };

    expect(allowedAgentTools(state)).toEqual(["request_approval"]);
  });

  test("falls back deterministically when no model endpoint is configured", async () => {
    delete process.env.LOCAL_QWEN_CHAT_COMPLETIONS_URL;
    const decision = await planNextAgentTool(baseState());

    expect(decision.source).toBe("DETERMINISTIC_FALLBACK");
    expect(decision.tool).toBe("load_contract");
  });

  test("rejects a Qwen tool choice outside the deterministic allow-list", async () => {
    process.env.LOCAL_QWEN_CHAT_COMPLETIONS_URL = "http://127.0.0.1:8080/v1/chat/completions";
    process.env.LOCAL_QWEN_MODEL = "mlx-community/Qwen3.5-9B-MLX-4bit";

    const fakeFetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '{"tool":"book_flight","reason":"Skip the guardrails"}',
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )) as typeof fetch;

    const decision = await planNextAgentTool(baseState(), fakeFetch);
    expect(decision.source).toBe("DETERMINISTIC_FALLBACK");
    expect(decision.tool).toBe("load_contract");
  });

  test("accepts a Qwen choice only when it is currently allowed", async () => {
    process.env.LOCAL_QWEN_CHAT_COMPLETIONS_URL = "http://127.0.0.1:8080/v1/chat/completions";
    process.env.LOCAL_QWEN_MODEL = "mlx-community/Qwen3.5-9B-MLX-4bit";

    const fakeFetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"tool":"inspect_disruption","reason":"Check the protected trip state first"}',
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )) as typeof fetch;

    const decision = await planNextAgentTool(baseState(), fakeFetch);
    expect(decision.source).toBe("QWEN");
    expect(decision.tool).toBe("inspect_disruption");
  });

  test("finishes cleanly after explaining that no valid option exists", () => {
    const state: AgentPlannerState = {
      contractLoaded: true,
      disruptionInspected: true,
      alternativesFound: 0,
      contractEvaluated: true,
      selectedFlightNo: null,
      approvalRequired: false,
      passengerApproved: false,
      offerVerified: false,
      explanationReady: true,
    };

    expect(allowedAgentTools(state)).toEqual(["finish"]);
  });

  test("deterministic fallback reaches finish after all guarded work is done", () => {
    const state: AgentPlannerState = {
      contractLoaded: true,
      disruptionInspected: true,
      alternativesFound: 3,
      contractEvaluated: true,
      selectedFlightNo: "CA 88",
      approvalRequired: false,
      passengerApproved: false,
      offerVerified: true,
      explanationReady: true,
    };

    expect(deterministicPlannerFallback(state).tool).toBe("finish");
  });
});
