# Work-item modal workspace scope design

## Goal

Let a user choose the destination workspace and project while creating an unrestricted new work item, without navigating away from the page they are viewing.

## User outcome

The Create new work item dialog makes its destination unambiguous: the user sees both a Workspace selector and a Project selector below the title. The initial selections match the workspace and project inferred from the current route. A user can switch workspace, select an available project in it, and create the work item there. The success toast links to the newly created work item in that selected workspace; the current page remains unchanged.

## Scope

### Included

- The standard, unrestricted Create new work item flow opened from global workspace navigation or the command palette.
- A workspace selector above the existing project selector.
- Loading and displaying only projects in the selected workspace for which the current user can create work items.
- Rebinding creation-side work to the selected workspace: work-item creation, asset upload finalization, custom-property persistence, parent lookup, and the success-toast action.
- Resetting values that cannot safely cross workspaces when the workspace changes: selected project, selected parent, project-specific property values/errors, type, cycle, module, labels, assignees, dates, estimate, and description attachments. The title and plain description text remain so a user does not lose their draft wording.
- Empty state for a selected workspace with no createable projects: show the workspace selector and a clear message; disable Save until a project is available.

### Excluded

- Changing the application route or globally switching the active workspace.
- Changing an existing work item’s workspace.
- Workspace creation, membership, or permissions changes.
- A new data store, service, dependency, or reusable cross-workspace abstraction.

## Non-negotiable compatibility boundaries

Workspace selection is shown only for a new, unrestricted work item. The current route workspace remains authoritative, and the selector is absent or disabled, for:

- Existing work item edits and duplicates.
- Draft creation or conversion.
- Sub-work-item creation, which inherits a parent’s workspace and project.
- Cycle- and module-scoped creation, which inherits route-provided membership.
- Calls that pass `allowedProjectIds`, since those callers deliberately constrain the valid project set.

These flows retain their existing API requests, selected project behavior, property context, and post-save behavior.

## Design

`CreateUpdateIssueModalBase` owns `selectedWorkspaceSlug`, initialized from `useParams().workspaceSlug` when the dialog opens. It passes this scope and an `onWorkspaceChange` callback into `IssueFormRoot`. The existing route workspace is still retained separately for compatibility-bound flows.

`IssueFormRoot` renders a compact workspace dropdown immediately below the modal title and above `IssueProjectSelect` only when the base marks the modal as workspace-switchable. It reuses the workspace list already held by `useWorkspace`; it does not alter `currentWorkspace`, navigation preferences, or the browser URL. The existing project selector remains the second control and is labeled/accessibly announced as Project so the two destinations are distinguishable.

When a user selects a workspace, the modal fetches that workspace’s projects and obtains its create permission set through the existing project/user stores. It replaces the allowed project IDs with the selected workspace’s permitted projects and selects the first available project. It clears the workspace-specific form/context state listed in Scope. If no project is available, it displays the no-createable-project state and prevents submission.

Every operation that addresses workspace-scoped data uses `selectedWorkspaceSlug` in the switchable create path: issue creation, file upload status finalization, custom property values, parent search/details, and `CreateIssueToastActionItems`. The success toast remains the only navigation affordance: its Open work item action targets `/${selectedWorkspaceSlug}/projects/${projectId}/issues/${issueId}` while the browser stays on the original page.

Changing workspace after selecting files clears the pending attachment IDs rather than uploading them to a different workspace. The UI must make that reset visible through the existing attachment/editor behavior before Save can proceed.

## Data flow

```text
current route workspace ──initializes──> selectedWorkspaceSlug
workspace dropdown ──changes──> selectedWorkspaceSlug
selectedWorkspaceSlug ──fetches──> createable projects
createable projects ──sets──> form.project_id
selectedWorkspaceSlug + project_id ──scopes──> create/upload/properties/toast link
```

## Failure handling

- If project loading or permission retrieval fails after switching workspace, retain the selected workspace, clear the project selection, show the existing error toast, and keep Save disabled until a retry succeeds.
- If no createable project exists, show the empty state instead of silently falling back to the prior workspace.
- A failed create keeps the form data and selected workspace/project intact for retry.
- The existing route-based behavior remains unchanged in every compatibility-bound flow.

## Accessibility and interaction

- The workspace selector has an explicit Workspace label and keyboard support matching the existing project dropdown.
- Selecting a workspace moves focus to the project selector or its no-project message.
- Both selectors truncate long names, expose their full value through the existing tooltip/accessible name pattern, and remain contained inside the dialog.
- Save communicates why it is disabled when the selected workspace has no permitted project.

## Acceptance criteria

1. An unrestricted new-work-item dialog starts with the route workspace and its current/default project selected.
2. The dialog displays a Workspace selector above a clearly identifiable Project selector.
3. Selecting another workspace replaces the project choices with that workspace’s createable projects and cannot submit with the prior workspace’s project.
4. Workspace-specific fields, parent selection, property state, and uploaded attachment IDs do not cross the workspace boundary.
5. Saving uses the selected workspace for every workspace-scoped request and shows an Open work item action for the created item there.
6. The current browser route does not change after creation.
7. Edit, duplicate, draft, sub-work-item, cycle/module, and explicitly project-restricted creation behavior remain unchanged.

## Verification

- Add source-contract/unit tests for visibility gating, workspace-to-project reset behavior, scope propagation, no-project handling, and the route-preserving toast target.
- Exercise the existing new-work-item, edit, duplicate, draft, sub-work-item, cycle, module, and restricted-project tests or focused equivalents.
- Run the focused web tests, lint, format check, and `pnpm --filter ./apps/web check:types`.
