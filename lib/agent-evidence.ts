import { createAgentAuditEvidence, type AgentAuditEvidence } from "./agent-audit";
import type { JudgePreflightReport } from "./judge-preflight";
import type { QwenHealthReport } from "./qwen-health";
import type { RuntimeMode } from "./runtime-mode";
import type { RecoveryOutcome } from "./types";

export interface JudgeEvidenceBundle {
  version: 1;
  generatedAt: string;
  runtimeMode: RuntimeMode;
  outcome: RecoveryOutcome;
  audit: AgentAuditEvidence;
  qwen: Pick<QwenHealthReport, "runtime" | "model" | "modelReady" | "connected" | "endpointHost">;
  preflight: JudgePreflightReport;
  summary: {
    status: RecoveryOutcome["status"];
    approval: RecoveryOutcome["approval"] | null;
    selectedFlightNo: string | null;
    rejectedCandidates: number;
    providerRetries: number;
    selfRepairEvents: number;
    humanBoundary: boolean;
  };
}

function countSteps(outcome: RecoveryOutcome, pattern: RegExp): number {
  return outcome.steps.filter((step) => pattern.test(`${step.title} ${step.detail}`)).length;
}

export async function createJudgeEvidenceBundle(input: {
  outcome: RecoveryOutcome;
  runtimeMode: RuntimeMode;
  qwen: QwenHealthReport;
  preflight: JudgePreflightReport;
  generatedAt?: string;
}): Promise<JudgeEvidenceBundle> {
  const audit = await createAgentAuditEvidence(input.outcome);
  return {
    version: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    runtimeMode: input.runtimeMode,
    outcome: input.outcome,
    audit,
    qwen: {
      runtime: input.qwen.runtime,
      model: input.qwen.model,
      modelReady: input.qwen.modelReady,
      connected: input.qwen.connected,
      endpointHost: input.qwen.endpointHost,
    },
    preflight: input.preflight,
    summary: {
      status: input.outcome.status,
      approval: input.outcome.approval ?? null,
      selectedFlightNo: input.outcome.selected?.flightNo ?? null,
      rejectedCandidates: input.outcome.evaluations.filter((item) => !item.valid).length,
      providerRetries: countSteps(input.outcome, /retry \d+\/\d+/i),
      selfRepairEvents: countSteps(input.outcome, /trying the next|after baggage validation|provider verification failure/i),
      humanBoundary: input.outcome.status === "NEEDS_APPROVAL",
    },
  };
}

function md(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value).replaceAll("|", "\\|");
}

export function judgeEvidenceToMarkdown(bundle: JudgeEvidenceBundle): string {
  const { outcome } = bundle;
  const candidates = outcome.evaluations
    .map(
      (evaluation) =>
        `| ${md(evaluation.option.flightNo)} | ${evaluation.valid ? "PASS" : "REJECT"} | ${md(evaluation.option.extraCostUsd)} | ${md(evaluation.reasons.join("; "))} |`
    )
    .join("\n");
  const steps = outcome.steps
    .map((step, index) => `${index + 1}. **${step.title}** — ${step.detail}`)
    .join("\n");
  const preflight = bundle.preflight.checks
    .map((check) => `| ${check.label} | ${check.status} | ${check.required ? "yes" : "no"} | ${check.detail} |`)
    .join("\n");

  return `# TripIntent Judge Evidence Bundle\n\nGenerated: ${bundle.generatedAt}\nRuntime mode: **${bundle.runtimeMode.toUpperCase()}**\nDecision: **${outcome.status}**\nAudit: \`${bundle.audit.shortId}\` / SHA-256 \`${bundle.audit.decisionHash}\`\n\n## Outcome Contract\n\n- Latest arrival: ${md(outcome.intent?.latestArrival)}\n- Departure flexibility: +${md(outcome.intent?.departureFlexibilityHours)}h\n- Checked baggage minimum: ${md(outcome.intent?.minBaggageKg)}kg\n- Delegated extra spend: $${md(outcome.intent?.maxExtraSpendUsd)}\n- Autopilot: ${outcome.intent?.autopilot ? "on" : "off"}\n\n## Decision Summary\n\n- Selected flight: ${md(outcome.selected?.flightNo)}\n- Approval boundary: ${md(outcome.approval)}\n- Rejected candidates: ${bundle.summary.rejectedCandidates}\n- Provider retries: ${bundle.summary.providerRetries}\n- Self-repair events: ${bundle.summary.selfRepairEvents}\n- Human boundary reached: ${bundle.summary.humanBoundary ? "yes" : "no"}\n\n## Candidate Evidence\n\n| Flight | Contract | Extra cost USD | Rejection reason |\n| --- | --- | ---: | --- |\n${candidates || "| — | — | — | — |"}\n\n## Provider / Policy Evidence\n\n- Verification source: ${md(outcome.verification?.source)}\n- Verification state: ${md(outcome.verification?.priceChange)}\n- Current provider price: ${md(outcome.verification?.currentPrice)}\n- Policy within authority: ${md(outcome.policyCheck?.withinAuthority)}\n- Escalation scope: ${md(outcome.escalation?.selectedScope)}\n- Escalation stop reason: ${md(outcome.escalation?.stopReason)}\n\n## Runtime Evidence\n\n- Qwen runtime: ${md(bundle.qwen.runtime)}\n- Qwen model: ${md(bundle.qwen.model)}\n- Qwen connected: ${md(bundle.qwen.connected)}\n- Qwen model ready: ${md(bundle.qwen.modelReady)}\n- Qwen endpoint: ${md(bundle.qwen.endpointHost)}\n\n## Judge Preflight\n\nReadiness: **${bundle.preflight.readiness}**\n\n| Check | Status | Required | Detail |\n| --- | --- | --- | --- |\n${preflight}\n\n## Replay Trace\n\n${steps}\n`;
}
