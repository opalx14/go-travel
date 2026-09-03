import { statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { buildSubmissionReadiness } from "../lib/submission-readiness";

const REQUIRED_FILES = [
  "README.md",
  "lib/recovery-engine.ts",
  "lib/agent-adversarial.ts",
  "lib/agent-evidence.ts",
  "lib/judge-fast-path.ts",
  "app/api/agent/preflight/route.ts",
  "app/api/agent/evidence/route.ts",
];

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const trackedFiles = git("ls-files")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);
const trackedFileSizes = Object.fromEntries(
  trackedFiles.map((file) => {
    try {
      return [file, statSync(file).size];
    } catch {
      return [file, 0];
    }
  })
);
const branch = git("branch", "--show-current") || "DETACHED";
let aheadOfOrigin = 0;
try {
  const value = git("rev-list", "--count", "@{u}..HEAD");
  aheadOfOrigin = Number.parseInt(value, 10) || 0;
} catch {
  aheadOfOrigin = 0;
}

const report = buildSubmissionReadiness({
  trackedFiles,
  trackedFileSizes,
  requiredFiles: REQUIRED_FILES,
  requiredFilesPresent: REQUIRED_FILES.filter((file) => trackedFiles.includes(file)),
  branch,
  aheadOfOrigin,
});

console.log(`Submission readiness: ${report.status}`);
for (const check of report.checks) {
  console.log(`${check.status.padEnd(4)} ${check.label}: ${check.detail}`);
}

if (report.failed > 0) process.exitCode = 1;
