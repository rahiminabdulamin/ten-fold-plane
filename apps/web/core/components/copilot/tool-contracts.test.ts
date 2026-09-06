import { describe, expect, it } from "vitest";

import { buildWorkItemQuery, toWorkItemRecords } from "./tool-contracts";

describe("work-item tool contracts", () => {
  it("sends the requested Backlog bucket to the Plane API", () => {
    expect(buildWorkItemQuery("backlog")).toEqual({ per_page: "20", state_group: "backlog" });
  });

  it("preserves a returned work item's state bucket", () => {
    expect(
      toWorkItemRecords([{ id: "issue-1", name: "Invite your team", sequence_id: 3, state__group: "backlog" }])
    ).toEqual([{ id: "issue-1", name: "Invite your team", sequence_id: 3, state_group: "backlog" }]);
  });
});
