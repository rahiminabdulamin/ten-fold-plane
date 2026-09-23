# Label Popover Interactivity Design

## Goal

Make label-search popovers receive pointer and keyboard interaction when opened from the work-item creation modal and the work-item detail properties panel.

## Root Cause

The visible popovers are rendered at `z-10` and `z-40`. In their respective modal and property-overlay contexts, those stacking levels can sit beneath an interaction layer. The popover remains visible but pointer input is intercepted before reaching `Combobox.Input`.

## Design

Apply the existing searchable-dropdown overlay contract to both label selectors: `pointer-events-auto z-[9999]` on the rendered `Combobox.Options`. This keeps all current popper positioning, search focus, selection, creation, keyboard handling, and mobile behavior unchanged while placing the menu above enclosing overlay layers.

## Acceptance Criteria

- The search input can be clicked, focused, and typed into in the create-work-item label selector.
- The search input can be clicked, focused, and typed into in the work-item detail label selector.
- Existing label selection and label creation behavior remains unchanged.
- No dependencies or new overlay abstraction are introduced.

## Validation

Add a source-level regression test that requires both selector menus to retain the shared interactive overlay classes, then run that test and the web type check.
