import { atlasFlightTool, AtlasToolError } from "@/lib/atlas/adapter";

interface ConfirmPriceBody {
  bookingId?: unknown;
  baggageSupported?: unknown;
}

export async function POST(request: Request) {
  let body: ConfirmPriceBody;
  try {
    body = (await request.json()) as ConfirmPriceBody;
  } catch {
    return Response.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const bookingId =
    typeof body.bookingId === "string" && body.bookingId.trim().length > 0
      ? body.bookingId
      : null;
  if (!bookingId) {
    return Response.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  try {
    const confirmed = await atlasFlightTool.confirmPrice(bookingId);
    if (body.baggageSupported !== true) {
      return Response.json({ ok: true, verification: confirmed });
    }

    try {
      const baggageOptions = await atlasFlightTool.listBaggage(bookingId);
      return Response.json({
        ok: true,
        verification: {
          ...confirmed,
          baggageSupported: true,
          baggageStatus: baggageOptions.length > 0 ? "available" : "unavailable",
          baggageOptions,
        },
      });
    } catch {
      return Response.json({
        ok: true,
        verification: {
          ...confirmed,
          baggageSupported: true,
          baggageStatus: "unknown",
        },
      });
    }
  } catch (error) {
    const code =
      error instanceof AtlasToolError ? error.code : "SERVICE_REQUEST_FAILED";
    return Response.json({ ok: false, error: code });
  }
}
