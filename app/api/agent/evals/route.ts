import {
  FAILURE_LAB_CASE_IDS,
  runAgentEvals,
  runAgentFailureCase,
  type FailureLabCaseId,
} from "@/lib/agent-evals";

/**
 * GET /api/agent/evals
 *
 * Runs the deterministic TripIntent agent safety/resilience eval matrix.
 * It intentionally avoids live provider calls so judges and CI can reproduce
 * the same gates without network access or model availability.
 */
export async function GET(request: Request) {
  const caseId = new URL(request.url).searchParams.get("case");
  if (caseId) {
    if (!FAILURE_LAB_CASE_IDS.includes(caseId as FailureLabCaseId)) {
      return Response.json({ ok: false, error: "UNKNOWN_EVAL_CASE" }, { status: 400 });
    }
    const failureCase = await runAgentFailureCase(caseId as FailureLabCaseId);
    return Response.json({ ok: Boolean(failureCase?.passed), case: failureCase });
  }

  const report = await runAgentEvals();
  return Response.json({ ok: report.gateStatus === "PASS", ...report });
}
