import { describe, expect, test } from "bun:test";
import {
  buildExecutionActivity,
  stageOfRecoveryStep,
  stageOfStep,
} from "./presentation";
import type { RecoveryStep } from "./types";

function step(id: string, title: string, detail = "evidence"): RecoveryStep {
  return { id, title, detail, tone: "info" };
}

describe("presentation recovery stage mapping", () => {
  test("maps escalation and baggage self-repair into deterministic evaluation", () => {
    expect(stageOfStep("step-escalation-departure_flex")).toBe("EVALUATE");
    expect(stageOfStep("step-provider-reject-8")).toBe("EVALUATE");
    expect(stageOfStep("step-baggage-reject-10")).toBe("EVALUATE");
    expect(stageOfStep("step-baggage")).toBe("EVALUATE");
  });

  test("distinguishes Atlas search retry from Atlas verify retry by evidence title", () => {
    expect(
      stageOfRecoveryStep(step("step-retry-3", "Atlas search retry 2/2"))
    ).toBe("SEARCH");
    expect(
      stageOfRecoveryStep(step("step-retry-9", "Atlas verify retry 2/2"))
    ).toBe("VERIFY");
  });

  test("exposes the current authority owner without assigning policy to Qwen", () => {
    const atlas = buildExecutionActivity([
      step("step-detect", "Flight change detected"),
      step("step-intent", "Travel intent loaded"),
      step("step-retry-3", "Atlas verify retry 2/2", "transient provider failure"),
    ]);
    expect(atlas.stage).toBe("VERIFY");
    expect(atlas.owner).toBe("ATLAS");

    const policy = buildExecutionActivity([
      step("step-escalation-exact", "EXACT · EXHAUSTED", "scope evidence"),
    ]);
    expect(policy.stage).toBe("EVALUATE");
    expect(policy.owner).toBe("POLICY_GUARDIAN");

    const human = buildExecutionActivity([
      step("step-execute", "Approval required", "passenger approval required"),
    ]);
    expect(human.stage).toBe("EXECUTE");
    expect(human.owner).toBe("HUMAN_BOUNDARY");
  });
});
