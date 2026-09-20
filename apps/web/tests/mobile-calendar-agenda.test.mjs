import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const countOccurrences = (source, value) => source.split(value).length - 1;

test("mobile calendar renders one selected-date agenda", async () => {
  const calendar = await readFile(
    new URL("../core/components/issues/issue-layouts/calendar/calendar.tsx", import.meta.url),
    "utf8"
  );

  assert.equal(countOccurrences(calendar, "isMobileView"), 1);
  assert.match(calendar, /data-testid="mobile-calendar-agenda"/);
});

test("mobile calendar dates indicate the number of work items", async () => {
  const dayTile = await readFile(
    new URL("../core/components/issues/issue-layouts/calendar/day-tile.tsx", import.meta.url),
    "utf8"
  );

  assert.match(dayTile, /data-testid="mobile-calendar-issue-count"/);
  assert.match(dayTile, /issueIds\?\.length > 0/);
});

test("mobile calendar joins adjacent dates that share a work item", async () => {
  const dayTile = await readFile(
    new URL("../core/components/issues/issue-layouts/calendar/day-tile.tsx", import.meta.url),
    "utf8"
  );

  assert.match(dayTile, /sharesIssueWithPreviousDate/);
  assert.match(dayTile, /sharesIssueWithNextDate/);
  assert.match(dayTile, /"left-0 right-0": sharesIssueWithPreviousDate && sharesIssueWithNextDate/);
});

test("mobile calendar gives range rows room and marks their start and due dates", async () => {
  const dayTile = await readFile(
    new URL("../core/components/issues/issue-layouts/calendar/day-tile.tsx", import.meta.url),
    "utf8"
  );

  assert.match(dayTile, /"min-h-14": issueIds\?\.length > 0/);
  assert.match(dayTile, /data-testid="mobile-calendar-range-start"/);
  assert.match(dayTile, /data-testid="mobile-calendar-range-end"/);
});

test("mobile agenda resolves work items across their calendar range", async () => {
  const calendar = await readFile(
    new URL("../core/components/issues/issue-layouts/calendar/calendar.tsx", import.meta.url),
    "utf8"
  );

  assert.match(calendar, /getCalendarIssueIdsByDate/);
  assert.match(calendar, /const issueIdList = issueIdsByDate\[formattedDatePayload\] \?\? \[\];/);
});

test("mobile calendar assigns overlapping ranges to separate lanes", async () => {
  const weekDays = await readFile(
    new URL("../core/components/issues/issue-layouts/calendar/week-days.tsx", import.meta.url),
    "utf8"
  );
  const dayTile = await readFile(
    new URL("../core/components/issues/issue-layouts/calendar/day-tile.tsx", import.meta.url),
    "utf8"
  );

  assert.match(weekDays, /const issueRowById: Record<string, number> = \{\};/);
  assert.match(weekDays, /issueRowById=\{issueRowById\}/);
  assert.match(dayTile, /issueRowById: Record<string, number>;/);
  assert.match(dayTile, /issueIds\.map\(\(issueId\) =>/);
});

test("mobile calendar carries range data across week boundaries", async () => {
  const weekDays = await readFile(
    new URL("../core/components/issues/issue-layouts/calendar/week-days.tsx", import.meta.url),
    "utf8"
  );

  assert.match(weekDays, /getAdjacentCalendarDates/);
  assert.match(weekDays, /\[\.\.\.calendarDates, \.\.\.getAdjacentCalendarDates\(\)\]/);
});

test("mobile calendar keeps selected dates neutral and anchors range dots to their dates", async () => {
  const dayTile = await readFile(
    new URL("../core/components/issues/issue-layouts/calendar/day-tile.tsx", import.meta.url),
    "utf8"
  );

  assert.match(dayTile, /"bg-layer-3 text-primary": isSelectedDate/);
  assert.match(dayTile, /className="absolute left-0 size-3 -translate-x-1\/2/);
  assert.match(dayTile, /className="absolute right-0 size-3 translate-x-1\/2/);
});

test("mobile agenda opens a preview before navigating from that preview", async () => {
  const issueBlock = await readFile(
    new URL("../core/components/issues/issue-layouts/calendar/issue-block.tsx", import.meta.url),
    "utf8"
  );

  assert.match(issueBlock, /onClick=\{\(\) => handleIssuePeekOverview\(issue\)\}/);
  assert.match(issueBlock, /<div\s+id=\{`issue-\$\{issue\.id\}`\}/);
  assert.doesNotMatch(issueBlock, /<ControlLink/);
  assert.match(
    issueBlock,
    /<button type="button" className="block text-left" onClick=\{\(\) => handleIssuePeekOverview\(issue\)\}>/
  );
});
