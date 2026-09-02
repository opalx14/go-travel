"use client";

import { useState, useTransition } from "react";
import {
  Bot,
  Check,
  Clock,
  CornerDownLeft,
  Luggage,
  Radio,
  SendHorizontal,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

const PRESET_PROMPTS = [
  {
    id: "standard",
    label: "⚡ KUL → SIN by 18:00 · 20kg bag · $50 flex",
    text: "I need to reach Singapore before 6 PM with at least 20kg checked baggage. If my flight changes, you can spend up to $50 extra without asking me. I can leave up to 3 hours later.",
  },
  {
    id: "urgent",
    label: "💼 Urgent Business · Strict 17:30 Arrival · $100 flex",
    text: "I have a vital client meeting in Singapore at 17:30. Must arrive before 17:30 with 25kg luggage. You have authority to spend up to $100 extra for any verified flight.",
  },
  {
    id: "leisure",
    label: "🧳 Leisure Trip · 30kg Baggage · Flexible Depart",
    text: "Flying to Singapore, need 30kg checked baggage and must arrive by 19:00. Up to 4 hours departure flexibility with $30 extra budget.",
  },
  {
    id: "approval",
    label: "🛡 Approval Gate · $10 max",
    text: "I need to reach Singapore before 6 PM with at least 20kg checked baggage. If my flight changes, you may spend only $10 extra without asking me. I can leave up to 3 hours later.",
  },
];

export function AirportChatCenterpiece({ inline = false }: { inline?: boolean }) {
  const {
    isProtected,
    intent,
    phase,
    outcome,
    protectTrip,
    runJudgeScenario,
    simulateDisruption,
    resetDemo,
  } = useDemo();

  const [brief, setBrief] = useState(PRESET_PROMPTS[0].text);
  const [isParsing, setIsParsing] = useState(false);
  const [, startTransition] = useTransition();

  const handlePresetClick = (presetText: string) => {
    setBrief(presetText);
  };

  const handleSubmit = async () => {
    const value = brief.trim();
    if (!value || isProtected || isParsing) return;
    setIsParsing(true);
    try {
      await protectTrip(value);
    } finally {
      setIsParsing(false);
    }
  };

  const handleJudgeScenario = async (presetText: string) => {
    if (isProtected || isParsing) return;
    setBrief(presetText);
    setIsParsing(true);
    try {
      await runJudgeScenario(presetText);
    } finally {
      setIsParsing(false);
    }
  };

  // If protected, render the sleek compact top Mission HUD
  if (isProtected) {
    const isDisrupted = phase !== "idle" && outcome?.status !== "RECOVERED";
    const isRecovered = outcome?.status === "RECOVERED";

    return (
      <div
        className={cn(
          "pointer-events-auto animate-in fade-in duration-300",
          inline
            ? "w-full"
            : "absolute inset-x-4 top-14 z-30 flex flex-col items-center justify-center zoom-in-95 sm:inset-x-8 sm:top-16"
        )}
      >
        <div
          className={cn(
            "ti-surface w-full rounded-2xl p-3.5 transition-all duration-500",
            !inline && "max-w-2xl",
            isDisrupted
              ? "border-rose-500/30"
              : isRecovered
                ? "border-emerald-500/30"
                : "border-sky-500/20"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b ti-divider pb-2.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                  isDisrupted
                    ? "bg-rose-500 text-white animate-pulse"
                    : isRecovered
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-sky-500 text-slate-950"
                )}
              >
                {isDisrupted ? (
                  <ShieldAlert className="size-3.5" />
                ) : isRecovered ? (
                  <ShieldCheck className="size-3.5" />
                ) : (
                  <Zap className="size-3.5" />
                )}
              </span>
              <span className="font-mono text-xs font-bold tracking-wider text-slate-200">
                {isDisrupted
                  ? "FLIGHT DELAYED"
                  : isRecovered
                    ? "RECOVERY READY"
                    : "TRIP PROTECTED"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {phase === "idle" && (
                <button
                  type="button"
                  onClick={() => startTransition(() => simulateDisruption())}
                  className="ti-status-danger inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition hover:bg-rose-500/15 hover:text-white"
                >
                  <ShieldAlert className="size-3 text-rose-400" />
                  Trigger delay
                </button>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="ti-status-active inline-flex items-center gap-1 rounded-md border px-2 py-1">
                <Clock className="size-3" /> By {intent.latestArrival}
              </span>
              <span className="ti-status-active inline-flex items-center gap-1 rounded-md border px-2 py-1">
                <Luggage className="size-3" /> {intent.minBaggageKg}kg bag
              </span>
              <span className="ti-status-success inline-flex items-center gap-1 rounded-md border px-2 py-1">
                <ShieldCheck className="size-3" /> ${intent.maxExtraSpendUsd} auto
              </span>
            </div>

            <button
              type="button"
              onClick={resetDemo}
              className="text-[11px] font-mono text-slate-400 underline-offset-4 hover:text-white hover:underline"
            >
              Reset Brief
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial state: mobile composer stays fixed at the bottom (commit 04 behavior);
  // desktop keeps the richer intent console in normal document flow.
  return (
    <div
      className={cn(
        "pointer-events-auto animate-in fade-in duration-500",
        inline
          ? "fixed inset-x-0 bottom-0 z-50 bg-[#070c18]/92 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:relative sm:z-auto sm:flex sm:w-full sm:items-center sm:justify-center sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
          : "absolute inset-0 z-30 flex items-center justify-center p-3 zoom-in-95 sm:p-6"
      )}
    >
      {/* Compact mobile composer / richer desktop intent console */}
      <div className="ti-surface relative w-full overflow-hidden rounded-[1.35rem] p-3 sm:max-w-3xl sm:rounded-[1.5rem] sm:p-6">
        {/* Neon Ambient Corner Glows */}
        <div className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 size-40 rounded-full bg-emerald-500/8 blur-3xl" />

        {/* Top Header Badge & Title */}
        <div className="relative hidden flex-col gap-1 sm:flex sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 ring-1 ring-sky-400/40">
              <Bot className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold tracking-widest text-sky-400 uppercase">
                  TripIntent AI Dispatcher
                </span>
                <span className="flex size-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                Where do you need to be?
              </h2>
            </div>
          </div>

          <div className="ti-control hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] sm:flex">
            <Radio className="size-3 text-sky-400 animate-pulse" />
            <span>KUL Terminal 1 · Active</span>
          </div>
        </div>

        {/* Natural Language Prompt Textarea */}
        <div className="ti-surface-subtle relative rounded-2xl p-2 transition-all focus-within:border-sky-400/45 focus-within:bg-slate-900/70 sm:mt-4 sm:p-3">
          <div className="mb-1 flex items-center gap-2 px-1 sm:hidden">
            <span className="flex size-6 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
              <Bot className="size-3.5" />
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-300">
              TripIntent
            </span>
          </div>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            rows={3}
            aria-label="Travel outcome requirement brief"
            placeholder="Tell TripIntent your goal (destination, deadline, baggage, delegated spend authority)..."
            className="max-h-28 min-h-12 w-full resize-none overflow-y-auto bg-transparent px-1 py-1 font-sans text-[15px] leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none sm:min-h-[72px] sm:max-h-40 sm:text-sm"
          />

          {/* Quick Trigger Bar inside textarea */}
          <div className="flex items-center justify-end border-t border-white/10 pt-2 text-[11px] text-slate-400 sm:justify-between">
            <div className="hidden items-center gap-1.5 text-[10px] font-mono text-slate-400 sm:flex">
              <CornerDownLeft className="size-3 text-sky-400" />
              <span>Press Enter to activate protection</span>
            </div>

            <button
              type="button"
              disabled={!brief.trim() || isParsing}
              onClick={() => void handleSubmit()}
              className={cn(
                "ml-auto flex size-10 items-center justify-center gap-2 rounded-full bg-sky-400 p-0 text-xs font-bold text-slate-950 shadow-[0_10px_28px_rgba(14,165,233,0.2)] transition-all hover:bg-sky-300 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 sm:h-auto sm:w-auto sm:rounded-xl sm:px-5 sm:py-2.5",
                isParsing && "animate-pulse"
              )}
            >
              {isParsing ? (
                <>
                  <Sparkles className="size-3.5 animate-spin" />
                  <span className="hidden sm:inline">Compiling Intent...</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Start Protecting Outcome</span>
                  <SendHorizontal className="size-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Judge fast path: one click shows autonomy vs approval without bypassing the real engine. */}
        <div className="mt-3 hidden rounded-xl border border-violet-400/15 bg-violet-400/[0.04] p-2.5 sm:block">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300">
                Judge Fast Path
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                One click: intent → disruption → Atlas search → policy → Qwen explanation.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={isParsing}
                onClick={() => void handleJudgeScenario(PRESET_PROMPTS[0].text)}
                className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-400/15 disabled:opacity-50"
              >
                ▶ Auto Recovery · $50
              </button>
              <button
                type="button"
                disabled={isParsing}
                onClick={() => void handleJudgeScenario(PRESET_PROMPTS[3].text)}
                className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[10px] font-bold text-amber-300 transition hover:bg-amber-400/15 disabled:opacity-50"
              >
                ▶ Approval Gate · $10
              </button>
            </div>
          </div>
        </div>

        {/* Quick Suggestion Presets */}
        <div className="mt-3 hidden sm:block">
          <p className="font-mono text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Quick Scenarios:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_PROMPTS.map((preset) => {
              const isSelected = brief === preset.text;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset.text)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all text-left",
                    isSelected
                      ? "ti-status-active"
                      : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Feature Tags */}
        <div className="mt-3.5 hidden items-center justify-between border-t ti-divider pt-2.5 font-mono text-[10px] text-slate-500 sm:flex">
          <span className="flex items-center gap-1 text-slate-300">
            <Check className="size-3 text-emerald-400" />
            Atlas Sandbox verified booking
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <Check className="size-3 text-sky-400" />
            Qwen Intent Natural Parser
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <Check className="size-3 text-amber-400" />
            Autonomous Disruption Recovery
          </span>
        </div>
      </div>
    </div>
  );
}
