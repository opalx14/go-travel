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
  DecisionExplanation,
  DisruptionEvent,
  Flight,
  RecoveryOutcome,
  RecoveryStep,
  TravelIntent,
} from "./types";
import {
  parseTravelBriefLocally,
  type IntentExtractionSource,
  type IntentField,
  type ParsedTravelBrief,
} from "./intent-parser";
import {
  DEFAULT_INTENT,
  ORIGINAL_FLIGHT,
  SCHEDULE_CHANGE_EVENT,
} from "./scenario";
import type {
  DeviceJourneyResponse,
  DeviceJourneySnapshot,
} from "./device-state";
import { createRemoteAtlasProvider } from "./atlas/remote-provider";
import { buildDeterministicDecisionExplanation } from "./decision-explainer";
import {
  DEFAULT_RUNTIME_MODE,
  runtimeModeHeaders,
  type RuntimeMode,
} from "./runtime-mode";
import {
  approveRecovery as executeApproval,
  declineRecovery as executeDecline,
  runRecovery,
} from "./recovery-engine";

export type DemoPhase = "idle" | "disrupted" | "running" | "complete";
export type EvidenceView = "issue" | "goal";

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

export type PersistenceStatus = "loading" | "saving" | "saved" | "error";

interface IntentParseResponse extends ParsedTravelBrief {
  ok: boolean;
}

interface DecisionExplanationResponse {
  ok: boolean;
  reasoning?: DecisionExplanation;
  error?: string;
}

async function resolveDecisionExplanation(
  outcome: RecoveryOutcome,
  runtimeMode: RuntimeMode
): Promise<DecisionExplanation> {
  const fallback = buildDeterministicDecisionExplanation(outcome);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch("/api/agent/explain", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...runtimeModeHeaders(runtimeMode),
      },
      body: JSON.stringify({ outcome }),
      signal: controller.signal,
    });
    if (!response.ok) return fallback;
    const payload = (await response.json()) as DecisionExplanationResponse;
    return payload.ok && payload.reasoning ? payload.reasoning : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveTravelBrief(
  brief: string,
  fallbackIntent: TravelIntent,
  runtimeMode: RuntimeMode
): Promise<ParsedTravelBrief> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("/api/intent/parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...runtimeModeHeaders(runtimeMode),
      },
      body: JSON.stringify({ brief }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Intent parser unavailable");
    const payload = (await response.json()) as IntentParseResponse;
    if (!payload.ok || !payload.intent || !Array.isArray(payload.matched)) {
      throw new Error("Intent parser returned invalid data");
    }
    return payload;
  } catch (error) {
    if (runtimeMode === "live") throw error;
    return parseTravelBriefLocally(brief, fallbackIntent);
  } finally {
    clearTimeout(timer);
  }
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
  intentMatchedFields: IntentField[];
  intentSource: IntentExtractionSource | null;
  persistenceStatus: PersistenceStatus;
  runtimeMode: RuntimeMode;
  runtimeError: string | null;
  evidenceView: EvidenceView;
  setEvidenceView: (view: EvidenceView) => void;
  changeRuntimeMode: (mode: RuntimeMode) => void;
  setAutopilot: (enabled: boolean) => void;
  setMaxExtraSpend: (usd: number) => void;
  protectTrip: (brief: string) => Promise<void>;
  runJudgeScenario: (brief: string) => Promise<void>;
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
  const [intentMatchedFields, setIntentMatchedFields] = useState<IntentField[]>([]);
  const [intentSource, setIntentSource] = useState<IntentExtractionSource | null>(null);
  const [stats, setStats] = useState<OpsStats>({
    exceptions: 0,
    autoResolved: 0,
    needsApproval: 0,
  });
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>("saved");
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>(DEFAULT_RUNTIME_MODE);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [evidenceView, setEvidenceView] = useState<EvidenceView>("issue");

  const atlasProvider = useMemo(
    () => createRemoteAtlasProvider(runtimeMode),
    [runtimeMode]
  );

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistenceHydratedRef = useRef(false);
  const skipNextPersistRef = useRef(false);
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

  useEffect(() => {
    // Judge/demo entry should always start from a clean traveler state. Persisted
    // SQLite evidence remains available to the admin dashboard, while an
    // explicit ?resume=1 URL can still restore the current device journey for
    // debugging or continuity checks.
    const shouldResume = new URLSearchParams(window.location.search).get("resume") === "1";
    if (!shouldResume) {
      skipNextPersistRef.current = true;
      persistenceHydratedRef.current = true;
      return;
    }

    const controller = new AbortController();

    async function restoreDeviceJourney() {
      try {
        const response = await fetch("/api/device-state", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Device state unavailable");

        const payload = (await response.json()) as DeviceJourneyResponse;
        if (payload.snapshot) {
          const snapshot = payload.snapshot;
          setTrip(snapshot.trip);
          setIntent(snapshot.intent);
          setPhase(snapshot.phase);
          setPlayedSteps(snapshot.playedSteps);
          setActiveRun(snapshot.outcome);
          setOutcome(snapshot.outcome);
          setIsProtected(snapshot.isProtected);
          setExceptions(snapshot.exceptions);
          setStats(snapshot.stats);
          setIntentMatchedFields(snapshot.intentMatchedFields);
          setIntentSource(snapshot.intentSource);
        }
        setPersistenceStatus("saved");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setPersistenceStatus("error");
      } finally {
        if (!controller.signal.aborted) persistenceHydratedRef.current = true;
      }
    }

    void restoreDeviceJourney();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!persistenceHydratedRef.current) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      const snapshot: DeviceJourneySnapshot = {
        version: 1,
        trip,
        intent,
        phase,
        playedSteps,
        outcome,
        isProtected,
        exceptions,
        stats,
        intentMatchedFields,
        intentSource,
        savedAt: new Date().toISOString(),
      };

      setPersistenceStatus("saving");
      void fetch("/api/device-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Device state save failed");
          setPersistenceStatus("saved");
        })
        .catch(() => setPersistenceStatus("error"));
    }, 350);

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [
    exceptions,
    intent,
    intentMatchedFields,
    intentSource,
    isProtected,
    outcome,
    phase,
    playedSteps,
    stats,
    trip,
  ]);

  const protectTrip = useCallback(async (brief: string) => {
    clearTimers();
    setRuntimeError(null);
    const generation = ++runIdRef.current;
    let parsed: ParsedTravelBrief;
    try {
      parsed = await resolveTravelBrief(brief, intent, runtimeMode);
    } catch (error) {
      if (generation === runIdRef.current) setRuntimeError(failureMessage(error));
      return;
    }
    if (generation !== runIdRef.current) return;

    setIntent(parsed.intent);
    setIntentMatchedFields(parsed.matched);
    setIntentSource(parsed.source);
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
  }, [clearTimers, intent, runtimeMode]);

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

  /**
   * Judge fast path: compile the brief, inject the clearly-labelled simulated
   * disruption, then run the exact same recovery engine after a short visual
   * beat. This removes demo clicks without bypassing policy, Atlas, or Qwen.
   */
  const runJudgeScenario = useCallback(async (brief: string) => {
    clearTimers();
    setRuntimeError(null);
    const generation = ++runIdRef.current;
    let parsed: ParsedTravelBrief;
    try {
      parsed = await resolveTravelBrief(brief, intent, runtimeMode);
    } catch (error) {
      if (generation === runIdRef.current) setRuntimeError(failureMessage(error));
      return;
    }
    if (generation !== runIdRef.current) return;

    setIntent(parsed.intent);
    setIntentMatchedFields(parsed.matched);
    setIntentSource(parsed.source);
    setIsProtected(true);
    setPlayedSteps([]);
    setActiveRun(null);
    setOutcome(null);
    setExceptions((prev) => [...prev, SCHEDULE_CHANGE_EVENT]);
    setStats((prev) => ({ ...prev, exceptions: prev.exceptions + 1 }));
    setPhase("disrupted");

    timersRef.current.push(
      setTimeout(() => {
        void (async () => {
          if (generation !== runIdRef.current) return;
          setPhase("running");

          let result: RecoveryOutcome;
          try {
            result = await runRecovery(ORIGINAL_FLIGHT, parsed.intent, atlasProvider);
          } catch (error) {
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

          result = {
            ...result,
            reasoning: await resolveDecisionExplanation(result, runtimeMode),
          };
          if (generation !== runIdRef.current) return;
          startReplay(result);
        })();
      }, 1100)
    );
  }, [atlasProvider, clearTimers, intent, runtimeMode, startReplay]);

  /** Run the recovery engine against the live (remote) Atlas provider. */
  const findRecovery = useCallback(async () => {
    if (phase !== "disrupted") return;
    const runId = ++runIdRef.current;
    setPhase("running");
    setRuntimeError(null);
    setPlayedSteps([]);
    setActiveRun(null);
    setOutcome(null);

    let result: RecoveryOutcome;
    try {
      result = await runRecovery(ORIGINAL_FLIGHT, intent, atlasProvider);
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

    // Qwen may explain the already-decided result, but it never changes the
    // deterministic selection, policy gate, price, or approval state.
    result = {
      ...result,
      reasoning: await resolveDecisionExplanation(result, runtimeMode),
    };

    // A newer generation (Reset) superseded this run — do not resurrect it.
    if (runId !== runIdRef.current) return;

    startReplay(result);
  }, [atlasProvider, phase, intent, runtimeMode, startReplay]);

  const resetDemo = useCallback(() => {
    // Invalidate any in-flight run so its post-await continuation bails.
    runIdRef.current++;
    clearTimers();
    setTrip(ORIGINAL_FLIGHT);
    setIntent(DEFAULT_INTENT);
    setIntentMatchedFields([]);
    setIntentSource(null);
    setPhase("idle");
    setPlayedSteps([]);
    setActiveRun(null);
    setOutcome(null);
    setExceptions([]);
    setIsProtected(false);
    setStats({ exceptions: 0, autoResolved: 0, needsApproval: 0 });
    setRuntimeError(null);
    setEvidenceView("issue");
  }, [clearTimers]);

  const changeRuntimeMode = useCallback(
    (mode: RuntimeMode) => {
      if (mode === runtimeMode) return;
      resetDemo();
      setRuntimeMode(mode);
    },
    [resetDemo, runtimeMode]
  );

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
      next = await executeApproval(ORIGINAL_FLIGHT, outcome, atlasProvider);
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
    next = {
      ...next,
      reasoning: await resolveDecisionExplanation(next, runtimeMode),
    };
    if (runId !== runIdRef.current) return;
    replayAppendedSteps(outcome, next);
  }, [atlasProvider, outcome, phase, replayAppendedSteps, runtimeMode]);

  const declineRecovery = useCallback(() => {
    if (phase !== "complete") return;
    if (!outcome || outcome.status !== "NEEDS_APPROVAL") return;
    setPhase("running");
    const declined = executeDecline(outcome);
    replayAppendedSteps(outcome, {
      ...declined,
      reasoning: buildDeterministicDecisionExplanation(declined),
    });
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
      intentMatchedFields,
      intentSource,
      persistenceStatus,
      runtimeMode,
      runtimeError,
      evidenceView,
      setEvidenceView,
      changeRuntimeMode,
      setAutopilot,
      setMaxExtraSpend,
      protectTrip,
      runJudgeScenario,
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
      intentMatchedFields,
      intentSource,
      persistenceStatus,
      runtimeMode,
      runtimeError,
      evidenceView,
      setEvidenceView,
      changeRuntimeMode,
      setAutopilot,
      setMaxExtraSpend,
      protectTrip,
      runJudgeScenario,
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
