import { describe, expect, it } from "vitest";

import { getComputedDisplayFilters, getComputedDisplayProperties } from "@plane/utils";

describe("calendar display filters", () => {
  it("shows weekends by default while preserving an explicit hidden preference", () => {
    expect(getComputedDisplayFilters().calendar?.show_weekends).toBe(true);
    expect(getComputedDisplayFilters({ calendar: { show_weekends: false } }).calendar?.show_weekends).toBe(false);
  });
});

describe("work item display properties", () => {
  it("hides IDs by default while preserving an explicit visible preference", () => {
    expect(getComputedDisplayProperties().key).toBe(false);
    expect(getComputedDisplayProperties({ key: true }).key).toBe(true);
  });
});
