import { describe, expect, it } from "vitest";

import { getRetryDelay } from "./retry-delay";

describe("getRetryDelay", () => {
  it("waits for the duration requested by a rate-limited server", () => {
    expect(getRetryDelay("17", 4, new Date("2026-09-10T00:00:00Z"))).toBe(17_000);
  });

  it("backs off exponentially when a failed request has no retry instruction", () => {
    expect(getRetryDelay(null, 4, new Date("2026-09-10T00:00:00Z"))).toBe(40_000);
  });
});
