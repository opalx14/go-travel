import { atlasFlightTool } from "@/lib/atlas/adapter";
import { ALTERNATIVES, ATLAS_SEARCH } from "@/lib/scenario";
import { runtimeModeFromRequest } from "@/lib/runtime-mode";

/**
 * POST /api/atlas/search
 *
 * Drives the Atlas CLI server-side (search params are fixed by the demo
 * scenario; only the departure date is resolved per request). Atlas results
 * are preferred, while transport/tool failures or a valid zero-inventory
 * response fall back to clearly-labelled simulated candidates so the demo
 * remains deterministic. Raw errors and stderr never reach the client.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** env override when valid, else a dynamic default of today + 10 days. */
function resolveDepartDate(): string {
  const fromEnv = process.env.ATLAS_SANDBOX_DEPART_DATE;
  if (fromEnv && DATE_PATTERN.test(fromEnv)) return fromEnv;

  const date = new Date();
  date.setDate(date.getDate() + 10);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(request: Request) {
  const runtimeMode = runtimeModeFromRequest(request);

  try {
    const result = await atlasFlightTool.searchFlights({
      origin: ATLAS_SEARCH.origin,
      destination: ATLAS_SEARCH.destination,
      depart: resolveDepartDate(),
      adults: ATLAS_SEARCH.adults,
    });

    if (result.candidates.length === 0) {
      if (runtimeMode === "live") {
        return Response.json({
          ok: true,
          candidates: [],
          searchId: result.searchId,
          offerCount: result.offerCount,
          returnedCount: result.returnedCount,
          fallback: false,
          runtimeMode,
        });
      }

      return Response.json({
        ok: true,
        candidates: ALTERNATIVES,
        searchId: result.searchId,
        offerCount: result.offerCount,
        returnedCount: result.returnedCount,
        fallback: true,
        fallbackReason: "ATLAS_NO_INVENTORY",
        runtimeMode,
      });
    }

    return Response.json({
      ok: true,
      candidates: result.candidates,
      searchId: result.searchId,
      offerCount: result.offerCount,
      returnedCount: result.returnedCount,
      fallback: false,
      runtimeMode,
    });
  } catch {
    // Internal classification happens inside the adapter (typed codes);
    // nothing raw — no message, no stderr — ever reaches the client.
    if (runtimeMode === "live") {
      return Response.json(
        {
          ok: false,
          fallback: false,
          candidates: [],
          error: "ATLAS_LIVE_UNAVAILABLE",
          runtimeMode,
        },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      fallback: true,
      candidates: ALTERNATIVES,
      runtimeMode,
    });
  }
}
