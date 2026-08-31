import { toAdminLiveSession, type AdminLivePayload } from "@/lib/admin-live";
import { listDeviceJourneys } from "@/lib/device-state-db";
import { buildOperationsReport } from "@/lib/operations-finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const rows = listDeviceJourneys();
  const journeys = rows.map((journey) => ({
    deviceId: journey.deviceId,
    createdAt: journey.createdAt,
    lastSeenAt: journey.lastSeenAt,
    updatedAt: journey.updatedAt,
    snapshot: journey.snapshot,
  }));
  const report = buildOperationsReport(journeys);
  const sessions = rows
    .map(toAdminLiveSession)
    .filter((session): session is NonNullable<typeof session> => session !== null);

  const payload: AdminLivePayload = {
    ok: true,
    generatedAt: new Date().toISOString(),
    report,
    sessions,
  };

  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
