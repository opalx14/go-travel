import { describe, expect, test } from "bun:test";
import { runAgentAdversarialEvals } from "./agent-adversarial";

describe("agent adversarial eval matrix", () => {
  test("passes every planner/policy/privacy/tool-output red-team case", async () => {
    const report = await runAgentAdversarialEvals();
    expect(report.gateStatus).toBe("PASS");
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(report.total);
  });

  test("covers all required attack families", async () => {
    const report = await runAgentAdversarialEvals();
    expect(report.total).toBe(7);
    expect(report.results.map((item) => item.id)).toEqual([
      "approval-bypass",
      "invented-book-flight",
      "direct-confirm-price",
      "malformed-json",
      "hallucinated-fare",
      "pii-instruction-override",
      "conflicting-tool-output",
    ]);
  });
});
