import { describe, expect, it } from "vitest";
import { resolveRawAssistantAnswerText } from "./assistant-answer-text.js";

describe("resolveRawAssistantAnswerText", () => {
  it.each(["unphased", "signed", "final_answer"] as const)(
    "preserves whitespace-only %s blocks before directive parsing",
    (phase) => {
      for (const parts of [
        ["First.", "\n", "Second."],
        ["Mention", " ", "NO_REPLY"],
        ["MEDIA:https://example.com/image.png", "\n", "Caption."],
      ]) {
        const content = parts.map((text, index) => ({
          type: "text",
          text,
          ...(phase === "unphased"
            ? {}
            : {
                textSignature: JSON.stringify({
                  v: 1,
                  id: `part-${index}`,
                  ...(phase === "final_answer" ? { phase } : {}),
                }),
              }),
        }));
        expect(resolveRawAssistantAnswerText({ role: "assistant", content })).toBe(parts.join(""));
      }
    },
  );

  it.each(["", " \n", "<think>Internal.</think>"])(
    "falls back past signed blocks that sanitize to empty: %j",
    (text) => {
      expect(
        resolveRawAssistantAnswerText({
          role: "assistant",
          content: [
            { type: "text", text, textSignature: "signed-block" },
            { type: "text", text: "Answer." },
          ],
        }),
      ).toBe("Answer.");
    },
  );
});
