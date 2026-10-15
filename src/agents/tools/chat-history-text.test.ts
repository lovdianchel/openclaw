import { describe, expect, it } from "vitest";
import { textAssistant } from "../test-helpers/sparse-transcript.test-support.js";
import { extractStoredAssistantText } from "./chat-history-text.js";

describe("extractStoredAssistantText", () => {
  it.each([
    { name: "plain text", content: "Internal reasoning.\nNO_REPLY", expected: "NO_REPLY" },
    {
      name: "split output text",
      content: [
        { type: "output_text", text: "Internal reasoning." },
        { type: "output_text", text: "\n **NO_REPLY** \n\n" },
      ],
      expected: "NO_REPLY",
    },
    {
      name: "adjacent inline text",
      content: [
        { type: "text", text: "Mention " },
        { type: "text", text: "NO_REPLY" },
      ],
      expected: "Mention NO_REPLY",
    },
    {
      name: "leading token",
      content: "NO_REPLY\nVisible answer.",
      expected: "NO_REPLY\nVisible answer.",
    },
    {
      name: "token mention",
      content: "NO_REPLY is a control token.",
      expected: "NO_REPLY is a control token.",
    },
    {
      name: "media without a silent tail",
      content: "Answer.\nMEDIA:/tmp/chart.png",
      expected: "Answer.\nMEDIA:/tmp/chart.png",
    },
    {
      name: "media with a silent tail",
      content: "Reasoning.\n[[audio_as_voice]]\nMEDIA:/tmp/voice.ogg\nNO_REPLY",
      expected: "[[audio_as_voice]]\nMEDIA:/tmp/voice.ogg",
    },
    {
      name: "voice tag without an attachment",
      content: "[[audio_as_voice]]\nNO_REPLY",
      expected: "NO_REPLY",
    },
  ])("preserves authored final-line intent: $name", ({ content, expected }) => {
    expect(extractStoredAssistantText({ role: "assistant", content })).toBe(expected);
  });

  it.each([
    [
      "tool calls",
      'Hello <invoke name="tool">payload</invoke></minimax:tool_call> [Tool Call: foo (ID: 1)] world',
      "Hello  world",
      ["invoke", "Tool Call"],
    ],
    [
      "tool results",
      'Prefix\n<tool_result>{"output":"hidden"}</tool_result>\nSuffix',
      "Prefix\n\nSuffix",
      ["tool_result"],
    ],
    ["thinking", "Before <think>secret</think> after", "Before  after", []],
    [
      "adjacent blocks",
      [
        { type: "text", text: "Hi " },
        { type: "text", text: "<think>secret</think>there" },
      ],
      "Hi there",
      [],
    ],
  ] as const)("sanitizes %s without adding separators", (_name, content, expected, hidden) => {
    const text = extractStoredAssistantText({ role: "assistant", content });
    const result = typeof content === "string" ? text?.trim() : text;
    expect(result).toBe(expected);
    for (const marker of hidden) {
      expect(result).not.toContain(marker);
    }
  });

  it.each([
    {
      name: "transcript error",
      message: {
        role: "assistant",
        stopReason: "error",
        errorMessage: "500 Internal Server Error",
        content: [{ type: "text", text: "500 Internal Server Error" }],
      },
      expected: "HTTP 500: Internal Server Error",
    },
    {
      name: "normal billing status",
      message: textAssistant(
        "Firebase downgraded us to the free Spark plan. Check whether billing should be re-enabled.",
      ),
      expected:
        "Firebase downgraded us to the free Spark plan. Check whether billing should be re-enabled.",
    },
    {
      name: "successful turn with stale errorMessage",
      message: {
        role: "assistant",
        stopReason: "end_turn",
        errorMessage: "insufficient credits for embedding model",
        content: [{ type: "text", text: "Handle payment required errors in your API." }],
      },
      expected: "Handle payment required errors in your API.",
    },
  ])("rewrites only transcript errors: $name", ({ message, expected }) => {
    expect(extractStoredAssistantText(message)).toBe(expected);
  });

  it("prefers final_answer text when phased assistant history is present", () => {
    const message = {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "internal reasoning",
          textSignature: JSON.stringify({ v: 1, id: "item_commentary", phase: "commentary" }),
        },
        {
          type: "text",
          text: "Done.",
          textSignature: JSON.stringify({ v: 1, id: "item_final", phase: "final_answer" }),
        },
      ],
    };
    expect(extractStoredAssistantText(message)).toBe("Done.");
  });
});
