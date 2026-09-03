import { describe, expect, test } from "bun:test";
import { createJudgeEvidenceBundle, judgeEvidenceToMarkdown } from "./agent-evidence";
import { runRecovery } from "./recovery-engine";
import { atlas } from "./atlas";
import { DEFAULT_INTENT, ORIGINAL_FLIGHT } from "./scenario";
import type { JudgePreflightReport } from "./judge-preflight";
import type { QwenHealthReport } from "./qwen-health";

const qwen: QwenHealthReport = {
  ok: true,
  configured: true,
  connected: true,
  modelReady: true,
  runtime: "self-hosted-qwen",
  provider: "Self-hosted Qwen",
  model: "mlx-community/Qwen3.5-9B-MLX-4bit",
  endpointHost: "127.0.0.1:8080",
  latencyMs: 12,
  checkedAt: "2026-09-03T00:00:00.000Z",
};

const preflight: JudgePreflightReport = {
  mode: "demo",
  readiness: "READY",
  passed: 1,
  warnings: 0,
  failed: 0,
  checks: [
    {
      id: "test",
      label: "Test gate",
      status: "PASS",
      required: true,
      detail: "Evidence gate passed",
    },
  ],
};

describe("judge evidence export", () => {
  test("creates deterministic audit-backed JSON evidence from a recovery run", async () => {
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, atlas);
    const bundle = await createJudgeEvidenceBundle({
      outcome,
      runtimeMode: "demo",
      qwen,
      preflight,
      generatedAt: "2026-09-03T00:00:00.000Z",
    });

    expect(bundle.version).toBe(1);
    expect(bundle.audit.algorithm).toBe("SHA-256");
    expect(bundle.audit.decisionHash).toHaveLength(64);
    expect(bundle.summary.status).toBe(outcome.status);
    expect(bundle.summary.selectedFlightNo).toBe(outcome.selected?.flightNo ?? null);
    expect(bundle.preflight.readiness).toBe("READY");
  });

  test("renders judge-readable Markdown with contract, candidates, runtime, preflight and replay trace", async () => {
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, atlas);
    const bundle = await createJudgeEvidenceBundle({
      outcome,
      runtimeMode: "demo",
      qwen,
      preflight,
      generatedAt: "2026-09-03T00:00:00.000Z",
    });
    const markdown = judgeEvidenceToMarkdown(bundle);

    expect(markdown).toContain("# TripIntent Judge Evidence Bundle");
    expect(markdown).toContain("## Outcome Contract");
    expect(markdown).toContain("## Candidate Evidence");
    expect(markdown).toContain("## Runtime Evidence");
    expect(markdown).toContain("## Judge Preflight");
    expect(markdown).toContain("## Replay Trace");
    expect(markdown).toContain(bundle.audit.shortId);
  });
});
