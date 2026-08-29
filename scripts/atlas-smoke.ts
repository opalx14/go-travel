/**
 * Atlas smoke test — standalone, offline-friendly check that the real CLI
 * works end to end for the demo scenario: search KUL→SIN, then verify the
 * first bookable current-price offer. NEVER creates orders or pays.
 *
 * Run: bun run atlas:smoke
 */
import { createAtlasFlightTool } from "../lib/atlas/adapter";
import { ATLAS_SEARCH } from "../lib/scenario";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function resolveDepartDate(): string {
  const fromEnv = process.env.ATLAS_SANDBOX_DEPART_DATE;
  if (fromEnv && DATE_PATTERN.test(fromEnv)) return fromEnv;
  const date = new Date();
  date.setDate(date.getDate() + 10);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function main(): Promise<void> {
  const depart = resolveDepartDate();
  console.log(
    `[smoke] search ${ATLAS_SEARCH.origin}→${ATLAS_SEARCH.destination} depart=${depart} adults=${ATLAS_SEARCH.adults}`
  );

  const tool = createAtlasFlightTool();
  const search = await tool.searchFlights({
    origin: ATLAS_SEARCH.origin,
    destination: ATLAS_SEARCH.destination,
    depart,
    adults: ATLAS_SEARCH.adults,
  });

  console.log(
    `[smoke] offers: offer_count=${search.offerCount} mapped=${search.returnedCount} search_id=${search.searchId ?? "n/a"}`
  );

  if (search.empty || search.candidates.length === 0) {
    console.log(
      "[smoke] SEARCH_NO_RESULTS for this date — no offer to verify. Set ATLAS_SANDBOX_DEPART_DATE to probe another date."
    );
    return;
  }

  const chosen =
    search.candidates.find(
      (c) => c.bookable === true && c.priceStatus === "current"
    ) ?? null;

  if (!chosen) {
    console.log(
      "[smoke] no bookable current-price offer in this search — verify skipped."
    );
    for (const c of search.candidates.slice(0, 5)) {
      console.log(
        `  - ${c.flightNo} ${c.departure}→${c.arrival} $${c.replacementPriceUsd} bookable=${c.bookable} price_status=${c.priceStatus}`
      );
    }
    return;
  }

  console.log(
    `[smoke] verifying ${chosen.flightNo} ${chosen.departure}→${chosen.arrival} $${chosen.replacementPriceUsd} (offer ${chosen.atlasOfferId})`
  );

  const verification = await tool.verifyOffer(chosen.atlasOfferId as string);
  console.log(`[smoke] price_change: ${verification.priceChange}`);
  console.log(`[smoke] summary: ${verification.summary}`);
  console.log(`[smoke] baggage_status: ${verification.baggageStatus ?? "n/a"}`);
  if (verification.baggageOptions?.length) {
    console.log(
      `[smoke] baggage_options: ${verification.baggageOptions
        .map((option) => `${option.weightKg}kg $${option.price}`)
        .join(", ")}`
    );
  }
}

main().catch((error) => {
  const code =
    error instanceof Error && "code" in error
      ? (error as { code: unknown }).code
      : undefined;
  console.error(`[smoke] FAILED${code ? ` (${String(code)})` : ""}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
