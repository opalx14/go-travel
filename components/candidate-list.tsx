"use client";

import { Check, X } from "lucide-react";
import type { ConstraintCheck } from "@/lib/types";
import type { CandidateView } from "@/lib/presentation";
import { cn } from "@/lib/utils";

/** Destination is trivially true in this scenario — only show it when it fails. */
function visibleChecks(checks: ConstraintCheck[]): ConstraintCheck[] {
  return checks.filter(
    (check) => check.kind !== "DESTINATION" || !check.passed
  );
}

function CheckChip({ check }: { check: ConstraintCheck }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium",
        check.passed
          ? "bg-secondary text-secondary-foreground"
          : check.hard
            ? "bg-rose-50 text-rose-700"
            : "bg-amber-50 text-amber-700"
      )}
      title={check.detail}
    >
      {check.passed ? (
        <Check className="size-3 text-emerald-600" />
      ) : (
        <X className={check.hard ? "size-3 text-rose-600" : "size-3 text-amber-600"} />
      )}
      {check.label}
    </span>
  );
}

/**
 * The agent's evaluation grid: every alternative Atlas returned, scored clause
 * by clause against the passenger's contract. Rejections stay visible — the
 * reasoning is the product.
 */
export function CandidateList({
  candidates,
  showVerdict,
}: {
  candidates: CandidateView[];
  /** Winner and rejections are only revealed once the EVALUATE stage runs. */
  showVerdict: boolean;
}) {
  const hasAtlasCandidates = candidates.some(
    ({ evaluation }) => evaluation.option.source === "ATLAS_SANDBOX"
  );

  return (
    <div>
    <ul className="space-y-2.5">
      {candidates.map(({ evaluation, isSelected }, index) => {
        const { option, valid, reasons } = evaluation;
        const rejected = showVerdict && !valid;
        const won = showVerdict && isSelected;

        return (
          <li
            key={option.id}
            style={{ animationDelay: `${index * 90}ms` }}
            className={cn(
              "animate-in fade-in slide-in-from-bottom-1 rounded-xl border p-3.5 duration-500",
              won && "border-primary/40 bg-primary/[0.04] ring-1 ring-primary/15",
              rejected && "border-dashed bg-muted/30 opacity-70"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{option.label}</span>
                  {option.source && (
                    <span
                      className={cn(
                        "label-caps rounded-full px-2 py-0.5 font-medium",
                        option.source === "ATLAS_SANDBOX"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {option.source === "ATLAS_SANDBOX"
                        ? "Atlas Sandbox"
                        : "Simulated"}
                    </span>
                  )}
                  {won && (
                    <span className="label-caps rounded-full bg-primary px-2 py-0.5 font-medium text-primary-foreground">
                      Best match
                    </span>
                  )}
                  {rejected && (
                    <span className="label-caps rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">
                      Rejected
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {option.flightNo} · {option.airline}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    won ? "text-primary" : "text-foreground"
                  )}
                >
                  +${option.extraCostUsd}
                </p>
                <p className="label-caps text-muted-foreground">Extra</p>
                {option.source === "ATLAS_SANDBOX" &&
                  option.replacementPriceUsd !== undefined && (
                    <p className="mt-1 text-[10px] text-muted-foreground/80 tabular-nums">
                      ${option.replacementPriceUsd} fare{option.baggagePriceUsd !== undefined ? ` + $${option.baggagePriceUsd} baggage` : ""} · vs $0 recoverable*
                    </p>
                  )}
              </div>
            </div>

            <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums">
              <span className="font-medium">{option.departure}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">{option.arrival}</span>
              <span className="text-xs text-muted-foreground">
                · {option.stops ? `${option.stops} stop` : "nonstop"} ·{" "}
                {option.baggageKg !== undefined
                  ? `${option.baggageKg} kg`
                  : "baggage unknown"}
              </span>
            </p>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {visibleChecks(evaluation.checks).map((check) => (
                <CheckChip key={check.kind} check={check} />
              ))}
            </div>

            {rejected && reasons.length > 0 && (
              <p className="mt-2.5 text-xs leading-relaxed text-rose-700">
                {reasons.join(" · ")}
              </p>
            )}
          </li>
        );
      })}
    </ul>
    {hasAtlasCandidates && (
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/80">
        * Scenario assumption: the disrupted ticket has no refundable value,
        so incremental cost = replacement fare − $0.
      </p>
    )}
    </div>
  );
}
