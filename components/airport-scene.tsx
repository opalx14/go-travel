"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Clock3,
  Luggage,
  Plane,
  Route,
  Sparkles,
  X,
} from "lucide-react";
import { AirportChatCenterpiece } from "@/components/airport-chat-centerpiece";
import { useDemo } from "@/lib/demo-store";
import type { Flight, FlightOption, TravelIntent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AirportSceneProps {
  origin: string;
  destination: string;
  moving?: boolean;
  disrupted?: boolean;
  recovered?: boolean;
  flight?: Flight;
  disruptedFlight?: Partial<Flight>;
  recoveredFlight?: FlightOption | null;
  phase?: string;
  isProtected?: boolean;
  intent?: TravelIntent;
}

type GateStatus = "active" | "boarding" | "standby" | "delayed" | "searching" | "recovered";

interface GateData {
  id: string;
  flightNo: string;
  airline: string;
  destination: string;
  departure: string;
  aircraft: string;
  baggage: string;
  status: GateStatus;
  note: string;
}

const GATE_TONE: Record<GateStatus, string> = {
  active: "border-cyan-400/25 bg-cyan-400/[0.055] text-cyan-200",
  boarding: "border-white/[0.10] bg-white/[0.03] text-slate-300",
  standby: "border-white/[0.07] bg-white/[0.018] text-slate-600",
  delayed: "border-rose-400/30 bg-rose-400/[0.075] text-rose-200",
  searching: "border-cyan-400/30 bg-cyan-400/[0.075] text-cyan-200",
  recovered: "border-emerald-400/30 bg-emerald-400/[0.075] text-emerald-200",
};

function statusLabel(status: GateStatus) {
  switch (status) {
    case "active":
      return "MONITORED";
    case "boarding":
      return "BOARDING";
    case "standby":
      return "STANDBY";
    case "delayed":
      return "DELAYED";
    case "searching":
      return "SEARCHING";
    case "recovered":
      return "RECOVERED";
  }
}

export function AirportScene({
  origin = "KUL",
  destination = "SIN",
  disrupted = false,
  recovered = false,
  flight,
  disruptedFlight,
  recoveredFlight,
  phase = "idle",
  isProtected = true,
  intent,
}: AirportSceneProps) {
  const { evidenceView } = useDemo();
  const [activeGateId, setActiveGateId] = useState<string | null>(null);
  const recovering = phase === "running" && disrupted && !recovered;

  const gates = useMemo<GateData[]>(() => {
    const originalFlightNo = flight?.flightNo ?? "QS 401";
    const originalAirline = flight?.airline ?? "Quicksilver Air";
    const originalDeparture = flight?.departure ?? "13:05";
    const recoveryFlightNo = recoveredFlight?.flightNo ?? "CA 88";
    const recoveryAirline = recoveredFlight?.airline ?? "Coral Airways";
    const recoveryDeparture = recoveredFlight?.departure ?? "15:20";

    return [
      {
        id: "A12",
        flightNo: originalFlightNo,
        airline: originalAirline,
        destination,
        departure: disrupted ? (disruptedFlight?.departure ?? "17:30") : originalDeparture,
        aircraft: "B737-800",
        baggage: "20kg checked",
        status: disrupted ? "delayed" : "active",
        note: disrupted
          ? `Arrival constraint violated · target ${intent?.latestArrival ?? "18:00"}`
          : "Protected flight monitored against the passenger outcome",
      },
      {
        id: "A14",
        flightNo: "MH 118",
        airline: "Malaysia Airlines",
        destination: "PEN",
        departure: "14:10",
        aircraft: "A330-300",
        baggage: "Standard handling",
        status: "boarding",
        note: "Background airport movement",
      },
      {
        id: "A18",
        flightNo: recovered ? recoveryFlightNo : recovering ? "ATLAS" : "STANDBY",
        airline: recovered ? recoveryAirline : recovering ? "Recovery search" : "Recovery bay",
        destination,
        departure: recovered ? recoveryDeparture : "--:--",
        aircraft: recovered ? "A321neo" : "Available stand",
        baggage: recovered ? "20kg verified" : "Ready",
        status: recovered ? "recovered" : recovering ? "searching" : "standby",
        note: recovered
          ? `Atlas-verified recovery · arrives before ${intent?.latestArrival ?? "18:00"}`
          : recovering
            ? "Atlas is evaluating verified alternatives"
            : "Reserved recovery stand",
      },
      {
        id: "B02",
        flightNo: "SQ 106",
        airline: "Singapore Airlines",
        destination: "SIN",
        departure: "16:00",
        aircraft: "B787-10",
        baggage: "Check-in open",
        status: "standby",
        note: "Background airport movement",
      },
    ];
  }, [
    destination,
    disrupted,
    disruptedFlight?.departure,
    flight?.airline,
    flight?.departure,
    flight?.flightNo,
    intent?.latestArrival,
    recovered,
    recoveredFlight,
    recovering,
  ]);

  const selectedGate = gates.find((gate) => gate.id === activeGateId) ?? null;
  const primaryGate = gates[0];
  const recoveryGate = gates[2];

  const agentState = recovered
    ? "RECOVERED"
    : recovering
      ? "RECOVERING"
      : disrupted
        ? "DISRUPTED"
        : "MONITORING";

  if (!isProtected) {
    return (
      <section
        className="relative w-full overflow-hidden bg-[#070c18] text-white"
        role="region"
        aria-label="TripIntent outcome setup"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(14,165,233,0.09),transparent_32%),linear-gradient(to_bottom,#09111f_0%,#070c18_72%)]" />
        <div className="airport-grid pointer-events-none absolute inset-0 opacity-[0.08]" />
        <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-5xl items-center px-5 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-sm text-center sm:hidden">
            <span className="label-caps text-cyan-400">Outcome-first travel</span>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-100">
              Tell TripIntent what must stay true.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Set your destination, arrival deadline, baggage and delegated spend. The agent handles the itinerary only after you protect the outcome.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 font-mono text-[9px] text-slate-500">
              <span className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1">Arrival deadline</span>
              <span className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1">Baggage</span>
              <span className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1">Spend authority</span>
            </div>
          </div>
          <AirportChatCenterpiece inline />
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative w-full overflow-hidden bg-[#070c18] text-white"
      role="region"
      aria-label="Airport operations map"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.08),transparent_30%),linear-gradient(to_bottom,#09111f_0%,#070c18_72%)]" />
      <div className="airport-grid pointer-events-none absolute inset-0 opacity-[0.10]" />

      <div className="relative mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-4 pb-24 sm:px-6 sm:py-5 sm:pb-5">
        {/* Protected mission summary */}
        <div id="protected-mission" className="mx-auto w-full max-w-5xl scroll-mt-24">
          <AirportChatCenterpiece inline />
        </div>

        {/* Evidence view is controlled by the desktop header / mobile dock */}
        <div id="evidence-panel" className="scroll-mt-24">
        {evidenceView === "issue" ? (
          <div className="ti-surface-subtle overflow-hidden rounded-[1.5rem] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#0c1524]/95 px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300">
                  <Building2 className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    KLIA Terminal 1 · Concourse Alpha
                  </p>
                </div>
              </div>
              <span className="hidden rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 font-mono text-[9px] text-slate-500 sm:inline-flex">
                {origin} · WMKK
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-[#09111e] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-100">Flight change</h3>
                <span className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 font-mono text-[9px] text-slate-500">
                  KLIA T1
                </span>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
                <button
                  type="button"
                  onClick={() => setActiveGateId(activeGateId === primaryGate.id ? null : primaryGate.id)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all",
                    GATE_TONE[primaryGate.status],
                    activeGateId === primaryGate.id && "ring-2 ring-rose-300/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="label-caps text-rose-300">Current</span>
                    <span className="font-mono text-[9px] font-bold text-rose-300">
                      {statusLabel(primaryGate.status)}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-400/[0.08] text-rose-300">
                      <Plane className="size-4 rotate-90" fill="currentColor" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-slate-100">
                        {primaryGate.flightNo} · Gate {primaryGate.id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {primaryGate.departure} · too late for {intent?.latestArrival ?? "18:00"}
                      </p>
                    </div>
                  </div>
                </button>

                <div className="hidden items-center justify-center px-2 lg:flex">
                  <div className="flex flex-col items-center gap-2 text-slate-600">
                    <ArrowRight className="size-4" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveGateId(activeGateId === recoveryGate.id ? null : recoveryGate.id)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all",
                    GATE_TONE[recoveryGate.status],
                    activeGateId === recoveryGate.id && "ring-2 ring-cyan-300/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn("label-caps", recovered ? "text-emerald-300" : "text-cyan-300")}>Recovery</span>
                    <span className="font-mono text-[9px] font-bold opacity-80">
                      {statusLabel(recoveryGate.status)}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-2xl border",
                        recovered
                          ? "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-300"
                          : recovering
                            ? "animate-pulse border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300"
                            : "border-white/[0.07] bg-white/[0.02] text-slate-600"
                      )}
                    >
                      {recovering ? <Sparkles className="size-4" /> : <Plane className="size-4 rotate-90" fill={recovered ? "currentColor" : "none"} />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-slate-100">
                        {recoveryGate.flightNo} · Gate {recoveryGate.id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {recovered
                          ? `${recoveryGate.departure} · verified`
                          : recovering
                            ? "Finding a valid replacement…"
                            : "Ready if needed"}
                      </p>
                    </div>
                  </div>
                </button>
              </div>

            </div>

            {/* Gate details are inline; nothing floats over the airport */}
            {selectedGate && (
              <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[#0b1422] p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-lg border px-2 py-1 font-mono text-[9px] font-bold", GATE_TONE[selectedGate.status])}>
                        {selectedGate.id} · {statusLabel(selectedGate.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-100">
                      {selectedGate.airline} · {selectedGate.flightNo}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveGateId(null)}
                    className="ti-control flex size-8 shrink-0 items-center justify-center p-0 text-slate-400 hover:text-white"
                    aria-label="Close gate details"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <GateDetail icon={Route} label="Route" value={`${origin} → ${selectedGate.destination}`} />
                  <GateDetail icon={Clock3} label="Departure" value={selectedGate.departure} />
                  <GateDetail icon={Plane} label="Aircraft" value={selectedGate.aircraft} />
                  <GateDetail icon={Luggage} label="Baggage" value={selectedGate.baggage} />
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                  <span className="font-semibold text-cyan-300">TripIntent · </span>
                  {selectedGate.note}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="ti-surface-subtle rounded-[1.5rem] p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
              <div>
                <p className="text-sm font-semibold text-slate-100">Goal check</p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[9px]",
                  recovered
                    ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"
                    : disrupted
                      ? "border-rose-400/20 bg-rose-400/[0.06] text-rose-300"
                      : "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300"
                )}
              >
                {agentState}
              </span>
            </div>

            <div className="grid items-center gap-6 py-10 sm:grid-cols-[auto_1fr_auto] sm:gap-8 sm:py-12">
              <AirportPoint code={origin} city="Kuala Lumpur" active />
              <div className="relative hidden h-16 items-center sm:flex">
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-cyan-300/18" />
                <div className="animate-route-scan absolute top-1/2 h-px w-20 -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
                <div className="relative mx-auto flex size-10 items-center justify-center rounded-2xl border border-white/[0.09] bg-[#0b1423] text-cyan-300">
                  <Plane className="size-4 rotate-90" fill="currentColor" />
                </div>
              </div>
              <AirportPoint code={destination} city="Singapore" active={recovered} />
            </div>

            <div className="grid gap-2 border-t border-white/[0.07] pt-4 sm:grid-cols-3">
              <RouteMetric label="Arrival goal" value={intent?.latestArrival ?? "18:00"} />
              <RouteMetric label="Protected flight" value={flight?.flightNo ?? "QS 401"} />
              <RouteMetric
                label={recovered ? "Recovery" : disrupted ? "Exception" : "Agent"}
                value={recovered ? (recoveredFlight?.flightNo ?? "CA 88") : disrupted ? "Schedule delay" : "Monitoring"}
              />
            </div>
          </div>
        )}
        </div>

      </div>
    </section>
  );
}

function GateDetail({ icon: Icon, label, value }: { icon: typeof Plane; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-slate-600">
        <Icon className="size-3" />
        <span className="font-mono text-[8px] uppercase tracking-[0.1em]">{label}</span>
      </div>
      <p className="mt-1 truncate text-[11px] font-medium text-slate-300" title={value}>
        {value}
      </p>
    </div>
  );
}

function AirportPoint({ code, city, active }: { code: string; city: string; active?: boolean }) {
  return (
    <div className="flex items-center gap-3 sm:flex-col sm:text-center">
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-2xl border font-mono text-sm font-black",
          active
            ? "border-cyan-400/25 bg-cyan-400/[0.06] text-cyan-200"
            : "border-white/[0.07] bg-white/[0.02] text-slate-500"
        )}
      >
        {code}
      </span>
      <div>
        <p className="text-xs font-semibold text-slate-200">{city}</p>
        <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-600">
          {active ? "Protected endpoint" : "Endpoint"}
        </p>
      </div>
    </div>
  );
}

function RouteMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.018] px-3 py-2.5">
      <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-slate-600">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-300">{value}</p>
    </div>
  );
}
