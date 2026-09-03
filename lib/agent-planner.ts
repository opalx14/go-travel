import { localQwenConfig } from "./qwen-runtime";
import {
  filterPlannerSelectableTools,
  type AgentToolName,
} from "./agent-tool-manifest";

export type { AgentToolName } from "./agent-tool-manifest";

function allow(...tools: AgentToolName[]): AgentToolName[] {
  return filterPlannerSelectableTools(tools);
}

export interface AgentPlannerState {
  contractLoaded: boolean;
  disruptionInspected: boolean;
  alternativesFound: number | null;
  contractEvaluated: boolean;
  selectedFlightNo: string | null;
  approvalRequired: boolean;
  passengerApproved: boolean;
  offerVerified: boolean;
  explanationReady: boolean;
}

export interface AgentPlanDecision {
  source: "QWEN" | "DETERMINISTIC_FALLBACK";
  tool: AgentToolName;
  reason: string;
  model?: string;
}

const PLANNER_SYSTEM = `You are the bounded TripIntent orchestration planner.
Choose exactly ONE next tool from the allowedTools array.
You may decide sequencing, but you may never invent tools, fares, flights, approvals, or policy results.
The deterministic runtime owns policy, spending authority, fare verification, and passenger approval.
Return strict JSON only: {"tool":"<allowed tool>","reason":"<short reason>"}.`;

export function allowedAgentTools(state: AgentPlannerState): AgentToolName[] {
  if (!state.contractLoaded && !state.disruptionInspected) {
    return allow("load_contract", "inspect_disruption");
  }

  if (!state.contractLoaded) return allow("load_contract");
  if (!state.disruptionInspected) return allow("inspect_disruption");

  if (state.alternativesFound === null) return allow("search_alternatives");

  if (!state.contractEvaluated) return allow("evaluate_contract");

  if (!state.selectedFlightNo) {
    return state.explanationReady ? allow("finish") : allow("explain_decision");
  }

  if (state.approvalRequired && !state.passengerApproved) {
    return allow("request_approval");
  }

  if (!state.offerVerified) return allow("verify_offer");
  if (!state.explanationReady) return allow("explain_decision");
  return allow("finish");
}

export function deterministicPlannerFallback(
  state: AgentPlannerState
): AgentPlanDecision {
  const [tool] = allowedAgentTools(state);
  return {
    source: "DETERMINISTIC_FALLBACK",
    tool,
    reason: `Fallback selected the next allowed tool: ${tool}`,
  };
}

function parsePlannerDecision(
  content: string,
  allowedTools: AgentToolName[],
  model: string
): AgentPlanDecision | null {
  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    const parsed = JSON.parse(normalized) as {
      tool?: unknown;
      reason?: unknown;
    };
    const tool = parsed.tool;
    if (typeof tool !== "string" || !allowedTools.includes(tool as AgentToolName)) {
      return null;
    }

    return {
      source: "QWEN",
      model,
      tool: tool as AgentToolName,
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? parsed.reason.trim().slice(0, 240)
          : `Qwen selected ${tool}`,
    };
  } catch {
    return null;
  }
}

export async function planNextAgentTool(
  state: AgentPlannerState,
  fetchImpl: typeof fetch = fetch
): Promise<AgentPlanDecision> {
  const allowedTools = allowedAgentTools(state);
  const fallback = deterministicPlannerFallback(state);
  const config = localQwenConfig();
  if (!config) return fallback;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: PLANNER_SYSTEM },
          {
            role: "user",
            content: JSON.stringify({ state, allowedTools }),
          },
        ],
        temperature: 0,
        max_tokens: 96,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: controller.signal,
    });

    if (!response.ok) return fallback;

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return fallback;

    return parsePlannerDecision(content, allowedTools, config.model) ?? fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
