import { describe, expect, test } from "bun:test";
import { runAgentEvals } from "./agent-evals";

describe("TripIntent agent eval suite", () => {
  test("passes every deterministic safety and resilience gate", async () => {
    const report = await runAgentEvals();

    expect(report.total).toBe(13);
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(13);
    expect(report.gateStatus).toBe("PASS");
    expect(report.results.every((item) => item.passed)).toBe(true);
  });

  test("covers contract, policy, tooling, privacy and resilience", async () => {
    const report = await runAgentEvals();
    const categories = new Set(report.results.map((item) => item.category));

    expect(categories).toEqual(
      new Set(["CONTRACT", "POLICY", "TOOLING", "PRIVACY", "RESILIENCE"])
    );
  });
});
