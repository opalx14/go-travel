export interface JudgeDemoStage {
  id: "QWEN" | "ATLAS" | "POLICY";
  label: string;
  role: string;
  proof: string;
}

export const JUDGE_DEMO_STAGES: JudgeDemoStage[] = [
  {
    id: "QWEN",
    label: "Qwen Local",
    role: "Understand + orchestrate",
    proof: "Parses the outcome contract and chooses only allow-listed next tools.",
  },
  {
    id: "ATLAS",
    label: "Atlas Sandbox",
    role: "Search + verify",
    proof: "Returns flight inventory, fare freshness, and baggage evidence.",
  },
  {
    id: "POLICY",
    label: "Policy Guardian",
    role: "Decide + stop",
    proof: "Owns deadline, baggage, spend authority, and the human boundary.",
  },
];

export const JUDGE_DEMO_DURATION_SECONDS = 180;

export function judgeDemoSequence(): string[] {
  return [
    "Outcome contract",
    "Simulated disruption",
    "Qwen orchestration",
    "Atlas evidence",
    "Deterministic policy",
    "Human boundary",
  ];
}
