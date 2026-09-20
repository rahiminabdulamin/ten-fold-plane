# Mobile Calendar Agenda Design

## Goal

Make the mobile calendar useful for finding and opening work items without changing the desktop calendar.

## Scope

- Applies below the existing `md` responsive breakpoint only.
- The month or week grid remains the date navigator.
- A date with work items exposes a compact, accessible count marker inside its mobile tile. Tapping the tile continues to select that date.
- Exactly one selected-date agenda appears below the grid. It reuses `CalendarIssueBlocks`, so work items remain clickable and existing quick-add, loading, pagination, permissions, and read-only behavior stay intact.
- The agenda heading contains the selected date once. Empty dates show the existing contextual quick-add control once.
- Desktop calendar day cards and drag-and-drop behavior remain unchanged.

## Non-goals

- Do not create a second calendar data store, a separate mobile route, or a new work-item card implementation.
- Do not change the calendar's date range, display controls, or desktop layout.

## Acceptance criteria

1. Mobile calendars show one, never duplicated, selected-date heading and agenda.
2. Mobile date tiles with work items visibly indicate how many items they contain.
3. Selecting a marked or unmarked date updates the single agenda beneath the grid.
4. Existing `CalendarIssueBlocks` actions and work-item links remain the agenda implementation.
5. Desktop-only issue blocks and day tiles retain their existing output.
