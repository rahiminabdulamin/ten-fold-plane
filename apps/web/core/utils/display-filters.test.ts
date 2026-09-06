import { describe, expect, it } from "vitest";

import { getComputedDisplayFilters } from "@plane/utils";

describe("calendar display filters", () => {
  it("shows weekends by default while preserving an explicit hidden preference", () => {
    expect(getComputedDisplayFilters().calendar?.show_weekends).toBe(true);
    expect(getComputedDisplayFilters({ calendar: { show_weekends: false } }).calendar?.show_weekends).toBe(false);
  });
});
