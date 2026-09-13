# Overlay Consumer Audit

## Baseline

- `@plane/ui` type check: pass.
- `@plane/propel` type check: pass.
- `npx`: available for Playwright CLI.

## Primitive inventory

| Family                               | Representative surfaces                                                                  | Initial risks                                                                | Status                                              |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| `@plane/ui` `CustomMenu`             | work-item quick actions, sidebar menus, page/toolbars, project settings, mobile headers  | descendant defaults cancelled; opt-in main portal; global hover coordination | Shared-fixed and browser-verified                   |
| `@plane/propel` `Menu`               | shared component stories and newer consumers                                             | duplicated open state; `MenuItem` called browser-global `close()`            | Shared-fixed and browser-verified                   |
| App `DateDropdown`                   | spreadsheet start/due date, issue properties, dialogs, rich filters                      | fixed Popper panel remained under a non-portalled Combobox options tree      | Shared-fixed through `ComboDropDown`                |
| App searchable dropdowns             | priority, state, estimate, cycle, module, project, intake, label, spreadsheet and detail | unportalled panels; wrapper clicks cancelled input and option defaults       | Shared-fixed; wrapper cancellation removed          |
| `@plane/ui` `Popover`                | editor toolbar, activity filters, calendar controls, label forms                         | absolute non-portalled panel could be clipped by overflow ancestors          | Shared-fixed with body portal and fixed positioning |
| `@plane/propel` `Popover`/`Combobox` | emoji pickers and newer shared selectors                                                 | native portal and positioner                                                 | Verified unaffected                                 |
| Headless UI app-local overlays       | notifications, settings, image/color pickers, admin sidebar                              | local positioning and stacking contracts                                     | Verified outside failing shared paths; unchanged    |

## Consumer segments

- Work-item layouts: list, spreadsheet, kanban, calendar, gantt, quick actions.
- Work-item experiences: detail, peek overview, modal, drafts, inbox, sub-issues, relations.
- Navigation: workspace sidebar, project menus, mobile headers, profile headers.
- Filters and views: issue filters, rich date filters, inbox sorting, modules, pages, workspace views.
- Settings and utilities: project/workspace settings, invitations, API tokens, editor toolbars, notification controls.
- Other apps: admin sidebar menus and space issue/navbar dropdowns.

## Interaction matrix

Each distinct composition is checked for trigger-relative placement, viewport collision, scroll alignment, pointer selection, keyboard selection, searchable input focus/typing, outside click, Escape, and focus return. Exceptions and final results will be recorded after shared fixes.

## Root causes and corrections

- `ComboDropDown` now portals its option tree to `document.body` after client mount. This fixes clipping and containing-block offsets for its state, priority, estimate, cycle, module, project, intake, label, and date consumers without per-page changes.
- Date and label Popper instances use fixed positioning with viewport padding. Label options explicitly opt out of outside-click dismissal while interacting.
- `CustomMenu` always portals its main panel, uses fixed Popper positioning with collision padding, and coordinates hover through its own context rather than `document.querySelector` and synthetic events.
- `CustomMenu` no longer calls `preventDefault()` for every descendant click. Trigger clicks still isolate containing rows.
- Property and quick-action wrappers retain `stopPropagation()` to prevent row navigation but no longer cancel the default behavior of inputs, options, calendars, links, and buttons arriving through React portals.
- Propel `Menu` now has one controlled Base UI open state, uses Base UI item dismissal, and no longer invokes the browser-global `close()` function.
- Legacy `Popover` panels now portal to the body with fixed Popper positioning.

## Verification results

- `@plane/ui` type check and build: pass.
- `@plane/propel` type check and build: pass.
- Web type check and production build: pass. The first parallel build raced shared package output; the sequential rerun passed.
- All package test tasks: pass (15/15 Turbo tasks; 32/32 reported live tests plus cached copilot and codemod suites).
- Full monorepo type check: pass (29/29 Turbo tasks).
- Package lint: zero errors. Existing warning budgets remain.
- `CustomMenu` Storybook harness: submenu opened; search accepted `urgent`; selecting Urgent updated `Selected: First: Urgent`; the submenu dismissed; a second instance remained isolated.
- Propel `Menu` Storybook: File → Export opened the nested menu; selecting Export as CSV invoked the action and dismissed both layers.
- Focused story consoles contained only the Storybook favicon 404; no component runtime errors were observed.
- No authenticated app session was running locally, so app-data-dependent page flows were validated through their shared primitive, source-path audit, type checks, and production build rather than live workspace data.
