import {
  localQwenConfig,
  localQwenEndpointHost,
  localQwenModelsEndpoint,
} from "./qwen-runtime";

interface ModelCatalogResponse {
  data?: Array<{ id?: string }>;
}

export interface QwenHealthReport {
  ok: true;
  configured: boolean;
  connected: boolean;
  modelReady: boolean;
  runtime: "self-hosted-qwen" | "deterministic-fallback";
  provider: "Self-hosted Qwen" | "Deterministic fallback";
  model: string | null;
  endpointHost: string | null;
  latencyMs: number | null;
  checkedAt: string;
}

const HEALTH_TIMEOUT_MS = 3_000;

export async function probeLocalQwenHealth(
  fetchImpl: typeof fetch = fetch
): Promise<QwenHealthReport> {
  const config = localQwenConfig();
  const checkedAt = new Date().toISOString();

  if (!config) {
    return {
      ok: true,
      configured: false,
      connected: false,
      modelReady: false,
      runtime: "deterministic-fallback",
      provider: "Deterministic fallback",
      model: null,
      endpointHost: null,
      latencyMs: null,
      checkedAt,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(localQwenModelsEndpoint(config.endpoint), {
      headers: config.headers,
      cache: "no-store",
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      return {
        ok: true,
        configured: true,
        connected: false,
        modelReady: false,
        runtime: "deterministic-fallback",
        provider: "Self-hosted Qwen",
        model: config.model,
        endpointHost: localQwenEndpointHost(config.endpoint),
        latencyMs,
        checkedAt,
      };
    }

    const payload = (await response.json()) as ModelCatalogResponse;
    const modelReady = (payload.data ?? []).some((item) => item.id === config.model);
    return {
      ok: true,
      configured: true,
      connected: true,
      modelReady,
      runtime: modelReady ? "self-hosted-qwen" : "deterministic-fallback",
      provider: "Self-hosted Qwen",
      model: config.model,
      endpointHost: localQwenEndpointHost(config.endpoint),
      latencyMs,
      checkedAt,
    };
  } catch {
    return {
      ok: true,
      configured: true,
      connected: false,
      modelReady: false,
      runtime: "deterministic-fallback",
      provider: "Self-hosted Qwen",
      model: config.model,
      endpointHost: localQwenEndpointHost(config.endpoint),
      latencyMs: Date.now() - startedAt,
      checkedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}
