import Link from "next/link";
import { ArrowLeft, Database, ShieldCheck } from "lucide-react";
import { AdminDashboard } from "@/components/admin-dashboard";
import { toAdminLiveSession } from "@/lib/admin-live";
import { listDeviceJourneys } from "@/lib/device-state-db";
import { buildOperationsReport } from "@/lib/operations-finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AdminPage() {
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

  return (
    <main className="ti-canvas min-h-screen flex-1 text-slate-100">
      <section className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-slate-800/80 pb-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-sky-300">
                <ShieldCheck className="size-4" />
              </span>
              <p className="label-caps text-sky-400">TripIntent Executive Control Plane</p>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl">
              Travel Operations P&amp;L &amp; AI Unit Economics
            </h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-400">
              Institutional control plane designed for travel CEOs, CTOs &amp; Hackathon Judges — connecting autonomous disruption recovery directly to booking revenue, real-world P&amp;L margins, DashScope Qwen token budgets, and the 40-point rubric.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-800 hover:text-white"
            >
              <ArrowLeft className="size-3.5 text-sky-400" /> Traveler Demo View
            </Link>
            <Link
              href="/operations/storage"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <Database className="size-3.5 text-sky-400" /> SQLite Storage
            </Link>
            <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2 font-mono text-xs font-bold text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> Atlas Sandbox Live
            </span>
          </div>
        </div>

        <div className="mt-6">
          <AdminDashboard report={report} initialSessions={sessions} />
        </div>
      </section>
    </main>
  );
}
