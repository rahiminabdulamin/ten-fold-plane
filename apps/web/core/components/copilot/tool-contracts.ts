export interface ProjectLookupRecord {
  id: string;
  name: string;
  identifier: string;
}

export interface ToolResult {
  ok: boolean;
  operation: string;
  affectedIds: string[];
  message: string;
  retryable: boolean;
}

export const WORK_ITEM_STATE_GROUPS = ["backlog", "unstarted", "started", "completed", "cancelled"] as const;

export type WorkItemStateGroup = (typeof WORK_ITEM_STATE_GROUPS)[number];

type WorkItemRecordSource = {
  id: string;
  name: string;
  sequence_id: number;
  state__group?: WorkItemStateGroup | null;
  description_html?: string;
  priority?: "urgent" | "high" | "medium" | "low" | "none" | null;
  start_date?: string | null;
  target_date?: string | null;
  state_id?: string | null;
  labels?: string[];
  assignees?: string[];
  parent_id?: string | null;
  point?: number | null;
  estimate_point?: string | null;
  type_id?: string | null;
};

export type WorkItemMutation = {
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

export function toolResult(operation: string, message: string, affectedIds: string[] = []): ToolResult {
  return { ok: true, operation, affectedIds, message, retryable: false };
}

export function toolError(operation: string, _error: unknown): ToolResult {
  const label = operation.replace(/_/g, " ");
  return { ok: false, operation, affectedIds: [], message: `Unable to ${label} right now.`, retryable: false };
}

export function findProjectMatches(projects: ProjectLookupRecord[], query: string): ProjectLookupRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];
  return projects
    .filter(({ name, identifier }) => {
      const normalizedName = name.toLocaleLowerCase();
      const normalizedIdentifier = identifier.toLocaleLowerCase();
      return normalizedName.includes(normalizedQuery) || normalizedIdentifier.includes(normalizedQuery);
    })
    .slice(0, 20)
    .map(({ id, name, identifier }) => ({ id, name, identifier }));
}

export function buildWorkItemQuery(stateGroup?: WorkItemStateGroup) {
  return { per_page: "20", ...(stateGroup ? { state_group: stateGroup } : {}) };
}

const toDescriptionHtml = (description: string | null) => {
  if (!description) return "<p></p>";
  const escaped = description.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n/g, "<br />")}</p>`;
};

export function toWorkItemPayload({
  title,
  description,
  priority,
  startDate,
  targetDate,
  stateId,
  labelIds,
  assigneeIds,
  parentId,
  point,
  estimatePointId,
  workItemTypeId,
}: WorkItemMutation) {
  return {
    ...(title !== undefined ? { name: title } : {}),
    ...(description !== undefined ? { description_html: toDescriptionHtml(description) } : {}),
    ...(priority !== undefined ? { priority } : {}),
    ...(startDate !== undefined ? { start_date: startDate } : {}),
    ...(targetDate !== undefined ? { target_date: targetDate } : {}),
    ...(stateId !== undefined ? { state_id: stateId } : {}),
    ...(labelIds !== undefined ? { labels: labelIds } : {}),
    ...(assigneeIds !== undefined ? { assignees: assigneeIds } : {}),
    ...(parentId !== undefined ? { parent_id: parentId } : {}),
    ...(point !== undefined ? { point } : {}),
    ...(estimatePointId !== undefined ? { estimate_point: estimatePointId } : {}),
    ...(workItemTypeId !== undefined ? { type_id: workItemTypeId } : {}),
  };
}

export function toWorkItemRecords(issues: WorkItemRecordSource[]) {
  return issues.slice(0, 20).map((issue) => ({
    id: issue.id,
    name: issue.name,
    sequence_id: issue.sequence_id,
    state_group: issue.state__group ?? null,
    description_html: issue.description_html ?? "<p></p>",
    priority: issue.priority ?? "none",
    start_date: issue.start_date ?? null,
    target_date: issue.target_date ?? null,
    state_id: issue.state_id ?? null,
    label_ids: issue.labels ?? [],
    assignee_ids: issue.assignees ?? [],
    parent_id: issue.parent_id ?? null,
    point: issue.point ?? null,
    estimate_point_id: issue.estimate_point ?? null,
    work_item_type_id: issue.type_id ?? null,
  }));
}
