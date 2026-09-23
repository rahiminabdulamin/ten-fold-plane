# Calendar Range Bars Design

## Goal

Make a work item with different start and due dates read as one continuous bar across its visible days in the desktop calendar.

## Scope

- The month and week desktop calendar render one grid-spanning segment per work item per visible week.
- A segment occupies a stable lane for that week and stretches from its first visible date through its last visible date.
- A segment that began before the displayed week has a square leading edge and repeats its label with a continuation marker. A segment that continues after the displayed week has a square trailing edge. This makes adjacent weekly segments read as one item without implying that either row is a new work item.
- One-day work items retain the existing per-day card rendering. Mobile remains unchanged.
- Drag, preview, quick actions, state color, permissions, and date-drop behavior reuse the existing `CalendarIssueBlockRoot` path.

## Non-goals

- No new calendar data store, API field, dependency, or special range editor.
- No change to calendar filters, event ordering beyond existing lane allocation, or mobile agenda behavior.

## Acceptance criteria

1. A Tuesday-through-Friday work item is one uninterrupted desktop bar across those columns.
2. A work item that crosses a week row is rendered as two matching week segments: the first has an open right edge; the next has an open left edge and a visible continuation label.
3. A range that starts or ends outside the displayed week uses the same open-edge rule.
4. One-day items, mobile markers/agenda, and existing interactions keep their current behavior.
5. Hidden weekends do not create visible breaks between adjacent visible weekday endpoints.
