import type { RuntimeMode } from "./runtime-mode";
import type { AgentEvalReport } from "./agent-evals";
import type { AgentBenchmarkReport } from "./agent-benchmark";
import type { QwenHealthReport } from "./qwen-health";
import type { AtlasCliReadiness } from "./atlas/readiness";

export type PreflightCheckStatus = "PASS" | "WARN" | "FAIL";
export type JudgeReadiness = "READY" | "READY_WITH_FALLBACK" | "BLOCKED";

export interface JudgePreflightCheck {
  id: string;
  label: string;
  status: PreflightCheckStatus;
  required: boolean;
  detail: string;
}

export interface JudgePreflightReport {
  mode: RuntimeMode;
  readiness: JudgeReadiness;
  passed: number;
  warnings: number;
  failed: number;
  checks: JudgePreflightCheck[];
}

export function buildJudgePreflight(input: {
  mode: RuntimeMode;
  evals: AgentEvalReport;
  benchmark: AgentBenchmarkReport;
  manifestViolations: string[];
  qwen: QwenHealthReport;
  atlas: AtlasCliReadiness;
}): JudgePreflightReport {
  const live = input.mode === "live";
  const checks: JudgePreflightCheck[] = [
    {
      id: "agent-evals",
      label: "Agent safety evals",
      status: input.evals.failed === 0 ? "PASS" : "FAIL",
      required: true,
      detail: `${input.evals.passed}/${input.evals.total} deterministic gates passed`,
    },
    {
      id: "scenario-benchmark",
      label: "Scenario benchmark",
      status: input.benchmark.failed === 0 ? "PASS" : "FAIL",
      required: true,
      detail: `${input.benchmark.passed}/${input.benchmark.total} end-to-end scenarios passed`,
    },
    {
      id: "tool-manifest",
      label: "Tool permission manifest",
      status: input.manifestViolations.length === 0 ? "PASS" : "FAIL",
      required: true,
      detail:
        input.manifestViolations.length === 0
          ? "Atlas capabilities are read-only; approval remains human-only"
          : input.manifestViolations.join("; "),
    },
    {
      id: "qwen-runtime",
      label: "Qwen3.5-9B runtime",
      status: input.qwen.modelReady ? "PASS" : live ? "FAIL" : "WARN",
      required: live,
      detail: input.qwen.modelReady
        ? `${input.qwen.model ?? "Qwen"} ready on ${input.qwen.endpointHost ?? "local endpoint"}`
        : live
          ? "Live mode requires the configured Qwen model to be reachable"
          : "Demo can use deterministic fallback when local Qwen is unavailable",
    },
    {
      id: "atlas-cli",
      label: "Atlas CLI",
      status:
        input.atlas.available === true
          ? "PASS"
          : live
            ? "FAIL"
            : "WARN",
      required: live,
      detail:
        input.atlas.available === true
          ? "atlas-flight executable is available"
          : input.atlas.available === null
            ? live
              ? "Atlas executable is resolved only through PATH and is not preflight-verifiable"
              : "Atlas PATH lookup is unresolved; Demo may fall back safely"
            : live
              ? "Live mode requires the atlas-flight executable"
              : "Atlas executable missing; Demo may fall back safely",
    },
  ];

  const failedRequired = checks.some(
    (check) => check.required && check.status !== "PASS"
  );
  const optionalWarnings = checks.some(
    (check) => !check.required && check.status !== "PASS"
  );
  const readiness: JudgeReadiness = failedRequired
    ? "BLOCKED"
    : optionalWarnings
      ? "READY_WITH_FALLBACK"
      : "READY";

  return {
    mode: input.mode,
    readiness,
    passed: checks.filter((check) => check.status === "PASS").length,
    warnings: checks.filter((check) => check.status === "WARN").length,
    failed: checks.filter((check) => check.status === "FAIL").length,
    checks,
  };
}
