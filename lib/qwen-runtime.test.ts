import { afterEach, describe, expect, test } from "bun:test";
import {
  DEFAULT_LOCAL_QWEN_TIMEOUT_MS,
  LOCAL_QWEN_MODEL,
  isLocalQwenConfigured,
  localQwenConfig,
  localQwenEndpointHost,
  localQwenModelsEndpoint,
} from "./qwen-runtime";

const ORIGINAL_ENV = {
  endpoint: process.env.LOCAL_QWEN_CHAT_COMPLETIONS_URL,
  model: process.env.LOCAL_QWEN_MODEL,
  apiKey: process.env.LOCAL_QWEN_API_KEY,
  timeout: process.env.LOCAL_QWEN_TIMEOUT_MS,
};

afterEach(() => {
  const restore = (key: string, value: string | undefined) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };

  restore("LOCAL_QWEN_CHAT_COMPLETIONS_URL", ORIGINAL_ENV.endpoint);
  restore("LOCAL_QWEN_MODEL", ORIGINAL_ENV.model);
  restore("LOCAL_QWEN_API_KEY", ORIGINAL_ENV.apiKey);
  restore("LOCAL_QWEN_TIMEOUT_MS", ORIGINAL_ENV.timeout);
});

describe("local Qwen runtime", () => {
  test("stays disabled when no self-hosted endpoint is configured", () => {
    delete process.env.LOCAL_QWEN_CHAT_COMPLETIONS_URL;

    expect(isLocalQwenConfigured()).toBe(false);
    expect(localQwenConfig()).toBeNull();
  });

  test("uses the MLX 27B default model and bounded timeout", () => {
    process.env.LOCAL_QWEN_CHAT_COMPLETIONS_URL =
      "http://127.0.0.1:8080/v1/chat/completions";
    delete process.env.LOCAL_QWEN_MODEL;
    delete process.env.LOCAL_QWEN_API_KEY;
    process.env.LOCAL_QWEN_TIMEOUT_MS = "45000";

    expect(localQwenConfig()).toEqual({
      endpoint: "http://127.0.0.1:8080/v1/chat/completions",
      model: LOCAL_QWEN_MODEL,
      headers: {},
      timeoutMs: 45_000,
    });
  });

  test("falls back to the safe timeout when configuration is invalid", () => {
    process.env.LOCAL_QWEN_CHAT_COMPLETIONS_URL =
      "http://127.0.0.1:8080/v1/chat/completions";
    process.env.LOCAL_QWEN_TIMEOUT_MS = "999999";

    expect(localQwenConfig()?.timeoutMs).toBe(DEFAULT_LOCAL_QWEN_TIMEOUT_MS);
  });

  test("derives a safe model-catalog endpoint and public host", () => {
    const endpoint =
      "http://127.0.0.1:8080/v1/chat/completions?token=do-not-expose";

    expect(localQwenModelsEndpoint(endpoint)).toBe(
      "http://127.0.0.1:8080/v1/models"
    );
    expect(localQwenEndpointHost(endpoint)).toBe("127.0.0.1:8080");
  });
});
