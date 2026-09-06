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
