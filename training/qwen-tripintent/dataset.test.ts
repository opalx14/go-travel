import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Message = { role: string; content: string };
type Example = { messages?: Message[] };

function load(name: string): Example[] {
  const path = join(import.meta.dir, `${name}.jsonl`);
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Example);
}

describe("TripIntent Qwen LoRA seed dataset", () => {
  test("keeps reviewable train/valid/test splits in MLX chat format", () => {
    const splits = {
      train: load("train"),
      valid: load("valid"),
      test: load("test"),
    };

    expect(splits.train.length).toBeGreaterThanOrEqual(10);
    expect(splits.valid.length).toBeGreaterThanOrEqual(3);
    expect(splits.test.length).toBeGreaterThanOrEqual(3);

    for (const examples of Object.values(splits)) {
      for (const example of examples) {
        expect(example.messages?.map((message) => message.role)).toEqual([
          "system",
          "user",
          "assistant",
        ]);
        expect(example.messages?.every((message) => message.content.length > 0)).toBe(true);
      }
    }
  });

  test("does not contain obvious real contact or credential material", () => {
    const corpus = [load("train"), load("valid"), load("test")]
      .flat()
      .flatMap((example) => example.messages ?? [])
      .map((message) => message.content)
      .join("\n");

    expect(corpus).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(corpus).not.toMatch(/(?:api[_ -]?key|bearer\s+[A-Za-z0-9._-]{12,})/i);
  });
});
