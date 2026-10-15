import { asOptionalRecord } from "@openclaw/normalization-core/record-coerce";
import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";
import {
  extractAssistantAuthoredText,
  extractAssistantTextForPhase,
  type AssistantPhase,
  parseAssistantTextSignature,
  readAssistantTextBlocksForPhase,
} from "./chat-message-content.js";
import {
  sanitizeAssistantFinalAnswerText,
  sanitizeAssistantVisibleText,
} from "./text/assistant-visible-text.js";

function readAuthoredPhaseText(message: Record<string, unknown>, phase?: AssistantPhase): string {
  return Array.isArray(message.content) && typeof message.text !== "string"
    ? extractAssistantAuthoredText({ content: readAssistantTextBlocksForPhase(message, phase) })
    : (extractAssistantTextForPhase(message, { phase }) ?? "");
}

/** Selects canonical final-answer bytes before channel reply directives are parsed. */
export function resolveRawAssistantAnswerText(message: unknown): string {
  const lastAssistant = asOptionalRecord(message);
  if (!lastAssistant) {
    return "";
  }
  const finalAnswerText = sanitizeAssistantFinalAnswerText(
    readAuthoredPhaseText(lastAssistant, "final_answer"),
  );
  if (finalAnswerText.trim()) {
    return normalizeOptionalString(finalAnswerText) ?? "";
  }
  // Signed unphased blocks retain their own answer semantics regardless of the message phase.
  const signedUnphasedParts = readAssistantTextBlocksForPhase({
    content: lastAssistant.content,
  }).filter((block) => parseAssistantTextSignature(block)?.id);
  const signedText = normalizeOptionalString(
    sanitizeAssistantFinalAnswerText(
      extractAssistantAuthoredText({ content: signedUnphasedParts }),
    ),
  );
  if (signedText) {
    return signedText;
  }
  return (
    normalizeOptionalString(sanitizeAssistantVisibleText(readAuthoredPhaseText(lastAssistant))) ??
    ""
  );
}
