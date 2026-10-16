import { onTestFinished } from "vitest";
import { mountSolid } from "../../../test-helpers/solid-render.tsx";
import { AsyncQuestionSummary } from "./chat-async-question-summary.tsx";
import type { AsyncQuestionPresentation, AsyncQuestions } from "./chat-async-question.types.ts";

const roots = new Map<
  HTMLElement,
  ReturnType<typeof mountSolid<Parameters<typeof AsyncQuestionSummary>[0]>>
>();

export function clearQuestionSummary(container: HTMLElement) {
  roots.get(container)?.dispose();
  roots.delete(container);
}

export function renderQuestionSummary(
  questions: AsyncQuestions,
  presentation: AsyncQuestionPresentation,
  container: HTMLElement,
) {
  const props = { questions, presentation };
  const current = roots.get(container);
  if (current) {
    current.update(props);
  } else {
    roots.set(container, mountSolid(AsyncQuestionSummary, props, container));
    onTestFinished(() => clearQuestionSummary(container));
  }
}
