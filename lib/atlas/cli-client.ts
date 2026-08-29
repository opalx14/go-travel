/**
 * Server-side subprocess client for the `atlas-flight` CLI.
 *
 * SECURITY/CONTRACT NOTES:
 * - The CLI is always invoked with an ARGUMENT ARRAY via `execFile` — never
 *   through a shell, so no argument can be interpreted as shell syntax.
 * - stderr is captured only to keep the pipe drained; its content is never
 *   surfaced to the UI, logged, or included in errors (it may carry
 *   diagnostics we must not leak).
 * - The adapter never reads or logs credentials; authorization lives inside
 *   the CLI's own secure store.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Injectable runner seam so unit tests never need the real CLI. */
export interface CliRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  /** True when the process could not be spawned at all (ENOENT/EACCES). */
  spawnFailed?: boolean;
}
export type CliRunner = (
  command: string,
  args: string[],
  timeoutMs: number
) => Promise<CliRunResult>;

export type CliErrorKind = "TIMEOUT" | "CLI_FAILURE" | "SPAWN_ERROR";

export class CliError extends Error {
  readonly kind: CliErrorKind;

  constructor(kind: CliErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "CliError";
  }
}

/** 10 MB — the search envelope can carry dozens of offers. */
const MAX_BUFFER = 10 * 1024 * 1024;

/** Resolve the CLI binary: env override → ~/.local/bin → PATH. */
export function resolveCliCommand(): string {
  const fromEnv = process.env.ATLAS_CLI_PATH;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv;
  const localBin = join(homedir(), ".local", "bin", "atlas-flight");
  if (existsSync(localBin)) return localBin;
  return "atlas-flight";
}

/** Real runner built on `execFile` (no shell). Kills the child on timeout. */
export function defaultCliRunner(): CliRunner {
  return (command, args, timeoutMs) =>
    new Promise<CliRunResult>((resolve) => {
      // Set by our own timer below; a SIGKILL from us surfaces as a signal
      // error, not ETIMEDOUT, so classification reads this flag.
      let timedOut = false;
      const child = execFile(
        command,
        args,
        { maxBuffer: MAX_BUFFER, timeout: 0 },
        (error, stdout, stderr) => {
          // Cancel the timer so a late SIGKILL never hits a recycled PID.
          clearTimeout(timer);
          if (error) {
            if (
              timedOut ||
              (error as NodeJS.ErrnoException & { signal?: string }).signal
            ) {
              resolve({ stdout, stderr, exitCode: null, timedOut: true });
              return;
            }
            const err = error as NodeJS.ErrnoException;
            // Spawn errors (ENOENT/EACCES) carry a string errno in `code`.
            if (typeof err.code === "string") {
              resolve({
                stdout,
                stderr,
                exitCode: null,
                timedOut: false,
                spawnFailed: true,
              });
              return;
            }
            const exitCode = typeof err.code === "number" ? err.code : null;
            resolve({ stdout, stderr, exitCode, timedOut: false });
            return;
          }
          resolve({ stdout, stderr, exitCode: 0, timedOut: false });
        }
      );
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeoutMs);
      timer.unref?.();
    });
}

/**
 * Run the CLI with the given argument array and return stdout.
 * Throws a typed `CliError` on timeout, non-zero exit, or spawn failure.
 * stderr content is intentionally discarded.
 */
export async function runCli(
  args: string[],
  timeoutMs: number,
  runner: CliRunner = defaultCliRunner(),
  command: string = resolveCliCommand()
): Promise<string> {
  const result = await runner(command, args, timeoutMs);
  if (result.timedOut) {
    throw new CliError("TIMEOUT", "atlas-flight CLI timed out");
  }
  if (result.spawnFailed) {
    throw new CliError(
      "SPAWN_ERROR",
      "atlas-flight CLI could not be started"
    );
  }
  if (result.exitCode !== 0) {
    throw new CliError(
      "CLI_FAILURE",
      `atlas-flight CLI exited with code ${result.exitCode ?? "unknown"}`
    );
  }
  return result.stdout;
}

/** Argument array for a new search — exactly per the CLI contract. */
export function searchArgs(input: {
  origin: string;
  destination: string;
  depart: string;
  adults: number;
}): string[] {
  return [
    "search",
    "--origin",
    input.origin,
    "--destination",
    input.destination,
    "--depart",
    input.depart,
    "--adults",
    String(input.adults),
    "--currency",
    "USD",
    "--json",
  ];
}

/** Argument array for offer verification — the ID is passed through verbatim. */
export function verifyArgs(offerId: string): string[] {
  return ["offer", "verify", "--offer-id", offerId, "--json"];
}

/** List checked-baggage options attached to a verified booking. */
export function baggageListArgs(bookingId: string): string[] {
  return [
    "booking",
    "baggage",
    "list",
    "--booking-id",
    bookingId,
    "--json",
  ];
}

/** Confirm a verified fare increase after explicit passenger approval. */
export function confirmPriceArgs(bookingId: string): string[] {
  return [
    "booking",
    "confirm-price",
    "--booking-id",
    bookingId,
    "--json",
  ];
}
