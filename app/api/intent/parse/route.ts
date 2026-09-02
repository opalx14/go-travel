import {
  matchedIntentFields,
  normalizeIntentCandidate,
  parseTravelBriefLocally,
  type IntentExtractionCandidate,
  type ParsedTravelBrief,
} from "@/lib/intent-parser";
import { redactSensitiveTravelText } from "@/lib/privacy-redaction";

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

const DEFAULT_QWEN_ENDPOINT =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";

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
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return null;

  const endpoint = process.env.QWEN_CHAT_COMPLETIONS_URL ?? DEFAULT_QWEN_ENDPOINT;
  const model = process.env.QWEN_MODEL ?? "qwen-flash";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Extract this brief as JSON:\n${brief}` },
        ],
        response_format: { type: "json_object" },
        enable_thinking: false,
        temperature: 0,
        max_tokens: 180,
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

  // Hosted-model boundary: strip identity, booking and payment data before
  // any traveler-authored text leaves the application. The local parser still
  // receives the original brief so deterministic fallback keeps full fidelity.
  const redaction = redactSensitiveTravelText(brief);
  const parsed =
    (await parseWithQwen(redaction.text)) ?? parseTravelBriefLocally(brief);

  return Response.json(
    {
      ok: true,
      ...parsed,
      privacy: {
        hostedModelInputRedacted: redaction.redacted,
        redactedKinds: redaction.kinds,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
