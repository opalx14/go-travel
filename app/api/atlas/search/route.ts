import { atlasFlightTool } from "@/lib/atlas/adapter";
import { ALTERNATIVES, ATLAS_SEARCH } from "@/lib/scenario";

/**
 * POST /api/atlas/search
 *
 * Drives the Atlas CLI server-side (search params are fixed by the demo
 * scenario; only the departure date is resolved per request). Every failure
 * — timeout, CLI error, service/auth codes — falls back to the simulated
 * candidates. Raw errors and stderr never reach the client.
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

export async function POST() {
  try {
    const result = await atlasFlightTool.searchFlights({
      origin: ATLAS_SEARCH.origin,
      destination: ATLAS_SEARCH.destination,
      depart: resolveDepartDate(),
      adults: ATLAS_SEARCH.adults,
    });

    // SEARCH_NO_RESULTS is an empty success — no fallback for it.
    return Response.json({
      ok: true,
      candidates: result.candidates,
      searchId: result.searchId,
      offerCount: result.offerCount,
      returnedCount: result.returnedCount,
      fallback: false,
    });
  } catch {
    // Internal classification happens inside the adapter (typed codes);
    // nothing raw — no message, no stderr — ever reaches the client.
    return Response.json({
      ok: true,
      fallback: true,
      candidates: ALTERNATIVES,
    });
  }
}
