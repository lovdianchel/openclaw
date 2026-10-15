import {
  addReplyPayloadMediaFailures,
  setReplyPayloadMetadata,
  type ReplyPayload,
} from "../reply-payload.js";
import { normalizeReplyPayloadOutcome } from "./normalize-reply.js";
import { parseReplyDirectives } from "./reply-directives.js";

export function prepareCliReplyPayload(
  text: string,
  currentMessageId?: string,
  assistantMessageIndex?: number,
): ReplyPayload {
  const parsed = parseReplyDirectives(text, { currentMessageId });
  const reply: ReplyPayload = {
    text: parsed.text,
    mediaUrls: parsed.mediaUrls,
    replyToId: parsed.replyToId,
    replyToCurrent: parsed.replyToCurrent,
    ...(parsed.replyToTag ? { replyToTag: true } : {}),
    audioAsVoice: parsed.audioAsVoice,
  };
  addReplyPayloadMediaFailures(reply, parsed.mediaFailures);
  if (assistantMessageIndex !== undefined) {
    setReplyPayloadMetadata(reply, { assistantMessageIndex });
  }
  if (parsed.isSilent) {
    setReplyPayloadMetadata(reply, { silentReply: true });
  }
  return reply;
}

export function prepareCliAssistantReply(output: { text: string; textParts?: string[] }): {
  text: string;
  hasContent: boolean;
  terminalReplyKind?: "silent-empty";
} {
  const outcomes = (output.textParts ?? [output.text]).map((text) =>
    normalizeReplyPayloadOutcome(prepareCliReplyPayload(text)),
  );
  const payloads = outcomes.flatMap((outcome) =>
    outcome.kind === "deliver" ? [outcome.payload] : [],
  );
  const hasContent = payloads.length > 0;
  return {
    text: payloads
      .map((payload) => payload.text?.trim())
      .filter(Boolean)
      .join("\n"),
    hasContent,
    terminalReplyKind:
      !hasContent &&
      outcomes.some((outcome) => outcome.kind === "suppress" && outcome.reason === "silent")
        ? "silent-empty"
        : undefined,
  };
}
