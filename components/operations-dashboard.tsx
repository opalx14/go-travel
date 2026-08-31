"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Database,
  Gauge,
  Plane,
  ReceiptText,
  Scale,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";
import { AgentConsole } from "@/components/agent-console";
import { CaseCard } from "@/components/case-card";
import { DecisionTrace } from "@/components/decision-trace";
import { OpsSummary } from "@/components/ops-summary";
import type {
  BookingHealth,
  ClientBookingReport,
  OperationsReport,
} from "@/lib/operations-finance";
import { DEMO_SERVICE_MARGIN_RATE } from "@/lib/operations-finance";
import { cn } from "@/lib/utils";

type OperationsTab = "business" | "clients";

const HEALTH_STYLES: Record<
  BookingHealth,
  { dot: string; badge: string; icon: typeof CheckCircle2 }
> = {
  recovered: {
    dot: "bg-emerald-400",
    badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    icon: CheckCircle2,
  },
  approval: {
    dot: "bg-amber-400",
    badge: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    icon: Clock3,
  },
  disrupted: {
    dot: "bg-rose-400",
    badge: "border-rose-400/20 bg-rose-400/10 text-rose-300",
    icon: CircleAlert,
  },
  declined: {
    dot: "bg-slate-400",
    badge: "border-slate-400/20 bg-slate-400/10 text-slate-300",
    icon: XCircle,
  },
  failed: {
    dot: "bg-rose-400",
    badge: "border-rose-400/20 bg-rose-400/10 text-rose-300",
    icon: XCircle,
  },
  protected: {
    dot: "bg-sky-400",
    badge: "border-sky-400/20 bg-sky-400/10 text-sky-300",
    icon: ShieldCheck,
  },
  unprotected: {
    dot: "bg-slate-500",
    badge: "border-slate-500/20 bg-slate-500/10 text-slate-400",
    icon: CircleAlert,
  },
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof BarChart3;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className="ti-surface-subtle rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-caps text-slate-500">{label}</p>
          <p
            className={cn(
              "mt-2 font-mono text-2xl font-semibold tracking-[-0.04em] text-slate-100 sm:text-[1.7rem]",
              tone === "success" && "text-emerald-300",
              tone === "warning" && "text-amber-300"
            )}
          >
            {value}
          </p>
        </div>
        <span className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-2 text-slate-400">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{detail}</p>
    </div>
  );
}

function MetricLine({
  label,
  value,
  detail,
  strong = false,
  negative = false,
}: {
  label: string;
  value: string;
  detail?: string;
  strong?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-slate-800/80 py-3 last:border-b-0",
        strong && "mt-1 border-t border-slate-700 pt-4"
      )}
    >
      <div>
        <p className={cn("text-sm text-slate-300", strong && "font-semibold text-white")}>
          {label}
        </p>
        {detail && <p className="mt-0.5 text-[10px] text-slate-600">{detail}</p>}
      </div>
      <p
        className={cn(
          "font-mono text-sm font-semibold tabular-nums text-slate-200",
          negative && "text-slate-400",
          strong && "text-emerald-300"
        )}
      >
        {negative ? "−" : ""}
        {value}
      </p>
    </div>
  );
}

function BusinessPanel({ report }: { report: OperationsReport }) {
  const { summary } = report;
  const maxOutcome = Math.max(...report.outcomeMix.map((item) => item.count), 1);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Booking value"
          value={formatMoney(summary.grossBookingValueUsd)}
          detail="Modeled customer sales across persisted booking evidence."
          icon={WalletCards}
        />
        <KpiCard
          label="Revenue"
          value={formatMoney(summary.serviceRevenueUsd)}
          detail={`Demo service revenue at ${(DEMO_SERVICE_MARGIN_RATE * 100).toFixed(0)}% of base fare, min $6.`}
          icon={BadgeDollarSign}
          tone="success"
        />
        <KpiCard
          label="Supplier cost"
          value={formatMoney(summary.supplierCostUsd)}
          detail="Base fare plus recovery spend recognized on recovered cases."
          icon={ReceiptText}
        />
        <KpiCard
          label="Gross profit"
          value={formatMoney(summary.grossProfitUsd)}
          detail={`Portfolio gross margin ${formatPct(summary.marginPct)} in the demo economics model.`}
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          label="Revenue protected"
          value={formatMoney(summary.revenueProtectedUsd)}
          detail={`${summary.recoveredBookings} recovered booking${summary.recoveredBookings === 1 ? "" : "s"} retained after disruption.`}
          icon={ShieldCheck}
          tone="success"
        />
        <KpiCard
          label="Revenue at risk"
          value={formatMoney(summary.revenueAtRiskUsd)}
          detail={`${summary.attentionBookings} case${summary.attentionBookings === 1 ? "" : "s"} need action, approval or a safe recovery.`}
          icon={CircleAlert}
          tone={summary.revenueAtRiskUsd > 0 ? "warning" : "default"}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="ti-surface rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="label-caps text-sky-400">Portfolio P&amp;L</p>
              <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em]">
                From customer sales to gross profit
              </h2>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 font-mono text-[9px] text-slate-400">
              MODELED · USD
            </span>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_220px]">
            <div>
              <MetricLine
                label="Gross booking value"
                value={formatMoney(summary.grossBookingValueUsd)}
                detail="Customer-facing booking value"
              />
              <MetricLine
                label="Supplier / fulfillment cost"
                value={formatMoney(summary.supplierCostUsd)}
                detail="Atlas fare basis + settled recovery spend"
                negative
              />
              <MetricLine
                label="Gross profit"
                value={formatMoney(summary.grossProfitUsd)}
                detail={`Service economics · ${formatPct(summary.marginPct)} margin`}
                strong
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
              <p className="label-caps text-slate-500">Recovery efficiency</p>
              <p className="mt-3 font-mono text-3xl font-semibold tracking-[-0.04em] text-white">
                {summary.recoveryRoi === null ? "—" : `${summary.recoveryRoi.toFixed(2)}×`}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Protected booking value per $1 of delegated recovery spend.
              </p>
              <div className="mt-5 border-t border-slate-800 pt-4">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Recovery spend</span>
                  <span className="font-mono text-slate-300">
                    {formatMoney(summary.recoverySpendUsd)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                  <span>Rejected options</span>
                  <span className="font-mono text-slate-300">
                    {summary.rejectedAlternatives}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ti-surface rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Scale className="size-4 text-sky-400" />
            <div>
              <p className="label-caps text-sky-400">AP / AR control</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
                Settlement exposure
              </h2>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] p-4">
              <p className="label-caps text-cyan-300">AR · customer</p>
              <p className="mt-2 font-mono text-xl font-semibold text-white">
                {formatMoney(summary.openReceivableUsd)}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Modeled open receivable</p>
            </div>
            <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.06] p-4">
              <p className="label-caps text-violet-300">AP · supplier</p>
              <p className="mt-2 font-mono text-xl font-semibold text-white">
                {formatMoney(summary.openPayableUsd)}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Modeled open payable</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3.5">
            <div className="flex gap-2.5">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
              <p className="text-[11px] leading-relaxed text-slate-400">
                Atlas Sandbox verifies fares, but this repository does not create or pay live orders yet. AP/AR remains an explicit modeled control layer, not a claimed settlement ledger.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="ti-surface rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="label-caps text-sky-400">Outcome mix</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
                What happened to client bookings
              </h2>
            </div>
            <span className="font-mono text-xs text-slate-500">
              {summary.bookings} bookings
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {report.outcomeMix.map((item) => {
              const style = HEALTH_STYLES[item.health];
              return (
                <div key={item.health}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-400">
                      <span className={cn("size-1.5 rounded-full", style.dot)} />
                      {item.label}
                    </span>
                    <span className="font-mono text-slate-300">{item.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-sky-400/75"
                      style={{ width: `${Math.max(8, (item.count / maxOutcome) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ti-surface rounded-2xl p-5 sm:p-6">
          <p className="label-caps text-sky-400">Judge-ready evidence</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
            Why this operations layer matters
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: Gauge,
                title: "Business impact",
                copy: "Shows protected value, risk, recovery spend and margin instead of only counting agent actions.",
              },
              {
                icon: Database,
                title: "Feasibility",
                copy: "Client intent and outcomes come from persisted device journeys, with provenance shown per booking.",
              },
              {
                icon: Activity,
                title: "Agent evidence",
                copy: "Rejected alternatives and approval gates expose the decisions behind each recovery.",
              },
              {
                icon: BarChart3,
                title: "Demo clarity",
                copy: "One view connects the traveler promise to operational and financial consequences.",
              },
            ].map(({ icon: Icon, title, copy }) => (
              <div key={title} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <Icon className="size-4 text-sky-400" />
                <p className="mt-3 text-sm font-semibold text-slate-200">{title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function BookingStatus({ booking }: { booking: ClientBookingReport }) {
  const style = HEALTH_STYLES[booking.health];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
        style.badge
      )}
    >
      <Icon className="size-3" />
      {booking.statusLabel}
    </span>
  );
}

function ClientPanel({ report }: { report: OperationsReport }) {
  const { summary } = report;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Client bookings"
          value={String(summary.bookings)}
          detail="One pseudonymous traveler row per persisted device journey."
          icon={Users}
        />
        <KpiCard
          label="Protected"
          value={String(summary.protectedBookings)}
          detail="Travelers with an active intent contract or recovery workflow."
          icon={ShieldCheck}
          tone="success"
        />
        <KpiCard
          label="Recovered"
          value={String(summary.recoveredBookings)}
          detail="Trips that reached a successful recovery outcome."
          icon={Plane}
          tone="success"
        />
        <KpiCard
          label="Needs attention"
          value={String(summary.attentionBookings)}
          detail="Disrupted, approval-gated or failed recovery cases."
          icon={CircleAlert}
          tone={summary.attentionBookings > 0 ? "warning" : "default"}
        />
      </section>

      <section className="ti-surface overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/80 px-5 py-5 sm:px-6">
          <div>
            <p className="label-caps text-sky-400">Client booking ledger</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
              Intent → disruption → decision → economics
            </h2>
            <p className="mt-1.5 max-w-2xl text-[11px] leading-relaxed text-slate-500">
              Customer names are intentionally pseudonymous because the prototype persists device-scoped journeys, not production identity or PII.
            </p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 font-mono text-[9px] text-slate-400">
            {report.dataMode === "device-evidence" ? "SQLITE DEVICE EVIDENCE" : "DEMO FALLBACK"}
          </span>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1180px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/25 text-[9px] uppercase tracking-[0.13em] text-slate-600">
                <th className="px-5 py-3 font-medium">Client / booking</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Flight decision</th>
                <th className="px-4 py-3 font-medium">Client contract</th>
                <th className="px-4 py-3 font-medium">Economics</th>
                <th className="px-4 py-3 font-medium">Evidence</th>
                <th className="px-5 py-3 text-right font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {report.bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-slate-800/70 align-top last:border-b-0 hover:bg-slate-900/25"
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-200">{booking.clientLabel}</p>
                    <p className="mt-1 font-mono text-[10px] text-slate-600">{booking.id}</p>
                    <p className="mt-2 text-[11px] text-slate-500">{booking.route}</p>
                  </td>
                  <td className="px-4 py-4">
                    <BookingStatus booking={booking} />
                    <p className="mt-2 max-w-40 text-[10px] leading-relaxed text-slate-500">
                      {booking.decisionLabel}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                      <span>{booking.originalFlight}</span>
                      {booking.selectedFlight && (
                        <>
                          <ArrowRight className="size-3 text-slate-600" />
                          <span className="text-sky-300">{booking.selectedFlight}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500">
                      {booking.alternativesRejected > 0
                        ? `${booking.alternativesRejected} alternative${booking.alternativesRejected === 1 ? "" : "s"} rejected by policy`
                        : "No rejected alternatives recorded"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1.5 text-[10px] text-slate-500">
                      <p>
                        Arrive by <span className="font-mono text-slate-300">{booking.latestArrival}</span>
                      </p>
                      <p>
                        Baggage <span className="font-mono text-slate-300">≥ {booking.minBaggageKg}kg</span>
                      </p>
                      <p>
                        Authority <span className="font-mono text-slate-300">{formatMoney(booking.maxExtraSpendUsd)}</span>
                      </p>
                      <p>
                        Autopilot <span className="font-mono text-slate-300">{booking.autopilot ? "ON" : "OFF"}</span>
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-mono text-xs font-semibold text-slate-200">
                      {formatMoney(booking.bookingValueUsd)}
                    </p>
                    <p className="mt-1 text-[10px] text-emerald-400/80">
                      Revenue {formatMoney(booking.serviceRevenueUsd)} · GP {formatPct(booking.marginPct)}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-600">
                      Recovery {formatMoney(booking.recoverySpendUsd)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-[10px] font-medium text-slate-400">{booking.sourceLabel}</p>
                    <p className="mt-1 text-[10px] text-slate-600">
                      {booking.health === "recovered"
                        ? `${formatMoney(booking.revenueProtectedUsd)} protected`
                        : booking.revenueAtRiskUsd > 0
                          ? `${formatMoney(booking.revenueAtRiskUsd)} at risk`
                          : "Original booking retained"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="font-mono text-[10px] text-slate-500">
                      {formatUpdatedAt(booking.updatedAt)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-800 lg:hidden">
          {report.bookings.map((booking) => (
            <article key={booking.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{booking.clientLabel}</p>
                  <p className="mt-1 font-mono text-[9px] text-slate-600">{booking.id}</p>
                </div>
                <BookingStatus booking={booking} />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/35 p-3">
                <div>
                  <p className="label-caps text-slate-600">Flight</p>
                  <p className="mt-1 font-mono text-xs text-slate-300">{booking.changeLabel}</p>
                </div>
                <div className="text-right">
                  <p className="label-caps text-slate-600">Value</p>
                  <p className="mt-1 font-mono text-xs text-slate-300">
                    {formatMoney(booking.bookingValueUsd)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[10px] text-slate-500">
                <p>
                  Arrive by <span className="font-mono text-slate-300">{booking.latestArrival}</span>
                </p>
                <p>
                  Budget <span className="font-mono text-slate-300">{formatMoney(booking.maxExtraSpendUsd)}</span>
                </p>
                <p>
                  Baggage <span className="font-mono text-slate-300">{booking.minBaggageKg}kg</span>
                </p>
                <p>
                  Autopilot <span className="font-mono text-slate-300">{booking.autopilot ? "ON" : "OFF"}</span>
                </p>
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
                {booking.decisionLabel} · {booking.sourceLabel}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-caps text-sky-400">Live client evidence</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
              Current browser journey and decision trace
            </h2>
          </div>
          <p className="max-w-xl text-[10px] leading-relaxed text-slate-600">
            The ledger is portfolio-level; this section keeps the existing case console for a judge to inspect the active traveler in detail.
          </p>
        </div>

        <OpsSummary />
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
          <CaseCard />
          <DecisionTrace />
        </div>
        <div className="mt-5">
          <AgentConsole />
        </div>
      </section>
    </div>
  );
}

export function OperationsDashboard({ report }: { report: OperationsReport }) {
  const [tab, setTab] = useState<OperationsTab>("business");

  const dataNote = useMemo(
    () =>
      report.dataMode === "device-evidence"
        ? `${report.bookings.length} persisted device journey${report.bookings.length === 1 ? "" : "s"} loaded from SQLite.`
        : "No persisted journeys were available, so the deterministic demo cohort is shown.",
    [report]
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/35 p-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-1 sm:inline-grid">
          <button
            type="button"
            onClick={() => setTab("business")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition",
              tab === "business"
                ? "bg-sky-400 text-slate-950 shadow-[0_8px_24px_rgba(56,189,248,0.18)]"
                : "text-slate-500 hover:bg-slate-900 hover:text-slate-200"
            )}
          >
            <BarChart3 className="size-3.5" />
            Business P&amp;L
          </button>
          <button
            type="button"
            onClick={() => setTab("clients")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition",
              tab === "clients"
                ? "bg-sky-400 text-slate-950 shadow-[0_8px_24px_rgba(56,189,248,0.18)]"
                : "text-slate-500 hover:bg-slate-900 hover:text-slate-200"
            )}
          >
            <Users className="size-3.5" />
            Client bookings
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 pb-1 sm:pb-0">
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
          <p className="text-[10px] text-slate-600">{dataNote}</p>
        </div>
      </div>

      {tab === "business" ? <BusinessPanel report={report} /> : <ClientPanel report={report} />}
    </div>
  );
}
