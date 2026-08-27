"use client";

import { Check, ShieldCheck, TriangleAlert, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PolicyGateView } from "@/lib/presentation";
import type { FlightOption } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE = {
  ALLOW: {
    label: "Allow",
    band: "bg-emerald-50 ring-emerald-200",
    text: "text-emerald-700",
    icon: ShieldCheck,
  },
  REQUIRE_APPROVAL: {
    label: "Require approval",
    band: "bg-amber-50 ring-amber-200",
    text: "text-amber-700",
    icon: UserCheck,
  },
  NO_OPTION: {
    label: "Deny",
    band: "bg-rose-50 ring-rose-200",
    text: "text-rose-700",
    icon: TriangleAlert,
  },
} as const;

function Fact({
  term,
  value,
  emphasis,
}: {
  term: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="label-caps text-muted-foreground">{term}</p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold tabular-nums",
          emphasis && "text-primary"
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * The bounded-autonomy moment: the agent proposes a recovery, and this
 * deterministic gate decides whether it may act alone or must ask.
 */
export function PolicyGate({
  gate,
  option,
  awaitingDecision,
  onApprove,
  onDecline,
}: {
  gate: PolicyGateView;
  option: FlightOption | null;
  /** True while the passenger still has to answer. */
  awaitingDecision: boolean;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const tone = TONE[gate.decision];
  const Icon = tone.icon;

  return (
    <section className="animate-in fade-in slide-in-from-bottom-1 rounded-xl border bg-card duration-500">
      <header className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
        <p className="label-caps text-foreground">Policy gate</p>
        <p className="text-[11px] text-muted-foreground">
          Deterministic · not model output
        </p>
      </header>

      <div className="px-4 py-3.5">
        {option ? (
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="label-caps text-muted-foreground">
                Best valid option
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {option.label} · {option.flightNo}
              </p>
            </div>
            <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
              arrives {option.arrival}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No alternative satisfied the hard constraints.
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t pt-3.5 sm:grid-cols-4">
          <div>
            <p className="label-caps text-muted-foreground">Hard constraints</p>
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-sm font-semibold",
                gate.hardConstraintsSatisfied
                  ? "text-emerald-700"
                  : "text-rose-700"
              )}
            >
              {gate.hardConstraintsSatisfied && (
                <Check className="size-3.5" strokeWidth={3} />
              )}
              {gate.hardConstraintsSatisfied ? "Satisfied" : "Unmet"}
            </p>
          </div>
          <Fact term="Extra spend" value={`+$${gate.extraCostUsd}`} />
          <Fact
            term="Authority"
            value={`$${gate.authorityUsd}`}
            emphasis
          />
          <Fact term="Autopilot" value={gate.autopilot ? "On" : "Off"} />
        </dl>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 ring-1 ring-inset",
          tone.band
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className={cn("size-4 shrink-0", tone.text)} />
          <p className={cn("label-caps font-medium", tone.text)}>
            {tone.label}
          </p>
          <span className={cn("text-xs", tone.text)}>→</span>
          <p className={cn("truncate text-xs font-medium", tone.text)}>
            {gate.action}
          </p>
        </div>
        {gate.shortfallUsd > 0 && (
          <p className="label-caps text-amber-700">
            Needs ${gate.shortfallUsd} more authority
          </p>
        )}
      </div>

      {awaitingDecision && option && (
        <div className="border-t px-4 py-3.5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {gate.shortfallUsd > 0
              ? `The recovery is valid — it just costs $${gate.shortfallUsd} more than you delegated. Approve it and the agent can verify the fare.`
              : "Autopilot is off, so every recovery waits for your word."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button className="flex-1" onClick={onApprove}>
              Approve +${option.extraCostUsd}
            </Button>
            <Button variant="outline" className="flex-1" onClick={onDecline}>
              Keep current trip
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
