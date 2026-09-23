import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const createDialogSelector = new URL("./select/base.tsx", import.meta.url);
const detailPanelSelector = new URL("./issue-detail/label/select/label-select.tsx", import.meta.url);
const stateDropdown = new URL("../dropdowns/state/base.tsx", import.meta.url);
const priorityDropdown = new URL("../dropdowns/priority.tsx", import.meta.url);

describe("label popover interactivity", () => {
  it("protects interactions inside the create-dialog label menu", () => {
    const content = readFileSync(fileURLToPath(createDialogSelector), "utf8");
    expect(content).toContain("pointer-events-auto");
    expect(content).toContain("z-[9999]");
    expect(content).toContain("data-prevent-outside-click");
    expect(content).toContain("modal={false}");
    expect(content).toContain("onMouseDown={(event) => event.stopPropagation()}");
  });

  it("uses the working property-popover pattern in the detail panel", () => {
    const content = readFileSync(fileURLToPath(detailPanelSelector), "utf8");
    expect(content).toContain('strategy: "fixed"');
    expect(content).toContain("<Portal>");
    expect(content).toContain("modal={false}");
    expect(content).toContain("z-40");
    expect(content).toContain("data-prevent-outside-click");
    expect(content).not.toContain("            static\n");
    expect(content).toContain("onMouseDown={(event) => event.stopPropagation()}");
  });

  it("does not submit the typed label name as a selected label ID", () => {
    const content = readFileSync(fileURLToPath(detailPanelSelector), "utf8");
    expect(content).not.toContain('as="li"\n                    value={query}');
    expect(content).toMatch(/canCreateLabel \? \(\s*<button/);
  });

  it("keeps the detail panel open while choosing State or Priority", () => {
    for (const selector of [stateDropdown, priorityDropdown]) {
      const content = readFileSync(fileURLToPath(selector), "utf8");
      expect(content).toContain("data-prevent-outside-click");
    }
  });
});
