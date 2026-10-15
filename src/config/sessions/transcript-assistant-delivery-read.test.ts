import { describe, expect, it } from "vitest";
import { projectAssistantTranscriptText } from "./transcript-assistant-delivery-read.js";

describe("projectAssistantTranscriptText", () => {
  it.each([
    { parts: ["Mention ", "NO_REPLY"], text: "Mention NO_REPLY" },
    { parts: ["First.", "\n", "Second."], text: "First.\nSecond." },
  ])("preserves authored separators for latest-reply readers: $parts", ({ parts, text }) => {
    expect(
      projectAssistantTranscriptText({
        role: "assistant",
        content: parts.map((part) => ({ type: "text", text: part })),
      })?.text,
    ).toBe(text);
  });

  it("keeps whole-message silence ahead of the selected answer and retains delivery facts", () => {
    const openclawDelivery = { mediaUrls: ["/tmp/kept.png"] };
    expect(
      projectAssistantTranscriptText({
        role: "assistant",
        content: [
          {
            type: "text",
            text: "A withdrawn answer.",
            textSignature: '{"v":1,"phase":"final_answer"}',
          },
          { type: "text", text: "\nNO_REPLY", textSignature: '{"v":1,"phase":"commentary"}' },
        ],
        openclawDelivery,
      }),
    ).toEqual({ text: "NO_REPLY", openclawDelivery });
  });
});
