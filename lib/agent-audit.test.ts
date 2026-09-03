import { describe, expect, test } from "bun:test";
import { atlas } from "./atlas";
import {
  createAgentAuditEvidence,
  verifyAgentAuditEvidence,
} from "./agent-audit";
import { runRecovery } from "./recovery-engine";
import { DEFAULT_INTENT, ORIGINAL_FLIGHT } from "./scenario";

describe("agent decision audit evidence", () => {
  test("is stable for the same decision facts", async () => {
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, atlas);
    const first = await createAgentAuditEvidence(outcome);
    const second = await createAgentAuditEvidence(structuredClone(outcome));
    expect(first.decisionHash).toBe(second.decisionHash);
    expect(first.shortId.startsWith("TI-")).toBe(true);
  });

  test("ignores read-only Qwen explanation wording", async () => {
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, atlas);
    const evidence = await createAgentAuditEvidence(outcome);
    const withReasoning = {
      ...outcome,
      reasoning: {
        source: "QWEN" as const,
        headline: "Different wording",
        selectedReason: "Different wording",
        rejectedReason: "Different wording",
        authorityReason: "Different wording",
        nextAction: "Different wording",
      },
    };
    expect(await verifyAgentAuditEvidence(withReasoning, evidence)).toBe(true);
  });

  test("detects a changed decision-critical fare", async () => {
    const outcome = await runRecovery(ORIGINAL_FLIGHT, DEFAULT_INTENT, atlas);
    const evidence = await createAgentAuditEvidence(outcome);
    const tampered = structuredClone(outcome);
    if (!tampered.selected) throw new Error("expected selected option");
    tampered.selected.extraCostUsd += 1;
    expect(await verifyAgentAuditEvidence(tampered, evidence)).toBe(false);
  });
});
