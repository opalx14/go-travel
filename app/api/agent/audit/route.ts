import {
  createAgentAuditEvidence,
  verifyAgentAuditEvidence,
} from "@/lib/agent-audit";
import type { RecoveryOutcome } from "@/lib/types";

interface AuditBody {
  outcome?: RecoveryOutcome;
}

export async function POST(request: Request) {
  let body: AuditBody;
  try {
    body = (await request.json()) as AuditBody;
  } catch {
    return Response.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  if (!body.outcome || !Array.isArray(body.outcome.steps) || !body.outcome.event) {
    return Response.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const evidence = await createAgentAuditEvidence(body.outcome);
  const verified = await verifyAgentAuditEvidence(body.outcome, evidence);
  return Response.json({ ok: verified, verified, evidence });
}
