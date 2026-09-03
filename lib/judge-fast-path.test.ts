import { describe, expect, test } from "bun:test";
import { JUDGE_FAST_PATH, validateJudgeFastPath } from "./judge-fast-path";

describe("judge 3-minute fast path", () => {
  test("is contiguous and exactly 180 seconds", () => {
    expect(validateJudgeFastPath()).toEqual([]);
    expect(JUDGE_FAST_PATH[0].startSecond).toBe(0);
    expect(JUDGE_FAST_PATH.at(-1)?.endSecond).toBe(180);
  });

  test("keeps the required judging story in order", () => {
    expect(JUDGE_FAST_PATH.map((segment) => segment.id)).toEqual([
      "problem-contract",
      "disruption",
      "orchestration",
      "reject-trap",
      "repair",
      "human-boundary",
      "proof-matrix",
      "business-outcome",
    ]);
  });
});
