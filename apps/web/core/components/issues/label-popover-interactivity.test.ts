import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const labelSelectorSources = [
  new URL("./select/base.tsx", import.meta.url),
  new URL("./issue-layouts/properties/label-dropdown.tsx", import.meta.url),
];

describe("label popover interactivity", () => {
  it("keeps both label menus above enclosing overlays", () => {
    for (const source of labelSelectorSources) {
      const content = readFileSync(fileURLToPath(source), "utf8");
      expect(content).toContain("pointer-events-auto");
      expect(content).toContain("z-[9999]");
    }
  });
});
