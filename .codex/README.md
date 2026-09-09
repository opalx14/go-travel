# Codex workspace notes for TripIntent

This directory contains repo-local notes for working on TripIntent with Codex. The primary repository instructions remain in [`AGENTS.md`](../AGENTS.md).

## Fast start

```bash
bun install
bun run dev
```

## High-signal verification

```bash
bun test
bun scripts/agent-evals.ts
bun scripts/agent-benchmark.ts
bun run build
```

## Core architecture to preserve

TripIntent separates agentic reasoning from safety-critical authority:

- LLMs may interpret intent, explain decisions, and select only allow-listed next actions.
- Deterministic TypeScript owns travel constraints, delegated spending authority, fare verification, approval gates, and safe-stop behavior.
- Atlas-backed evidence and provider failures must never be silently represented as live success.
- Human approval is required when an action exceeds delegated authority or a verified fare changes beyond the permitted boundary.
- Privacy redaction happens before model inference.

## Useful judge/developer paths

- `lib/agent-planner.ts` — bounded tool planning
- `lib/policy-engine.ts` — deterministic policy checks
- `lib/recovery-engine.ts` — recovery decision flow
- `lib/agent-evals.ts` — reproducible safety/resilience evaluation matrix
- `lib/agent-benchmark.ts` — end-to-end scenario benchmark
- `scripts/agent-loop-smoke.ts` — deterministic/mock agent-loop smoke test
- `scripts/agent-loop-live-smoke.ts` — connected Atlas smoke path

These notes are for current Codex-assisted maintenance and evaluation of the repository; they do not change the provenance claims documented in the main README.
