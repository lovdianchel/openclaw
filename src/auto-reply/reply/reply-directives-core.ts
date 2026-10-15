import type { splitMediaOutput } from "../../media/parse-output.js";
import {
  parseInlineDirectives,
  stripInlineDirectiveTagsForDelivery,
} from "../../utils/directive-tags.js";
import { appendReplyMediaFailures, type ReplyMediaFailure } from "../reply-payload.js";
import { isSilentReplyPayloadText, SILENT_REPLY_TOKEN } from "../tokens.js";
import { stripMixedSilentReplyTokens } from "./mixed-silent-reply-tokens.js";

export type ReplyDirectiveParseResult = {
  text: string;
  mediaUrls?: string[];
  mediaFailures?: ReplyMediaFailure[];
  replyToId?: string;
  replyToCurrent?: boolean;
  replyToTag: boolean;
  audioAsVoice?: boolean;
  isSilent: boolean;
  /** Silent authored text can still produce a visible attachment failure. */
  hasSilentIntent: boolean;
};

/** Applies shared reply policy after the caller's media extraction. */
export function parseReplyDirectivesFromMedia(
  split: ReturnType<typeof splitMediaOutput>,
  options: {
    currentMessageId?: string;
    silentToken?: string;
    silentIntent?: boolean;
    preserveTrailingWhitespace?: boolean;
  } = {},
): ReplyDirectiveParseResult {
  let text = split.text ?? "";

  const replyParsed = text.includes("[[")
    ? parseInlineDirectives(text, {
        currentMessageId: options.currentMessageId,
        stripAudioTag: false,
        preserveTrailingWhitespace: options.preserveTrailingWhitespace,
      })
    : undefined;

  text = stripInlineDirectiveTagsForDelivery(replyParsed?.hasReplyTag ? replyParsed.text : text, {
    preserveTrailingWhitespace: options.preserveTrailingWhitespace,
  }).text;

  const silentToken = options.silentToken ?? SILENT_REPLY_TOKEN;
  const isSilent = options.silentIntent ?? isSilentReplyPayloadText(text, silentToken);
  if (options.silentIntent === false) {
    text = stripMixedSilentReplyTokens(text, silentToken) ?? text;
  }
  const mediaFailures = Array.from(
    { length: split.rejectedMediaCount ?? 0 },
    (): ReplyMediaFailure => ({
      code: "invalid-reference",
      kind: "document",
      label: "Media not attached",
    }),
  );

  return {
    // Silent payloads must not leak the control token into channel delivery.
    text: appendReplyMediaFailures(isSilent ? "" : text, mediaFailures) ?? "",
    mediaUrls: split.mediaUrls,
    ...(mediaFailures.length ? { mediaFailures } : {}),
    replyToId: replyParsed?.replyToId,
    replyToCurrent: replyParsed?.replyToCurrent || undefined,
    replyToTag: replyParsed?.hasReplyTag ?? false,
    audioAsVoice: split.audioAsVoice,
    isSilent: isSilent && !mediaFailures.length,
    hasSilentIntent: isSilent,
  };
}

/** Retains deliverable text and media when projecting a parsed reply into a transcript. */
export function serializeReplyDirectiveText(
  parsed: Pick<ReplyDirectiveParseResult, "text" | "mediaUrls" | "audioAsVoice">,
): string {
  return [
    parsed.text,
    ...(parsed.audioAsVoice && parsed.mediaUrls?.length ? ["[[audio_as_voice]]"] : []),
    ...(parsed.mediaUrls ?? []).map((url) => `MEDIA:${url}`),
  ]
    .filter(Boolean)
    .join("\n");
}
