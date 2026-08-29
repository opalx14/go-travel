import { describe, expect, test } from "bun:test";
import { createAtlasFlightTool } from "./adapter";
import type { CliRunner, CliRunResult } from "./cli-client";

function result(stdout: unknown): CliRunResult {
  return {
    stdout: JSON.stringify(stdout),
    stderr: "",
    exitCode: 0,
    timedOut: false,
  };
}

describe("createAtlasFlightTool — verification and baggage", () => {
  test("lists baggage after an unchanged verified fare", async () => {
    const calls: string[][] = [];
    const runner: CliRunner = async (_command, args) => {
      calls.push(args);
      if (args[0] === "offer") {
        return result({
          status: "success",
          code: "OFFER_VERIFIED",
          data: {
            booking_id: "book_opaque",
            previous_price: 24.98,
            current_price: 24.98,
            currency: "USD",
            price_change: "unchanged",
            baggage_supported: true,
            seat_supported: true,
          },
        });
      }
      return result({
        status: "success",
        code: "BAGGAGE_OPTIONS_LISTED",
        data: {
          booking_id: "book_opaque",
          options: [
            {
              baggage_id: "bag_20",
              segment_id: "seg_opaque",
              weight_kg: 20,
              price: 25.98,
              currency: "USD",
            },
          ],
        },
      });
    };

    const tool = createAtlasFlightTool({ runner });
    const verification = await tool.verifyOffer("off_opaque");

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual([
      "offer",
      "verify",
      "--offer-id",
      "off_opaque",
      "--json",
    ]);
    expect(calls[1]).toEqual([
      "booking",
      "baggage",
      "list",
      "--booking-id",
      "book_opaque",
      "--json",
    ]);
    expect(verification.bookingId).toBe("book_opaque");
    expect(verification.baggageStatus).toBe("available");
    expect(verification.baggageOptions?.[0]).toEqual({
      baggageId: "bag_20",
      segmentId: "seg_opaque",
      weightKg: 20,
      price: 25.98,
      currency: "USD",
    });
  });

  test("does not issue a baggage command after a price increase checkpoint", async () => {
    const calls: string[][] = [];
    const runner: CliRunner = async (_command, args) => {
      calls.push(args);
      return result({
        status: "action_required",
        code: "PRICE_CONFIRMATION_REQUIRED",
        data: {
          booking_id: "book_price_up",
          previous_price: 24.98,
          current_price: 30,
          currency: "USD",
          baggage_supported: true,
          seat_supported: true,
        },
      });
    };

    const tool = createAtlasFlightTool({ runner });
    const verification = await tool.verifyOffer("off_price_up");

    expect(calls).toHaveLength(1);
    expect(verification.priceChange).toBe("increased");
    expect(verification.baggageStatus).toBe("unknown");
  });

  test("confirms an approved fare increase with booking confirm-price", async () => {
    const calls: string[][] = [];
    const runner: CliRunner = async (_command, args) => {
      calls.push(args);
      return result({
        status: "success",
        code: "PRICE_CONFIRMED",
        data: {
          booking_id: "book_price_up",
          previous_price: 24.98,
          current_price: 30,
          currency: "USD",
          price_change: "increased",
        },
      });
    };

    const tool = createAtlasFlightTool({ runner });
    const verification = await tool.confirmPrice("book_price_up");

    expect(calls).toEqual([
      [
        "booking",
        "confirm-price",
        "--booking-id",
        "book_price_up",
        "--json",
      ],
    ]);
    expect(verification.priceConfirmed).toBe(true);
    expect(verification.currentPrice).toBe(30);
    expect(verification.bookingId).toBe("book_price_up");
  });

  test("keeps fare verification usable when baggage listing fails", async () => {
    let call = 0;
    const runner: CliRunner = async () => {
      call += 1;
      if (call === 1) {
        return result({
          status: "success",
          code: "OFFER_VERIFIED",
          data: {
            booking_id: "book_1",
            current_price: 42,
            previous_price: 42,
            currency: "USD",
            price_change: "unchanged",
            baggage_supported: true,
          },
        });
      }
      return {
        stdout: "",
        stderr: "hidden diagnostics",
        exitCode: 1,
        timedOut: false,
      };
    };

    const tool = createAtlasFlightTool({ runner });
    const verification = await tool.verifyOffer("off_1");
    expect(verification.priceChange).toBe("unchanged");
    expect(verification.baggageStatus).toBe("unknown");
    expect(verification.baggageOptions).toBeUndefined();
  });
});
