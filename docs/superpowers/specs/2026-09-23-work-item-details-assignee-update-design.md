# Work-item Details Assignee Update Repair

## Goal

Allow a project member to be assigned from an existing work item's details page, matching the working new-work-item dialog.

## Evidence and Root Cause

The details page PATCHes `/api/workspaces/<slug>/projects/<project_id>/issues/<issue_id>/` with `assignee_ids`. `IssueViewSet.partial_update()` instantiates `IssueCreateSerializer` with only `project_id` in its context. When an assignee is selected, `IssueCreateSerializer.validate()` resolves it through `self.context["workspace_id"]`; the missing key causes validation to fail and the endpoint returns 400. The create action supplies `workspace_id`, which explains why the dialog succeeds.

## Design

Pass `issue.workspace_id` to `IssueCreateSerializer` in `IssueViewSet.partial_update()`. This preserves the existing serializer contract and the current workspace-member validation. No frontend payload, endpoint, or member-selection behavior changes.

## Requirements

1. A PATCH with one valid active workspace member in `assignee_ids` returns 204.
2. The selected member is persisted as the work item's assignee.
3. Existing invalid-assignee validation remains unchanged.

## Testing

Add an API contract regression test that PATCHes an existing work item with the authenticated workspace member's ID, asserts 204, and verifies the persisted assignee.
