# TripIntent Qwen LoRA seed set

This directory contains a small, reviewable supervised fine-tuning seed set for `mlx-community/Qwen3.5-27B-4bit` using MLX-LM LoRA/QLoRA.

## What the adapter should learn

The learned model is intentionally bounded to language work:

- English/Vietnamese traveler intent → strict TripIntent Outcome Contract JSON.
- Read-only explanations of deterministic recovery results.
- Outcome-over-price language: a cheaper option may be rejected when it violates arrival or baggage constraints.
- Human-in-the-loop language for delegated spending limits and Atlas price-increase checkpoints.
- Safe failure explanations without relaxing traveler constraints.

It must **not** learn to replace the TypeScript policy engine, invent fares, choose a different flight after policy selection, bypass approval, or ingest real passenger PII.

## Data layout

MLX-LM reads OpenAI-style chat JSONL:

- `train.jsonl`
- `valid.jsonl`
- `test.jsonl`

Every example uses `messages` with `system`, `user`, and `assistant` roles. The committed examples are synthetic/de-identified and contain no production credentials.

## Train locally on Apple Silicon

Stop `mlx_lm.server` first so the Mac has maximum unified memory, then run:

```bash
TRIPINTENT_QWEN_ITERS=40 bash scripts/qwen-lora-train.sh
```

The script defaults to 4 trainable transformer layers, batch size 1, prompt masking, gradient checkpointing, and a 768-token sequence cap. Adapter weights are written to `.artifacts/qwen-tripintent-lora/`, which is gitignored.

For a quick pipeline validation:

```bash
TRIPINTENT_QWEN_ITERS=2 bash scripts/qwen-lora-train.sh
```

A local 2-iteration validation on the 32 GB Apple Silicon development machine completed successfully with 3.648M trainable parameters (0.014% of the 26.896B model), validation loss `1.493`, training loss `1.667`, and peak MLX memory around `18.571 GB`. This is evidence that the LoRA pipeline runs locally; it is **not** presented as a production-quality trained checkpoint.

## Serve an adapter

```bash
mlx_lm.server \
  --model mlx-community/Qwen3.5-27B-4bit \
  --adapter-path .artifacts/qwen-tripintent-lora \
  --host 127.0.0.1 \
  --port 8080 \
  --chat-template-args '{"enable_thinking":false}'
```

Then verify with `bun run qwen:smoke` and the TripIntent Live mode. Before promoting any adapter, expand the corpus and evaluate held-out multilingual intent accuracy, JSON validity, fact preservation, approval-boundary behavior, and regression against the deterministic ground truth.
