# TripIntent

> **Autonomous Disruption Recovery & Intelligent Fulfilment Layer for Travel Sellers**  
> *Built for the Alibaba Cloud × Atlas × Qoder Agentic AI Hackathon 2026*  
> **Primary Track**: **Flights & Aviation**  
> Supporting layers: recovery economics, audit provenance, and operator observability

---

## The Core Philosophy: Outcome Over Naive Price

Search is becoming a commodity; the next competitive advantage for Travel Sellers is **reliable fulfilment and post-booking recovery**. When an airline changes its flight schedule, travelers don't care how pretty the search result was—they care whether their trip outcome is preserved.

Furthermore, **reliability protects brand loyalty and seller margins**: a $50 LCC ticket that generates $20 in manual support cost means the travel seller is subsidizing the transaction. 

**TripIntent** bridges this gap:
- **Atlas** provides direct intelligent airline retailing & live infrastructure across 140+ LCCs.
- **TripIntent** acts as the autonomous agentic recovery layer on top of Atlas:

$$\text{Disruption Signal} \longrightarrow \text{Outcome Contract} \longrightarrow \text{Atlas Search} \longrightarrow \text{Policy Gate} \longrightarrow \text{Fare Re-Check} \longrightarrow \text{Revenue \& Margin Protected}$$

> **Signature Hackathon Moment**:  
> *"Cheapest option rejected. Traveler outcome protected. $89 revenue protected for $19 recovery spend."*

---

## Domain Model: Qwen3.5-9B for Travel Recovery

TripIntent uses **`mlx-community/Qwen3.5-9B-MLX-4bit`** as its default local/self-hosted language model on Apple Silicon. The 9B profile is intentionally chosen as a resource-aware fit for the 32 GB development Mac while still leaving deterministic code in control of safety-critical decisions. The model is **not** the policy engine; its role is bounded to language-heavy tasks where an LLM adds value while deterministic code retains authority:

- **Traveler intent normalization** — English/Vietnamese travel briefs → a strict Outcome Contract (`latestArrival`, flexibility, baggage, delegated extra spend, autopilot).
- **Read-only decision explanation** — explains why the deterministic recovery engine selected/rejected options without changing flight, fare, constraints, or approval state.
- **Privacy-first inference** — PNR, labeled identity fields, payment-card data, email, and phone are redacted before model inference.
- **Deployment resilience** — the Mac can run Qwen locally; GitHub/VPS do not ship model weights and Demo mode remains usable through deterministic fallback.
- **Resource-aware default** — Qwen3.5-9B 4-bit is the normal development/runtime profile; Qwen3.5-27B remains an optional benchmark profile only and is not required for the demo or deployment.

### TripIntent LoRA specialization

The repository also includes a small, auditable MLX-LM LoRA dataset and training entry point under `training/qwen-tripintent/`. The specialization follows the hackathon theme rather than trying to teach the model to make unsafe booking decisions:

1. Multilingual disruption-recovery intent extraction.
2. Outcome-over-price reasoning language.
3. Human-in-the-loop / spending-authority explanations.
4. Atlas verification and fare-change checkpoint explanations.
5. Safe failure behavior when no policy-valid recovery exists.

The LoRA dataset deliberately contains **no real passenger PII and no live booking credentials**. Policy math, Atlas fare verification, and booking authority remain outside the learned model.

```bash
# Stop the inference server first so the 32 GB Mac has maximum unified memory.
TRIPINTENT_QWEN_ITERS=40 bash scripts/qwen-lora-train.sh

# Serve the base model with the trained TripIntent adapter.
mlx_lm.server \
  --model mlx-community/Qwen3.5-9B-MLX-4bit \
  --adapter-path .artifacts/qwen-tripintent-lora-9b \
  --host 127.0.0.1 \
  --port 8080 \
  --chat-template-args '{"enable_thinking":false}'
```

The committed train/validation/test files are intentionally small and reviewable for the hackathon. They are a **domain-adaptation seed set**, not a claim of a production-scale training corpus. A production path would expand this set with consented/de-identified recovery conversations, harder multilingual edge cases, and offline evaluation against deterministic ground truth before promoting an adapter.

---

## Architecture & Workflow

```text
Traveler natural-language brief
  ↓
Qwen3.5-9B 4-bit intent extraction (local/self-hosted OpenAI-compatible endpoint)
  ↘ deterministic TypeScript fallback (zero crash guarantee)
  ↓
TravelIntent Contract (Arrival deadline · Baggage allowance · Flexibility · Spend Authority)
  ↓
Deterministic Recovery Engine & Policy Gate
  ↓
Atlas Flight Booking Skill / CLI
  ├─ 1. Live Flight Search (140+ LCCs)
  ├─ 2. Ancillary & Baggage Option Lookup
  ├─ 3. Provider Fare Verification & Price Re-check
  └─ 4. Explicit Price-Increase Confirmation Safety Gate
  ↓
Qwen Decision Explanation (read-only)
  └─ Explains selected / rejected options without changing the deterministic result
  ↓
Fulfilment & Post-Booking Operations (ATRIP Model)
  ├─ Ticketing SLA (<5 min adherence)
  ├─ Revenue Protected Hero KPI ($89 retained)
  ├─ Modeled AP / AR & Refund Exposure
  └─ Unit Margin Protection (12% gross profit preserved)
```

---

## Bounded Agent Orchestration (Qwen → Atlas Tools)

TripIntent also includes a judge/dev orchestration harness that makes the agent loop explicit without weakening the production safety model. Qwen may choose the **next tool**, but only from a deterministic allow-list derived from runtime state. Tool execution, travel constraints, spending authority, fare verification, and passenger approval remain code-owned guardrails.

```text
Qwen Planner
  ↓ chooses one allow-listed action
load_contract / inspect_disruption / search_alternatives / evaluate_contract
  ↓
Atlas Live search + verify + baggage evidence
  ↓
Deterministic Policy Guardian
  ├─ within authority → continue
  └─ over authority / fare increase → request_approval and STOP
```

Two smoke harnesses keep this claim reproducible:

```bash
bun scripts/agent-loop-smoke.ts       # Qwen planner + deterministic/mock tools
bun scripts/agent-loop-live-smoke.ts  # Qwen planner + Atlas Sandbox Live; refuses fallback evidence
```

The live harness can reject a selected Atlas offer after verification (for example when baggage cannot be confirmed), return to the remaining candidates, and re-run deterministic evaluation. It never invents a `book_flight` tool and never auto-approves delegated spend. This orchestration path is kept as **judge/dev evidence** until it has enough regression coverage to replace any part of the stable traveler recovery workflow.

### Agent stress / safety evals

TripIntent also exposes a reproducible deterministic eval matrix in the Technical Proof drawer and through `bun scripts/agent-evals.ts`. The current suite passes **16/16 gates** covering: cheapest-but-late rejection, delegated-spend approval, baggage-adjusted re-check, self-repair after Atlas offer expiry, self-repair after provider verification failure, self-repair when required baggage is unavailable, bounded recovery from one transient Atlas search failure, bounded recovery from one transient Atlas verification failure, hard stop after the retry budget is exhausted, provider fare-increase checkpoint, no-inventory safe failure, midnight-crossing time correctness, privacy redaction, a capability permission manifest, tamper-evident decision fingerprinting, and rejection of invented planner tools. These gates intentionally run without network/model dependencies; Qwen + Atlas Live behavior remains a separate smoke test so provider availability cannot manufacture a safety pass.

---

## Key Pillars Aligned with Atlas

### 1. Reliable Fulfilment & Post-Booking Recovery
Recovery does not stop at finding a flight. TripIntent evaluates whether the candidate meets the traveler's exact outcome constraints (arrival time, baggage weight, departure window), validates baggage availability through Atlas, and confirms ticketing SLA (<5 min).

### 2. Contract > Naive Price Sorting
Naive AI agents pick the cheapest flight. TripIntent prioritizes the **traveler's outcome contract**:
- **Flight C ($5 extra)**: CHEAPEST → **REJECTED** (Arrives 19:40, violates 18:00 deadline).
- **Flight B ($19 extra)**: **SELECTED & VERIFIED** (Arrives 16:35 on-time, 20kg bag confirmed, inside $50 authority).

### 3. Agent Spending Safety Gates
The agent never spends blindly:
- If extra cost $\le$ `maxExtraSpendUsd` + Autopilot ON $\rightarrow$ **Autonomous Execution**.
- If extra cost $>$ `maxExtraSpendUsd` or Fare increased $\rightarrow$ **Passenger Approval Gate**.
- Qwen can explain *why* a recovery was selected or rejected, but it cannot override the deterministic policy decision.

The traveler demo includes both an autonomous `$50` authority scenario and a `$10` approval-gate scenario. The desktop **Judge Fast Path** can launch either scenario in one click while still running the same Qwen intent parser, simulated disruption event, Atlas search/verification, deterministic policy gate, and read-only Qwen explanation.

### Runtime Modes: Demo by Default, Live on Demand

TripIntent exposes two runtime modes from the header while keeping one shared UI and recovery engine:

- **Demo (default)** — judge-safe mode. Qwen and Atlas are used when available, but unavailable providers or zero Atlas inventory may fall back to clearly-labelled deterministic/local evidence so the three-minute demo remains reproducible.
- **Live** — connected verification mode. Qwen intent extraction and Atlas search must succeed; simulated provider fallback is disabled. A missing or unavailable connected provider is surfaced as an error rather than silently replaced with demo data.

Both modes still use the same deterministic policy engine and human approval gates. The schedule-change trigger itself remains **SIMULATED in both modes** because the current Atlas Flight Booking integration does not expose airline disruption monitoring. Live mode therefore means live/connected Qwen + Atlas search/verification, not a claim of a production airline event feed.

### 4. Privacy Boundary Before Model Inference
Traveler-authored text is sanitized before it reaches the configured Qwen inference server. The redaction layer removes labeled PNR/booking references, passport and ID numbers, payment-card numbers, email addresses, phone numbers, and explicitly labeled passenger names. Deterministic parsing remains available when the model server is absent or unavailable.

### 5. Margin & Revenue Protection (Business P&L)
The `/operations` dashboard elevates **"Revenue Protected by Autonomous Recovery"** as the #1 Hero KPI:
- **Protected Booking Value**: Preserves customer lifetime value and avoids cancellations.
- **Support Cost Eliminated**: Replaces hours of customer support with a 3-second autonomous resolution.
- **ATRIP Settlement Control**: Tracks modeled Customer AR, Supplier AP, and open refund exposure.

---

## Operations & ATRIP Evidence Dashboard

Navigate to `/operations` in the app to inspect:

1. **Business P&L**:
   - **Hero KPI**: Revenue Protected by Autonomous Recovery (`$99.68` demo cohort).
   - **Recovery ROI**: `$5.25 protected per $1 spend`.
   - **Ticketing SLA Adherence**: `100% (<5 min target)`.
   - **Fare Verification Rate**: `100% Atlas price re-checked before commit`.
   - **AP/AR & Refund Exposure**: Modeled settlement balances.

2. **Client Bookings Ledger**:
   - Pseudonymous device-scoped booking journeys with full audit trails.
   - Fulfilment status (`Confirmed`, `Ticketed`, `Disrupted`, `Recovered`).
   - Explicit rejection traces (`2 rejected: cheapest arrived 19:40 > 18:00`).

---

## Provenance & Attribution

- **Development Tooling**: Qoder IDE
- **LLM Intent Parser**: open-weight Qwen3.5-9B 4-bit through a local/self-hosted OpenAI-compatible endpoint (`LOCAL_QWEN_CHAT_COMPLETIONS_URL`), with deterministic fallback
- **LLM Decision Explanation**: the same local/self-hosted Qwen model explains an already-computed deterministic decision; it cannot change selection, policy, price, or approval state
- **Bounded Agent Planner**: Qwen can select the next action only from a deterministic runtime allow-list; unknown or disallowed tool choices are rejected and fall back safely
- **Disruption Signal**: simulated schedule-change event for the hackathon scenario; never presented as Atlas monitoring data
- **Flight & Retailing Infrastructure**: Atlas Flight Booking Skill & Sandbox for search, offer verification, baggage lookup, and price re-check
- **Deterministic Safety Layer**: hard travel constraints and delegated spending authority are enforced in TypeScript, not delegated to the LLM
- **Model Privacy Boundary**: traveler text is redacted before it reaches the configured inference endpoint; PNR, labeled identity fields, payment-card numbers, email addresses, and phone numbers are not intentionally forwarded
- **Token Control**: intent extraction uses one structured Qwen call with a 180-token output cap; explanation uses one read-only call capped at 300 tokens, with deterministic fallbacks for both paths
- **AI Runtime Evidence**: `/api/ai/health` probes the self-hosted OpenAI-compatible model catalog and reports whether Qwen is configured, reachable, and ready; the header surfaces Qwen Local vs deterministic fallback without exposing secrets
- **Deployment Split**: model weights live only in the local Hugging Face/MLX cache; GitHub and the VPS contain application code only and do not require a local Qwen model to boot
- **Persistence**: device-scoped SQLite database
- **P&L Model**: 12% demo service-margin assumption (minimum $6); AP/AR modeled transparently

*Note: This is a hackathon demonstration project. Demo mode is the default. Live mode removes Qwen/Atlas fallback for connected verification, but live order placement, payment, ticket issuance, settlement, and airline disruption ingestion remain outside this prototype.*

---

## Judge Evidence Map

| Claim | Runtime evidence | Code path | Verification |
| --- | --- | --- | --- |
| Natural-language outcome contract | Qwen / deterministic source shown in the UI | `app/api/intent/parse/route.ts`, `lib/intent-parser.ts` | `lib/intent-parser.test.ts` |
| Model privacy | Traveler text is redacted before Qwen inference | `lib/privacy-redaction.ts`, `app/api/intent/parse/route.ts` | `lib/privacy-redaction.test.ts` |
| Cheapest can be rejected | Candidate evaluation shows deadline/baggage violations | `lib/policy-engine.ts`, `lib/recovery-engine.ts` | `lib/policy-engine.test.ts`, `lib/recovery-engine.test.ts` |
| Atlas is used for travel evidence | Search/verification source is labeled per candidate and fare | `app/api/atlas/*`, `lib/atlas/*` | Atlas adapter/parser/client tests + `bun run atlas:smoke` |
| LLM cannot override safety | Decision is computed before Qwen explanation is requested | `lib/recovery-engine.ts`, `app/api/agent/explain/route.ts` | `lib/decision-explainer.test.ts` |
| Qwen can orchestrate tools without owning policy | Planner selects only from state-derived `allowedTools`; Atlas Live smoke refuses simulated fallback | `lib/agent-planner.ts`, `scripts/agent-loop-live-smoke.ts` | `lib/agent-planner.test.ts`, `bun scripts/agent-loop-smoke.ts`, `bun scripts/agent-loop-live-smoke.ts` |
| Safety/resilience gates stay reproducible | Technical Proof shows a 16/16 PASS matrix plus Failure Lab, capability manifest, and SHA-256 decision fingerprinting; changing Qwen prose does not alter the hash, changing fare/policy facts does | `lib/agent-evals.ts`, `lib/provider-retry.ts`, `lib/agent-tool-manifest.ts`, `lib/agent-audit.ts`, `components/agent-audit-panel.tsx` | `lib/agent-evals.test.ts`, `lib/agent-audit.test.ts`, `lib/agent-tool-manifest.test.ts`, `bun scripts/agent-evals.ts` |
| End-to-end behavior is benchmarked | Technical Proof runs a deterministic scenario matrix spanning autonomous recovery, two HITL paths, impossible deadline failure, provider price jump, baggage self-repair and transient search recovery | `lib/agent-benchmark.ts`, `app/api/agent/benchmark/route.ts`, `components/agent-benchmark-panel.tsx` | `lib/agent-benchmark.test.ts`, `bun scripts/agent-benchmark.ts` |
| Self-hosted AI is verifiable | Header badge and `/api/ai/health` show configured / connected / model-ready state | `app/api/ai/health/route.ts`, `components/nav-header.tsx`, `lib/qwen-runtime.ts` | `lib/qwen-runtime.test.ts`, `bun run qwen:smoke` |
| Human-in-the-loop authority gate | `$10` demo scenario pauses before over-authority action | `lib/recovery-engine.ts`, `components/action-zone.tsx` | recovery authority/approval tests |
| Operator observability | Admin shows the persisted traveler decision stream; Technical Proof derives replayable run telemetry from the same outcome (candidates, rejects, retries, repairs, approval, verification, explanation source) | `app/api/admin/live/route.ts`, `lib/admin-live.ts`, `lib/agent-telemetry.ts`, `components/agent-telemetry-panel.tsx` | SQLite-backed runtime state + `lib/agent-telemetry.test.ts` |

The traveler-side **Agent decision console** also exposes a provenance rail: **Intent → Disruption → Search → Deterministic Decision → Read-only Explanation**.

---

## Verification & Testing

```bash
bun test             # Unit and integration test suite
bun run lint         # ESLint check
bun run build        # Production bundle build
bun run atlas:smoke  # Read-only Atlas CLI verification test
bun run qwen:smoke   # OpenAI-compatible local Qwen endpoint verification
bun scripts/agent-evals.ts  # 8 deterministic agent safety/resilience gates
bun scripts/agent-loop-smoke.ts       # Bounded Qwen planner with deterministic tool evidence
bun scripts/agent-loop-live-smoke.ts  # Bounded Qwen planner against Atlas Sandbox Live
bun scripts/agent-benchmark.ts        # End-to-end deterministic recovery scenario matrix
```

---

## Getting Started

```bash
cp .env.example .env.local
bun install
bun run dev
```

### Local Qwen on Apple Silicon

The repository does **not** contain model weights. On the development Mac, install MLX-LM and run the quantized 9B model as a local OpenAI-compatible server:

```bash
uv tool install mlx-lm
mlx_lm.server \
  --model mlx-community/Qwen3.5-9B-MLX-4bit \
  --host 127.0.0.1 \
  --port 8080 \
  --chat-template-args '{"enable_thinking":false}'
```

With the `.env.example` values copied into `.env.local`, verify the direct model endpoint with:

```bash
bun run qwen:smoke
```

Then run TripIntent normally with `bun run dev`. Demo mode uses Qwen when the local endpoint is configured and healthy, but falls back deterministically if it is absent. Live mode requires the configured Qwen endpoint plus Atlas and surfaces provider failures instead of silently substituting demo evidence.

On the VPS, leave `LOCAL_QWEN_CHAT_COMPLETIONS_URL` unset unless a reachable self-hosted inference server exists. The core recovery flow will still boot and run in Demo mode without Qwen weights or any hosted-model API key.

Open [http://localhost:3020](http://localhost:3020) to view the TripIntent passenger experience, [http://localhost:3020/admin](http://localhost:3020/admin) for the live operator view, or [http://localhost:3020/operations](http://localhost:3020/operations) for the Business Operations Control Center.
