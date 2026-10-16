import { asOptionalRecord } from "@openclaw/normalization-core/record-coerce";
import { normalizeOptionalString } from "@openclaw/normalization-core/string-coerce";
import {
  extractAssistantAuthoredText,
  extractAssistantTextForPhase,
  parseAssistantTextSignature,
  readAssistantTextBlocksForPhase,
} from "./chat-message-content.js";
import {
  sanitizeAssistantFinalAnswerText,
  sanitizeAssistantVisibleText,
} from "./text/assistant-visible-text.js";

/** Selects canonical final-answer bytes before channel reply directives are parsed. */
export function resolveRawAssistantAnswerText(message: unknown): string {
  const lastAssistant = asOptionalRecord(message);
  if (!lastAssistant) {
    return "";
  }
  const finalAnswerText = sanitizeAssistantFinalAnswerText(
    extractAssistantTextForPhase(lastAssistant, { phase: "final_answer", joinWith: "" }) ?? "",
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
    normalizeOptionalString(
      sanitizeAssistantVisibleText(
        extractAssistantTextForPhase(lastAssistant, { joinWith: "" }) ?? "",
      ),
    ) ?? ""
  );
}
