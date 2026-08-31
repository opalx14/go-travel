# TripIntent

Book the outcome, not the flight.

Built for the Alibaba Cloud × Atlas × Qoder Agentic AI Hackathon 2026.

## Architecture

```text
Traveler natural-language brief
  ↓
Qwen intent extraction (DashScope)
  ↘ deterministic local fallback
  ↓
TravelIntent contract
  ↓
Deterministic Recovery Policy
  ↓
Atlas Flight Booking Skill / CLI
  ├─ flight search
  ├─ fare verification
  ├─ explicit price-increase confirmation
  └─ baggage option validation
  ↓
Atlas Sandbox
```

The recovery policy never treats an unknown Atlas baggage allowance as confirmed. When the passenger requires checked baggage, TripIntent verifies the selected offer, reads the available baggage options, chooses the cheapest option that satisfies the required weight, and includes that add-on in delegated spending authority.

## Natural-language intent

Set `DASHSCOPE_API_KEY` on the server to enable Qwen extraction. `QWEN_MODEL` is optional and defaults to `qwen-flash`. If Qwen is unavailable or not configured, the app falls back to a deterministic local parser and labels that provenance in the UI.

## Operations & business evidence

`/operations` separates the internal view into two judge-friendly surfaces:

- **Business P&L** — modeled booking value, service revenue, supplier cost, gross profit, revenue protected / at risk, recovery efficiency, and AP / AR exposure.
- **Client bookings** — one pseudonymous row per persisted device journey, including the traveler contract, disruption/recovery status, selected flight, rejected alternatives, delegated spend, and provenance.

The finance layer is intentionally transparent: it uses persisted booking/recovery evidence plus a **12% demo service-margin assumption (minimum $6)**. Atlas Sandbox verifies fares, but this repository does not create or pay live orders, so AP/AR is displayed as modeled/open exposure rather than claimed settlement data. When SQLite has no journeys yet, the operations view uses a deterministic demo cohort so the judging flow remains presentable.

## Provenance

- Development tooling: Qoder
- Intent extraction: Qwen via Alibaba Cloud DashScope when configured; deterministic fallback otherwise
- Travel capability: Atlas Flight Booking
- Environment: Atlas Sandbox
- Disruption event: Simulated
- Flight search / fare verification / price confirmation / baggage options: Atlas Sandbox
- Client operations evidence: device-scoped SQLite persistence
- Finance / P&L: modeled demo economics, not production accounting or settlement

*Note: This is a demonstration project using the Atlas Sandbox environment. It does not perform live production bookings.*

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Verification

```bash
bun test
bun run lint
bun run build
bun run atlas:smoke
```

`atlas:smoke` is read-only with respect to booking: it searches, verifies one eligible offer, and inspects baggage options. It never creates an order or pays.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
