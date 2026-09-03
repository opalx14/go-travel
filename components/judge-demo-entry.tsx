"use client";

import {
  BrainCircuit,
  CheckCircle2,
  Play,
  SearchCheck,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import {
  JUDGE_DEMO_DURATION_SECONDS,
  JUDGE_DEMO_STAGES,
  judgeDemoSequence,
} from "@/lib/judge-demo-entry";
import type { RuntimeMode } from "@/lib/runtime-mode";

const STAGE_ICON = {
  QWEN: BrainCircuit,
  ATLAS: SearchCheck,
  POLICY: ShieldCheck,
} as const;

export function JudgeDemoEntry({
  runtimeMode,
  disabled,
  onAutoRecovery,
  onApprovalGate,
}: {
  runtimeMode: RuntimeMode;
  disabled: boolean;
  onAutoRecovery: () => void;
  onApprovalGate: () => void;
}) {
  return (
    <section className="mt-2 overflow-hidden rounded-2xl border border-violet-400/20 bg-[linear-gradient(135deg,rgba(139,92,246,0.09),rgba(14,165,233,0.035)_55%,rgba(16,185,129,0.045))] sm:mt-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-violet-300">
              Judge Demo Proof
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400">
              <TimerReset className="size-3" />
              {JUDGE_DEMO_DURATION_SECONDS}s fast path
            </span>
          </div>
          <h3 className="mt-2 hidden text-sm font-bold tracking-[-0.01em] text-white sm:block">
            One recovery. Three accountable layers.
          </h3>
          <p className="mt-1 hidden max-w-2xl text-[11px] leading-relaxed text-slate-400 sm:block">
            Qwen can orchestrate, Atlas can provide live travel evidence, but only the deterministic policy layer can authorize the recovery or stop at a passenger boundary.
          </p>
        </div>

        <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {runtimeMode === "live" ? "Live · no provider fallback" : "Demo · fallback-safe"}
        </span>
      </div>

      <div className="hidden gap-px bg-white/10 sm:grid md:grid-cols-3">
        {JUDGE_DEMO_STAGES.map((stage, index) => {
          const Icon = STAGE_ICON[stage.id];
          return (
            <article key={stage.id} className="bg-[#0a1020]/92 px-4 py-3.5">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-200">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold text-slate-500">
                      0{index + 1}
                    </span>
                    <p className="text-xs font-bold text-slate-100">{stage.label}</p>
                  </div>
                  <p className="mt-0.5 text-[10px] font-semibold text-cyan-300">{stage.role}</p>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">{stage.proof}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="px-3 py-3 sm:px-4 sm:py-3.5">
        <div className="hidden flex-wrap gap-1.5 sm:flex">
          {judgeDemoSequence().map((step) => (
            <span
              key={step}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.025] px-2 py-1 font-mono text-[9px] text-slate-400"
            >
              <CheckCircle2 className="size-2.5 text-emerald-400" />
              {step}
            </span>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="hidden text-[10px] text-slate-500 sm:block">
            Both buttons run the real recovery engine; they differ only in delegated spend authority.
          </p>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <button
              type="button"
              disabled={disabled}
              onClick={onAutoRecovery}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-2 text-center text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-400/15 disabled:opacity-50 sm:px-3.5"
            >
              <Play className="size-3" fill="currentColor" />
              Run Auto Recovery · $50
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onApprovalGate}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-2 text-center text-[10px] font-bold text-amber-300 transition hover:bg-amber-400/15 disabled:opacity-50 sm:px-3.5"
            >
              <ShieldCheck className="size-3" />
              Run Human Boundary · $10
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
