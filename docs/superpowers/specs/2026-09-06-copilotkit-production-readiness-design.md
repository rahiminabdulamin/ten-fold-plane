# CopilotKit Production Readiness Design

## Goal

Make the authenticated Ten-Fold assistant reliably answer project and work-item requests, including a request such as "list tasks from Tutorial project", without exposing arbitrary Plane API access.

## Scope

The assistant supports projects and work items only. It can list, find by name or identifier, read, create, rename, delete (with confirmation), and navigate those records. Cycles, modules, pages, comments, and arbitrary endpoint execution remain unavailable.

## Tool model

The browser registers typed frontend tools because the browser already owns the authenticated Plane session. The runtime only brokers agent traffic and never receives Plane cookies.

- `find_project` lists at most 20 compact `{ id, name, identifier }` records and resolves an exact name/identifier before a work-item operation. Zero or multiple matches return a safe result, never a guess.
- Work-item tools accept a canonical project UUID only. A two-step agent flow calls `find_project`, then `list_work_items`, `get_work_item`, or a mutation tool.
- Tool results share `{ ok, operation, affectedIds, message, retryable }` and only add compact data or canonical URLs.
- Creates and single-record title updates execute once after input validation. Deletes use human-in-the-loop confirmation and execute exactly once after an explicit click.
- All service failures become safe result envelopes. Raw Axios errors and API responses are not sent back to the model.

## Route context and navigation

The active workspace slug is trusted route context. The active project ID is a convenience default only; tools may receive a canonical project ID from `find_project`. Navigation uses the application’s canonical `/:workspaceSlug/projects/:projectId/issues/:issueId` route.

## UI reliability

The assistant host must not render a portal into an invalid target. The integration keeps CopilotKit’s sidebar mounted under its provider, uses only documented React hooks, and has a browser regression test that sends a project-name request and observes a completed assistant response or a safe tool-result error.

## Production checks

Unit tests cover matching, compact result shaping, error normalization, and mutation call counts. Web type checking, Copilot runtime tests, and a browser flow run before release. Existing unrelated worktree changes are excluded from this work.
