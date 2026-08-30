"use client";

import { useMemo, useState, useRef } from "react";
import {
  Building2,
  CircleAlert,
  Clock3,
  Compass,
  Eye,
  Globe2,
  Luggage,
  MapPin,
  Minus,
  Moon,
  Navigation,
  Plane,
  Plus,
  Radio,
  RadioTower,
  RotateCcw,
  Route,
  Sparkles,
  Sun,
  Sunrise,
  Users,
  X,
  Zap,
} from "lucide-react";
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

type ViewMode = "apron" | "radar";
type CameraPreset = "isometric" | "gates" | "runway" | "topdown";

interface GateData {
  id: string;
  name: string;
  concourse: string;
  xPercent: number;
  yPercent: number;
  flightNo: string;
  airline: string;
  destination: string;
  depTime: string;
  aircraft: string;
  status: "active" | "standby" | "delayed" | "recovered" | "boarding";
  baggageStatus: string;
  agentNote?: string;
}

const CAMERA_CONFIGS: Record<
  CameraPreset,
  {
    name: string;
    rotateX: number;
    rotateZ: number;
    scale: number;
    panX: number;
    panY: number;
  }
> = {
  isometric: {
    name: "3D Isometric",
    rotateX: 38,
    rotateZ: -10,
    scale: 1,
    panX: 0,
    panY: 0,
  },
  gates: {
    name: "Terminal Pier A",
    rotateX: 24,
    rotateZ: -4,
    scale: 1.25,
    panX: -10,
    panY: 12,
  },
  runway: {
    name: "Runway 14L",
    rotateX: 48,
    rotateZ: -24,
    scale: 1.15,
    panX: 12,
    panY: -10,
  },
  topdown: {
    name: "Tactical 2D",
    rotateX: 6,
    rotateZ: 0,
    scale: 1.02,
    panX: 0,
    panY: 0,
  },
};

export function AirportScene({
  origin = "KUL",
  destination = "SIN",
  moving = false,
  disrupted = false,
  recovered = false,
  flight,
  disruptedFlight,
  recoveredFlight,
  isProtected = true,
  intent,
}: AirportSceneProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("apron");
  const [preset, setPreset] = useState<CameraPreset>("isometric");
  const [camera, setCamera] = useState(CAMERA_CONFIGS.isometric);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeGateId, setActiveGateId] = useState<string | null>(null);
  const [timeMode, setTimeMode] = useState<"day" | "dusk" | "night">("dusk");
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic gate data
  const gates: GateData[] = useMemo(() => {
    const originalFlightNo = flight?.flightNo ?? "QS 401";
    const originalAirline = flight?.airline ?? "Quicksilver Air";
    const origDep = flight?.departure ?? "13:05";

    const recoveredNo = recoveredFlight?.flightNo ?? "CA 88";
    const recoveredAirline = recoveredFlight?.airline ?? "Coral Airways";
    const recoveredDep = recoveredFlight?.departure ?? "15:20";
    const recoveredPrice = recoveredFlight?.replacementPriceUsd
      ? `$${recoveredFlight.replacementPriceUsd.toFixed(2)}`
      : recoveredFlight?.extraCostUsd !== undefined
        ? `+$${recoveredFlight.extraCostUsd}`
        : "$124.50";

    return [
      {
        id: "A12",
        name: "Gate A12",
        concourse: "Pier Alpha",
        xPercent: 16,
        yPercent: 36,
        flightNo: originalFlightNo,
        airline: originalAirline,
        destination,
        depTime: disrupted
          ? (disruptedFlight?.departure ?? "17:30")
          : origDep,
        aircraft: "Boeing 737-800 NG",
        status: disrupted ? "delayed" : "active",
        baggageStatus: "20kg Checked · Booked",
        agentNote: disrupted
          ? "Rescheduled +3h25m — arrival deadline 18:00 violated"
          : "Primary booked flight monitored by TripIntent",
      },
      {
        id: "A14",
        name: "Gate A14",
        concourse: "Pier Alpha",
        xPercent: 32,
        yPercent: 36,
        flightNo: "MH 118",
        airline: "Malaysia Airlines",
        destination: "PEN",
        depTime: "14:10",
        aircraft: "Airbus A330-300",
        status: "boarding",
        baggageStatus: "Cargo Secured",
        agentNote: "Regional domestic service · Nominal schedule",
      },
      {
        id: "A18",
        name: "Gate A18",
        concourse: "Pier Alpha (Recovery)",
        xPercent: 48,
        yPercent: 36,
        flightNo: recovered ? recoveredNo : "STANDBY",
        airline: recovered ? recoveredAirline : "Atlas Allocation",
        destination,
        depTime: recovered ? recoveredDep : "--:--",
        aircraft: "Airbus A321neo",
        status: recovered ? "recovered" : "standby",
        baggageStatus: recovered ? "20kg Verified Guaranteed" : "Gate Available",
        agentNote: recovered
          ? `Verified by Atlas Sandbox (${recoveredPrice}) · Arrives before ${intent?.latestArrival ?? "18:00"}`
          : "Designated autonomous recovery bay for TripIntent",
      },
      {
        id: "B02",
        name: "Gate B02",
        concourse: "Pier Bravo",
        xPercent: 68,
        yPercent: 40,
        flightNo: "SQ 106",
        airline: "Singapore Airlines",
        destination: "SIN",
        depTime: "16:00",
        aircraft: "Boeing 787-10",
        status: "standby",
        baggageStatus: "Check-in Open",
        agentNote: "Commercial scheduled corridor flight",
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
  ]);

  // Selected gate detail
  const selectedGate = gates.find((g) => g.id === activeGateId);

  // Camera presets
  const applyPreset = (newPreset: CameraPreset) => {
    setPreset(newPreset);
    setCamera(CAMERA_CONFIGS[newPreset]);
  };

  const handleZoom = (delta: number) => {
    setCamera((prev) => ({
      ...prev,
      scale: Math.max(0.75, Math.min(2.0, prev.scale + delta)),
    }));
  };

  const toggleTimeMode = () => {
    setTimeMode((prev) =>
      prev === "dusk" ? "night" : prev === "night" ? "day" : "dusk"
    );
  };

  const handleReset = () => {
    applyPreset("isometric");
    setActiveGateId(null);
  };

  // Mouse pan & tilt drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== "apron") return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || viewMode !== "apron") return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    setCamera((prev) => ({
      ...prev,
      rotateX: Math.max(6, Math.min(60, prev.rotateX - dy * 0.18)),
      rotateZ: prev.rotateZ + dx * 0.22,
      panX: prev.panX + dx * 0.12,
      panY: prev.panY + dy * 0.12,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const statusHeadline = recovered
    ? `Atlas Recovery Docked at Gate A18 (${recoveredFlight?.flightNo ?? "CA 88"})`
    : disrupted
      ? `Disruption: Gate A12 Flight Delayed (+3h25m)`
      : isProtected
        ? `Digital Twin Active · Monitoring KUL → SIN`
        : `Airport Movement Preview · KUL Terminal 1`;

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative h-[380px] w-full select-none overflow-hidden rounded-[2.2rem] border bg-slate-950 text-white shadow-2xl transition-all duration-700 sm:h-[460px] lg:h-[500px]",
        disrupted && !recovered && "border-rose-500/50 shadow-[0_0_60px_rgba(244,63,94,0.22)] ring-1 ring-rose-500/30",
        recovered && "border-emerald-500/50 shadow-[0_0_60px_rgba(16,185,129,0.22)] ring-1 ring-emerald-500/30",
        !disrupted && !recovered && "border-sky-500/40 shadow-[0_0_50px_rgba(14,165,233,0.16)] ring-1 ring-sky-500/20"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      role="region"
      aria-label="Interactive Airport Digital Twin and Tactical Flight Map"
    >
      {/* Background Lighting Theme */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-1000",
          timeMode === "dusk" &&
            "bg-gradient-to-b from-[#080e22] via-[#0e1938] to-[#141829]",
          timeMode === "night" &&
            "bg-gradient-to-b from-[#03060d] via-[#070b17] to-[#0c101d]",
          timeMode === "day" &&
            "bg-gradient-to-b from-[#172554] via-[#1d4ed8] to-[#0f172a]"
        )}
      />

      {/* Cybernetic Grid Overlay */}
      <div className="airport-grid absolute inset-0 opacity-40" />

      {/* Ambient Top Glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.22),transparent_70%)]" />

      {/* TOP HEADER: View Mode Switcher & Status Pill */}
      <div className="absolute inset-x-3 top-3 z-40 flex flex-wrap items-center justify-between gap-2 sm:inset-x-6 sm:top-4">
        {/* Left: Telemetry Badge */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold backdrop-blur-md shadow-lg transition-all",
              disrupted && !recovered
                ? "border-rose-500/50 bg-rose-950/85 text-rose-200"
                : recovered
                  ? "border-emerald-500/50 bg-emerald-950/85 text-emerald-200"
                  : "border-sky-500/40 bg-slate-900/85 text-sky-200"
            )}
          >
            <RadioTower
              className={cn(
                "size-3.5",
                disrupted && !recovered
                  ? "animate-pulse text-rose-400"
                  : recovered
                    ? "text-emerald-400"
                    : "text-sky-400"
              )}
            />
            <span className="tracking-tight font-bold">{statusHeadline}</span>
            <span className="relative flex size-2">
              <span
                className={cn(
                  "absolute inline-flex size-full animate-ping rounded-full opacity-75",
                  disrupted && !recovered
                    ? "bg-rose-400"
                    : recovered
                      ? "bg-emerald-400"
                      : "bg-sky-400"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex size-2 rounded-full",
                  disrupted && !recovered
                    ? "bg-rose-500"
                    : recovered
                      ? "bg-emerald-500"
                      : "bg-sky-500"
                )}
              />
            </span>
          </div>

          <div className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-slate-900/80 px-3 py-1 font-mono text-[10px] text-slate-300 backdrop-blur-md lg:flex shadow-sm">
            <MapPin className="size-3 text-sky-400" />
            <span>WMKK / {origin} · KLIA T1</span>
          </div>
        </div>

        {/* Right: Mode Switcher & Controls */}
        <div className="flex items-center gap-2">
          {/* Dual View Mode Tabs */}
          <div className="flex items-center rounded-xl border border-white/20 bg-slate-900/90 p-1 shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setViewMode("apron")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-bold transition-all",
                viewMode === "apron"
                  ? "bg-sky-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Compass className="size-3.5" />
              <span>3D Apron Twin</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("radar")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-bold transition-all",
                viewMode === "radar"
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Globe2 className="size-3.5" />
              <span>Flight Radar Arc</span>
            </button>
          </div>

          {/* Apron Camera Presets */}
          {viewMode === "apron" && (
            <div className="hidden items-center rounded-xl border border-white/20 bg-slate-900/90 p-1 shadow-xl backdrop-blur-md sm:flex">
              {(
                [
                  { id: "isometric", label: "Twin", icon: Compass },
                  { id: "gates", label: "Gates", icon: Building2 },
                  { id: "runway", label: "14L", icon: Plane },
                  { id: "topdown", label: "2D", icon: Eye },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyPreset(item.id)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all",
                    preset === item.id
                      ? "bg-white/25 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <item.icon className="size-3" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Zoom & Lighting Controls */}
          {viewMode === "apron" && (
            <div className="flex items-center rounded-xl border border-white/20 bg-slate-900/90 p-1 shadow-xl backdrop-blur-md">
              <button
                type="button"
                onClick={toggleTimeMode}
                className="flex size-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
                title={`Lighting: ${timeMode.toUpperCase()}`}
              >
                {timeMode === "dusk" && <Sunrise className="size-3.5 text-amber-400" />}
                {timeMode === "night" && <Moon className="size-3.5 text-sky-400" />}
                {timeMode === "day" && <Sun className="size-3.5 text-yellow-400" />}
              </button>
              <button
                type="button"
                onClick={() => handleZoom(0.15)}
                className="flex size-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
                title="Zoom in"
              >
                <Plus className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleZoom(-0.15)}
                className="flex size-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
                title="Zoom out"
              >
                <Minus className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex size-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
                title="Reset Camera"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: 3D ISOMETRIC APRON DIGITAL TWIN                                   */}
      {/* ========================================================================= */}
      {viewMode === "apron" && (
        <div
          className="airport-scene-container absolute inset-0 flex items-center justify-center overflow-visible"
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <div
            className="relative h-[680px] w-[1000px] transition-transform duration-500 ease-out"
            style={{
              transform: `perspective(1200px) rotateX(${camera.rotateX}deg) rotateZ(${camera.rotateZ}deg) scale(${camera.scale}) translate(${camera.panX}px, ${camera.panY}px)`,
              transformStyle: "preserve-3d",
            }}
          >
            {/* TARMAC CONCRETE GROUND SLAB WITH PAVEMENT TEXTURE */}
            <div
              className="absolute inset-0 rounded-[3rem] border border-slate-700/60 bg-gradient-to-b from-[#111a2e] via-[#0d1526] to-[#090f1d] shadow-[0_45px_120px_rgba(0,0,0,0.85)]"
              style={{ transform: "translateZ(0px)" }}
            >
              {/* Tarmac Markings & Expansion Joints */}
              <svg className="absolute inset-0 size-full opacity-70" xmlns="http://www.w3.org/2000/svg">
                {/* Concrete slab grid lines */}
                <defs>
                  <pattern id="concrete-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#concrete-grid)" />

                {/* Main Taxiway Centerlines */}
                <path d="M 100 500 L 900 500" fill="none" stroke="#eab308" strokeWidth="4" strokeDasharray="16 10" />
                <path d="M 170 500 Q 185 430 200 310" fill="none" stroke="#eab308" strokeWidth="3.5" opacity="0.9" />
                <path d="M 330 500 Q 340 430 350 310" fill="none" stroke="#eab308" strokeWidth="3.5" opacity="0.9" />
                {/* Gate A18 (Recovery Path - Glowing Emerald when active) */}
                <path
                  d="M 720 500 Q 580 470 520 310"
                  fill="none"
                  stroke={recovered ? "#10b981" : "#eab308"}
                  strokeWidth={recovered ? "5" : "3.5"}
                  strokeDasharray={recovered ? "none" : "10 8"}
                  className={recovered ? "animate-pulse" : ""}
                />
                <path d="M 820 500 Q 770 440 710 330" fill="none" stroke="#eab308" strokeWidth="3" opacity="0.75" />

                {/* Gate Stand Lead-in Stop Bars */}
                <line x1="175" y1="305" x2="225" y2="305" stroke="#ef4444" strokeWidth="4" />
                <line x1="325" y1="305" x2="375" y2="305" stroke="#ef4444" strokeWidth="4" />
                <line x1="495" y1="305" x2="545" y2="305" stroke={recovered ? "#10b981" : "#ef4444"} strokeWidth="4" />
                <line x1="685" y1="325" x2="735" y2="325" stroke="#ef4444" strokeWidth="4" />

                {/* Apron Service Road (Zipper lines) */}
                <path d="M 90 360 L 910 360" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeDasharray="8 8" />
                <path d="M 90 378 L 910 378" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeDasharray="8 8" />
              </svg>

              {/* Taxiway Blue Edge Lights */}
              <div className="absolute inset-x-28 bottom-32 flex justify-between px-6">
                {Array.from({ length: 20 }).map((_, i) => (
                  <span key={i} className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#38bdf8]" />
                ))}
              </div>

              {/* Apron Floodlight Mast Glow Cones */}
              <div className="pointer-events-none absolute left-36 top-48 h-56 w-72 bg-[radial-gradient(ellipse_at_top,rgba(254,240,138,0.12),transparent_70%)]" />
              <div className="pointer-events-none absolute right-48 top-48 h-56 w-72 bg-[radial-gradient(ellipse_at_top,rgba(254,240,138,0.12),transparent_70%)]" />
            </div>

            {/* RUNWAY 14L/32R WITH SEQUENCED CHASER STROBES */}
            <div
              className="absolute bottom-6 left-10 right-10 h-22 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-[0_25px_50px_rgba(0,0,0,0.9)]"
              style={{ transform: "translateZ(8px)" }}
            >
              <div className="relative size-full">
                {/* Threshold Piano Keys */}
                <div className="absolute left-6 inset-y-2 flex gap-1.5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span key={i} className="h-full w-2 rounded-xs bg-white/95" />
                  ))}
                </div>

                <div className="absolute left-28 top-1/2 -translate-y-1/2 font-mono text-2xl font-black tracking-widest text-white/95">
                  14L
                </div>

                {/* Runway Centerline Strobes */}
                <div className="absolute inset-x-44 top-1/2 flex -translate-y-1/2 justify-between">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <span key={i} className="h-2.5 w-9 rounded-xs bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                  ))}
                </div>

                {/* Sequenced Chaser Light Bar */}
                <div className="airport-runway-chaser absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                {/* Runway Edge Lights (Amber / White) */}
                <div className="absolute inset-x-4 top-1 flex justify-between">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span key={i} className="size-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#fde047]" />
                  ))}
                </div>
                <div className="absolute inset-x-4 bottom-1 flex justify-between">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span key={i} className="size-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#fde047]" />
                  ))}
                </div>

                {/* PAPI (Precision Approach Path Indicator) Array */}
                <div className="absolute left-4 -top-6 flex gap-1.5 rounded-md border border-white/20 bg-slate-950/90 p-1">
                  <span className="size-2 rounded-full bg-red-500 shadow-[0_0_8px_red]" />
                  <span className="size-2 rounded-full bg-red-500 shadow-[0_0_8px_red]" />
                  <span className="size-2 rounded-full bg-white shadow-[0_0_8px_white]" />
                  <span className="size-2 rounded-full bg-white shadow-[0_0_8px_white]" />
                </div>
              </div>
            </div>

            {/* MULTI-LEVEL TERMINAL 1 BUILDING */}
            <div
              className="absolute left-16 right-16 top-14 h-38 rounded-2xl border-2 border-slate-600/70 bg-gradient-to-b from-slate-800/95 via-slate-900/98 to-slate-950/98 shadow-[0_35px_80px_rgba(0,0,0,0.75)] backdrop-blur-2xl"
              style={{ transform: "translateZ(34px)" }}
            >
              {/* Glass Roof Canopy with Structural Trusses */}
              <div className="absolute -top-3.5 inset-x-6 h-4 rounded-t-xl bg-gradient-to-r from-sky-900/50 via-sky-600/50 to-sky-900/50 border-t border-sky-400/60" />

              <div className="relative flex h-full flex-col justify-between p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40">
                      <Building2 className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold tracking-tight text-white">
                        KLIA TERMINAL 1 · CONCOURSE ALPHA
                      </p>
                      <p className="text-[9px] font-mono text-slate-400">
                        AUTONOMOUS PASSENGER FLIGHT RECOVERY TWIN
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 rounded-md bg-slate-950/80 px-2 py-1 font-mono text-[10px] text-emerald-400 border border-emerald-500/30">
                      <Users className="size-3" />
                      <span>TERMINAL FLOW: NOMINAL</span>
                    </div>
                  </div>
                </div>

                {/* Concourse Glass Facade */}
                <div className="grid grid-cols-12 gap-2 py-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 rounded-sm bg-gradient-to-b from-sky-400/20 via-sky-400/5 to-transparent border border-sky-400/25 flex items-center justify-center"
                    >
                      <span className="size-1 rounded-full bg-amber-300/50" />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span>GROUND OPERATIONS · PIER ALPHA</span>
                  <span className="text-sky-400 font-bold">
                    ACTIVE GATES: {gates.filter((g) => g.status !== "standby").length} / {gates.length}
                  </span>
                </div>
              </div>

              {/* 3D ARTICULATED JETBRIDGES & GATES */}
              {gates.map((gate) => {
                const isRecoveredGate = gate.id === "A18" && recovered;
                const isDisruptedGate = gate.id === "A12" && disrupted;
                const isSelected = activeGateId === gate.id;

                return (
                  <div
                    key={gate.id}
                    className="absolute bottom-0 -translate-y-2"
                    style={{ left: `${gate.xPercent}%`, transform: "translateZ(22px)" }}
                  >
                    <div className="relative flex flex-col items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveGateId(isSelected ? null : gate.id);
                        }}
                        className={cn(
                          "relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold shadow-lg transition-all duration-300 hover:scale-105",
                          isRecoveredGate &&
                            "gate-verified-glow border-emerald-400 bg-emerald-950 text-emerald-200 ring-4 ring-emerald-500/25",
                          isDisruptedGate &&
                            "gate-alert-pulse border-rose-400 bg-rose-950 text-rose-200 ring-4 ring-rose-500/25",
                          !isRecoveredGate &&
                            !isDisruptedGate &&
                            "border-sky-500/40 bg-slate-900/90 text-sky-200 hover:border-sky-400",
                          isSelected && "ring-4 ring-amber-400/50 scale-110"
                        )}
                      >
                        <MapPin className="size-3" />
                        <span>{gate.id}</span>
                        <span className="font-mono text-[9px] opacity-85">{gate.flightNo}</span>
                        {isRecoveredGate && <Sparkles className="size-3 text-emerald-400 animate-spin" />}
                        {isDisruptedGate && <CircleAlert className="size-3 text-rose-400 animate-bounce" />}
                      </button>

                      {/* VDGS LED Screen */}
                      <div
                        className={cn(
                          "mt-1 flex h-4 w-12 items-center justify-center rounded-xs border font-mono text-[7px] font-black tracking-widest",
                          isRecoveredGate
                            ? "border-emerald-400/60 bg-emerald-950 text-emerald-300 vdgs-active"
                            : isDisruptedGate
                              ? "border-rose-400/60 bg-rose-950 text-rose-300"
                              : "border-amber-400/40 bg-black text-amber-400"
                        )}
                      >
                        {isRecoveredGate ? "DOCK OK" : isDisruptedGate ? "DELAY" : "PARK"}
                      </div>

                      {/* Articulated Jetbridge Arm */}
                      <div className="relative mt-1 flex flex-col items-center">
                        <div
                          className={cn(
                            "h-12 w-3.5 rounded-xs border transition-all duration-700",
                            isRecoveredGate
                              ? "border-emerald-400/70 bg-emerald-900/60"
                              : isDisruptedGate
                                ? "border-rose-400/60 bg-rose-950/50 opacity-75"
                                : "border-slate-500 bg-slate-800"
                          )}
                          style={{ transform: isDisruptedGate ? "scaleY(0.7)" : "scaleY(1)" }}
                        />
                        <div
                          className={cn(
                            "h-2.5 w-6 rounded-t-xs border",
                            isRecoveredGate
                              ? "border-emerald-400 bg-emerald-600"
                              : isDisruptedGate
                                ? "border-rose-400 bg-rose-600"
                                : "border-slate-400 bg-slate-600"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3D ATC CONTROL TOWER WITH SWEEPING RADAR */}
            <div className="absolute left-6 top-10 flex flex-col items-center" style={{ transform: "translateZ(60px)" }}>
              <div className="relative flex size-12 items-center justify-center rounded-2xl border-2 border-sky-400/70 bg-slate-900 shadow-[0_0_30px_rgba(56,189,248,0.5)] backdrop-blur-md">
                <span className="beacon-light absolute -top-2 size-2 rounded-full bg-red-500 shadow-[0_0_14px_red]" />
                <div className="relative size-7 rounded-full border border-sky-400/40 flex items-center justify-center overflow-hidden">
                  <div className="airport-radar-beam absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_310deg,rgba(56,189,248,0.75)_360deg)]" />
                  <Radio className="size-3 text-sky-400 relative z-10" />
                </div>
              </div>
              <div className="h-26 w-4.5 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border-x border-slate-600" />
            </div>

            {/* 3D AIRCRAFT: PRIMARY FLIGHT (Gate A12 - QS 401) */}
            <div
              className={cn(
                "airport-3d-plane absolute z-30 flex flex-col items-center transition-all duration-700",
                disrupted ? "left-[14%] top-[42%] text-rose-400" : "left-[15%] top-[40%] text-sky-400"
              )}
              style={{ transform: "translateZ(28px)" }}
            >
              <div
                className={cn(
                  "relative flex size-14 items-center justify-center rounded-full border-2 bg-slate-900/95 shadow-2xl backdrop-blur-md",
                  disrupted
                    ? "border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.45)]"
                    : "border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.35)]"
                )}
              >
                <Plane className="size-7" fill="currentColor" />
                <span
                  className={cn(
                    "beacon-light absolute -top-1 size-2 rounded-full",
                    disrupted ? "bg-rose-500 shadow-[0_0_12px_red]" : "bg-red-500"
                  )}
                />
              </div>
              <div className="mt-1 flex items-center gap-1 rounded-md border border-white/15 bg-slate-950/90 px-2 py-0.5 font-mono text-[9px] font-bold text-white shadow-md">
                <span>{flight?.flightNo ?? "QS 401"}</span>
                {disrupted && <span className="text-rose-400 font-extrabold animate-pulse">DELAY</span>}
              </div>
            </div>

            {/* 3D AIRCRAFT: REGIONAL FLIGHT (Gate A14 - MH 118) */}
            <div className="absolute left-[31%] top-[40%] z-20 flex flex-col items-center text-slate-300" style={{ transform: "translateZ(22px)" }}>
              <div className="flex size-12 items-center justify-center rounded-full border border-slate-500 bg-slate-900/90 shadow-lg">
                <Plane className="size-5.5" fill="currentColor" />
              </div>
              <span className="mt-1 rounded-md bg-slate-950/80 px-1.5 py-0.5 font-mono text-[8px] text-slate-400">MH 118</span>
            </div>

            {/* 3D AIRCRAFT: RECOVERED FLIGHT (Gate A18 - Docked on Atlas Recovery) */}
            {recovered && (
              <div
                className="airport-3d-plane animate-in zoom-in-75 fade-in duration-1000 absolute left-[47%] top-[40%] z-30 flex flex-col items-center text-emerald-400"
                style={{ transform: "translateZ(30px)" }}
              >
                <div className="absolute -inset-4 -z-10 animate-ping rounded-full bg-emerald-500/25 duration-1000" />
                <div className="relative flex size-14 items-center justify-center rounded-full border-2 border-emerald-400 bg-slate-900/95 shadow-[0_0_40px_rgba(16,185,129,0.55)] backdrop-blur-md">
                  <Plane className="size-7" fill="currentColor" />
                  <span className="beacon-light absolute -top-1 size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
                </div>
                <div className="mt-1 flex items-center gap-1 rounded-md border border-emerald-400/60 bg-emerald-950/90 px-2 py-0.5 font-mono text-[9px] font-black text-emerald-200 shadow-lg">
                  <Sparkles className="size-3 text-emerald-400" />
                  <span>{recoveredFlight?.flightNo ?? "CA 88"}</span>
                  <span className="text-emerald-400">VERIFIED</span>
                </div>
              </div>
            )}

            {/* ACTIVE TAXIING AI AIRCRAFT */}
            <div
              className={cn(
                "absolute z-20 flex flex-col items-center transition-all duration-1000",
                moving ? "left-[62%] top-[68%]" : "left-[76%] top-[68%]"
              )}
              style={{ transform: "translateZ(18px) rotate(-8deg)" }}
            >
              <div className="flex size-11 items-center justify-center rounded-full border border-sky-400/40 bg-slate-900/90 text-sky-300 shadow-md">
                <Plane className="size-5 rotate-45" fill="currentColor" />
              </div>
              <span className="mt-1 rounded-md bg-slate-950/80 px-1.5 py-0.5 font-mono text-[8px] text-sky-400">
                AK 710 · TAXI
              </span>
            </div>

            {/* FLOATING HOLOGRAPHIC GATE HUD CARD */}
            {selectedGate && (
              <div
                className="animate-in fade-in zoom-in-90 duration-300 absolute z-50 w-76 rounded-2xl border-2 border-sky-400/70 bg-slate-900/95 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-white"
                style={{
                  left: `${selectedGate.xPercent + 2}%`,
                  top: `${selectedGate.yPercent - 24}%`,
                  transform: "translateZ(65px)",
                }}
              >
                <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-sky-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-400 border border-sky-500/30">
                        {selectedGate.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">{selectedGate.concourse}</span>
                    </div>
                    <h4 className="mt-1 text-sm font-bold text-white">
                      {selectedGate.airline} · {selectedGate.flightNo}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveGateId(null)}
                    className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-2.5 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><Route className="size-3 text-sky-400" /> Route</span>
                    <span className="font-mono font-semibold">{origin} → {selectedGate.destination}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><Clock3 className="size-3 text-sky-400" /> Departure</span>
                    <span className="font-mono font-semibold text-white">{selectedGate.depTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><Plane className="size-3 text-sky-400" /> Aircraft</span>
                    <span className="font-medium text-slate-200">{selectedGate.aircraft}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><Luggage className="size-3 text-sky-400" /> Baggage</span>
                    <span className="font-medium text-emerald-400">{selectedGate.baggageStatus}</span>
                  </div>
                  {selectedGate.agentNote && (
                    <div className="mt-2 rounded-xl bg-slate-950/85 p-2 border border-white/10 text-[10px] leading-relaxed text-slate-300">
                      <span className="font-bold text-sky-400">TripIntent Agent: </span>
                      {selectedGate.agentNote}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: TACTICAL AERONAUTICAL FLIGHT RADAR & ROUTE ARC (KUL ✈️ SIN)         */}
      {/* ========================================================================= */}
      {viewMode === "radar" && (
        <div className="relative size-full overflow-hidden p-6 sm:p-8 flex items-center justify-center">
          {/* Tactical Vector Map Projection (Malacca Strait Flight Corridor) */}
          <div className="relative h-[320px] w-full max-w-3xl rounded-2xl border border-white/15 bg-[#070c18] p-6 shadow-inner">
            {/* Top Flight Telemetry HUD */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Navigation className="size-5 rotate-45" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-bold text-white">
                      FLIGHT TRAJECTORY · {recovered ? (recoveredFlight?.flightNo ?? "CA 88") : (flight?.flightNo ?? "QS 401")}
                    </p>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                      {recovered ? "RECOVERY CORRIDOR" : "MONITORED"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    WMKK (Kuala Lumpur) → WSSS (Singapore Changi) · Airway W531
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[9px]">CRUISING ALT</span>
                  <span className="font-bold text-sky-400">FL 280 (28,000 ft)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">GROUND SPEED</span>
                  <span className="font-bold text-emerald-400">460 KTS</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">ETA DEADLINE</span>
                  <span className="font-bold text-white">{intent?.latestArrival ?? "18:00"}</span>
                </div>
              </div>
            </div>

            {/* Flight Route Map Canvas */}
            <div className="relative mt-5 h-44 w-full">
              <svg className="size-full" viewBox="0 0 800 180" fill="none">
                {/* Radar Sweep Background Rings */}
                <circle cx="400" cy="90" r="160" stroke="rgba(56,189,248,0.08)" strokeWidth="1" />
                <circle cx="400" cy="90" r="100" stroke="rgba(56,189,248,0.12)" strokeWidth="1" />
                <circle cx="400" cy="90" r="40" stroke="rgba(56,189,248,0.16)" strokeWidth="1" />

                {/* Waypoints */}
                <g fill="#94a3b8" fontSize="9" fontFamily="monospace">
                  <circle cx="100" cy="110" r="4" fill="#38bdf8" />
                  <text x="75" y="135">KUL (WMKK)</text>

                  <circle cx="280" cy="70" r="3" fill="#64748b" />
                  <text x="265" y="60">VPL</text>

                  <circle cx="460" cy="55" r="3" fill="#64748b" />
                  <text x="445" y="45">PULIP</text>

                  <circle cx="620" cy="80" r="3" fill="#64748b" />
                  <text x="605" y="70">NYLON</text>

                  <circle cx="720" cy="120" r="4" fill="#10b981" />
                  <text x="695" y="145">SIN (WSSS)</text>
                </g>

                {/* Original Nominal Flight Trajectory */}
                <path
                  d="M 100 110 Q 280 40 400 40 T 720 120"
                  stroke={disrupted && !recovered ? "rgba(244,63,94,0.4)" : "#38bdf8"}
                  strokeWidth="3"
                  strokeDasharray={disrupted && !recovered ? "6 6" : "none"}
                />

                {/* Disrupted Delay Vector */}
                {disrupted && !recovered && (
                  <g>
                    <path
                      d="M 100 110 Q 350 160 720 120"
                      stroke="#f43f5e"
                      strokeWidth="3"
                      strokeDasharray="4 4"
                      className="animate-pulse"
                    />
                    <text x="360" y="170" fill="#f43f5e" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      SCHEDULE DELAYED (+3h25m) ❌
                    </text>
                  </g>
                )}

                {/* Recovered Atlas Flight Route */}
                {recovered && (
                  <g>
                    <path
                      d="M 100 110 Q 300 20 400 20 T 720 120"
                      stroke="#10b981"
                      strokeWidth="4"
                      className="animate-pulse"
                    />
                    <text x="340" y="15" fill="#10b981" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      ATLAS RECOVERY ROUTE · ARRIVES 16:35 ✅
                    </text>
                  </g>
                )}

                {/* Flying Aircraft Icon along Trajectory */}
                <g transform={recovered ? "translate(420, 20)" : "translate(380, 40)"}>
                  <circle cx="0" cy="0" r="14" fill="#0f172a" stroke={recovered ? "#10b981" : "#38bdf8"} strokeWidth="2" />
                  <g transform="translate(-7, -7)">
                    <Plane className={cn("size-3.5 rotate-45", recovered ? "text-emerald-400" : "text-sky-400")} fill="currentColor" />
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM TELEMETRY BAR */}
      <div className="absolute inset-x-3 bottom-3 z-40 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-2 text-[10px] text-slate-300 backdrop-blur-md sm:inset-x-5 sm:bottom-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
          <span className="flex items-center gap-1 text-sky-400 font-bold">
            <Zap className="size-3" /> TWIN LATENCY: 12ms
          </span>
          <span className="hidden sm:inline text-slate-400">
            METAR: 28°C · CAVOK · WIND 060@08KT
          </span>
          <span className="hidden md:inline text-slate-400">
            CORRIDOR: WMKK ✈️ WSSS
          </span>
        </div>

        <div className="text-slate-400 text-[10px]">
          {viewMode === "apron"
            ? "Drag to pan & tilt · Click any gate to inspect"
            : "Live Aeronautical Navigation Radar Corridor"}
        </div>
      </div>
    </div>
  );
}
