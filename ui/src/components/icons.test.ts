/* @vitest-environment jsdom */
import { createComponent } from "solid-js";
import { describe, expect, it } from "vitest";
import { mountSolid } from "../test-helpers/mount-solid.ts";
import { Icon } from "./solid/icon.tsx";

describe("Solid icon reuse", () => {
  it("keeps reusable registry values", () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    mountSolid(() => createComponent(Icon, { name: "copy" }), { container: first });
    mountSolid(() => createComponent(Icon, { name: "copy" }), { container: second });
    expect(first.querySelector("svg")).not.toBe(second.querySelector("svg"));
    expect(first.querySelector("rect")?.getAttribute("width")).toBe("14");
  });
});
