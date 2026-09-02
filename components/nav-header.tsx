"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CircleAlert,
  Cpu,
  FlaskConical,
  RadioTower,
  Target,
  UserRound,
} from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

interface AIRuntimeHealth {
  configured: boolean;
  connected: boolean;
  modelReady: boolean;
  runtime: "self-hosted-qwen" | "deterministic-fallback";
  model: string | null;
  endpointHost: string | null;
  latencyMs: number | null;
}

function AIRuntimeBadge() {
  const [health, setHealth] = useState<AIRuntimeHealth | null>(null);

  useEffect(() => {
    let disposed = false;

    const refresh = async () => {
      try {
        const response = await fetch("/api/ai/health", { cache: "no-store" });
        if (!response.ok) throw new Error("AI health unavailable");
        const next = (await response.json()) as AIRuntimeHealth;
        if (!disposed) setHealth(next);
      } catch {
        if (!disposed) setHealth(null);
      }
    };

    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  const ready = Boolean(health?.connected && health.modelReady);
  const configuredButDown = Boolean(health?.configured && !ready);
  const label = ready
    ? "Qwen Local · 27B ready"
    : configuredButDown
      ? "Qwen Local · unavailable"
      : health
        ? "Deterministic · AI optional"
        : "AI runtime · checking";
  const title = ready
    ? `${health?.model ?? "Qwen"} @ ${health?.endpointHost ?? "self-hosted"}${health?.latencyMs !== null ? ` · ${health?.latencyMs}ms health probe` : ""}`
    : configuredButDown
      ? `Configured model ${health?.model ?? "Qwen"} is not reachable; Demo mode can fall back deterministically.`
      : "No self-hosted Qwen endpoint is configured; Demo mode remains deterministic and reproducible.";

  return (
    <div
      className={cn(
        "hidden items-center gap-2 rounded-full border px-3 py-1 xl:flex",
        ready
          ? "border-emerald-400/20 bg-emerald-400/5"
          : configuredButDown
            ? "border-amber-400/20 bg-amber-400/5"
            : "border-slate-700 bg-slate-900/60"
      )}
      title={title}
      aria-label={`AI runtime: ${label}`}
    >
      <Cpu
        className={cn(
          "size-3.5",
          ready
            ? "text-emerald-300"
            : configuredButDown
              ? "text-amber-300"
              : "text-slate-400"
        )}
      />
      <span
        className={cn(
          "font-mono text-[10px] font-medium",
          ready
            ? "text-emerald-300"
            : configuredButDown
              ? "text-amber-300"
              : "text-slate-400"
        )}
      >
        {label}
      </span>
    </div>
  );
}

/** Route mark: origin dot → path → destination pin, drawn with CSS only. */
function RouteMark() {
  return (
    <span aria-hidden className="flex items-center gap-[3px]">
      <span className="size-1.5 rounded-full ring-[1.5px] ring-primary" />
      <span className="h-[1.5px] w-2.5 rounded-full bg-primary/35" />
      <span className="size-2.5 rounded-full bg-primary" />
    </span>
  );
}

export function NavHeader() {
  const {
    isProtected,
    evidenceView,
    setEvidenceView,
    runtimeMode,
    runtimeError,
    changeRuntimeMode,
  } = useDemo();
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/operations");

  return (
    <header className="sticky top-0 z-50 border-b ti-divider bg-[#070c18]/90 text-slate-100 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:h-16 sm:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <RouteMark />
          <span className="text-[17px] leading-none font-bold tracking-tight text-white">
            Trip<span className="text-sky-400">Intent</span>
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-2 lg:gap-3">
          {!isAdmin && isProtected && (
            <div className="hidden items-center gap-2 md:flex">
              <div className="ti-control flex items-center gap-1 rounded-full p-1">
                <button
                  type="button"
                  onClick={() => setEvidenceView("issue")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition",
                    evidenceView === "issue"
                      ? "bg-cyan-400 text-slate-950"
                      : "text-slate-500 hover:text-slate-200"
                  )}
                >
                  <CircleAlert className="size-3.5" />
                  Issue
                </button>
                <button
                  type="button"
                  onClick={() => setEvidenceView("goal")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition",
                    evidenceView === "goal"
                      ? "bg-cyan-400 text-slate-950"
                      : "text-slate-500 hover:text-slate-200"
                  )}
                >
                  <Target className="size-3.5" />
                  Goal
                </button>
              </div>
            </div>
          )}

          <div className="ti-control flex items-center gap-1 rounded-full p-1">
            <Link
              href="/admin"
              prefetch={false}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition sm:text-xs",
                isAdmin
                  ? "bg-cyan-400 text-slate-950"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <BarChart3 className="size-3.5" />
              Admin
            </Link>
            <Link
              href="/"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition sm:text-xs",
                !isAdmin
                  ? "bg-cyan-400 text-slate-950"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <UserRound className="size-3.5" />
              Traveler
            </Link>
          </div>

          <div className="ti-control flex items-center gap-1 rounded-full p-1" aria-label="Runtime mode">
            <button
              type="button"
              onClick={() => changeRuntimeMode("demo")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition",
                runtimeMode === "demo"
                  ? "bg-sky-400 text-slate-950"
                  : "text-slate-500 hover:text-slate-200"
              )}
              title="Demo mode: real providers when available, clearly-labelled deterministic fallback allowed"
            >
              <FlaskConical className="size-3.5" />
              Demo
            </button>
            <button
              type="button"
              onClick={() => changeRuntimeMode("live")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition",
                runtimeMode === "live"
                  ? "bg-emerald-400 text-slate-950"
                  : "text-slate-500 hover:text-slate-200"
              )}
              title="Live mode: self-hosted Qwen and Atlas connections are required; no simulated provider fallback"
            >
              <RadioTower className="size-3.5" />
              Live
            </button>
          </div>

          <AIRuntimeBadge />

          <div
            className={cn(
              "hidden items-center gap-2 rounded-full border px-3 py-1 2xl:flex",
              runtimeError
                ? "border-rose-400/20 bg-rose-400/5"
                : runtimeMode === "live"
                  ? "border-emerald-400/20 bg-emerald-400/5"
                  : "border-sky-400/20 bg-sky-400/5"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                runtimeError
                  ? "bg-rose-400"
                  : runtimeMode === "live"
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-sky-400"
              )}
            />
            <span
              className={cn(
                "font-mono text-[10px] font-medium",
                runtimeError
                  ? "text-rose-300"
                  : runtimeMode === "live"
                    ? "text-emerald-300"
                    : "text-sky-300"
              )}
            >
              {runtimeError
                ? "Connected service unavailable"
                : runtimeMode === "live"
                  ? "Connected · no fallback"
                  : "Default · fallback-safe"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
