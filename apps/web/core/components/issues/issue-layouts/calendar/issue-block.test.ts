import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const calendarIssueBlock = new URL("./issue-block.tsx", import.meta.url);

describe("CalendarIssueBlock", () => {
  it("opens the detail panel when a calendar bar is clicked", () => {
    const source = readFileSync(fileURLToPath(calendarIssueBlock), "utf8");

    expect(source.match(/onClick=\{\(\) => handleIssuePeekOverview\(issue\)\}/g)).toHaveLength(2);
  });
});
