import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const filtersDropdown = new URL("./dropdown.tsx", import.meta.url);

describe("FiltersDropdown", () => {
  it("keeps its fixed menu interactive above the active layout", () => {
    const source = readFileSync(fileURLToPath(filtersDropdown), "utf8");

    expect(source).toContain("pointer-events-auto");
    expect(source).toContain("z-[9999]");
    expect(source).toContain("data-prevent-outside-click");
  });
});
