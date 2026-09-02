/**
 * Qwen local smoke test — verifies the OpenAI-compatible self-hosted endpoint
 * without going through a hosted model vendor.
 *
 * Run the MLX server first, then:
 *   bun run qwen:smoke
 */
import {
  DEFAULT_LOCAL_QWEN_ENDPOINT,
  LOCAL_QWEN_MODEL,
} from "../lib/qwen-runtime";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

async function main(): Promise<void> {
  const endpoint =
    process.env.LOCAL_QWEN_CHAT_COMPLETIONS_URL?.trim() ||
    DEFAULT_LOCAL_QWEN_ENDPOINT;
  const model = process.env.LOCAL_QWEN_MODEL?.trim() || LOCAL_QWEN_MODEL;
  const apiKey = process.env.LOCAL_QWEN_API_KEY?.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);

  console.log(`[qwen-smoke] endpoint=${endpoint}`);
  console.log(`[qwen-smoke] model=${model}`);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Return valid JSON only. Do not add markdown or commentary.",
          },
          {
            role: "user",
            content: 'Return exactly {"ok":true,"runtime":"local-qwen"}',
          },
        ],
        temperature: 0,
        max_tokens: 48,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Qwen returned an empty completion");

    const parsed = JSON.parse(content) as { ok?: unknown; runtime?: unknown };
    if (parsed.ok !== true || parsed.runtime !== "local-qwen") {
      throw new Error(`Unexpected model payload: ${content}`);
    }

    console.log(`[qwen-smoke] PASS ${content}`);
  } finally {
    clearTimeout(timer);
  }
}

main().catch((error) => {
  console.error("[qwen-smoke] FAILED");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
