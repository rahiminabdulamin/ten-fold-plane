export interface ProjectLookupRecord {
  id: string;
  name: string;
  identifier: string;
}

export type ToolStatus = "success" | "partial_success" | "failure" | "uncertain";

export type ToolErrorCategory =
  | "validation"
  | "permission"
  | "not_found"
  | "conflict"
  | "rate_limit"
  | "network"
  | "timeout"
  | "unexpected";

export interface ToolResult {
  ok: boolean;
  status: ToolStatus;
  operation: string;
  affectedIds: string[];
  message: string;
  retryable: boolean;
  errorCategory?: ToolErrorCategory;
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

export async function createWorkItemsSequentially<TItem, TValue>(
  items: TItem[],
  create: (item: TItem) => Promise<TValue>
): Promise<{
  created: { item: TItem; value: TValue }[];
  failed: { item: TItem; message: string; error: unknown }[];
}> {
  const created: { item: TItem; value: TValue }[] = [];
  const failed: { item: TItem; message: string; error: unknown }[] = [];

  for (const item of items) {
    try {
      // oxlint-disable-next-line eslint(no-await-in-loop) -- preserve request order and stop after the first failure.
      created.push({ item, value: await create(item) });
    } catch (error) {
      failed.push({ item, message: "Unable to create work item.", error });
    }
  }

  return { created, failed };
}

export function toolResult(operation: string, message: string, affectedIds: string[] = []): ToolResult {
  return { ok: true, status: "success", operation, affectedIds, message, retryable: false };
}

export function toolPartialResult(operation: string, message: string, affectedIds: string[] = []): ToolResult {
  return { ok: false, status: "partial_success", operation, affectedIds, message, retryable: false };
}

export function toolUncertainResult(
  operation: string,
  affectedIds: string[] = [],
  message = "The final result could not be verified. Check the current state before trying again."
): ToolResult {
  return { ok: false, status: "uncertain", operation, affectedIds, message, retryable: false };
}

export function toolValidationError(operation: string, message: string, affectedIds: string[] = []): ToolResult {
  return {
    ok: false,
    status: "failure",
    operation,
    affectedIds,
    message,
    retryable: false,
    errorCategory: "validation",
  };
}

type StructuredError = { code?: unknown; response?: { status?: unknown } };

export function classifyToolError(error: unknown): { category: ToolErrorCategory; retryable: boolean } {
  const structured = error && typeof error === "object" ? (error as StructuredError) : {};
  const status = structured.response?.status;
  if (status === 400) return { category: "validation", retryable: false };
  if (status === 401 || status === 403) return { category: "permission", retryable: false };
  if (status === 404) return { category: "not_found", retryable: false };
  if (status === 409) return { category: "conflict", retryable: false };
  if (status === 429) return { category: "rate_limit", retryable: true };
  if (structured.code === "ECONNABORTED" || structured.code === "ETIMEDOUT")
    return { category: "timeout", retryable: true };
  if (structured.code === "ERR_NETWORK" || structured.code === "ECONNRESET")
    return { category: "network", retryable: true };
  return { category: "unexpected", retryable: false };
}

export function toolError(operation: string, error: unknown, options: { mutation?: boolean } = {}): ToolResult {
  const label = operation.replace(/_/g, " ");
  const { category, retryable } = classifyToolError(error);
  return {
    ok: false,
    status: "failure",
    operation,
    affectedIds: [],
    message: `Unable to ${label} right now.`,
    retryable: options.mutation ? false : retryable,
    errorCategory: category,
  };
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

export function buildWorkItemQuery(stateGroup?: WorkItemStateGroup, dateFrom?: string, dateTo?: string) {
  if (Boolean(dateFrom) !== Boolean(dateTo)) throw new Error("Provide both dateFrom and dateTo.");
  if (dateFrom && dateTo && dateFrom > dateTo) throw new Error("dateFrom must not be after dateTo.");
  return {
    per_page: "20",
    ...(stateGroup ? { state_group: stateGroup } : {}),
    ...(dateFrom && dateTo ? { target_date__range: `${dateFrom},${dateTo}` } : {}),
  };
}

export function getUserLocalDateTime(timeZone: string, now: Date = new Date()) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    timeZone,
  };
}

const toDescriptionHtml = (description: string | null) => {
  if (!description) return "<p></p>";
  const escaped = description.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n/g, "<br />")}</p>`;
};

const toPlaneDate = (value: string | null | undefined) => value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? value;

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
    ...(startDate !== undefined ? { start_date: toPlaneDate(startDate) } : {}),
    ...(targetDate !== undefined ? { target_date: toPlaneDate(targetDate) } : {}),
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
