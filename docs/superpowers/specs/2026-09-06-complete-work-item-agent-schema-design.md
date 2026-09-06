# Complete Work-Item Agent Schema Design

## Objective

Give the Ten-Fold Assistant a complete, typed interface for normal work-item creation, inspection, and updates. A request such as “schedule the onboarding tasks, assign Alex, and add the Design label” must not depend on hidden UI fields or undocumented API payloads.

## Scope

The work-item tools expose every user-editable core issue field supported by `IssueSerializer`:

- title (`name`), plain-text description, priority, start date, and target date;
- state, labels, assignees, parent work item, legacy numeric point, estimate point, and work-item type.

The assistant also receives the project-specific choices necessary to resolve a human name to a canonical ID: states, labels, members, estimate points, and work-item types. Labels, states, and types are configurable project metadata, rather than arbitrary per-record fields.

The repository currently has no persisted arbitrary custom work-item-field definition/value API. The design therefore supports all existing built-in fields and all project-configured values. It does not claim support for a custom-field system that does not exist in this deployment.

## Tool Contract

`get_work_item_schema(projectId?)` returns bounded, canonical records for the active or requested project:

- `states`: id, name, group;
- `labels`: id, name;
- `members`: member id and display name;
- `estimatePoints`: id and value;
- `workItemTypes`: id and name when the API response supplies project types.

`create_work_item` requires `title` and accepts a `WorkItemMutation` payload. `update_work_item` requires `issueId` and accepts at least one field from the same payload. The public field names are deliberately human-oriented:

```ts
type WorkItemMutation = {
  title?: string;
  description?: string | null;
  priority?: "urgent" | "high" | "medium" | "low" | "none";
  startDate?: string | null;
  targetDate?: string | null;
  stateId?: string | null;
  labelIds?: string[];
  assigneeIds?: string[];
  parentId?: string | null;
  point?: number | null;
  estimatePointId?: string | null;
  workItemTypeId?: string | null;
};
```

The adapter maps these to existing Plane API names (`name`, `description_html`, `start_date`, `target_date`, `state_id`, `labels`, `assignees`, `parent_id`, `point`, `estimate_point`, and `type_id`). Plain text is safely escaped into paragraph HTML before the existing Django sanitization layer receives it. Explicit `null` clears nullable scalar fields; an empty list replaces labels or assignees with none.

`get_work_item` and `list_work_items` return the same editable core values so the model can inspect a record before modifying it.

## Autonomy and Safety

The runtime prompt directs the assistant to obtain the schema before resolving a name for a project-specific field. It must never invent IDs, silently create configuration, or apply an ambiguous match. It can assign existing labels/states/types. Creating or changing labels, states, or types is intentionally a distinct configuration operation and requires an explicit user request.

The contract does not expose system-managed or import-only fields: IDs, sequence and sort order, audit users/timestamps, completion/archive timestamps, rich-text JSON/binary storage, external IDs/sources, workspace/project ownership, and drafts. This is an allowlist, not a generic API body passthrough.

## Error Handling

Local Zod validation rejects invalid date strings and an update with no changes. Django remains the final authority for project membership, label/state/type ownership, date ordering, and authorization. Tool errors remain normalized and do not reveal server internals.

## Testing

Unit tests prove API-payload mapping, text escaping, null/empty-list semantics, and read-record shaping. Source-level integration tests verify the registered tool schemas, project-schema retrieval, and runtime instructions. Focused web type checking verifies the React implementation.
