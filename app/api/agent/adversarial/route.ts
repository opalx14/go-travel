import { runAgentAdversarialEvals } from "@/lib/agent-adversarial";

/** GET /api/agent/adversarial — deterministic red-team matrix, no live calls required. */
export async function GET() {
  const report = await runAgentAdversarialEvals();
  return Response.json({ ok: report.gateStatus === "PASS", ...report });
}
