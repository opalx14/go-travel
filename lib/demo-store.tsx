"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  DisruptionEvent,
  Flight,
  RecoveryOutcome,
  RecoveryStep,
  TravelIntent,
} from "./types";
import {
  DEFAULT_INTENT,
  ORIGINAL_FLIGHT,
  SCHEDULE_CHANGE_EVENT,
} from "./scenario";
import { remoteAtlas } from "./atlas/remote-provider";
import {
  approveRecovery as executeApproval,
  declineRecovery as executeDecline,
  runRecovery,
} from "./recovery-engine";

export type DemoPhase = "idle" | "disrupted" | "running" | "complete";

/** A trip always starts unprotected; the passenger opts in with one click. */
export const INITIAL_IS_PROTECTED = false;

/** The agent may only catch a disruption on a protected, idle trip. */
export function canSimulateDisruption(
  isProtected: boolean,
  phase: DemoPhase
): boolean {
  return isProtected && phase === "idle";
}

/** Cosmetic pacing for replaying the deterministic decision timeline. */
const STEP_DELAY_MS = 550;

export interface OpsStats {
  exceptions: number;
  autoResolved: number;
  needsApproval: number;
}

interface DemoStore {
  trip: Flight;
  intent: TravelIntent;
  phase: DemoPhase;
  playedSteps: RecoveryStep[];
  /**
   * The deterministic run currently being replayed. Available as soon as the
   * engine resolves so the console can reveal candidates and the policy gate
   * in step with `playedSteps`.
   */
  activeRun: RecoveryOutcome | null;
  /** The settled outcome, set once the replay finishes. */
  outcome: RecoveryOutcome | null;
  /** Whether the passenger has turned trip protection on. */
  isProtected: boolean;
  exceptions: DisruptionEvent[];
  stats: OpsStats;
  setAutopilot: (enabled: boolean) => void;
  setMaxExtraSpend: (usd: number) => void;
  protectTrip: () => void;
  simulateDisruption: () => void;
  findRecovery: () => void;
  approveRecovery: () => void;
  declineRecovery: () => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoStore | null>(null);

/** Classify provider errors into a passenger-readable failure step. */
function failureMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "Atlas search timed out";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Recovery service unavailable";
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState<Flight>(ORIGINAL_FLIGHT);
  const [intent, setIntent] = useState<TravelIntent>(DEFAULT_INTENT);
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [playedSteps, setPlayedSteps] = useState<RecoveryStep[]>([]);
  const [activeRun, setActiveRun] = useState<RecoveryOutcome | null>(null);
  const [outcome, setOutcome] = useState<RecoveryOutcome | null>(null);
  const [exceptions, setExceptions] = useState<DisruptionEvent[]>([]);
  const [isProtected, setIsProtected] = useState(INITIAL_IS_PROTECTED);
  const [stats, setStats] = useState<OpsStats>({
    exceptions: 0,
    autoResolved: 0,
    needsApproval: 0,
  });

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /**
   * Run-generation guard: any in-flight await captures its generation, and
   * bails when a newer generation exists (Reset while a run is pending).
   */
  const runIdRef = useRef(0);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const protectTrip = useCallback(() => {
    clearTimers();
    setIsProtected(true);

    // Product choreography: once protection is active, the prototype receives
    // the scheduled airline-change event through the same monitored journey
    // flow a real integration would use. The technical trace still labels the
    // disruption source as SIMULATED; there is no separate demo control in the
    // passenger experience.
    timersRef.current.push(
      setTimeout(() => {
        setPlayedSteps([]);
        setActiveRun(null);
        setOutcome(null);
        setExceptions((prev) => [...prev, SCHEDULE_CHANGE_EVENT]);
        setStats((prev) => ({ ...prev, exceptions: prev.exceptions + 1 }));
        setPhase("disrupted");
      }, 5600)
    );
  }, [clearTimers]);

  /**
   * Record the (simulated) schedule change and hold at the disrupted phase.
   * The engine does NOT run yet — the passenger asks for a recovery.
   */
  const simulateDisruption = useCallback(() => {
    // Protection first: the agent only monitors trips the passenger enabled.
    if (!canSimulateDisruption(isProtected, phase)) return;
    clearTimers();
    setPlayedSteps([]);
    setActiveRun(null);
    setOutcome(null);
    setExceptions((prev) => [...prev, SCHEDULE_CHANGE_EVENT]);
    setStats((prev) => ({ ...prev, exceptions: prev.exceptions + 1 }));
    setPhase("disrupted");
  }, [isProtected, phase, clearTimers]);

  const startReplay = useCallback(
    (result: RecoveryOutcome) => {
      setActiveRun(result);

      // Replay the deterministic timeline with a small cadence for the demo.
      result.steps.forEach((step, index) => {
        timersRef.current.push(
          setTimeout(() => {
            setPlayedSteps((prev) => [...prev, step]);
          }, (index + 1) * STEP_DELAY_MS)
        );
      });

      timersRef.current.push(
        setTimeout(() => {
          setOutcome(result);
          setPhase("complete");
          if (result.status === "RECOVERED") {
            setStats((prev) => ({
              ...prev,
              autoResolved: prev.autoResolved + 1,
            }));
          } else if (result.status === "NEEDS_APPROVAL") {
            setStats((prev) => ({
              ...prev,
              needsApproval: prev.needsApproval + 1,
            }));
          }
        }, result.steps.length * STEP_DELAY_MS + STEP_DELAY_MS / 2)
      );
    },
    []
  );

  /** Run the recovery engine against the live (remote) Atlas provider. */
  const findRecovery = useCallback(async () => {
    if (phase !== "disrupted") return;
    const runId = ++runIdRef.current;
    setPhase("running");
    setPlayedSteps([]);
    setActiveRun(null);
    setOutcome(null);

    let result: RecoveryOutcome;
    try {
      result = await runRecovery(ORIGINAL_FLIGHT, intent, remoteAtlas);
    } catch (error) {
      // Search fetch failure/timeout: surface a settled FAILED outcome
      // instead of leaving the UI spinning forever.
      result = {
        status: "FAILED",
        event: SCHEDULE_CHANGE_EVENT,
        evaluations: [],
        selected: null,
        policyCheck: null,
        steps: [
          {
            id: "step-failed",
            title: "Recovery failed",
            detail: failureMessage(error),
            tone: "danger",
          },
        ],
      };
    }

    // A newer generation (Reset) superseded this run — do not resurrect it.
    if (runId !== runIdRef.current) return;

    startReplay(result);
  }, [phase, intent, startReplay]);

  const resetDemo = useCallback(() => {
    // Invalidate any in-flight run so its post-await continuation bails.
    runIdRef.current++;
    clearTimers();
    setTrip(ORIGINAL_FLIGHT);
    setPhase("idle");
    setPlayedSteps([]);
    setActiveRun(null);
    setOutcome(null);
    setExceptions([]);
    setIsProtected(false);
    setStats({ exceptions: 0, autoResolved: 0, needsApproval: 0 });
  }, [clearTimers]);

  /** Replay only the steps appended by an approval/decline decision. */
  const replayAppendedSteps = useCallback(
    (previous: RecoveryOutcome, next: RecoveryOutcome) => {
      const appended = next.steps.slice(previous.steps.length);
      setActiveRun(next);
      appended.forEach((step, index) => {
        timersRef.current.push(
          setTimeout(() => {
            setPlayedSteps((prev) => [...prev, step]);
          }, (index + 1) * STEP_DELAY_MS)
        );
      });
      timersRef.current.push(
        setTimeout(() => {
          setOutcome(next);
          setPhase("complete");
          if (next.status === "NEEDS_APPROVAL") {
            setStats((prev) => ({
              ...prev,
              needsApproval: prev.needsApproval + 1,
            }));
          }
        }, appended.length * STEP_DELAY_MS + STEP_DELAY_MS / 2)
      );
    },
    []
  );

  const approveRecovery = useCallback(async () => {
    if (phase !== "complete") return;
    if (!outcome || outcome.status !== "NEEDS_APPROVAL") return;
    const runId = ++runIdRef.current;
    setPhase("running");
    let next: RecoveryOutcome;
    try {
      next = await executeApproval(ORIGINAL_FLIGHT, outcome, remoteAtlas);
    } catch (error) {
      next = {
        ...outcome,
        status: "FAILED",
        steps: [
          ...outcome.steps,
          {
            id: "step-failed",
            title: "Approval failed",
            detail: failureMessage(error),
            tone: "danger",
          },
        ],
      };
    }
    if (runId !== runIdRef.current) return;
    replayAppendedSteps(outcome, next);
  }, [outcome, phase, replayAppendedSteps]);

  const declineRecovery = useCallback(() => {
    if (phase !== "complete") return;
    if (!outcome || outcome.status !== "NEEDS_APPROVAL") return;
    setPhase("running");
    replayAppendedSteps(outcome, executeDecline(outcome));
  }, [outcome, phase, replayAppendedSteps]);

  const setAutopilot = useCallback((enabled: boolean) => {
    setIntent((prev) => ({ ...prev, autopilot: enabled }));
  }, []);

  const setMaxExtraSpend = useCallback((usd: number) => {
    setIntent((prev) => ({ ...prev, maxExtraSpendUsd: usd }));
  }, []);

  const value = useMemo<DemoStore>(
    () => ({
      trip,
      intent,
      phase,
      playedSteps,
      activeRun,
      outcome,
      isProtected,
      exceptions,
      stats,
      setAutopilot,
      setMaxExtraSpend,
      protectTrip,
      simulateDisruption,
      findRecovery,
      approveRecovery,
      declineRecovery,
      resetDemo,
    }),
    [
      trip,
      intent,
      phase,
      playedSteps,
      activeRun,
      outcome,
      isProtected,
      exceptions,
      stats,
      setAutopilot,
      setMaxExtraSpend,
      protectTrip,
      simulateDisruption,
      findRecovery,
      approveRecovery,
      declineRecovery,
      resetDemo,
    ]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoStore {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return ctx;
}
