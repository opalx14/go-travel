"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Database,
  Gauge,
  Layers,
  Plane,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { AgentConsole } from "@/components/agent-console";
import { CaseCard } from "@/components/case-card";
import { DecisionTrace } from "@/components/decision-trace";
import { OpsSummary } from "@/components/ops-summary";
import type {
  BookingHealth,
  ClientBookingReport,
  FulfilmentStatus,
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
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    icon: CheckCircle2,
  },
  approval: {
    dot: "bg-amber-400",
    badge: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    icon: Clock3,
  },
  disrupted: {
    dot: "bg-rose-400",
    badge: "border-rose-400/25 bg-rose-400/10 text-rose-300",
    icon: CircleAlert,
  },
  declined: {
    dot: "bg-slate-400",
    badge: "border-slate-400/25 bg-slate-400/10 text-slate-300",
    icon: XCircle,
  },
  failed: {
    dot: "bg-rose-400",
    badge: "border-rose-400/25 bg-rose-400/10 text-rose-300",
    icon: XCircle,
  },
  protected: {
    dot: "bg-sky-400",
    badge: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    icon: ShieldCheck,
  },
  unprotected: {
    dot: "bg-slate-500",
    badge: "border-slate-500/25 bg-slate-500/10 text-slate-400",
    icon: CircleAlert,
  },
};

const FULFILMENT_STYLES: Record<
  FulfilmentStatus,
  { badge: string; label: string }
> = {
  CONFIRMED: { badge: "border-slate-500/20 bg-slate-500/10 text-slate-300", label: "Confirmed" },
  TICKETED: { badge: "border-sky-400/20 bg-sky-400/10 text-sky-300", label: "Ticketed" },
  DISRUPTED: { badge: "border-rose-400/20 bg-rose-400/10 text-rose-300", label: "Disrupted" },
  RECOVERED: { badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300", label: "Recovered" },
  CANCELLED: { badge: "border-slate-600/20 bg-slate-600/10 text-slate-400", label: "Cancelled" },
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

function HeroKpiCard({
  label,
  value,
  detail,
  badgeText,
  roiText,
}: {
  label: string;
  value: string;
  detail: string;
  badgeText?: string;
  roiText?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-slate-950/90 p-5 shadow-[0_12px_36px_rgba(16,185,129,0.12)]">
      <div className="pointer-events-none absolute -right-6 -top-6 size-32 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="label-caps font-bold tracking-widest text-emerald-400">{label}</span>
            {badgeText && (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
                {badgeText}
              </span>
            )}
          </div>
          <p className="mt-2.5 font-mono text-3xl font-bold tracking-[-0.04em] text-emerald-200 sm:text-4xl">
            {value}
          </p>
        </div>
        <span className="flex size-11 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-sm">
          <ShieldCheck className="size-6" />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-500/20 pt-3">
        <p className="text-[11px] leading-relaxed text-emerald-300/80">{detail}</p>
        {roiText && (
          <span className="font-mono text-xs font-bold text-emerald-300">
            {roiText}
          </span>
        )}
      </div>
    </div>
  );
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
  tone?: "default" | "success" | "warning" | "cyan";
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
              tone === "warning" && "text-amber-300",
              tone === "cyan" && "text-cyan-300"
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
      {/* HERO & PRIMARY METRICS */}
      <section className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <HeroKpiCard
            label="Revenue Protected by Agent"
            value={formatMoney(summary.revenueProtectedUsd)}
            detail={`${summary.recoveredBookings} recovered booking${summary.recoveredBookings === 1 ? "" : "s"} retained after disruption.`}
            badgeText="HERO KPI"
            roiText={summary.recoveryRoi ? `${summary.recoveryRoi.toFixed(2)}× Recovery ROI` : undefined}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
          <KpiCard
            label="Retained Gross Profit"
            value={formatMoney(summary.grossProfitUsd)}
            detail={`Portfolio gross margin ${formatPct(summary.marginPct)} (${(DEMO_SERVICE_MARGIN_RATE * 100).toFixed(0)}% base fee, min $6).`}
            icon={TrendingUp}
            tone="success"
          />
          <KpiCard
            label="Ticketing SLA Adherence"
            value={`${summary.ticketingSlaAdherencePct}%`}
            detail="100% recovered tickets processed within <5 min SLA target."
            icon={BadgeCheck}
            tone="cyan"
          />
          <KpiCard
            label="Fare Verification Integrity"
            value={`${summary.fareVerificationRatePct}%`}
            detail="Atlas Sandbox price re-check verified before purchase commitment."
            icon={Zap}
            tone="cyan"
          />
          <KpiCard
            label="Revenue at Risk"
            value={formatMoney(summary.revenueAtRiskUsd)}
            detail={`${summary.attentionBookings} case${summary.attentionBookings === 1 ? "" : "s"} need approval or safe recovery intervention.`}
            icon={CircleAlert}
            tone={summary.revenueAtRiskUsd > 0 ? "warning" : "default"}
          />
        </div>
      </section>

      {/* P&L & ATRIP POST-BOOKING FULFILMENT CAPABILITY */}
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        {/* P&L Breakdown */}
        <div className="ti-surface rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="label-caps text-sky-400">Unit Economics &amp; Margin Protection</p>
              <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em]">
                Customer Sales → Supplier Fulfilment → Net Margin
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
                detail="Customer-facing gross sales volume"
              />
              <MetricLine
                label="Supplier / fulfillment cost"
                value={formatMoney(summary.supplierCostUsd)}
                detail="Atlas base fare + settled autonomous recovery spend"
                negative
              />
              <MetricLine
                label="Gross profit retained"
                value={formatMoney(summary.grossProfitUsd)}
                detail={`Margin protected against customer support subsidization · ${formatPct(summary.marginPct)} margin`}
                strong
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
              <p className="label-caps text-slate-500">Autonomous Efficiency</p>
              <p className="mt-3 font-mono text-3xl font-semibold tracking-[-0.04em] text-white">
                {summary.recoveryRoi === null ? "—" : `${summary.recoveryRoi.toFixed(2)}×`}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Protected booking revenue per $1 of delegated recovery spend.
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

        {/* ATRIP-Inspired Fulfilment & Servicing Control */}
        <div className="ti-surface rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-sky-400" />
            <div>
              <p className="label-caps text-sky-400">Fulfilment &amp; Post-Booking Servicing</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
                ATRIP Settlement &amp; SLA Control
              </h2>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] p-4">
              <p className="label-caps text-cyan-300">AR · customer receivable</p>
              <p className="mt-2 font-mono text-xl font-semibold text-white">
                {formatMoney(summary.openReceivableUsd)}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Modeled customer balance</p>
            </div>
            <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.06] p-4">
              <p className="label-caps text-violet-300">AP · supplier payable</p>
              <p className="mt-2 font-mono text-xl font-semibold text-white">
                {formatMoney(summary.openPayableUsd)}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Atlas Sandbox payable</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.06] p-3.5">
              <p className="label-caps text-amber-300">Refund Exposure</p>
              <p className="mt-1 font-mono text-lg font-semibold text-white">
                {formatMoney(summary.totalRefundExposureUsd)}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">Potential refund on open disruptions</p>
            </div>
            <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3.5">
              <p className="label-caps text-emerald-300">Ticketing SLA</p>
              <p className="mt-1 font-mono text-lg font-semibold text-white">&lt; 5 min</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Direct LCC connection target</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-sky-400/15 bg-sky-400/[0.05] p-3.5">
            <div className="flex gap-2.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-sky-300" />
              <p className="text-[11px] leading-relaxed text-slate-400">
                Atlas provides 140+ LCC retailing and live search infrastructure. TripIntent sits on top as the autonomous recovery layer, protecting brand reliability and preventing support cost erosion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* OUTCOME MIX & VALUE PROPOSITION */}
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="ti-surface rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="label-caps text-sky-400">Outcome Distribution</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
                What happened to traveler outcome contracts
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
          <p className="label-caps text-sky-400">Judge-Ready Architecture</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
            Why TripIntent + Atlas Wins
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: Gauge,
                title: "Margin & Revenue Protection",
                copy: "A $50 booking with $20 support cost subsidizes transactions. Autonomous recovery preserves both margin and brand.",
              },
              {
                icon: Database,
                title: "Reliable Fulfilment (ATRIP)",
                copy: "Focuses on post-booking servicing, fare re-check, and ticketing SLA rather than commodity search results.",
              },
              {
                icon: Activity,
                title: "Agent Spending Safety Gates",
                copy: "Delegated spend authority + explicit approval gates stop unauthorized spending before checkout.",
              },
              {
                icon: BarChart3,
                title: "Contract > Naive Price",
                copy: "Rejects naive cheapest flights if they miss the customer deadline, selecting verified flights that save the trip.",
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
              Contract → Disruption → Decision → Fulfilment &amp; Settlement
            </h2>
            <p className="mt-1.5 max-w-2xl text-[11px] leading-relaxed text-slate-500">
              Customer names are pseudonymous because the prototype persists device-scoped journeys, reflecting the end-to-end ATRIP post-booking lifecycle.
            </p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 font-mono text-[9px] text-slate-400">
            {report.dataMode === "device-evidence" ? "SQLITE DEVICE EVIDENCE" : "DEMO FALLBACK"}
          </span>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1240px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/25 text-[9px] uppercase tracking-[0.13em] text-slate-600">
                <th className="px-5 py-3 font-medium">Client / Booking</th>
                <th className="px-4 py-3 font-medium">Fulfilment &amp; SLA</th>
                <th className="px-4 py-3 font-medium">Flight Decision</th>
                <th className="px-4 py-3 font-medium">Outcome Contract</th>
                <th className="px-4 py-3 font-medium">Revenue &amp; P&amp;L</th>
                <th className="px-4 py-3 font-medium">AP / AR Exposure</th>
                <th className="px-5 py-3 text-right font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {report.bookings.map((booking) => {
                const fulfilment = FULFILMENT_STYLES[booking.fulfilmentStatus];
                return (
                  <tr
                    key={booking.id}
                    className="border-b border-slate-800/70 align-top last:border-b-0 hover:bg-slate-900/25"
                  >
                    {/* Client / Route */}
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-200">{booking.clientLabel}</p>
                      <p className="mt-1 font-mono text-[10px] text-slate-600">{booking.id}</p>
                      <p className="mt-2 text-[11px] text-slate-500">{booking.route}</p>
                    </td>

                    {/* Fulfilment & SLA */}
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <BookingStatus booking={booking} />
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold",
                            fulfilment.badge
                          )}
                        >
                          {fulfilment.label}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-[10px] text-slate-500">
                        <p className="flex items-center gap-1">
                          SLA: <span className="font-mono text-slate-300">{booking.ticketingSla}</span>
                        </p>
                        <p className="flex items-center gap-1">
                          Fare:{" "}
                          <span
                            className={cn(
                              "font-semibold",
                              booking.fareVerified ? "text-emerald-400" : "text-slate-500"
                            )}
                          >
                            {booking.fareVerified ? "Atlas Re-check ✓" : "Pending"}
                          </span>
                        </p>
                      </div>
                    </td>

                    {/* Flight Decision */}
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
                          ? `${booking.alternativesRejected} option${booking.alternativesRejected === 1 ? "" : "s"} rejected (deadline breached)`
                          : "No rejected options"}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-600">
                        {booking.decisionLabel}
                      </p>
                    </td>

                    {/* Client Contract */}
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

                    {/* Revenue & P&L */}
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs font-semibold text-slate-200">
                        {formatMoney(booking.bookingValueUsd)}
                      </p>
                      <p className="mt-1 text-[10px] text-emerald-400">
                        Revenue {formatMoney(booking.serviceRevenueUsd)} · GP {formatPct(booking.marginPct)}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {booking.health === "recovered"
                          ? `${formatMoney(booking.revenueProtectedUsd)} protected (spend ${formatMoney(booking.recoverySpendUsd)})`
                          : booking.revenueAtRiskUsd > 0
                            ? `${formatMoney(booking.revenueAtRiskUsd)} revenue at risk`
                            : "Original booking retained"}
                      </p>
                    </td>

                    {/* AP/AR Settlement Exposure */}
                    <td className="px-4 py-4">
                      <div className="space-y-1 text-[10px]">
                        <p className="text-cyan-300/80">
                          AR: <span className="font-mono text-white">{formatMoney(booking.customerReceivableUsd)}</span>
                        </p>
                        <p className="text-violet-300/80">
                          AP: <span className="font-mono text-white">{formatMoney(booking.supplierPayableUsd)}</span>
                        </p>
                        {booking.refundExposureUsd > 0 && (
                          <p className="text-amber-300/90 font-medium">
                            Refund Risk: {formatMoney(booking.refundExposureUsd)}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Updated */}
                    <td className="px-5 py-4 text-right">
                      <p className="font-mono text-[10px] text-slate-500">
                        {formatUpdatedAt(booking.updatedAt)}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Ledger Cards */}
        <div className="divide-y divide-slate-800 lg:hidden">
          {report.bookings.map((booking) => (
            <article key={booking.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{booking.clientLabel}</p>
                  <p className="mt-1 font-mono text-[9px] text-slate-600">{booking.id}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <BookingStatus booking={booking} />
                  <span className="font-mono text-[9px] text-emerald-400">
                    SLA {booking.ticketingSla} · {booking.fareVerified ? "Verified ✓" : "Pending"}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/35 p-3">
                <div>
                  <p className="label-caps text-slate-600">Flight</p>
                  <p className="mt-1 font-mono text-xs text-slate-300">{booking.changeLabel}</p>
                </div>
                <div className="text-right">
                  <p className="label-caps text-slate-600">Value / Protected</p>
                  <p className="mt-1 font-mono text-xs text-emerald-300">
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

              <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2 text-[10px] text-slate-500">
                <span>AR {formatMoney(booking.customerReceivableUsd)} · AP {formatMoney(booking.supplierPayableUsd)}</span>
                <span className="font-mono text-slate-400">{booking.sourceLabel}</span>
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                {booking.decisionLabel}
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
