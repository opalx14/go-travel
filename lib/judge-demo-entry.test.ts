import { describe, expect, test } from "bun:test";
import {
  JUDGE_DEMO_DURATION_SECONDS,
  JUDGE_DEMO_STAGES,
  judgeDemoSequence,
} from "./judge-demo-entry";

describe("judge demo entry", () => {
  test("keeps the judge flow fixed at three minutes", () => {
    expect(JUDGE_DEMO_DURATION_SECONDS).toBe(180);
  });

  test("shows Qwen, Atlas and deterministic policy as separate responsibilities", () => {
    expect(JUDGE_DEMO_STAGES.map((stage) => stage.id)).toEqual([
      "QWEN",
      "ATLAS",
      "POLICY",
    ]);
    expect(JUDGE_DEMO_STAGES[2].proof).toContain("human boundary");
  });

  test("keeps the proof story ordered from contract to human boundary", () => {
    expect(judgeDemoSequence()).toEqual([
      "Outcome contract",
      "Simulated disruption",
      "Qwen orchestration",
      "Atlas evidence",
      "Deterministic policy",
      "Human boundary",
    ]);
  });
});
