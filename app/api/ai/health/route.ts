import {
  localQwenConfig,
  localQwenEndpointHost,
  localQwenModelsEndpoint,
} from "@/lib/qwen-runtime";

interface ModelCatalogResponse {
  data?: Array<{
    id?: string;
  }>;
}

const HEALTH_TIMEOUT_MS = 3_000;

export async function GET() {
  const config = localQwenConfig();
  const checkedAt = new Date().toISOString();

  if (!config) {
    return Response.json(
      {
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
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(localQwenModelsEndpoint(config.endpoint), {
      headers: config.headers,
      cache: "no-store",
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      return Response.json(
        {
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
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const payload = (await response.json()) as ModelCatalogResponse;
    const modelIds = (payload.data ?? [])
      .map((item) => item.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    const modelReady = modelIds.includes(config.model);

    return Response.json(
      {
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
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      {
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
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    clearTimeout(timer);
  }
}
