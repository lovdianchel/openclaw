import { render } from "@solidjs/web";
import { createComponent, createSignal, flush } from "solid-js";
import type { ApplicationContext } from "../app/context.ts";
import { ApplicationProvider } from "../lib/reactive/context.ts";
import { normalizeApplicationContext } from "./application-context-fixtures.ts";

export {
  createApplicationGateway,
  createNavigationPreferencesFixture,
  hiddenScopeUpgradeCapability,
} from "./application-context-fixtures.ts";

export function createApplicationContextProvider(context: ApplicationContext) {
  const host = document.createElement("div");
  const [value, setValue] = createSignal(normalizeApplicationContext(context));
  render(
    () =>
      createComponent(ApplicationProvider, {
        host,
        get value() {
          return value();
        },
      }),
    document.createDocumentFragment(),
  );
  return Object.assign(host, {
    setContext: (next: ApplicationContext) => {
      setValue(normalizeApplicationContext(next));
      flush();
    },
  });
}

export type ApplicationContextProvider = ReturnType<typeof createApplicationContextProvider>;
