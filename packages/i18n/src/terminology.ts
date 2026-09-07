/**
 * Display-only hierarchy nomenclature for Ten-Fold.
 * Domain names in routes, APIs, translation keys, and persistence remain unchanged.
 */
export function applyHierarchyTerminology(value: string): string {
  return value
    .replace(/\bWorkspaces\b/g, "Teams")
    .replace(/\bworkspaces\b/g, "teams")
    .replace(/\bWorkspace\b/g, "Team")
    .replace(/\bworkspace\b/g, "team")
    .replace(/\bProjects\b/g, "Workspaces")
    .replace(/\bprojects\b/g, "workspaces")
    .replace(/\bProject\b/g, "Workspace")
    .replace(/\bproject\b/g, "workspace");
}
