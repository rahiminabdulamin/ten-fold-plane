# Mobile Calendar Agenda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a mobile calendar date expose its work-item count and show a single selected-date agenda.

**Architecture:** Keep `CalendarChart` as the owner of `selectedDate` and reuse its existing `CalendarIssueBlocks` instance as the sole mobile agenda. Add the item-count affordance at the existing `CalendarDayTile` boundary, where grouped ids already identify that date's work items. No new data model or mobile-only card is needed.

**Tech Stack:** React, TypeScript, Tailwind responsive utilities, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-21-mobile-calendar-agenda-design.md`

## Global Constraints

- Apply only below `md`; desktop calendar behavior must remain unchanged.
- Reuse `CalendarIssueBlocks` and existing selected-date state; add no dependencies or duplicate data stores.
- Do not commit because the checkout contains unrelated user changes.

## Review Focus

- A selected date with zero work items must show one quick-add area, not two.
- A selected date with one or more work items must show those items in the agenda.
- A date outside the active month must still select and reveal its agenda when shown in the grid.
- The current date and selected date styles must coexist with the work-item count marker.
- Desktop day cards must continue rendering their own issue blocks and drag targets.

---

### Task 1: Mobile calendar selection and agenda

**Files:**

- Create: `apps/web/tests/mobile-calendar-agenda.test.mjs`
- Modify: `apps/web/core/components/issues/issue-layouts/calendar/calendar.tsx`
- Modify: `apps/web/core/components/issues/issue-layouts/calendar/day-tile.tsx`

**Interfaces:**

- Consumes: `CalendarChart`'s `selectedDate`, `issueIdList`, and `CalendarIssueBlocks` props.
- Produces: one `md:hidden` agenda and a mobile-only `issueIds.length` marker on `CalendarDayTile`.

- [x] **Step 1: Write the failing source-contract test**

```js
assert.equal(countOccurrences(calendarSource, "isMobileView"), 1);
assert.match(calendarSource, /data-testid="mobile-calendar-agenda"/);
assert.match(dayTileSource, /data-testid="mobile-calendar-issue-count"/);
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test apps/web/tests/mobile-calendar-agenda.test.mjs`

Expected: FAIL because the duplicate mobile agenda and count marker still exist.

- [x] **Step 3: Implement the minimal responsive rendering**

```tsx
<div className="md:hidden" data-testid="mobile-calendar-agenda">
  <p>{/* selected date heading */}</p>
  <CalendarIssueBlocks isMobileView /* existing props */ />
</div>;

{
  issueIds.length > 0 && <span data-testid="mobile-calendar-issue-count">{issueIds.length}</span>;
}
```

Remove the second mobile agenda after `IssueLayoutHOC`; keep the agenda inside the scrollable calendar container. Render the marker only in the mobile tile, without changing desktop issue blocks.

- [x] **Step 4: Run focused verification**

Run: `node --test apps/web/tests/mobile-calendar-agenda.test.mjs && pnpm --filter web check:types && git diff --check`

Expected: all commands exit 0.
