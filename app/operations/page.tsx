import { AgentConsole } from "@/components/agent-console";
import { CaseCard } from "@/components/case-card";
import { DecisionTrace } from "@/components/decision-trace";
import { OpsSummary } from "@/components/ops-summary";

export default function OperationsPage() {
  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-2xl">
          <p className="label-caps text-primary">Agent operations</p>
          <h1 className="mt-2.5 text-3xl leading-[1.15] font-semibold tracking-[-0.025em]">
            Case console
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Every disruption becomes a case with a full decision record.
          </p>
        </div>
        <span className="label-caps rounded-full border border-border/80 bg-card px-2.5 py-1 text-muted-foreground">
          Single-tenant sandbox
        </span>
      </div>

      <div className="mt-8">
        <OpsSummary />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <CaseCard />
        <DecisionTrace />
      </div>

      <div className="mt-6">
        <AgentConsole />
      </div>

    </main>
  );
}
