import {
  buildDeterministicDecisionExplanation,
  normalizeDecisionExplanation,
  type DecisionExplanationCandidate,
} from "@/lib/decision-explainer";
import type { RecoveryOutcome } from "@/lib/types";

const DEFAULT_QWEN_ENDPOINT =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";

const SYSTEM_PROMPT = `You are TripIntent's explanation layer.
The recovery decision has ALREADY been made by deterministic policy code.
You must never choose a different flight, change a price, relax a constraint, or invent facts.
Explain the supplied decision in concise operational language.
Return JSON only with exactly these keys:
- headline
- selectedReason
- rejectedReason
- authorityReason
- nextAction
Keep each value short and factual. State why a cheaper rejected option failed when that fact is present.`;

interface ExplainBody {
  outcome?: RecoveryOutcome;
}

interface QwenResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
}

function validOutcome(value: unknown): value is RecoveryOutcome {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RecoveryOutcome>;
  return (
    typeof candidate.status === "string" &&
    !!candidate.event &&
    Array.isArray(candidate.evaluations) &&
    Array.isArray(candidate.steps)
  );
}

function facts(outcome: RecoveryOutcome) {
  return {
    status: outcome.status,
    approval: outcome.approval ?? null,
    intent: outcome.intent ?? null,
    event: {
      type: outcome.event.type,
      originalArrival: outcome.event.originalArrival,
      newArrival: outcome.event.newArrival,
    },
    candidates: outcome.evaluations.map((evaluation) => ({
      flightNo: evaluation.option.flightNo,
      departure: evaluation.option.departure,
      arrival: evaluation.option.arrival,
      baggageKg: evaluation.option.baggageKg ?? null,
      extraCostUsd: evaluation.option.extraCostUsd,
      source: evaluation.option.source ?? null,
      valid: evaluation.valid,
      withinAuthority: evaluation.withinAuthority,
      reasons: evaluation.reasons,
    })),
    selected: outcome.selected
      ? {
          flightNo: outcome.selected.flightNo,
          departure: outcome.selected.departure,
          arrival: outcome.selected.arrival,
          baggageKg: outcome.selected.baggageKg ?? null,
          extraCostUsd: outcome.selected.extraCostUsd,
          source: outcome.selected.source ?? null,
        }
      : null,
    policy: outcome.policyCheck,
    verification: outcome.verification
      ? {
          source: outcome.verification.source,
          priceChange: outcome.verification.priceChange,
          currentPrice: outcome.verification.currentPrice ?? null,
        }
      : null,
  };
}

export async function POST(request: Request) {
  let body: ExplainBody;
  try {
    body = (await request.json()) as ExplainBody;
  } catch {
    return Response.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  if (!validOutcome(body.outcome)) {
    return Response.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const fallback = buildDeterministicDecisionExplanation(body.outcome);
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: true, reasoning: fallback },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const endpoint = process.env.QWEN_CHAT_COMPLETIONS_URL ?? DEFAULT_QWEN_ENDPOINT;
  const model = process.env.QWEN_MODEL ?? "qwen-flash";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);

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
          {
            role: "user",
            content: `Explain this already-decided recovery result:\n${JSON.stringify(facts(body.outcome))}`,
          },
        ],
        response_format: { type: "json_object" },
        enable_thinking: false,
        temperature: 0,
        max_tokens: 300,
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error("Qwen explanation unavailable");
    const payload = (await response.json()) as QwenResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Qwen explanation empty");

    const candidate = JSON.parse(content) as DecisionExplanationCandidate;
    return Response.json(
      {
        ok: true,
        reasoning: normalizeDecisionExplanation(candidate, fallback, model),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { ok: true, reasoning: fallback },
      { headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    clearTimeout(timer);
  }
}
