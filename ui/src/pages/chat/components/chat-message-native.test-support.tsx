import type { JSX } from "@solidjs/web";
import {
  createComponent,
  createSignal,
  For,
  getOwner,
  merge,
  Show,
  untrack,
  type Component,
} from "solid-js";
import { SolidContentPresentation } from "../../../lit/solid-content.tsx";
import { mountSolid, type MountSolidOptions } from "../../../test-helpers/mount-solid.ts";
import { flush } from "../../../test-helpers/solid-settle.ts";
import { AsyncQuestionSummary } from "./chat-async-question-summary.tsx";
import { ChatNotice } from "./chat-divider.tsx";
import { GroupedMessage } from "./chat-message-bubble-view.tsx";
import {
  ActivityGroup,
  MessageGroup,
  type NativeMessageGroupOptions,
} from "./chat-message-group-view.tsx";
import { StreamGroup } from "./chat-message-stream-view.tsx";
import { MarkdownContent, MessageMarkdown } from "./chat-message-text-view.tsx";
import type { QuestionPanelProps } from "./chat-question-card.ts";
import { ChatQuestionPanel } from "./chat-question-panel.tsx";
import type { ChatThreadProps } from "./chat-thread-interactions.ts";
import { ChatThread } from "./chat-thread-view.tsx";
import type { ChatTranscriptController } from "./chat-transcript-controller.ts";

export function createGroupedMessageHarness(container: HTMLElement) {
  type Props = Parameters<typeof GroupedMessage>[0];
  let root: ReturnType<typeof mountSolid> | undefined;
  let update: (props: Props) => void;
  return {
    render(
      preparation: Props["preparation"],
      messageKey: string,
      options: Props["options"],
      onOpenSidebar?: Props["onOpenSidebar"],
    ) {
      const next = { preparation, messageKey, options, onOpenSidebar };
      if (root) {
        update(next);
      } else {
        root = mountSolid(
          () => {
            const [props, setProps] = createSignal<Props>(next, { ownedWrite: true });
            update = setProps;
            return <GroupedMessage {...props()} />;
          },
          { container },
        );
      }
      if (!getOwner()) {
        flush();
      }
    },
    unmount() {
      root?.unmount();
      root = undefined;
    },
  };
}

export function createActivityGroupHarness(container: HTMLElement) {
  type Props = Parameters<typeof ActivityGroup>[0];
  let root: ReturnType<typeof mountSolid> | undefined;
  let update: (props: Props) => void;
  return {
    render(
      groups: Props["groups"],
      options: Props["options"],
      presentation: Props["presentation"] = "standalone",
    ) {
      const next = { groups, options, presentation };
      if (root) {
        update(next);
      } else {
        root = mountSolid(
          () => {
            const [props, setProps] = createSignal<Props>(next, { ownedWrite: true });
            update = setProps;
            return <ActivityGroup {...props()} />;
          },
          { container },
        );
      }
      if (!getOwner()) {
        flush();
      }
    },
    unmount() {
      root?.unmount();
      root = undefined;
    },
  };
}

export function createMessageGroupHarness(
  container: HTMLElement,
  options: Omit<MountSolidOptions, "container"> = {},
) {
  type Props = Parameters<typeof MessageGroup>[0];
  let root: ReturnType<typeof mountSolid> | undefined;
  let update: (props: Props) => void;
  return {
    render(group: Props["group"], renderOptions: NativeMessageGroupOptions) {
      const next = { group, options: renderOptions };
      if (root) {
        update(next);
      } else {
        root = mountSolid(
          () => {
            const [props, setProps] = createSignal(next);
            update = setProps;
            return <MessageGroup group={props().group} options={props().options} />;
          },
          { ...options, container },
        );
      }
      if (!getOwner()) {
        flush();
      }
    },
    unmount() {
      root?.unmount();
      root = undefined;
    },
  };
}

export function createChatThreadHarness(
  container: HTMLElement,
  transcript: ChatTranscriptController,
) {
  let root: ReturnType<typeof mountSolid> | undefined;
  let update: (props: ChatThreadProps) => void;
  return {
    render(props: ChatThreadProps) {
      const next = { ...props };
      if (root) {
        update(next);
      } else {
        root = mountSolid(
          () => {
            const [current, setCurrent] = createSignal(next);
            update = setCurrent;
            return <ChatThread props={current()} transcript={transcript} />;
          },
          { container },
        );
      }
      if (!getOwner()) {
        flush();
      }
    },
    unmount() {
      root?.unmount();
      root = undefined;
    },
  };
}

class NativeView {
  constructor(
    readonly component: Component<Record<string, unknown>>,
    readonly props: Record<string, unknown>,
  ) {}
}

export function nativeView<P extends Record<string, unknown>>(component: Component<P>, props: P) {
  // SAFETY: The descriptor keeps this component paired with its original props.
  return new NativeView(component as Component<Record<string, unknown>>, props);
}

type Content = NativeView | JSX.Element | Content[];
function ContentView(props: { value: Content }): JSX.Element {
  const view = () => (props.value instanceof NativeView ? props.value : undefined);
  const items = () => (Array.isArray(props.value) ? props.value : undefined);
  const plain = () => {
    const value = props.value;
    return value instanceof NativeView || Array.isArray(value) ? null : value;
  };
  return (
    <Show
      when={view()?.component}
      fallback={
        <Show when={items()} fallback={plain()}>
          {(values) => (
            <For each={values()} keyed={false}>
              {(item) => <ContentView value={item()} />}
            </For>
          )}
        </Show>
      }
    >
      {(component) =>
        createComponent(
          untrack(component),
          merge(() => view()!.props),
        )
      }
    </Show>
  );
}

const mounts = new WeakMap<
  HTMLElement,
  {
    update(value: Content): void;
    setConnected(value: boolean): void;
    unmount(): void;
  }
>();

export function render(value: Content, container: HTMLElement) {
  let mounted = mounts.get(container);
  if (value == null) {
    mounted?.unmount();
    mounts.delete(container);
    return undefined;
  }
  if (!mounted) {
    const [content, update] = createSignal<Content>(value, { equals: false });
    const [presented, setPresented] = createSignal(true);
    const view = mountSolid(
      () => (
        <SolidContentPresentation value={presented}>
          <ContentView value={content()} />
        </SolidContentPresentation>
      ),
      { container },
    );
    mounted = {
      update: (next) => update(() => next),
      setConnected: (connected) => {
        setPresented(connected);
        flush();
      },
      unmount: view.unmount,
    };
    mounts.set(container, mounted);
  } else {
    mounted.update(value);
  }
  flush();
  return mounted;
}

export function renderAsyncQuestionSummary(
  questions: Parameters<typeof AsyncQuestionSummary>[0]["questions"],
  presentation: Parameters<typeof AsyncQuestionSummary>[0]["presentation"],
) {
  return nativeView(AsyncQuestionSummary, { questions, presentation });
}
export function renderMessageMarkdown(
  markdown: string,
  messageKey: string,
  options: Parameters<typeof MessageMarkdown>[0]["options"],
  markdownOptions: Parameters<typeof MessageMarkdown>[0]["markdownOptions"],
  duplicateSuffix?: Parameters<typeof MessageMarkdown>[0]["duplicateSuffix"],
  media?: Parameters<typeof MessageMarkdown>[0]["media"],
) {
  return nativeView(MessageMarkdown, {
    markdown,
    messageKey,
    options,
    markdownOptions,
    duplicateSuffix,
    media,
  });
}
export function renderMarkdownMedia(
  content: Parameters<typeof MarkdownContent>[0]["content"],
  media?: Parameters<typeof MarkdownContent>[0]["media"],
  incremental = false,
) {
  return nativeView(MarkdownContent, { content, media, incremental });
}
export function renderGroupedMessage(
  preparation: Parameters<typeof GroupedMessage>[0]["preparation"],
  messageKey: string,
  options: Parameters<typeof GroupedMessage>[0]["options"],
  onOpenSidebar?: Parameters<typeof GroupedMessage>[0]["onOpenSidebar"],
) {
  return nativeView(GroupedMessage, { preparation, messageKey, options, onOpenSidebar });
}
export function renderMessageGroup(
  group: Parameters<typeof MessageGroup>[0]["group"],
  options: NativeMessageGroupOptions,
) {
  return nativeView(MessageGroup, { group, options });
}
export function renderActivityGroup(
  groups: Parameters<typeof ActivityGroup>[0]["groups"],
  options: NativeMessageGroupOptions,
  presentation: Parameters<typeof ActivityGroup>[0]["presentation"] = "standalone",
) {
  return nativeView(ActivityGroup, { groups, options, presentation });
}
export function renderStreamGroup(
  parts: Parameters<typeof StreamGroup>[0]["parts"],
  options: Parameters<typeof StreamGroup>[0]["options"] = {},
) {
  return nativeView(StreamGroup, { parts, options });
}

function QuestionPanelFixture(props: { panel: QuestionPanelProps }) {
  return <ChatQuestionPanel props={props.panel} />;
}
export function renderQuestionPanel(panel: QuestionPanelProps) {
  return nativeView(QuestionPanelFixture, { panel });
}
export function renderChatNotice(
  item: Parameters<typeof ChatNotice>[0]["item"],
  onPermissionRetry?: Parameters<typeof ChatNotice>[0]["onPermissionRetry"],
  recovery?: Parameters<typeof ChatNotice>[0]["recovery"],
) {
  return nativeView(ChatNotice, { item, onPermissionRetry, recovery });
}

function MarkdownSection(props: { content: Content; onClick?: (event: MouseEvent) => void }) {
  return (
    <section onClick={(event) => props.onClick?.(event)}>
      <ContentView value={props.content} />
    </section>
  );
}
export function renderMarkdownSection(content: Content, onClick?: (event: MouseEvent) => void) {
  return nativeView(MarkdownSection, { content, onClick });
}
