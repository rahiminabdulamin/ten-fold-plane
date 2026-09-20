import { describe, expect, it } from "vitest";

import { getCalendarIssueIdsByDate } from "./calendar-range";

describe("getCalendarIssueIdsByDate", () => {
  it("places a dated work item on every inclusive day from start through due date", () => {
    const issueIds = getCalendarIssueIdsByDate(
      {
        span: { id: "span", start_date: "2026-11-10", target_date: "2026-11-13" },
        single: { id: "single", start_date: null, target_date: "2026-11-13" },
      },
      ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"]
    );

    expect(issueIds).toEqual({
      "2026-11-09": [],
      "2026-11-10": ["span"],
      "2026-11-11": ["span"],
      "2026-11-12": ["span"],
      "2026-11-13": ["span", "single"],
      "2026-11-14": [],
    });
  });
});
