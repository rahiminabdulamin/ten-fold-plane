# Copilot Backlog Reliability Design

## Goal

Make the Ten-Fold assistant accurately list work items in a named project's requested state bucket, beginning with Backlog.

## Root cause

`list_work_items` accepts only a project ID and always calls the work-item endpoint with `per_page=20`. Although the Plane endpoint already accepts `state_group=backlog`, the agent cannot express that constraint through its typed frontend tool. The runtime prompt also does not explicitly forbid a textual empty-result claim unless a filtered lookup produced it.

## Design

Extend `list_work_items` with an optional `stateGroup` enum matching Plane state groups: `backlog`, `unstarted`, `started`, `completed`, and `cancelled`. Convert it directly to the existing API's `state_group` query parameter. Keep the existing 20-item limit and canonical project-ID resolution unchanged.

Return each compact work-item record with its state group, so the model can verify that its answer reflects the requested bucket. Update the runtime instruction to require `find_project` followed by `list_work_items` with `stateGroup` whenever the request names a project and state bucket, and to prohibit empty-result claims without the corresponding successful tool response.

## Testing

Extract the small pure query/record shaping boundary into the existing Copilot tool-contract module. Unit tests use literal expectations to prove that a Backlog request emits `{ per_page: "20", state_group: "backlog" }` and that returned records preserve their state group. These tests fail if the filter is omitted, misspelled, or stripped from the result.

## Constraints

- No new dependencies, backend endpoint, or generic API tool.
- Preserve safe error envelopes, canonical project lookup, and the existing 20-item cap.
- Do not claim that an empty bucket has no tasks unless the filtered `list_work_items` response succeeds and is empty.
