import { describe, expect, test } from "bun:test";
import {
  CliError,
  defaultCliRunner,
  runCli,
  searchArgs,
  verifyArgs,
  type CliRunner,
} from "./cli-client";

function fakeRunner(result: {
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  timedOut?: boolean;
  spawnFailed?: boolean;
}): { runner: CliRunner; calls: { command: string; args: string[] }[] } {
  const calls: { command: string; args: string[] }[] = [];
  const runner: CliRunner = async (command, args) => {
    calls.push({ command, args });
    return {
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: result.exitCode ?? 0,
      timedOut: result.timedOut ?? false,
      spawnFailed: result.spawnFailed ?? false,
    };
  };
  return { runner, calls };
}

describe("argument construction", () => {
  test("search args follow the CLI contract exactly", () => {
    expect(
      searchArgs({ origin: "KUL", destination: "SIN", depart: "2026-08-27", adults: 1 })
    ).toEqual([
      "search",
      "--origin",
      "KUL",
      "--destination",
      "SIN",
      "--depart",
      "2026-08-27",
      "--adults",
      "1",
      "--currency",
      "USD",
      "--json",
    ]);
  });

  test("verify args pass the opaque offer id verbatim", () => {
    expect(verifyArgs("off_AbC-123_XyZ")).toEqual([
      "offer",
      "verify",
      "--offer-id",
      "off_AbC-123_XyZ",
      "--json",
    ]);
  });
});

describe("runCli with an injected runner", () => {
  test("returns stdout on success and never shell-joins arguments", async () => {
    const { runner, calls } = fakeRunner({ stdout: '{"ok":true}' });
    const stdout = await runCli(searchArgs({
      origin: "KUL",
      destination: "SIN",
      depart: "2026-08-27",
      adults: 1,
    }), 1000, runner, "/usr/bin/fake-atlas");

    expect(stdout).toBe('{"ok":true}');
    expect(calls).toHaveLength(1);
    // Arguments stay an array: no shell interpolation is possible.
    expect(Array.isArray(calls[0].args)).toBe(true);
    expect(calls[0].args).toContain("--origin");
    expect(calls[0].command).toBe("/usr/bin/fake-atlas");
  });

  test("non-zero exit is classified CLI_FAILURE", async () => {
    const { runner } = fakeRunner({ exitCode: 2, stderr: "secret diagnostics" });
    try {
      await runCli(["search"], 1000, runner);
      throw new Error("expected CliError");
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).kind).toBe("CLI_FAILURE");
      // stderr content must never leak into the error.
      expect((error as Error).message).not.toContain("secret diagnostics");
    }
  });

  test("timeout is classified TIMEOUT", async () => {
    const { runner } = fakeRunner({ timedOut: true });
    try {
      await runCli(["search"], 1000, runner);
      throw new Error("expected CliError");
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).kind).toBe("TIMEOUT");
    }
  });

  test("spawn failure is classified SPAWN_ERROR", async () => {
    const { runner } = fakeRunner({ spawnFailed: true });
    try {
      await runCli(["search"], 1000, runner);
      throw new Error("expected CliError");
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).kind).toBe("SPAWN_ERROR");
    }
  });
});

/**
 * Real-subprocess checks for defaultCliRunner: the fake runner above only
 * exercises runCli's classification, so these prove the execFile callback
 * actually sets timedOut/spawnFailed the way runCli expects.
 */
describe("defaultCliRunner against real processes", () => {
  test("killing a slow child classifies timedOut", async () => {
    const result = await defaultCliRunner()("sleep", ["5"], 200);
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull();
  }, 5000);

  test("a missing binary classifies spawnFailed", async () => {
    const result = await defaultCliRunner()(
      "/nonexistent/atlas-flight-binary",
      [],
      1000
    );
    expect(result.spawnFailed).toBe(true);
    expect(result.timedOut).toBe(false);
  });

  test("a normal exit returns stdout with exitCode 0", async () => {
    const result = await defaultCliRunner()(
      "echo",
      ["hello"],
      1000
    );
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.stdout.trim()).toBe("hello");
  });
});
