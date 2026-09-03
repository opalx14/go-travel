"use client";

import {
  BrainCircuit,
  DatabaseZap,
  Plane,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useDemo } from "@/lib/demo-store";
import {
  buildExecutionActivity,
  PIPELINE_ORDER,
  SCANNER_STATUSES,
  type PipelineStageId,
} from "@/lib/presentation";
import { cn } from "@/lib/utils";

const STAGE_SHORT: Record<PipelineStageId, string> = {
  OBSERVE: "Observe",
  ASSESS: "Contract",
  SEARCH: "Search",
  EVALUATE: "Evaluate",
  POLICY: "Policy",
  EXECUTE: "Consent",
  VERIFY: "Verify",
};

/**
 * Judge-visible recovery replay. It visualizes evidence ownership without
 * pretending the LLM owns policy: Atlas supplies provider evidence, the
 * deterministic guardian owns critical decisions, and Qwen remains read-only.
 */
export function Scanner() {
  const { playedSteps } = useDemo();
  const activity = buildExecutionActivity(playedSteps);

  return (
    <ScannerBody
      key={activity.stage}
      stage={activity.stage}
      ownerLabel={activity.ownerLabel}
      stageLabel={activity.stageLabel}
      detail={activity.detail}
      statuses={SCANNER_STATUSES[activity.stage]}
    />
  );
}

function ScannerBody({
  stage,
  ownerLabel,
  stageLabel,
  detail,
  statuses,
}: {
  stage: PipelineStageId;
  ownerLabel: string;
  stageLabel: string;
  detail: string;
  statuses: string[];
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (statuses.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % statuses.length),
      1100
    );
    return () => clearInterval(timer);
  }, [statuses.length]);

  const status = statuses[Math.min(index, statuses.length - 1)];
  const activeIndex = PIPELINE_ORDER.indexOf(stage);

  return (
    <div className="px-3 py-5 sm:px-5 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex size-16 items-center justify-center sm:size-20">
            <span className="absolute inset-0 rounded-full border border-primary/15" />
            <span className="absolute inset-0 animate-[radar-spin_1.4s_linear_infinite] rounded-full border-2 border-transparent border-t-primary" />
            <span className="absolute inset-3 animate-pulse rounded-full bg-primary/5" />
            <Plane className="relative size-5 text-primary" />
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <p className="text-base font-semibold tracking-[-0.01em]">
                Recovery engine running
              </p>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-300">
                {stageLabel}
              </span>
            </div>
            <p
              key={status}
              className="animate-in fade-in mt-1.5 text-sm text-muted-foreground duration-300"
            >
              {status}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label="Recovery execution progress">
          {PIPELINE_ORDER.map((item, itemIndex) => {
            const reached = itemIndex <= activeIndex;
            const active = item === stage;
            return (
              <div key={item} className="min-w-0 text-center">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    active
                      ? "bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.45)]"
                      : reached
                        ? "bg-emerald-400/65"
                        : "bg-white/10"
                  )}
                />
                <span
                  className={cn(
                    "mt-1.5 hidden truncate font-mono text-[8px] uppercase tracking-wide sm:block",
                    active ? "text-cyan-300" : reached ? "text-slate-300" : "text-slate-600"
                  )}
                >
                  {STAGE_SHORT[item]}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Active authority
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-200">{ownerLabel}</p>
            </div>
            <span className="font-mono text-[9px] text-slate-500">decision replay · evidence-derived</span>
          </div>
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
            {detail}
          </p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Responsibility
            icon={<DatabaseZap className="size-3.5" />}
            title="Atlas"
            detail="search + fare evidence"
            active={stage === "SEARCH" || stage === "VERIFY"}
          />
          <Responsibility
            icon={<ShieldCheck className="size-3.5" />}
            title="Policy"
            detail="constraints + authority"
            active={stage === "EVALUATE" || stage === "POLICY"}
          />
          <Responsibility
            icon={<UserCheck className="size-3.5" />}
            title="Human"
            detail="consent boundary"
            active={stage === "EXECUTE"}
          />
          <Responsibility
            icon={<BrainCircuit className="size-3.5" />}
            title="Qwen"
            detail="read-only explanation"
            active={false}
          />
        </div>

        <p className="mt-3 text-center font-mono text-[9px] leading-relaxed text-slate-500">
          Qwen explanation is generated after deterministic selection/policy evidence and cannot change fare, authority, or approval.
        </p>
      </div>
    </div>
  );
}

function Responsibility({
  icon,
  title,
  detail,
  active,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 transition-all",
        active
          ? "border-cyan-400/30 bg-cyan-400/[0.07] text-cyan-200"
          : "border-white/8 bg-white/[0.018] text-slate-500"
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold">
        {icon}
        {title}
      </div>
      <p className="mt-1 text-[9px] leading-snug">{detail}</p>
    </div>
  );
}
