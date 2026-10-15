import { asOptionalObjectRecord } from "@openclaw/normalization-core/record-coerce";
import {
  parseReplyDirectivesFromMedia,
  serializeReplyDirectiveText,
} from "../../auto-reply/reply/reply-directives-core.js";
import { SILENT_REPLY_TOKEN } from "../../auto-reply/tokens.js";
import { splitMediaOutput } from "../../media/parse-output.js";
import { NESTED_TOOL_ACTIVITY_CUSTOM_TYPE } from "../../sessions/nested-tool-activity.js";
import {
  extractAssistantAuthoredText,
  extractAssistantTextForPhase,
} from "../../shared/chat-message-content.js";
import { sanitizeAssistantVisibleTextWithProfile } from "../../shared/text/assistant-visible-text.js";
import { sanitizeUserFacingText } from "../embedded-agent-helpers/sanitize-user-facing-text.js";
import { renderUserFacingText } from "../embedded-agent-helpers/user-facing-text.js";

export function stripToolMessages(messages: unknown[]): unknown[] {
  return messages.filter((msg) => {
    if (!msg || typeof msg !== "object") {
      return true;
    }
    const { role, customType } = msg as { role?: unknown; customType?: unknown };
    return (
      role !== "toolResult" &&
      role !== "tool" &&
      !(role === "custom" && customType === NESTED_TOOL_ACTIVITY_CUSTOM_TYPE)
    );
  });
}

function sanitizeTextContent(text: string): string {
  return sanitizeAssistantVisibleTextWithProfile(text, "history");
}

export function extractStoredAssistantText(message: unknown): string | undefined {
  const entry = asOptionalObjectRecord(message);
  if (entry?.role !== "assistant") {
    return undefined;
  }
  const rawText = extractAssistantAuthoredText(entry);
  // Classify authored order before phase selection can revive a withdrawn answer.
  const parsed = parseReplyDirectivesFromMedia(splitMediaOutput(rawText));
  if (parsed.hasSilentIntent) {
    return serializeReplyDirectiveText(parsed) || SILENT_REPLY_TOKEN;
  }
  const joined =
    extractAssistantTextForPhase(message, {
      phase: "final_answer",
      sanitizeText: sanitizeTextContent,
      joinWith: "",
    }) ??
    extractAssistantTextForPhase(message, {
      sanitizeText: sanitizeTextContent,
      joinWith: "",
    });
  const stopReason = entry.stopReason;
  // Gate on stopReason only — a non-error response with a stale/background errorMessage
  // should not have its content rewritten with error templates (#13935).
  const errorContext = stopReason === "error";

  return joined
    ? errorContext
      ? renderUserFacingText(joined, { errorContext: true })
      : sanitizeUserFacingText(joined)
    : undefined;
}
