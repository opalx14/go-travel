# TripIntent — Submission / Finalist Readiness

Date: 2026-09-03

## Local submission gate

Run:

```bash
bun scripts/submission-readiness.ts
```

The guard checks:

- no tracked `.env.local` / `.env.production`;
- no tracked common model-weight artifacts (`.safetensors`, `.gguf`, `.bin`, `.pt`, `.pth`, `.ckpt`);
- no tracked file above 50 MB;
- required judge/runtime evidence files are present;
- current branch is `main`;
- local commits ahead of origin are reported as a warning, not silently pushed.

## Demo mode checklist

Before submission or VPS demo:

1. `bun test`
2. `bun run lint`
3. `bun run build`
4. `bun scripts/agent-evals.ts`
5. `bun scripts/agent-benchmark.ts`
6. Verify `/api/agent/preflight?mode=demo` is not `BLOCKED`.
7. Run one traveler recovery and export the JSON/Markdown judge evidence bundle.
8. Keep disruption provenance labeled `SIMULATED`.
9. Verify fallback labels remain explicit when Qwen or Atlas is unavailable.

## Mac Live mode checklist

Live mode is for the local Mac, not the VPS.

1. Start the configured Qwen3.5-9B MLX runtime on `127.0.0.1:8080`.
2. Run `bun run qwen:smoke`.
3. Run `bun run atlas:smoke`.
4. Run `bun scripts/agent-loop-live-smoke.ts`.
5. Verify `/api/agent/preflight?mode=live` reports `READY`.
6. Confirm Atlas search/verify evidence is live and no silent fallback occurs.
7. Confirm over-authority, price increase, autopilot-off, and broader scope still stop at HITL.

## Final judge flow

Use the built-in 3-minute fast path:

```text
0:00  Problem + Outcome Contract
0:25  Simulated disruption
0:40  Qwen + Atlas orchestration
1:15  Cheapest trap rejected
1:40  Self-repair / bounded retry
2:00  Human authority boundary
2:25  Benchmarks + adversarial proof + SHA-256 audit
2:50  Business outcome
3:00  Stop
```

## Explicit user-controlled release steps

Do **not** perform these automatically:

- push `main` to GitHub;
- create a submission tag;
- deploy/redeploy the VPS;
- rotate or add credentials.

Only perform those after explicit user approval.
