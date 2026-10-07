import { describe, expect, it } from "vitest";

import { getCalendarDesktopRowCount, getCalendarIssueIdsByDate, getCalendarIssueSpans } from "./calendar-range";
import type { CalendarIssueSpan } from "./calendar-range";

const span = (issueId: string, start: number, end = start, isRange = end !== start): CalendarIssueSpan => ({
  issueId,
  start,
  end,
  isRange,
  continuesBefore: false,
  continuesAfter: false,
});

describe("getCalendarDesktopRowCount", () => {
  it.each([
    {
      name: "an early range and three later cards",
      spans: [span("range", 1, 2), ...["a", "b", "c"].map((id) => span(id, 5))],
      rangeLanes: 1,
      rows: 4,
    },
    {
      name: "a card under a range and three later cards",
      spans: [span("range", 1, 2), span("early", 1), ...["a", "b", "c"].map((id) => span(id, 5))],
      rangeLanes: 1,
      rows: 4,
    },
    {
      name: "two range lanes and three cards",
      spans: [span("r1", 0, 2), span("r2", 1, 3), ...["a", "b", "c"].map((id) => span(id, 5))],
      rangeLanes: 2,
      rows: 5,
    },
    { name: "cards on separate dates", spans: [span("a", 0), span("b", 0), span("c", 4)], rangeLanes: 0, rows: 2 },
    { name: "a range in a deeper allocated lane", spans: [span("range", 1, 3), span("a", 1)], rangeLanes: 3, rows: 4 },
    {
      name: "a range clipped to one visible date",
      spans: [span("range", 0, 0, true), span("a", 4)],
      rangeLanes: 1,
      rows: 2,
    },
    { name: "only ranges", spans: [span("range", 0, 4)], rangeLanes: 1, rows: 1 },
    { name: "an empty week", spans: [], rangeLanes: 0, rows: 0 },
  ])("reserves all desktop rows for $name", ({ spans, rangeLanes, rows }) => {
    expect(getCalendarDesktopRowCount(spans, rangeLanes)).toBe(rows);
  });
});

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
