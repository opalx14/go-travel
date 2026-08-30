import Link from "next/link";
import {
  ArrowLeft,
  Database,
  Laptop,
  Plane,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { listDeviceJourneys } from "@/lib/device-state-db";

export const dynamic = "force-dynamic";

function shortDeviceId(deviceId: string) {
  return deviceId.length <= 12 ? deviceId : `${deviceId.slice(0, 8)}…${deviceId.slice(-4)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

export default function StorageDebugPage() {
  const journeys = listDeviceJourneys();
  const protectedCount = journeys.filter((journey) => journey.isProtected).length;
  const disruptedCount = journeys.filter((journey) => journey.phase === "disrupted").length;
  const recoveredCount = journeys.filter(
    (journey) => journey.snapshot?.outcome?.status === "RECOVERED"
  ).length;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/operations"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to operations
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-primary shadow-sm">
              <Database className="size-5" />
            </span>
            <div>
              <p className="label-caps text-primary">Internal debug</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
                Device journey storage
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Live view of the local SQLite persistence used to restore each browser&apos;s TripIntent journey.
            Device identifiers are shortened in the UI.
          </p>
        </div>

        <a
          href="/operations/storage"
          className="inline-flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs font-semibold shadow-sm transition hover:bg-muted/60"
        >
          <RefreshCw className="size-3.5" /> Refresh database
        </a>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Saved devices" value={journeys.length} icon={Laptop} />
        <StatCard label="Protected trips" value={protectedCount} icon={ShieldCheck} />
        <StatCard label="Disrupted" value={disruptedCount} icon={TriangleAlert} />
        <StatCard label="Recovered" value={recoveredCount} icon={Plane} />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
          <div>
            <p className="text-sm font-semibold">SQLite rows</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              `.data/go-travel.sqlite` · `device_journey_state`
            </p>
          </div>
          <span className="rounded-full border bg-muted/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
            {journeys.length} row{journeys.length === 1 ? "" : "s"}
          </span>
        </div>

        {journeys.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Database className="mx-auto size-7 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">No saved journeys yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open the passenger page, protect a trip, then return here.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {journeys.map((journey) => {
              const outcome = journey.snapshot?.outcome?.status ?? "—";
              const intent = journey.snapshot?.intent;

              return (
                <article key={journey.deviceId} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-muted px-2 py-1 font-mono text-[10px] font-semibold text-muted-foreground">
                          {shortDeviceId(journey.deviceId)}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                            journey.isProtected
                              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          {journey.isProtected ? "Protected" : "Not protected"}
                        </span>
                        <span className="rounded-full border bg-background px-2.5 py-1 font-mono text-[10px] uppercase text-muted-foreground">
                          {journey.phase}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 className="font-mono text-lg font-bold tracking-tight">
                          {journey.origin} → {journey.destination}
                        </h2>
                        <span className="text-sm font-medium text-muted-foreground">
                          {journey.flightNo}
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-muted-foreground">
                      <p>Updated {formatDate(journey.updatedAt)}</p>
                      <p className="mt-1">Last seen {formatDate(journey.lastSeenAt)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Trip ID" value={journey.tripId} mono />
                    <Detail label="Recovery" value={outcome} mono />
                    <Detail
                      label="Arrival goal"
                      value={intent ? `Before ${intent.latestArrival}` : "—"}
                    />
                    <Detail
                      label="Autopilot"
                      value={intent ? `${intent.autopilot ? "On" : "Off"} · ≤ $${intent.maxExtraSpendUsd}` : "—"}
                    />
                  </div>

                  {journey.snapshot && (
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{journey.snapshot.exceptions.length} disruption event(s)</span>
                      <span>{journey.snapshot.playedSteps.length} agent step(s)</span>
                      <span>Saved {formatDate(journey.snapshot.savedAt)}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        This page is an internal demo/debug surface. SQLite stores journey state only; simulated airport positions are not Atlas telemetry.
      </p>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Database;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-3 font-mono text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border bg-background/60 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 truncate text-xs font-semibold ${mono ? "font-mono" : ""}`} title={value}>
        {value}
      </p>
    </div>
  );
}
