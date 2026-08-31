import Link from "next/link";
import { Database } from "lucide-react";
import { OperationsDashboard } from "@/components/operations-dashboard";
import { listDeviceJourneys } from "@/lib/device-state-db";
import { buildOperationsReport } from "@/lib/operations-finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function OperationsPage() {
  const journeys = listDeviceJourneys().map((journey) => ({
    deviceId: journey.deviceId,
    createdAt: journey.createdAt,
    lastSeenAt: journey.lastSeenAt,
    updatedAt: journey.updatedAt,
    snapshot: journey.snapshot,
  }));
  const report = buildOperationsReport(journeys);
  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-2xl">
          <p className="label-caps text-primary">Travel operations</p>
          <h1 className="mt-2.5 text-3xl leading-[1.15] font-semibold tracking-[-0.025em]">
            Business &amp; client control center
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Connect every traveler promise and recovery decision to booking economics, revenue risk and operational evidence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/operations/storage"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition hover:text-foreground"
          >
            <Database className="size-3" /> SQLite storage
          </Link>
          <span className="label-caps rounded-full border border-border/80 bg-card px-2.5 py-1 text-muted-foreground">
            Single-tenant sandbox
          </span>
        </div>
      </div>

      <div className="mt-8">
        <OperationsDashboard report={report} />
      </div>
    </main>
  );
}
