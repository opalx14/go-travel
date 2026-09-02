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

## Architecture & Workflow

```text
Traveler natural-language brief
  ↓
Qwen intent extraction (Alibaba Cloud DashScope)
  ↘ deterministic local fallback (zero crash guarantee)
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

### 4. Privacy Boundary Before Hosted Models
Traveler-authored text is sanitized before it can be sent to DashScope. The redaction layer removes labeled PNR/booking references, passport and ID numbers, payment-card numbers, email addresses, phone numbers, and explicitly labeled passenger names. Deterministic local parsing remains available when hosted inference is unavailable.

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
- **LLM Intent Parser**: Qwen via Alibaba Cloud DashScope (`QWEN_MODEL`, default `qwen3.8-flash`) with deterministic fallback
- **LLM Decision Explanation**: the same configured Qwen model explains an already-computed deterministic decision; it cannot change selection, policy, price, or approval state
- **Disruption Signal**: simulated schedule-change event for the hackathon scenario; never presented as Atlas monitoring data
- **Flight & Retailing Infrastructure**: Atlas Flight Booking Skill & Sandbox for search, offer verification, baggage lookup, and price re-check
- **Deterministic Safety Layer**: hard travel constraints and delegated spending authority are enforced in TypeScript, not delegated to the LLM
- **Hosted-model Privacy Boundary**: traveler text is redacted before DashScope receives it; PNR, labeled identity fields, payment-card numbers, email addresses, and phone numbers are not intentionally forwarded
- **Token Control**: intent extraction uses one structured Qwen call with a 180-token output cap; explanation uses one read-only call capped at 300 tokens, with deterministic fallbacks for both paths
- **Persistence**: device-scoped SQLite database
- **P&L Model**: 12% demo service-margin assumption (minimum $6); AP/AR modeled transparently

*Note: This is a hackathon demonstration project. Demo mode is the default. Live mode removes Qwen/Atlas fallback for connected verification, but live order placement, payment, ticket issuance, settlement, and airline disruption ingestion remain outside this prototype.*

---

## Judge Evidence Map

| Claim | Runtime evidence | Code path | Verification |
| --- | --- | --- | --- |
| Natural-language outcome contract | Qwen / deterministic source shown in the UI | `app/api/intent/parse/route.ts`, `lib/intent-parser.ts` | `lib/intent-parser.test.ts` |
| Hosted-model privacy | Traveler text is redacted before DashScope inference | `lib/privacy-redaction.ts`, `app/api/intent/parse/route.ts` | `lib/privacy-redaction.test.ts` |
| Cheapest can be rejected | Candidate evaluation shows deadline/baggage violations | `lib/policy-engine.ts`, `lib/recovery-engine.ts` | `lib/policy-engine.test.ts`, `lib/recovery-engine.test.ts` |
| Atlas is used for travel evidence | Search/verification source is labeled per candidate and fare | `app/api/atlas/*`, `lib/atlas/*` | Atlas adapter/parser/client tests + `bun run atlas:smoke` |
| LLM cannot override safety | Decision is computed before Qwen explanation is requested | `lib/recovery-engine.ts`, `app/api/agent/explain/route.ts` | `lib/decision-explainer.test.ts` |
| Human-in-the-loop authority gate | `$10` demo scenario pauses before over-authority action | `lib/recovery-engine.ts`, `components/action-zone.tsx` | recovery authority/approval tests |
| Operator observability | Admin shows the same persisted traveler decision stream | `app/api/admin/live/route.ts`, `lib/admin-live.ts`, `components/admin-dashboard.tsx` | SQLite-backed runtime state |

The traveler-side **Agent decision console** also exposes a provenance rail: **Intent → Disruption → Search → Deterministic Decision → Read-only Explanation**.

---

## Verification & Testing

```bash
bun test             # Unit and integration test suite
bun run lint         # ESLint check
bun run build        # Production bundle build
bun run atlas:smoke  # Read-only Atlas CLI verification test
```

---

## Getting Started

```bash
cp .env.example .env.local
bun install
bun run dev
```

`DASHSCOPE_API_KEY` is optional for local verification: without it, intent extraction and decision explanation fall back to deterministic code. This keeps the core recovery flow testable even when hosted-model credentials or network access are unavailable.

Open [http://localhost:3020](http://localhost:3020) to view the TripIntent passenger experience, [http://localhost:3020/admin](http://localhost:3020/admin) for the live operator view, or [http://localhost:3020/operations](http://localhost:3020/operations) for the Business Operations Control Center.
