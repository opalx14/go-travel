import { runAgentBenchmark } from "@/lib/agent-benchmark";

/** Deterministic end-to-end scenario benchmark for judge/CI evidence. */
export async function GET() {
  const report = await runAgentBenchmark();
  return Response.json({ ok: report.failed === 0, ...report });
}
