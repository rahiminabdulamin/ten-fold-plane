# Label Popover Event Boundary Design

## Goal

Make every control inside the label popover interactive in both the new-work-item dialog and an existing work item's detail panel.

## Observed Behavior

- In the new-work-item dialog, the search input accepts text, but existing label options cannot be selected or deselected.
- In the existing-item detail panel, neither the search input nor label options can be interacted with.

## Root Cause

The previous change raised both popovers above surrounding overlays but did not establish an event boundary. Pointer-down events still escape the popover and reach dialog/peek outside-click handlers before Headless UI completes focus or option selection. The detail popover is also rendered through a portal, so without the repository's `data-prevent-outside-click` marker it is classified as outside the detail panel.

## Design

Apply the repository's existing searchable-dropdown event contract to each affected `Combobox.Options` root:

- Add `data-prevent-outside-click` so shared outside-click hooks recognize portaled menu content as protected.
- Stop `mousedown` propagation at the options root so enclosing dialog and peek handlers cannot cancel input focus or option selection.

Keep the existing Combobox state, Popper positioning, label creation, selection callbacks, and z-index unchanged.

## Acceptance Criteria

- The create-dialog search input remains focusable and editable.
- Existing labels can be selected and deselected in the create dialog.
- The detail-panel search input can be focused and edited.
- Existing labels can be selected and deselected in the detail panel.
- Creating a label from either popover continues to work.
- Clicking outside the popover retains the existing close behavior.
- No dependency or new overlay abstraction is introduced.

## Validation

Extend the existing focused regression test to require the outside-click marker and the mouse-down event boundary in both selector sources. Run the regression test, focused lint and formatting checks, and the web type check. A live browser check requires an authenticated session; the available automation session redirects to sign-in.
