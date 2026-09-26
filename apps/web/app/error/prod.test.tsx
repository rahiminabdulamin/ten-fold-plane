import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const errorPageSource = readFileSync(new URL("./prod.tsx", import.meta.url), "utf8");
const spinnerSource = readFileSync(new URL("../../core/components/common/logo-spinner.tsx", import.meta.url), "utf8");

describe("Ten-Fold error and loading branding", () => {
  it("uses Ten-Fold artwork and the Kognitif support contact", () => {
    expect(errorPageSource).toContain("tenfold-clipart-008.png?url");
    expect(errorPageSource).toContain("mailto:contact@kognitif.ai");
    expect(errorPageSource).not.toContain("plane.so");
    expect(errorPageSource).not.toContain("planepowers");
    expect(spinnerSource).toContain("tenfold-clipart-002a.png?url");
  });
});
