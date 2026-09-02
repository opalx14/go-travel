#!/usr/bin/env bash
set -euo pipefail

MODEL="${LOCAL_QWEN_MODEL:-mlx-community/Qwen3.5-27B-4bit}"
DATA="${TRIPINTENT_QWEN_DATA:-training/qwen-tripintent}"
ADAPTER="${TRIPINTENT_QWEN_ADAPTER:-.artifacts/qwen-tripintent-lora}"
ITERS="${TRIPINTENT_QWEN_ITERS:-40}"
LAYERS="${TRIPINTENT_QWEN_LAYERS:-4}"

mkdir -p "$ADAPTER"

exec mlx_lm.lora \
  --model "$MODEL" \
  --train \
  --data "$DATA" \
  --fine-tune-type lora \
  --mask-prompt \
  --num-layers "$LAYERS" \
  --batch-size 1 \
  --iters "$ITERS" \
  --learning-rate 1e-5 \
  --steps-per-report 5 \
  --steps-per-eval 10 \
  --grad-accumulation-steps 2 \
  --adapter-path "$ADAPTER" \
  --save-every 20 \
  --max-seq-length 768 \
  --grad-checkpoint \
  --seed 42
