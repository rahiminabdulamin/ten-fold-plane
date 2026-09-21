# Mobile Work-items Header Design

## Goal

Keep the project work-items context bar usable on narrow mobile viewports without changing its desktop composition.

## Scope

- Apply the responsive constraint only to `IssuesHeader`.
- Keep the breadcrumb trail as the only element allowed to shrink or clip.
- Keep the work-item count, public-status badge, and create-work-item action visible and on one row.
- Do not change header actions, routes, data fetching, or the shared `Header` primitive.

## Acceptance criteria

1. At narrow viewport widths, the context row does not wrap or overlap the calendar controls beneath it.
2. The breadcrumb portion can contract while the count, public badge, and creation action remain reachable.
3. Desktop styling and behavior are unchanged.
