import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const createDialogSelector = new URL("./select/base.tsx", import.meta.url);
const detailPanelSelector = new URL("./issue-detail/label/select/label-select.tsx", import.meta.url);

describe("label popover interactivity", () => {
  it("protects interactions inside the create-dialog label menu", () => {
    const content = readFileSync(fileURLToPath(createDialogSelector), "utf8");
    expect(content).toContain("pointer-events-auto");
    expect(content).toContain("z-[9999]");
    expect(content).toContain("data-prevent-outside-click");
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
});
