import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const customSearchSelect = new URL(
  "../../../../../packages/ui/src/dropdowns/custom-search-select.tsx",
  import.meta.url
);

describe("rich filter option selection", () => {
  it("selects an option before ancestor mouse handlers can swallow its mousedown", () => {
    const content = readFileSync(fileURLToPath(customSearchSelect), "utf8");

    expect(content).toMatch(
      /onMouseDownCapture=\{\(event\) =>\s*handleOptionSelection\(event, option\.value, option\.disabled\)/
    );
  });
});
