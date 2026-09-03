import { runAgentBenchmark } from "@/lib/agent-benchmark";
import { runAgentEvals } from "@/lib/agent-evals";
import { validateAgentToolManifest } from "@/lib/agent-tool-manifest";
import { createJudgeEvidenceBundle, judgeEvidenceToMarkdown } from "@/lib/agent-evidence";
import { probeAtlasCliReadiness } from "@/lib/atlas/readiness";
import { buildJudgePreflight } from "@/lib/judge-preflight";
import { probeLocalQwenHealth } from "@/lib/qwen-health";
import { runtimeModeFromRequest } from "@/lib/runtime-mode";
import type { RecoveryOutcome } from "@/lib/types";

function isRecoveryOutcome(value: unknown): value is RecoveryOutcome {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RecoveryOutcome>;
  return (
    typeof candidate.status === "string" &&
    Boolean(candidate.event) &&
    Array.isArray(candidate.evaluations) &&
    Array.isArray(candidate.steps)
  );
}

/** POST /api/agent/evidence — export one supplied recovery run as JSON + Markdown evidence. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { outcome?: unknown } | null;
  if (!isRecoveryOutcome(body?.outcome)) {
    return Response.json({ ok: false, error: "INVALID_RECOVERY_OUTCOME" }, { status: 400 });
  }

  const mode = runtimeModeFromRequest(request);
  const [evals, benchmark, qwen] = await Promise.all([
    runAgentEvals(),
    runAgentBenchmark(),
    probeLocalQwenHealth(),
  ]);
  const preflight = buildJudgePreflight({
    mode,
    evals,
    benchmark,
    manifestViolations: validateAgentToolManifest(),
    qwen,
    atlas: probeAtlasCliReadiness(),
  });
  const bundle = await createJudgeEvidenceBundle({
    outcome: body.outcome,
    runtimeMode: mode,
    qwen,
    preflight,
  });

  return Response.json(
    {
      ok: true,
      bundle,
      markdown: judgeEvidenceToMarkdown(bundle),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
