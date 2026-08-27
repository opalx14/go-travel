import { atlasFlightTool, AtlasToolError } from "@/lib/atlas/adapter";

/**
 * POST /api/atlas/verify — body: { offerId: string }
 *
 * The offer id is opaque: validated as a non-empty string and passed to the
 * CLI verbatim. Never calls confirm-price; a price increase is reported as
 * verification data, not acted upon.
 */

interface VerifyBody {
  offerId?: unknown;
}

export async function POST(request: Request) {
  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return Response.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const offerId =
    typeof body.offerId === "string" && body.offerId.trim().length > 0
      ? body.offerId
      : null;
  if (!offerId) {
    return Response.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  try {
    const verification = await atlasFlightTool.verifyOffer(offerId);
    return Response.json({ ok: true, verification });
  } catch (error) {
    const code =
      error instanceof AtlasToolError ? error.code : "SERVICE_REQUEST_FAILED";
    return Response.json({ ok: false, error: code });
  }
}
