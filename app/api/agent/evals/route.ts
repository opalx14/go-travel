import { runAgentEvals } from "@/lib/agent-evals";

/**
 * GET /api/agent/evals
 *
 * Runs the deterministic TripIntent agent safety/resilience eval matrix.
 * It intentionally avoids live provider calls so judges and CI can reproduce
 * the same gates without network access or model availability.
 */
export async function GET() {
  const report = await runAgentEvals();
  return Response.json({ ok: report.gateStatus === "PASS", ...report });
}
