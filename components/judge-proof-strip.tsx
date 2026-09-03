"use client";

import {
  ArrowRight,
  Bot,
  DatabaseZap,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import {
  buildJudgeVisibleProof,
  OPEN_AGENT_TRACE_EVENT,
  type JudgeProofChip,
} from "@/lib/judge-visible-proof";
import { cn } from "@/lib/utils";

function chipIcon(chip: JudgeProofChip) {
  if (chip.label === "Travel evidence") return DatabaseZap;
  if (chip.label === "Decision authority") return ShieldCheck;
  if (chip.label === "Execution boundary") return UserCheck;
  return Bot;
}

export function JudgeProofStrip() {
  const { phase, activeRun, outcome, runtimeMode } = useDemo();
  const run = outcome ?? activeRun;
  const proof = buildJudgeVisibleProof({ phase, outcome: run, runtimeMode });

  if (!proof) return null;

  return (
    <section
      aria-label="Judge-visible agent proof"
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 rounded-2xl border p-4 duration-500 sm:p-5",
        proof.tone === "success" && "border-emerald-400/20 bg-emerald-400/[0.045]",
        proof.tone === "warning" && "border-amber-400/20 bg-amber-400/[0.045]",
        proof.tone === "danger" && "border-rose-400/20 bg-rose-400/[0.045]",
        proof.tone === "info" && "border-sky-400/20 bg-sky-400/[0.045]"
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p
            className={cn(
              "label-caps font-bold",
              proof.tone === "success" && "text-emerald-300",
              proof.tone === "warning" && "text-amber-300",
              proof.tone === "danger" && "text-rose-300",
              proof.tone === "info" && "text-sky-300"
            )}
          >
            {proof.eyebrow}
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-[-0.02em] text-slate-100 sm:text-lg">
            {proof.headline}
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
            {proof.detail}
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_AGENT_TRACE_EVENT))}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-4 py-2.5 text-xs font-semibold text-slate-100 transition hover:border-sky-400/30 hover:bg-sky-400/10"
        >
          Open 3-min technical proof
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {proof.chips.map((chip) => {
          const Icon = chipIcon(chip);
          return (
            <div
              key={`${chip.label}-${chip.value}`}
              className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-black/10 px-3 py-2.5"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                  chip.state === "live" && "bg-emerald-400/10 text-emerald-300",
                  chip.state === "guarded" && "bg-sky-400/10 text-sky-300",
                  chip.state === "fallback" && "bg-slate-400/10 text-slate-400",
                  chip.state === "human" && "bg-amber-400/10 text-amber-300"
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  {chip.label}
                </p>
                <p className="truncate text-[11px] font-semibold text-slate-200">
                  {chip.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
