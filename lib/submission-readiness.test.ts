import { describe, expect, test } from "bun:test";
import { buildSubmissionReadiness } from "./submission-readiness";

const BASE = {
  trackedFiles: ["README.md", "lib/recovery-engine.ts"],
  trackedFileSizes: { "README.md": 1024, "lib/recovery-engine.ts": 4096 },
  requiredFiles: ["README.md", "lib/recovery-engine.ts"],
  requiredFilesPresent: ["README.md", "lib/recovery-engine.ts"],
  branch: "main",
  aheadOfOrigin: 0,
};

describe("submission readiness", () => {
  test("passes a clean local submission snapshot", () => {
    const report = buildSubmissionReadiness(BASE);
    expect(report.status).toBe("READY_LOCAL");
    expect(report.failed).toBe(0);
  });

  test("fails when credentials, model weights, oversized artifacts or required files are unsafe", () => {
    const report = buildSubmissionReadiness({
      ...BASE,
      trackedFiles: ["README.md", ".env.local", "weights/qwen.safetensors"],
      trackedFileSizes: {
        "README.md": 1024,
        ".env.local": 100,
        "weights/qwen.safetensors": 60 * 1024 * 1024,
      },
      requiredFilesPresent: ["README.md"],
    });
    expect(report.status).toBe("NEEDS_ATTENTION");
    expect(report.failed).toBe(3);
  });

  test("warns instead of failing when local commits are intentionally not pushed yet", () => {
    const report = buildSubmissionReadiness({ ...BASE, aheadOfOrigin: 15 });
    expect(report.status).toBe("READY_LOCAL");
    expect(report.warnings).toBe(1);
    expect(report.checks.find((check) => check.id === "push-state")?.status).toBe("WARN");
  });
});
