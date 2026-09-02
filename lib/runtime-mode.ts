export type RuntimeMode = "demo" | "live";

/** Judge-safe default: the app always boots in deterministic demo mode. */
export const DEFAULT_RUNTIME_MODE: RuntimeMode = "demo";

export const RUNTIME_MODE_HEADER = "x-tripintent-mode";

export function normalizeRuntimeMode(value: unknown): RuntimeMode {
  return value === "live" ? "live" : DEFAULT_RUNTIME_MODE;
}

export function runtimeModeFromRequest(request: Request): RuntimeMode {
  return normalizeRuntimeMode(request.headers.get(RUNTIME_MODE_HEADER));
}

export function runtimeModeHeaders(mode: RuntimeMode): Record<string, string> {
  return { [RUNTIME_MODE_HEADER]: mode };
}
