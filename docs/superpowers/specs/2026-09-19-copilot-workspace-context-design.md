# Copilot Workspace Context Design

## Intent

The Ten-Fold Assistant must operate in an explicit Workspace context without asking users to identify a Workspace when the UI already makes one available. Users need to see and control that context so that creating, listing, and managing work items is predictable across Workspace navigation.

In user-facing copy, the top-level entity is a Team and the child entity is a Workspace. Existing API and route names retain their `workspace` and `project` terminology.

## Scope

This feature adds a Workspace selector to the existing Copilot sidebar header, keeps it synchronized with the active route, and makes its selection the default context for Copilot work-item tools and model instructions.

It does not introduce a new global store, persist a selection between browser sessions, navigate the application when the selector changes, or alter the Workspace membership model. Spreadsheet tools remain tied to the Workspace in their open route.

## User Experience

The Copilot sidebar header has two rows:

1. The existing Ten-Fold Assistant title and close button.
2. A compact, searchable control labeled `Workspace`, displaying the selected Workspace name and a dropdown affordance.

The control uses the existing `CustomSearchSelect` component and lists accessible, non-archived Workspaces in the current Team. Each option identifies the Workspace by name and identifier where needed for disambiguation. Standard keyboard navigation, focus handling, and search come from that component.

The control displays a loading state while it retrieves the Workspace list. When there is no valid choice it displays `Choose Workspace` and does not claim an active context.

## Selection Rules

The context selection is local to the mounted Copilot UI.

| Situation                                        | Selected Workspace                                           |
| ------------------------------------------------ | ------------------------------------------------------------ |
| Sidebar mounts on a Workspace route              | The route's `projectId`                                      |
| User selects a different Workspace               | The selected Workspace; the page does not navigate           |
| User navigates to another Workspace route        | The new route's `projectId`, replacing any manual selection  |
| User navigates to a non-Workspace route          | Keep the current valid selection                             |
| No selection and exactly one available Workspace | Select that sole Workspace                                   |
| No selection and zero or multiple Workspaces     | No active context; prompt the user to select one             |
| Team changes                                     | Clear the old Team's selection before resolving the new Team |
| Route ID is unavailable or inaccessible          | Clear it; do not retain or use its ID                        |

A selector choice applies immediately to subsequent chat actions. It is not written to local storage and does not change existing chat messages. An action already awaiting human confirmation continues to use the Workspace captured when that confirmation was rendered.

## Architecture

`PlaneTools` remains the owner of this state because it already owns the Copilot sidebar, route parameters, frontend tools, and custom header. It will:

1. Retrieve lightweight Workspace records with the existing `ProjectService.getProjectsLite(teamSlug)` method.
2. Hold the selected Workspace ID in local React state and derive its display record from the fetched list.
3. Synchronize that state from route changes according to the selection rules.
4. Render the header selector through the current `CopilotSidebar` header slot.
5. Publish a small serialized agent context with CopilotKit v2's `useAgentContext` hook.

The agent context has this stable shape:

```ts
{
  teamSlug: string;
  workspaceId: string | null;
  workspaceName: string | null;
  workspaceIdentifier: string | null;
}
```

It is a current UI fact, not a user assertion. The runtime prompt treats it as the authoritative default Workspace for unqualified work-item requests.

## Tool Resolution

Workspace-scoped work-item tools resolve their target in this order:

1. A canonical `projectId` explicitly supplied by the model after resolving a Workspace explicitly named by the user.
2. The currently selected Workspace ID.
3. A safe context-required response.

This applies to event/month listing, schema retrieval, work-item list/create/batch-create/recurring-create/get/open/update/delete operations. Tool dependency arrays and mutation fingerprints must use the resolved selected context so a selector change cannot call a stale Workspace.

If a user names a different Workspace, the agent may use `find_project` and pass its canonical ID for that request. This does not silently change the selector. If the user does not name a Workspace and the selector holds a valid Workspace, the agent must use it without `list_projects` or a clarification question.

Workspace administration tools keep their explicit-ID behavior. Spreadsheet query and mutation tools remain route-bound because the spreadsheet itself belongs to the currently open Workspace; a separate selector must not redirect those requests.

## Prompt Changes

The runtime prompt will replace the old instruction that forbids inferring a Workspace from the open page. It will instead instruct the agent to:

- use the selected UI Workspace for unqualified work-item requests;
- avoid `list_projects` and Workspace clarification when valid selected context exists;
- resolve an explicitly named different Workspace with `find_project`;
- ask the user to choose a Workspace only when no selected context exists and no explicit Workspace can be resolved.

The existing event/task/work-item synonym rules, mutation safeguards, and schema-resolution rules remain unchanged.

## Failure Handling

- A Workspace-list request failure disables meaningful selection and leaves no inferred context; tool calls fail safely with a concise selection-required result.
- A deleted or inaccessible selected Workspace is cleared as soon as the refreshed list reveals it is absent.
- A route change always wins over an earlier manual override when it targets a valid Workspace.
- Confirmations capture their route-bound target at display time, preventing an intervening selector change from redirecting a destructive request.
- Tools never fall back to an arbitrary first Workspace when multiple choices exist.

## Test Requirements

Tests must establish that:

1. A valid route Workspace initializes the selector and model context.
2. Manual selection changes normal work-item tool defaults without navigation.
3. A subsequent Workspace-route navigation replaces a manual selection.
4. A Team change and an inaccessible route Workspace clear stale context.
5. The one-Workspace fallback selects only the sole Workspace; multiple Workspaces without selection remain unselected.
6. Work-item tools use selected context, while spreadsheet tools remain route-bound.
7. Explicitly named different Workspaces can still be resolved per request.
8. The runtime prompt no longer directs the model to list Workspaces when a selected context exists.
9. Existing event and recurring-work-item behavior remains covered by the existing tests.

## Acceptance Criteria

- Opening Copilot while viewing a Workspace visibly selects that Workspace and enables unqualified work-item requests in it.
- Selecting another Workspace in Copilot changes assistant context without changing the current page.
- Navigating to a different Workspace visibly switches Copilot context to that Workspace.
- No Workspace is guessed when no valid selection exists.
- The assistant no longer asks a Workspace question solely because multiple Workspaces exist while a valid selector context is active.
- The feature adds no dependency and no application-wide state container.
