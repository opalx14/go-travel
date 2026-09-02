import { describe, expect, test } from "bun:test";
import {
  DEFAULT_RUNTIME_MODE,
  normalizeRuntimeMode,
  runtimeModeFromRequest,
  runtimeModeHeaders,
} from "./runtime-mode";

describe("runtime mode", () => {
  test("defaults to demo for absent or invalid mode", () => {
    expect(DEFAULT_RUNTIME_MODE).toBe("demo");
    expect(normalizeRuntimeMode(undefined)).toBe("demo");
    expect(normalizeRuntimeMode("production")).toBe("demo");
  });

  test("accepts live only when explicitly requested", () => {
    expect(normalizeRuntimeMode("live")).toBe("live");
    const request = new Request("http://localhost/api/test", {
      headers: runtimeModeHeaders("live"),
    });
    expect(runtimeModeFromRequest(request)).toBe("live");
  });

  test("demo header remains explicit for provider calls", () => {
    const request = new Request("http://localhost/api/test", {
      headers: runtimeModeHeaders("demo"),
    });
    expect(runtimeModeFromRequest(request)).toBe("demo");
  });
});
