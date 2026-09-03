import { describe, expect, test } from "bun:test";
import { withReadonlyProviderRetry } from "./provider-retry";

describe("withReadonlyProviderRetry", () => {
  test("recovers from one transient failure", async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const retries: number[] = [];

    const value = await withReadonlyProviderRetry(
      async () => {
        calls += 1;
        if (calls === 1) throw new Error("transient");
        return "ok";
      },
      {
        operation: "atlas-search",
        baseDelayMs: 120,
        onRetry: ({ attempt }) => retries.push(attempt),
        sleep: async (delayMs) => {
          sleeps.push(delayMs);
        },
      }
    );

    expect(value).toBe("ok");
    expect(calls).toBe(2);
    expect(retries).toEqual([2]);
    expect(sleeps).toEqual([120]);
  });

  test("stops after the bounded attempt budget", async () => {
    let calls = 0;

    await expect(
      withReadonlyProviderRetry(
        async () => {
          calls += 1;
          throw new Error("still unavailable");
        },
        {
          operation: "atlas-verify",
          maxAttempts: 2,
          baseDelayMs: 0,
        }
      )
    ).rejects.toThrow("still unavailable");

    expect(calls).toBe(2);
  });

  test("does not retry successful reads", async () => {
    let calls = 0;
    const value = await withReadonlyProviderRetry(
      async () => {
        calls += 1;
        return 42;
      },
      { operation: "atlas-search", baseDelayMs: 0 }
    );

    expect(value).toBe(42);
    expect(calls).toBe(1);
  });
});
