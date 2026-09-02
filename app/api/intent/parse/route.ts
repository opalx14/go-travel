import {
  matchedIntentFields,
  normalizeIntentCandidate,
  parseTravelBriefLocally,
  type IntentExtractionCandidate,
  type ParsedTravelBrief,
} from "@/lib/intent-parser";
import { redactSensitiveTravelText } from "@/lib/privacy-redaction";
import { runtimeModeFromRequest } from "@/lib/runtime-mode";
import { localQwenConfig } from "@/lib/qwen-runtime";

interface ParseBody {
  brief?: unknown;
}

interface QwenResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const SYSTEM_PROMPT = `You extract a traveler's recovery contract from a natural-language travel brief.
Return JSON only with these keys:
- latestArrival: 24-hour HH:MM string or null
- departureFlexibilityHours: number or null
- minBaggageKg: number or null
- maxExtraSpendUsd: number or null
- autopilot: boolean or null

Rules:
- maxExtraSpendUsd means ONLY extra spending the traveler delegated without asking, not their target/base ticket price.
- autopilot is true only when the traveler explicitly allows automatic action or action without asking.
- Do not invent missing constraints. Use null for missing values.
- Output valid JSON.`;

async function parseWithQwen(brief: string): Promise<ParsedTravelBrief | null> {
  const config = localQwenConfig();
  if (!config) return null;
  const { endpoint, model, headers, timeoutMs } = config;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Extract this brief as JSON:\n${brief}` },
        ],
        temperature: 0,
        max_tokens: 180,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as QwenResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;

    const candidate = JSON.parse(content) as IntentExtractionCandidate;
    return {
      source: "QWEN",
      intent: normalizeIntentCandidate(candidate),
      matched: matchedIntentFields(candidate),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  const runtimeMode = runtimeModeFromRequest(request);
  let body: ParseBody;
  try {
    body = (await request.json()) as ParseBody;
  } catch {
    return Response.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  if (brief.length < 8 || brief.length > 2_000) {
    return Response.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  // Model boundary: strip identity, booking and payment data before traveler text
  // reaches the configured inference server. The deterministic parser still gets
  // the original brief so fallback behavior keeps full constraint fidelity.
  const redaction = redactSensitiveTravelText(brief);
  const qwenParsed = await parseWithQwen(redaction.text);

  if (runtimeMode === "live" && !qwenParsed) {
    return Response.json(
      { ok: false, error: "LIVE_QWEN_UNAVAILABLE", runtimeMode },
      { status: 502 }
    );
  }

  const parsed = qwenParsed ?? parseTravelBriefLocally(brief);

  return Response.json(
    {
      ok: true,
      ...parsed,
      runtimeMode,
      privacy: {
        modelInputRedacted: redaction.redacted,
        redactedKinds: redaction.kinds,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
