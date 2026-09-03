import { describe, expect, test } from "bun:test";
import { buildJudgePreflight } from "./judge-preflight";

const evals = {
  passed: 16,
  failed: 0,
  total: 16,
  gateStatus: "PASS" as const,
  results: [],
};
const benchmark = {
  passed: 7,
  failed: 0,
  total: 7,
  passRate: 100,
  cases: [],
};
const qwenReady = {
  ok: true as const,
  configured: true,
  connected: true,
  modelReady: true,
  runtime: "self-hosted-qwen" as const,
  provider: "Self-hosted Qwen" as const,
  model: "mlx-community/Qwen3.5-9B-MLX-4bit",
  endpointHost: "127.0.0.1:8080",
  latencyMs: 2,
  checkedAt: "2026-09-03T00:00:00.000Z",
};
const atlasReady = {
  available: true,
  status: "AVAILABLE" as const,
  commandLabel: "atlas-flight" as const,
  source: "resolved-path" as const,
};

describe("judge preflight", () => {
  test("marks Live READY only when connected prerequisites pass", () => {
    const report = buildJudgePreflight({
      mode: "live",
      evals,
      benchmark,
      manifestViolations: [],
      qwen: qwenReady,
      atlas: atlasReady,
    });
    expect(report.readiness).toBe("READY");
    expect(report.failed).toBe(0);
  });

  test("allows Demo with explicit fallback warnings", () => {
    const report = buildJudgePreflight({
      mode: "demo",
      evals,
      benchmark,
      manifestViolations: [],
      qwen: { ...qwenReady, connected: false, modelReady: false, runtime: "deterministic-fallback" },
      atlas: { ...atlasReady, available: false, status: "MISSING" },
    });
    expect(report.readiness).toBe("READY_WITH_FALLBACK");
    expect(report.warnings).toBe(2);
    expect(report.failed).toBe(0);
  });

  test("blocks Live when Qwen or Atlas is unavailable", () => {
    const report = buildJudgePreflight({
      mode: "live",
      evals,
      benchmark,
      manifestViolations: [],
      qwen: { ...qwenReady, connected: false, modelReady: false, runtime: "deterministic-fallback" },
      atlas: { ...atlasReady, available: false, status: "MISSING" },
    });
    expect(report.readiness).toBe("BLOCKED");
    expect(report.failed).toBe(2);
  });

  test("blocks both modes when deterministic safety evidence fails", () => {
    const report = buildJudgePreflight({
      mode: "demo",
      evals: { ...evals, passed: 15, failed: 1, gateStatus: "FAIL" },
      benchmark,
      manifestViolations: [],
      qwen: qwenReady,
      atlas: atlasReady,
    });
    expect(report.readiness).toBe("BLOCKED");
  });
});
