# Calendar Range Bars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render multi-day calendar work items as unified weekly bars with unambiguous cross-row continuation.

**Architecture:** Add a pure helper that turns a visible week's date-to-issue mapping into span descriptors. `CalendarWeekDays` will use those descriptors to lay range work items over its existing day grid, while `CalendarDayTile` continues to render only one-day work items. The existing issue block root remains the interaction surface.

**Tech Stack:** React, TypeScript, Vitest, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-23-calendar-range-bars-design.md`

## Global Constraints

- Do not add dependencies, stores, APIs, or mobile-only behavior.
- Preserve the existing `CalendarIssueBlockRoot` interaction path for range segments.
- Do not commit because the checkout contains unrelated user changes.

## Review Focus

- A range beginning before a week must show a continuation marker and an open left edge.
- A range ending after a week must show an open right edge.
- A range crossing hidden weekends must be continuous across the displayed Friday/Monday columns.
- Work items that overlap must occupy separate lanes.
- A date with only one-day work items must retain its existing card rendering.

### Task 1: Derive visible weekly range segments

**Files:**

- Modify: `apps/web/core/components/issues/issue-layouts/calendar/calendar-range.ts`
- Test: `apps/web/core/components/issues/issue-layouts/calendar/calendar-range.test.ts`

**Interfaces:**

- Produces `getCalendarIssueSpans(issues, issueIdsByDate, visibleDates)`, returning issue id, inclusive column bounds, and continuation flags.

- [ ] Write failing Vitest cases for an in-week span, a cross-week continuation, hidden-weekend visibility, and non-overlapping lane input.
- [ ] Run `pnpm exec vitest run apps/web/core/components/issues/issue-layouts/calendar/calendar-range.test.ts` and confirm the new cases fail because the helper is absent.
- [ ] Add the smallest typed span helper using the existing inclusive date mapping and actual issue start/due dates.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Render desktop span bars and preserve day cards

**Files:**

- Modify: `apps/web/core/components/issues/issue-layouts/calendar/week-days.tsx`
- Modify: `apps/web/core/components/issues/issue-layouts/calendar/day-tile.tsx`
- Modify: `apps/web/core/components/issues/issue-layouts/calendar/issue-block-root.tsx`
- Modify: `apps/web/core/components/issues/issue-layouts/calendar/issue-block.tsx`
- Test: `apps/web/core/components/issues/issue-layouts/calendar/calendar-range.test.ts`

**Interfaces:**

- Consumes `getCalendarIssueSpans` descriptors.
- Produces one desktop CSS-grid segment per multi-day issue and passes its range edge position to `CalendarIssueBlock`.

- [ ] Write source-contract assertions proving range bars use `gridColumn`, continuation labels are rendered, and day tiles receive range ids to exclude from their repeated cards.
- [ ] Run the focused test and confirm the source-contract assertions fail.
- [ ] Render a desktop-only absolute range layer over the existing week grid, assign the existing greedy lane rows, reserve height for those lanes, and leave one-day work items in `CalendarIssueBlocks`.
- [ ] Extend the existing issue block with a minimal optional edge-position and label-prefix prop; use square/open edges for continuing segments and retain rounded ends where the range starts or ends.
- [ ] Run the focused test, `pnpm --filter web check:types`, and `git diff --check`; confirm each succeeds.
