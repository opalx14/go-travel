import { AgentTraceDrawer } from "@/components/agent-trace-drawer";
import { JourneyTimeline } from "@/components/journey-timeline";

export default function PassengerPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-8 sm:py-10">
      <JourneyTimeline />
      <AgentTraceDrawer />
    </main>
  );
}
