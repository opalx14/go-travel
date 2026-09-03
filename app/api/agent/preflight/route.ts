import { runAgentBenchmark } from "@/lib/agent-benchmark";
import { runAgentEvals } from "@/lib/agent-evals";
import { validateAgentToolManifest } from "@/lib/agent-tool-manifest";
import { probeAtlasCliReadiness } from "@/lib/atlas/readiness";
import { buildJudgePreflight } from "@/lib/judge-preflight";
import { probeLocalQwenHealth } from "@/lib/qwen-health";
import type { RuntimeMode } from "@/lib/runtime-mode";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode: RuntimeMode = url.searchParams.get("mode") === "live" ? "live" : "demo";
  const [evals, benchmark, qwen] = await Promise.all([
    runAgentEvals(),
    runAgentBenchmark(),
    probeLocalQwenHealth(),
  ]);
  const report = buildJudgePreflight({
    mode,
    evals,
    benchmark,
    manifestViolations: validateAgentToolManifest(),
    qwen,
    atlas: probeAtlasCliReadiness(),
  });
  return Response.json({ ok: report.readiness !== "BLOCKED", ...report }, {
    headers: { "Cache-Control": "no-store" },
  });
}
