# Work-item modal property popovers design

## Goal

Make every property menu in the Create new work item dialog usable and anchored beneath its trigger.

## Scope

The state (Bucket), priority (Urgency), assignee, start-date, and due-date controls in the creation dialog use the existing dropdown components. No menu behavior, data options, keyboard handling, or date validation changes.

## Design

`ModalCore` is a Headless UI dialog at layer 30. State and priority options are currently layer 10 inside the dialog, while assignee and date options are portaled to `document.body` at layer 30. Body portals sit outside the dialog's managed tree, so they are inert to interaction; their Popper positioning also resolves at the viewport origin in this modal.

Render the assignee and date option elements in their owning dropdown tree, matching state and priority. Give all five option surfaces `z-40`, above the dialog panel and its backdrop. Popper retains the existing reference button, placement, overflow, and fixed-position strategy where already used; without a body portal it positions relative to the trigger inside the dialog.

## Acceptance criteria

- Bucket and Urgency search fields accept typing, and their listed choices can be selected.
- Assignees, Start date, and Due date open directly beneath their respective buttons in the dialog.
- Assignee search/selection and calendar date selection work normally.
- Existing dropdown placement overrides, close behavior, selected values, and date min/max restrictions remain intact.

## Verification

The web UI source-contract test verifies that all five option surfaces use `z-40`, and that assignee/date menus no longer use `createPortal`. Run the focused contract test and the web TypeScript check.
