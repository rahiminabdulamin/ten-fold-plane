import { describe, expect, it } from "vitest";

import {
  buildWorkItemQuery,
  classifyToolError,
  createWorkItemsSequentially,
  expandWeeklyOccurrenceDates,
  filterMonthEventRecords,
  getUserLocalDateTime,
  getMonthDateRange,
  toolError,
  toolPartialResult,
  toolResult,
  toolUncertainResult,
  toWorkItemPayload,
  toWorkItemRecords,
} from "./tool-contracts";

describe("work-item tool contracts", () => {
  it("distinguishes verified, partial, and uncertain outcomes", () => {
    expect(toolResult("create_work_item", "Created.")).toMatchObject({
      ok: true,
      status: "success",
      retryable: false,
    });
    expect(toolPartialResult("create_work_items", "Created 1 of 2.", ["issue-1"])).toMatchObject({
      ok: false,
      status: "partial_success",
    });
    expect(toolUncertainResult("update_work_item", ["issue-1"])).toMatchObject({
      ok: false,
      status: "uncertain",
      retryable: false,
    });
  });

  it("classifies structured service errors without exposing them", () => {
    expect(classifyToolError({ response: { status: 403 } })).toEqual({ category: "permission", retryable: false });
    expect(classifyToolError({ response: { status: 429 } })).toEqual({ category: "rate_limit", retryable: true });
    expect(classifyToolError({ code: "ECONNABORTED" })).toEqual({ category: "timeout", retryable: true });
    expect(classifyToolError({ code: "ERR_NETWORK" })).toEqual({ category: "network", retryable: true });
  });

  it("never marks a failed mutation as retryable", () => {
    expect(toolError("create_work_item", { response: { status: 429 } }, { mutation: true })).toMatchObject({
      ok: false,
      status: "failure",
      errorCategory: "rate_limit",
      retryable: false,
    });
  });

  it("sends the requested Backlog bucket to the Plane API", () => {
    expect(buildWorkItemQuery("backlog")).toEqual({ per_page: "20", state_group: "backlog" });
  });

  it("sends an inclusive target-date range when listing upcoming work items", () => {
    expect(buildWorkItemQuery(undefined, "2026-09-07", "2026-09-30")).toEqual({
      per_page: "20",
      target_date__range: "2026-09-07,2026-09-30",
    });
  });

  it("rejects incomplete or reversed target-date ranges", () => {
    expect(() => buildWorkItemQuery(undefined, "2026-09-17")).toThrow("both dateFrom and dateTo");
    expect(() => buildWorkItemQuery(undefined, "2026-09-18", "2026-09-17")).toThrow(
      "dateFrom must not be after dateTo"
    );
  });

  it("reports the current date and time in the user's timezone", () => {
    expect(getUserLocalDateTime("Asia/Singapore", new Date("2026-09-07T16:30:00Z"))).toEqual({
      date: "2026-09-08",
      time: "00:30",
      timeZone: "Asia/Singapore",
    });
  });

  it("resolves a named month to the current year without a state filter", () => {
    expect(getMonthDateRange("October", "2026-09-17")).toEqual({
      dateFrom: "2026-10-01",
      dateTo: "2026-10-31",
    });
  });

  it("expands four Wednesday occurrences from a Sunday anchor without creating Sunday dates", () => {
    expect(expandWeeklyOccurrenceDates("2026-10-11", "wednesday", 4)).toEqual([
      "2026-10-14",
      "2026-10-21",
      "2026-10-28",
      "2026-11-04",
    ]);
  });

  it("keeps an anchor-day Saturday occurrence and crosses the year boundary", () => {
    expect(expandWeeklyOccurrenceDates("2026-12-26", "saturday", 4)).toEqual([
      "2026-12-26",
      "2027-01-02",
      "2027-01-09",
      "2027-01-16",
    ]);
  });

  it("rejects an invalid recurrence anchor or occurrence count", () => {
    expect(() => expandWeeklyOccurrenceDates("2026-02-30", "wednesday", 4)).toThrow("valid calendar date");
    expect(() => expandWeeklyOccurrenceDates("2026-10-11", "wednesday", 0)).toThrow("positive integer");
    expect(() => expandWeeklyOccurrenceDates("2026-10-11", "holiday" as never, 4)).toThrow("supported weekday");
  });

  it("keeps only valid records inside the requested month and orders them by target date", () => {
    expect(
      filterMonthEventRecords(
        [
          { id: "september", name: "September event", target_date: "2026-09-30" },
          { id: "october-last", name: "Last event", target_date: "2026-10-31" },
          { id: "october-first", name: "First event", target_date: "2026-10-01T09:00:00Z" },
          { id: "november", name: "November event", target_date: "2026-11-01" },
          { id: "missing", name: "Missing date", target_date: null },
          { id: "malformed", name: "Malformed date", target_date: "2026-10-44" },
        ],
        "2026-10-01",
        "2026-10-31"
      ).map(({ id }) => id)
    ).toEqual(["october-first", "october-last"]);
  });

  it("preserves a returned work item's state bucket", () => {
    expect(
      toWorkItemRecords([{ id: "issue-1", name: "Invite your team", sequence_id: 3, state__group: "backlog" }])
    ).toMatchObject([{ id: "issue-1", name: "Invite your team", sequence_id: 3, state_group: "backlog" }]);
  });

  it("maps the complete editable work-item contract to the Plane API", () => {
    expect(
      toWorkItemPayload({
        title: "Plan launch",
        description: "First line\nSecond line <script>",
        priority: "high",
        startDate: "2026-09-07",
        targetDate: "2026-09-10",
        stateId: "state-1",
        labelIds: ["label-1"],
        assigneeIds: ["member-1"],
        parentId: "issue-1",
        point: 5,
        estimatePointId: "estimate-1",
        workItemTypeId: "type-1",
      })
    ).toEqual({
      name: "Plan launch",
      description_html: "<p>First line<br />Second line &lt;script&gt;</p>",
      priority: "high",
      start_date: "2026-09-07",
      target_date: "2026-09-10",
      state_id: "state-1",
      labels: ["label-1"],
      assignees: ["member-1"],
      parent_id: "issue-1",
      point: 5,
      estimate_point: "estimate-1",
      type_id: "type-1",
    });
  });

  it("sends timestamps as Plane date-only fields", () => {
    expect(toWorkItemPayload({ startDate: "2026-09-08T14:00:00", targetDate: "2026-09-08T14:00:00" })).toEqual({
      start_date: "2026-09-08",
      target_date: "2026-09-08",
    });
  });

  it("continues a batch after an individual work-item creation fails", async () => {
    const result = await createWorkItemsSequentially(["First", "Broken", "Last"], async (title) => {
      if (title === "Broken") throw new Error("Request failed");
      return { id: title.toLowerCase() };
    });

    expect(result).toEqual({
      created: [
        { item: "First", value: { id: "first" } },
        { item: "Last", value: { id: "last" } },
      ],
      failed: [{ item: "Broken", message: "Unable to create work item.", error: expect.any(Error) }],
    });
  });

  it("preserves clear values and editable fields returned by the API", () => {
    expect(
      toWorkItemRecords([
        {
          id: "issue-1",
          name: "Invite your team",
          sequence_id: 3,
          description_html: "<p>Invite everyone</p>",
          priority: "medium",
          start_date: "2026-09-07",
          target_date: null,
          state_id: "state-1",
          labels: ["label-1"],
          assignees: ["member-1"],
          parent_id: null,
          point: 5,
          estimate_point: "estimate-1",
          type_id: "type-1",
        },
      ])
    ).toEqual([
      {
        id: "issue-1",
        name: "Invite your team",
        sequence_id: 3,
        state_group: null,
        description_html: "<p>Invite everyone</p>",
        priority: "medium",
        start_date: "2026-09-07",
        target_date: null,
        state_id: "state-1",
        label_ids: ["label-1"],
        assignee_ids: ["member-1"],
        parent_id: null,
        point: 5,
        estimate_point_id: "estimate-1",
        work_item_type_id: "type-1",
      },
    ]);
  });
});
