import type { Component } from "solid-js";
import { solidContent } from "../../../lit/solid-content.tsx";

/** Keep the geometry fixture owned by the pane layout content boundary. */
export function nativePaneLayout<P extends Record<string, unknown>>(
  component: Component<P>,
  props: P,
) {
  return solidContent(component, props);
}
