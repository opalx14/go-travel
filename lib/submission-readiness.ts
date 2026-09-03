export interface SubmissionSnapshot {
  trackedFiles: string[];
  trackedFileSizes: Record<string, number>;
  requiredFiles: string[];
  requiredFilesPresent: string[];
  branch: string;
  aheadOfOrigin: number;
}

export interface SubmissionReadinessCheck {
  id: string;
  label: string;
  status: "PASS" | "WARN" | "FAIL";
  detail: string;
}

export interface SubmissionReadinessReport {
  status: "READY_LOCAL" | "NEEDS_ATTENTION";
  checks: SubmissionReadinessCheck[];
  passed: number;
  warnings: number;
  failed: number;
}

const FORBIDDEN_PATTERNS: RegExp[] = [
  /(^|\/)\.env\.local$/i,
  /(^|\/)\.env\.production$/i,
  /\.(safetensors|gguf|bin|pt|pth|ckpt)$/i,
  /(^|\/)(model|models|weights)(\/|$)/i,
];

const MAX_TRACKED_FILE_BYTES = 50 * 1024 * 1024;

export function buildSubmissionReadiness(
  snapshot: SubmissionSnapshot
): SubmissionReadinessReport {
  const forbidden = snapshot.trackedFiles.filter((file) =>
    FORBIDDEN_PATTERNS.some((pattern) => pattern.test(file))
  );
  const oversized = Object.entries(snapshot.trackedFileSizes)
    .filter(([, bytes]) => bytes > MAX_TRACKED_FILE_BYTES)
    .map(([file]) => file);
  const missingRequired = snapshot.requiredFiles.filter(
    (file) => !snapshot.requiredFilesPresent.includes(file)
  );

  const checks: SubmissionReadinessCheck[] = [
    {
      id: "tracked-secrets-models",
      label: "No tracked credentials or model weights",
      status: forbidden.length === 0 ? "PASS" : "FAIL",
      detail:
        forbidden.length === 0
          ? "No .env.local/.env.production or common model-weight artifacts are tracked."
          : `Forbidden tracked artifact(s): ${forbidden.join(", ")}`,
    },
    {
      id: "tracked-size",
      label: "No oversized tracked artifacts",
      status: oversized.length === 0 ? "PASS" : "FAIL",
      detail:
        oversized.length === 0
          ? "No tracked file exceeds the 50 MB submission guard."
          : `Oversized tracked artifact(s): ${oversized.join(", ")}`,
    },
    {
      id: "required-files",
      label: "Required submission files present",
      status: missingRequired.length === 0 ? "PASS" : "FAIL",
      detail:
        missingRequired.length === 0
          ? `${snapshot.requiredFiles.length}/${snapshot.requiredFiles.length} required files present.`
          : `Missing required file(s): ${missingRequired.join(", ")}`,
    },
    {
      id: "branch",
      label: "Submission branch",
      status: snapshot.branch === "main" ? "PASS" : "WARN",
      detail:
        snapshot.branch === "main"
          ? "Working on main submission branch."
          : `Current branch is ${snapshot.branch}; verify submission target before push/tag.`,
    },
    {
      id: "push-state",
      label: "Remote synchronization",
      status: snapshot.aheadOfOrigin === 0 ? "PASS" : "WARN",
      detail:
        snapshot.aheadOfOrigin === 0
          ? "Local branch matches origin."
          : `Local branch is ahead of origin by ${snapshot.aheadOfOrigin} commit(s); push remains an explicit user-controlled step.`,
    },
  ];

  const failed = checks.filter((check) => check.status === "FAIL").length;
  return {
    status: failed === 0 ? "READY_LOCAL" : "NEEDS_ATTENTION",
    checks,
    passed: checks.filter((check) => check.status === "PASS").length,
    warnings: checks.filter((check) => check.status === "WARN").length,
    failed,
  };
}
