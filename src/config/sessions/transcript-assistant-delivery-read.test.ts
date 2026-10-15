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

  it.each([
    {
      name: "image after the silent token",
      content: "NO_REPLY\nMEDIA:https://example.test/chart.png",
      text: "MEDIA:https://example.test/chart.png",
    },
    {
      name: "voice after the silent token",
      content: "NO_REPLY\n[[audio_as_voice]]\nMEDIA:https://example.test/voice.ogg",
      text: "[[audio_as_voice]]\nMEDIA:https://example.test/voice.ogg",
    },
    {
      name: "image before a final silent line",
      content: "Private reasoning.\nMEDIA:https://example.test/chart.png\nNO_REPLY",
      text: "MEDIA:https://example.test/chart.png",
    },
    {
      name: "invalid media receipt",
      content: "Private reasoning.\nNO_REPLY\nMEDIA:media://inbound/",
      text: "⚠️ Media not attached: Use a public HTTPS URL without credentials or attach a local file by a safe path.",
    },
  ])("retains $name without withdrawn prose", ({ content, text }) => {
    expect(projectAssistantTranscriptText({ role: "assistant", content })?.text).toBe(text);
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
