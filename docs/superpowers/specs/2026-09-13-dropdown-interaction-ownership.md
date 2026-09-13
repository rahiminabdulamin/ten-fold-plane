# Dropdown interaction ownership

## Problem

Work-item property popovers combine independent local open state, Headless UI
combobox state, Popper placement, and wrappers that cancel click defaults.
Within transformed or horizontally scrolling layouts this produces menus that
do not mount, are offset from their trigger, or render above the table but do
not receive pointer events.

## Scope

Fix property dropdowns used by work-item list, board, calendar, sub-issue,
relation, draft, and module-card surfaces. Preserve their existing data,
permissions, labels, keyboard shortcuts, and visual styling.

## Design

Each dropdown has one interaction owner: Headless UI controls open/close,
focus, search, keyboard navigation, and selection. Its click events must not
be cancelled by the trigger or a containing property wrapper.

The rendered options element is the Popper element. Popper uses fixed
viewport coordinates and the options element is portaled to `document.body`.
This keeps it outside table transforms, overflow clipping, and table stacking
contexts. The React portal retains the Headless UI context, so options and the
search input remain functional.

Existing custom state may remain only where it represents non-Headless UI
behavior (for example remote data loading); it must not independently decide
whether the options surface mounts.

## Migration

1. Establish a reusable internal options/placement pattern for property
   comboboxes, without adding a dependency.
2. Migrate the label, priority, state, date, and date-range property controls.
3. Remove only wrapper or trigger `preventDefault()` calls that cancel the
   combobox activation event. Retain cancellation for destructive actions,
   clear buttons, and navigation links.
4. Apply the same property wrapper rule to every existing surface that embeds
   these controls.

## Verification

Browser checks must cover table and at least one non-table surface. For each
control: open from its visible trigger, measure that the popup starts adjacent
to the trigger, type into search where available, select an option/date by
pointer and keyboard, and confirm the persisted value updates. Run web type
checking, production build, formatter, and targeted lint before commit.

## Non-goals

Do not alter the project data model, globally rewrite dialogs/menus, add a new
overlay dependency, or change unrelated quick-action controls.
