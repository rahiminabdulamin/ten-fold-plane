import { describe, expect, it } from "vitest";

import {
  createWorkItemsSequentially,
  buildWorkItemQuery,
  getUserLocalDateTime,
  toWorkItemPayload,
  toWorkItemRecords,
} from "./tool-contracts";

describe("work-item tool contracts", () => {
  it("sends the requested Backlog bucket to the Plane API", () => {
    expect(buildWorkItemQuery("backlog")).toEqual({ per_page: "20", state_group: "backlog" });
  });

  it("sends an inclusive target-date range when listing upcoming work items", () => {
    expect(buildWorkItemQuery(undefined, "2026-09-07", "2026-09-30")).toEqual({
      per_page: "20",
      target_date__range: "2026-09-07,2026-09-30",
    });
  });

  it("reports the current date and time in the user's timezone", () => {
    expect(getUserLocalDateTime("Asia/Singapore", new Date("2026-09-07T16:30:00Z"))).toEqual({
      date: "2026-09-08",
      time: "00:30",
      timeZone: "Asia/Singapore",
    });
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
      failed: [{ item: "Broken", message: "Request failed" }],
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
