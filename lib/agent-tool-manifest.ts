export const AGENT_TOOL_NAMES = [
  "load_contract",
  "inspect_disruption",
  "search_alternatives",
  "evaluate_contract",
  "request_approval",
  "verify_offer",
  "explain_decision",
  "finish",
] as const;

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];
export type AgentToolEffect = "READ" | "COMPUTE" | "HUMAN_BOUNDARY" | "TERMINAL";
export type AgentToolExecutor = "RUNTIME" | "ATLAS" | "QWEN" | "HUMAN";
export type AgentToolRetryPolicy = "NONE" | "BOUNDED_READ_ONLY";

export interface AgentToolCapability {
  name: AgentToolName;
  effect: AgentToolEffect;
  executor: AgentToolExecutor;
  qwenMaySelect: boolean;
  autoExecutable: boolean;
  retryPolicy: AgentToolRetryPolicy;
  description: string;
}

export const AGENT_TOOL_MANIFEST: Record<AgentToolName, AgentToolCapability> = {
  load_contract: {
    name: "load_contract",
    effect: "READ",
    executor: "RUNTIME",
    qwenMaySelect: true,
    autoExecutable: true,
    retryPolicy: "NONE",
    description: "Load the immutable traveler outcome contract.",
  },
  inspect_disruption: {
    name: "inspect_disruption",
    effect: "READ",
    executor: "RUNTIME",
    qwenMaySelect: true,
    autoExecutable: true,
    retryPolicy: "NONE",
    description: "Inspect the protected-trip disruption signal.",
  },
  search_alternatives: {
    name: "search_alternatives",
    effect: "READ",
    executor: "ATLAS",
    qwenMaySelect: true,
    autoExecutable: true,
    retryPolicy: "BOUNDED_READ_ONLY",
    description: "Search Atlas replacement inventory without creating an order.",
  },
  evaluate_contract: {
    name: "evaluate_contract",
    effect: "COMPUTE",
    executor: "RUNTIME",
    qwenMaySelect: true,
    autoExecutable: true,
    retryPolicy: "NONE",
    description: "Run deterministic deadline, baggage and authority checks.",
  },
  request_approval: {
    name: "request_approval",
    effect: "HUMAN_BOUNDARY",
    executor: "HUMAN",
    qwenMaySelect: true,
    autoExecutable: false,
    retryPolicy: "NONE",
    description: "Stop execution and request explicit passenger approval.",
  },
  verify_offer: {
    name: "verify_offer",
    effect: "READ",
    executor: "ATLAS",
    qwenMaySelect: true,
    autoExecutable: true,
    retryPolicy: "BOUNDED_READ_ONLY",
    description: "Re-check fare and baggage evidence without confirming a price increase.",
  },
  explain_decision: {
    name: "explain_decision",
    effect: "READ",
    executor: "QWEN",
    qwenMaySelect: true,
    autoExecutable: true,
    retryPolicy: "NONE",
    description: "Explain an already-computed decision without mutating it.",
  },
  finish: {
    name: "finish",
    effect: "TERMINAL",
    executor: "RUNTIME",
    qwenMaySelect: true,
    autoExecutable: true,
    retryPolicy: "NONE",
    description: "Close the orchestration loop with no further side effects.",
  },
};

export function filterPlannerSelectableTools(tools: AgentToolName[]): AgentToolName[] {
  return tools.filter((tool) => AGENT_TOOL_MANIFEST[tool].qwenMaySelect);
}

export function validateAgentToolManifest(): string[] {
  const violations: string[] = [];
  for (const tool of AGENT_TOOL_NAMES) {
    const capability = AGENT_TOOL_MANIFEST[tool];
    if (capability.effect === "HUMAN_BOUNDARY" && capability.autoExecutable) {
      violations.push(`${tool}: human boundary cannot auto-execute`);
    }
    if (
      capability.retryPolicy === "BOUNDED_READ_ONLY" &&
      capability.effect !== "READ"
    ) {
      violations.push(`${tool}: retry policy requires a read-only effect`);
    }
    if (capability.executor === "ATLAS" && capability.effect !== "READ") {
      violations.push(`${tool}: Atlas planner capability must remain read-only`);
    }
  }
  return violations;
}
