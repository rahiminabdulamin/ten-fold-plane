export type WorkspaceOption = { id: string; name: string; identifier: string | null };

export const toAgentWorkspaceContext = (teamSlug: string, selectedWorkspace: WorkspaceOption | undefined) => ({
  teamSlug,
  workspaceId: selectedWorkspace?.id ?? null,
  workspaceName: selectedWorkspace?.name ?? null,
  workspaceIdentifier: selectedWorkspace?.identifier ?? null,
});

type SelectedWorkspaceInput = {
  routeProjectId: string | undefined;
  selectedProjectId: string | undefined;
  availableIds: string[];
};

export const resolveSelectedWorkspaceId = ({
  routeProjectId,
  selectedProjectId,
  availableIds,
}: SelectedWorkspaceInput): string | null => {
  if (routeProjectId) return availableIds.includes(routeProjectId) ? routeProjectId : null;
  if (selectedProjectId && availableIds.includes(selectedProjectId)) return selectedProjectId;
  return availableIds.length === 1 ? availableIds[0] : null;
};

export const resolveWorkspaceToolTarget = (requestedProjectId: string | undefined, selectedProjectId: string | null) =>
  requestedProjectId ?? selectedProjectId;

export const shouldSyncWorkspaceSelection = (
  previousRouteProjectId: string | undefined,
  routeProjectId: string | undefined,
  selectedProjectId: string | null
) => previousRouteProjectId !== routeProjectId || selectedProjectId === null;
