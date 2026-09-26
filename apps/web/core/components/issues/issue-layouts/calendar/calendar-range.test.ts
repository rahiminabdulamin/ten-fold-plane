import { describe, expect, it } from "vitest";

import { getCalendarIssueIdsByDate, getCalendarIssueSpans } from "./calendar-range";

describe("getCalendarIssueIdsByDate", () => {
  it("places a dated work item on every inclusive day from start through due date", () => {
    const issueIds = getCalendarIssueIdsByDate(
      {
        span: { id: "span", start_date: "2026-11-10", target_date: "2026-11-13" },
        single: { id: "single", start_date: null, target_date: "2026-11-13" },
      },
      ["span", "single"],
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

  it("only places work items returned for the active calendar", () => {
    const issueIds = getCalendarIssueIdsByDate(
      {
        current: { id: "current", start_date: "2026-11-10", target_date: "2026-11-13" },
        cachedElsewhere: { id: "cachedElsewhere", start_date: "2026-11-10", target_date: "2026-11-13" },
      },
      ["current"],
      ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"]
    );

    expect(issueIds).toEqual({
      "2026-11-10": ["current"],
      "2026-11-11": ["current"],
      "2026-11-12": ["current"],
      "2026-11-13": ["current"],
    });
  });

  it("describes a range as one visible span with open edges when it crosses calendar rows", () => {
    const issues = {
      crossing: { id: "crossing", start_date: "2026-11-05", target_date: "2026-11-10" },
    };
    const firstWeekDates = [
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ];
    const secondWeekDates = [
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ];

    expect(
      getCalendarIssueSpans(issues, getCalendarIssueIdsByDate(issues, ["crossing"], firstWeekDates), firstWeekDates)
    ).toEqual([{ issueId: "crossing", start: 3, end: 6, isRange: true, continuesBefore: false, continuesAfter: true }]);
    expect(
      getCalendarIssueSpans(issues, getCalendarIssueIdsByDate(issues, ["crossing"], secondWeekDates), secondWeekDates)
    ).toEqual([{ issueId: "crossing", start: 0, end: 1, isRange: true, continuesBefore: true, continuesAfter: false }]);
  });

  it("keeps a range continuous across hidden weekend columns", () => {
    const issues = {
      weekend: { id: "weekend", start_date: "2026-11-06", target_date: "2026-11-09" },
    };
    const visibleWeekdays = ["2026-11-06", "2026-11-09"];

    expect(
      getCalendarIssueSpans(issues, getCalendarIssueIdsByDate(issues, ["weekend"], visibleWeekdays), visibleWeekdays)
    ).toEqual([{ issueId: "weekend", start: 0, end: 1, isRange: true, continuesBefore: false, continuesAfter: false }]);
  });

  it("allocates one-day work items to lanes without rendering them as range bars", () => {
    const issues = {
      single: { id: "single", start_date: null, target_date: "2026-11-10" },
    };
    const dates = ["2026-11-09", "2026-11-10", "2026-11-11"];

    expect(getCalendarIssueSpans(issues, getCalendarIssueIdsByDate(issues, ["single"], dates), dates)).toEqual([
      { issueId: "single", start: 1, end: 1, continuesBefore: false, continuesAfter: false, isRange: false },
    ]);
  });
});
