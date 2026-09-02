export const LOCAL_QWEN_MODEL = "mlx-community/Qwen3.5-27B-4bit";
export const DEFAULT_LOCAL_QWEN_ENDPOINT =
  "http://127.0.0.1:8080/v1/chat/completions";
export const DEFAULT_LOCAL_QWEN_TIMEOUT_MS = 30_000;

export interface LocalQwenConfig {
  endpoint: string;
  model: string;
  headers: Record<string, string>;
  timeoutMs: number;
}

export function isLocalQwenConfigured(): boolean {
  return Boolean(process.env.LOCAL_QWEN_CHAT_COMPLETIONS_URL?.trim());
}

export function localQwenModelsEndpoint(chatCompletionsEndpoint: string): string {
  const url = new URL(chatCompletionsEndpoint);
  url.pathname = url.pathname.replace(/\/chat\/completions\/?$/, "/models");
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function localQwenEndpointHost(chatCompletionsEndpoint: string): string {
  try {
    return new URL(chatCompletionsEndpoint).host;
  } catch {
    return "self-hosted";
  }
}

/**
 * TripIntent uses the open-weight Qwen3.5-27B model through any local/self-hosted
 * OpenAI-compatible server (vLLM, SGLang, llama.cpp-compatible gateway, etc.).
 * No hosted vendor API is required by the application.
 */
export function localQwenConfig(): LocalQwenConfig | null {
  const endpoint = process.env.LOCAL_QWEN_CHAT_COMPLETIONS_URL?.trim();
  if (!endpoint) return null;

  const apiKey = process.env.LOCAL_QWEN_API_KEY?.trim();
  const configuredTimeout = Number(process.env.LOCAL_QWEN_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(configuredTimeout) && configuredTimeout >= 1_000 && configuredTimeout <= 120_000
      ? configuredTimeout
      : DEFAULT_LOCAL_QWEN_TIMEOUT_MS;

  return {
    endpoint,
    model: process.env.LOCAL_QWEN_MODEL?.trim() || LOCAL_QWEN_MODEL,
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    timeoutMs,
  };
}
