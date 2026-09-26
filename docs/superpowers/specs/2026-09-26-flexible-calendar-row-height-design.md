# Flexible Calendar Row Height Design

## Goal

Ensure every work-item bar in a calendar week is visible on desktop and every mobile range dot is visible in its date cell, regardless of overlap count.

## Scope

- Month rows grow from the number of allocated work-item lanes; there is no two-bar cap.
- The calendar content region scrolls vertically when expanded weeks exceed the available viewport.
- Mobile date cells grow by one dot-lane height per overlapping work item, while the selected-day agenda remains available below the grid.
- Preserve current range bars, drag and drop, previews, quick actions, and week-layout sizing.

## Non-goals

- No API, data-store, dependency, or filter changes.
- No nested per-week scroll areas or a fixed maximum number of visible items.

## Acceptance criteria

1. Desktop month-week height reserves a row for every allocated range-bar lane.
2. The calendar content container provides vertical scrolling for expanded calendar content.
3. Mobile date-cell height reserves space for every dot lane so no marker is clipped.
4. Existing calendar range behavior remains covered by the focused source-contract test.
