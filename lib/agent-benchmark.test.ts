import { describe, expect, test } from "bun:test";
import { runAgentBenchmark } from "./agent-benchmark";

describe("agent scenario benchmark", () => {
  test("passes the full end-to-end recovery matrix", async () => {
    const report = await runAgentBenchmark();
    expect(report.total).toBe(7);
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(7);
    expect(report.passRate).toBe(100);
    expect(report.cases.every((item) => item.passed)).toBe(true);
  });

  test("covers autonomous, HITL, failure and resilience outcomes", async () => {
    const report = await runAgentBenchmark();
    expect(report.cases.some((item) => item.actualStatus === "RECOVERED")).toBe(true);
    expect(
      report.cases.some((item) => item.actualStatus === "NEEDS_APPROVAL")
    ).toBe(true);
    expect(report.cases.some((item) => item.actualStatus === "FAILED")).toBe(true);
    expect(
      report.cases.some((item) => item.actualApproval === "PRICE_INCREASED")
    ).toBe(true);
  });
});
