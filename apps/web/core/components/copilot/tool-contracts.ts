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

export function toWorkItemRecords(issues: WorkItemRecordSource[]) {
  return issues.slice(0, 20).map(({ id, name, sequence_id, state__group }) => ({
    id,
    name,
    sequence_id,
    state_group: state__group ?? null,
  }));
}
