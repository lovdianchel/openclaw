import { createComponent, createSignal, getOwner } from "solid-js";
import { solidContent } from "../../../lit/solid-content.tsx";
import { mountSolid } from "../../../test-helpers/mount-solid.ts";
import { flush } from "../../../test-helpers/solid-settle.ts";
import {
  getTranscriptState,
  closeTranscriptSearch,
  type ChatThreadProps,
} from "./chat-thread-interactions.ts";
import { ChatThread } from "./chat-thread-view.tsx";
import type { ChatTranscriptController } from "./chat-transcript-controller.ts";
import { TranscriptSearch } from "./chat-transcript-search.tsx";

/** Remaining Lit callers share the native transcript's retained Solid root. */
export function renderChatThread(props: ChatThreadProps, transcript: ChatTranscriptController) {
  return solidContent(ChatThread, { props, transcript });
}

export function mountTranscriptSearch(
  paneId: () => string,
  requestUpdate: () => void,
  container?: HTMLElement,
) {
  const [revision, setRevision] = createSignal(0, { ownedWrite: true });
  const view = mountSolid(
    () =>
      createComponent(TranscriptSearch, {
        get state() {
          return getTranscriptState(paneId());
        },
        get revision() {
          return revision();
        },
        requestUpdate,
        onClose: () => closeTranscriptSearch(getTranscriptState(paneId()), requestUpdate),
      }),
    { container },
  );
  return {
    ...view,
    update() {
      setRevision((value) => value + 1);
      flush();
    },
  };
}

export function mountChatThread(initial: ChatThreadProps, transcript: ChatTranscriptController) {
  const [current, setCurrent] = createSignal(initial, { equals: false, ownedWrite: true });
  const view = mountSolid(() =>
    createComponent(ChatThread, {
      get props() {
        return current();
      },
      transcript,
    }),
  );
  flush();
  return {
    ...view,
    update(props: ChatThreadProps) {
      setCurrent(() => props);
      if (!getOwner()) {
        flush();
      }
    },
  };
}
