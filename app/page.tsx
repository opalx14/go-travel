"use client";

import { AgentTraceDrawer } from "@/components/agent-trace-drawer";
import { AirportScene } from "@/components/airport-scene";
import { JourneyTimeline } from "@/components/journey-timeline";
import { MobileDock } from "@/components/mobile-dock";
import { useDemo } from "@/lib/demo-store";
import { SCHEDULE_CHANGE_EVENT } from "@/lib/scenario";

export default function PassengerPage() {
  const { trip, intent, phase, outcome, isProtected } = useDemo();
  const changed = phase !== "idle";
  const ready = outcome?.status === "RECOVERED";
  const moving = isProtected && !ready;
  const selectedFlight = outcome?.selected;

  return (
    <main className={`ti-canvas relative flex w-full flex-1 flex-col overflow-hidden text-foreground ${isProtected ? "pb-24 md:pb-0" : ""}`}>

      {/* 1. FULL-SCREEN / FULL-PAGE AIRPORT OPERATIONS DIGITAL TWIN & CENTER CHAT */}
      <section className="relative z-10 w-full overflow-hidden">
        <AirportScene
          origin={trip.origin}
          destination={trip.destination}
          moving={moving}
          disrupted={changed && !ready}
          recovered={ready}
          flight={trip}
          disruptedFlight={{
            departure: SCHEDULE_CHANGE_EVENT.newDeparture,
            arrival: SCHEDULE_CHANGE_EVENT.newArrival,
          }}
          recoveredFlight={selectedFlight}
          phase={phase}
          isProtected={isProtected}
          intent={intent}
        />
      </section>

      {isProtected && (
        <>
          {/* 2. AGENT OPERATIONS & RECOVERY TIMELINE */}
          <section
            id="agent-pipeline"
            className="ti-section-fade relative z-10 -mt-8 w-full flex-1 px-4 pb-12 pt-20 sm:-mt-12 sm:px-8 sm:pb-16 sm:pt-24"
          >
            <div className="mx-auto mb-7 flex w-full max-w-5xl flex-wrap items-end justify-between gap-4 border-b ti-divider pb-5">
              <div>
                <span className="label-caps font-bold text-cyan-400">
                  Mission Workflow
                </span>
                <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.025em] text-slate-100 sm:text-2xl">
                  Outcome Protection & Autonomous Recovery
                </h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 font-mono text-[11px] text-slate-400">
                Trip ID · {trip.id}
              </span>
            </div>

            <div className="mx-auto w-full max-w-5xl">
              <JourneyTimeline showHero={false} />
            </div>
          </section>

          {/* 3. TECHNICAL AGENT TRACE DRAWER */}
          <AgentTraceDrawer />
          <MobileDock />
        </>
      )}
    </main>
  );
}
