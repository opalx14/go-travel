# TripIntent

> **Autonomous Disruption Recovery & Intelligent Fulfilment Layer for Travel Sellers**  
> *Built for the Alibaba Cloud × Atlas × Qoder Agentic AI Hackathon 2026*  
> **Primary Track**: **Flights & Aviation** (with Fintech P&L Economics & Data Provenance)

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

### 4. Margin & Revenue Protection (Business P&L)
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
- **LLM Intent Parser**: Qwen via Alibaba Cloud DashScope (`qwen-flash`) with deterministic fallback
- **Flight & Retailing Infrastructure**: Atlas Flight Booking Skill & Sandbox
- **Persistence**: Device-scoped SQLite database
- **P&L Model**: 12% demo service-margin assumption (minimum $6); AP/AR modeled transparently

*Note: This is a hackathon demonstration project operating against the Atlas Sandbox environment. Live order placement and settlement remain modeled.*

---

## Verification & Testing

```bash
bun test             # 87+ unit and integration tests passing
bun run lint         # ESLint check
bun run build        # Production bundle build
bun run atlas:smoke  # Read-only Atlas CLI verification test
```

---

## Getting Started

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the TripIntent passenger experience, or [http://localhost:3000/operations](http://localhost:3000/operations) for the Business Operations Control Center.
