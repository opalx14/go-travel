import { describe, expect, test } from "bun:test";
import {
  AGENT_TOOL_MANIFEST,
  AGENT_TOOL_NAMES,
  validateAgentToolManifest,
} from "./agent-tool-manifest";

describe("agent tool permission manifest", () => {
  test("contains exactly the planner capabilities", () => {
    expect(Object.keys(AGENT_TOOL_MANIFEST).sort()).toEqual(
      [...AGENT_TOOL_NAMES].sort()
    );
  });

  test("keeps Atlas planner capabilities read-only and bounded", () => {
    const atlasTools = AGENT_TOOL_NAMES.map((name) => AGENT_TOOL_MANIFEST[name]).filter(
      (tool) => tool.executor === "ATLAS"
    );
    expect(atlasTools.length).toBeGreaterThan(0);
    expect(atlasTools.every((tool) => tool.effect === "READ")).toBe(true);
    expect(
      atlasTools.every((tool) => tool.retryPolicy === "BOUNDED_READ_ONLY")
    ).toBe(true);
  });

  test("never auto-executes the human boundary", () => {
    expect(AGENT_TOOL_MANIFEST.request_approval.autoExecutable).toBe(false);
    expect(AGENT_TOOL_MANIFEST.request_approval.executor).toBe("HUMAN");
    expect(validateAgentToolManifest()).toEqual([]);
  });
});
