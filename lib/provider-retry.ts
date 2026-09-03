export interface ReadonlyRetryEvent {
  operation: string;
  attempt: number;
  maxAttempts: number;
}

export interface ReadonlyRetryOptions {
  operation: string;
  maxAttempts?: number;
  baseDelayMs?: number;
  onRetry?: (event: ReadonlyRetryEvent) => void;
  sleep?: (delayMs: number) => Promise<void>;
}

const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_BASE_DELAY_MS = 120;

function defaultSleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Bounded retry primitive for read-only provider operations only.
 *
 * It intentionally does not classify business outcomes such as fare increases,
 * expired offers, or passenger approvals. Those remain explicit domain states.
 * The helper retries thrown transport/tool failures at most once by default and
 * then rethrows the original provider error. Never use this around state-changing
 * actions such as confirm-price, payment, or booking creation.
 */
export async function withReadonlyProviderRetry<T>(
  action: () => Promise<T>,
  options: ReadonlyRetryOptions
): Promise<T> {
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS));
  const baseDelayMs = Math.max(0, Math.floor(options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS));
  const sleep = options.sleep ?? defaultSleep;

  let attempt = 1;
  for (;;) {
    try {
      return await action();
    } catch (error) {
      if (attempt >= maxAttempts) throw error;

      options.onRetry?.({
        operation: options.operation,
        attempt: attempt + 1,
        maxAttempts,
      });

      const delayMs = baseDelayMs * attempt;
      if (delayMs > 0) await sleep(delayMs);
      attempt += 1;
    }
  }
}
