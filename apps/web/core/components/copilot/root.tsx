import { CopilotKit, CopilotSidebar, useFrontendTool, useHumanInTheLoop } from "@copilotkit/react-core/v2";
import { API_BASE_URL } from "@plane/constants";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useParams } from "react-router";

import { IssueService } from "@/services/issue";
import { IssueLabelService } from "@/services/issue/issue_label.service";
import { EstimateService } from "@/services/estimate.service";
import { ProjectMemberService } from "@/services/project/project-member.service";
import { ProjectStateService } from "@/services/project/project-state.service";
import { ProjectService } from "@/services/project";
import { WorkspaceService } from "@/services/workspace.service";

import {
  buildWorkItemQuery,
  findProjectMatches,
  toWorkItemPayload,
  toWorkItemRecords,
  toolError,
  toolResult,
  WORK_ITEM_STATE_GROUPS,
} from "./tool-contracts";

const projectService = new ProjectService();
const issueService = new IssueService();
const stateService = new ProjectStateService();
const labelService = new IssueLabelService();
const memberService = new ProjectMemberService();
const estimateService = new EstimateService();
const workspaceService = new WorkspaceService();
const COPILOT_PANEL_WIDTH_STORAGE_KEY = "tenfold-copilot-panel-width";
const COPILOT_LAUNCHER_POSITION_STORAGE_KEY = "tenfold-copilot-launcher-position";
const DEFAULT_COPILOT_PANEL_WIDTH = 360;
const MIN_COPILOT_PANEL_WIDTH = 280;
const MAX_COPILOT_PANEL_WIDTH = 560;
const LAUNCHER_SIZE = 56;
const LAUNCHER_GUTTER = 24;

type LauncherPosition = { x: number; y: number };

const workItemMutationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(100_000).optional(),
  priority: z.enum(["urgent", "high", "medium", "low", "none"]).optional(),
  startDate: z.string().date().optional(),
  targetDate: z.string().date().optional(),
  stateId: z.string().uuid().optional(),
  labelIds: z.array(z.string().uuid()).max(100).optional(),
  assigneeIds: z.array(z.string().uuid()).max(100).optional(),
  parentId: z.string().uuid().optional(),
  point: z.number().int().min(0).max(12).optional(),
  estimatePointId: z.string().uuid().optional(),
  workItemTypeId: z.string().uuid().optional(),
});

const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);

const getDefaultLauncherPosition = (): LauncherPosition => ({
  x: Math.max(LAUNCHER_GUTTER, window.innerWidth - LAUNCHER_SIZE - LAUNCHER_GUTTER),
  y: Math.max(LAUNCHER_GUTTER, window.innerHeight - LAUNCHER_SIZE - LAUNCHER_GUTTER),
});

const clampLauncherPosition = ({ x, y }: LauncherPosition): LauncherPosition => ({
  x: clamp(x, LAUNCHER_GUTTER, Math.max(LAUNCHER_GUTTER, window.innerWidth - LAUNCHER_SIZE - LAUNCHER_GUTTER)),
  y: clamp(y, LAUNCHER_GUTTER, Math.max(LAUNCHER_GUTTER, window.innerHeight - LAUNCHER_SIZE - LAUNCHER_GUTTER)),
});

function PlaneTools() {
  const { workspaceSlug, projectId } = useParams();
  const workspace = typeof workspaceSlug === "string" ? workspaceSlug : "";
  const [panelWidth, setPanelWidth] = useState(DEFAULT_COPILOT_PANEL_WIDTH);
  const panelWidthRef = useRef(DEFAULT_COPILOT_PANEL_WIDTH);
  const [launcherPosition, setLauncherPosition] = useState<LauncherPosition | null>(null);
  const dragStart = useRef<{ x: number; y: number; pointerX: number; pointerY: number; moved: boolean } | null>(null);
  const preserveSidebarOpen = useRef(false);

  useEffect(() => {
    const storedWidth = Number(window.localStorage.getItem(COPILOT_PANEL_WIDTH_STORAGE_KEY));
    if (Number.isFinite(storedWidth)) {
      const width = clamp(storedWidth, MIN_COPILOT_PANEL_WIDTH, MAX_COPILOT_PANEL_WIDTH);
      panelWidthRef.current = width;
      setPanelWidth(width);
    }
    const storedPosition = window.localStorage.getItem(COPILOT_LAUNCHER_POSITION_STORAGE_KEY);
    if (storedPosition) {
      try {
        setLauncherPosition(clampLauncherPosition(JSON.parse(storedPosition) as LauncherPosition));
        return;
      } catch {
        window.localStorage.removeItem(COPILOT_LAUNCHER_POSITION_STORAGE_KEY);
      }
    }
    setLauncherPosition(getDefaultLauncherPosition());
  }, []);

  useEffect(() => {
    panelWidthRef.current = panelWidth;
    document.documentElement.style.setProperty("--copilot-panel-width", `${panelWidth}px`);
    window.localStorage.setItem(COPILOT_PANEL_WIDTH_STORAGE_KEY, `${panelWidth}`);
  }, [panelWidth]);

  useEffect(() => {
    if (!launcherPosition) return;
    window.localStorage.setItem(COPILOT_LAUNCHER_POSITION_STORAGE_KEY, JSON.stringify(launcherPosition));
  }, [launcherPosition]);

  const resetLauncherPosition = useCallback(() => {
    const position = getDefaultLauncherPosition();
    window.localStorage.removeItem(COPILOT_LAUNCHER_POSITION_STORAGE_KEY);
    setLauncherPosition(position);
  }, []);

  useEffect(() => {
    const panel = document.querySelector<HTMLElement>("[data-copilot-sidebar]");
    if (!panel) return;
    let wasOpen = panel.getAttribute("aria-hidden") === "false";
    const observer = new MutationObserver(() => {
      const isOpen = panel.getAttribute("aria-hidden") === "false";
      if (isOpen) {
        preserveSidebarOpen.current = true;
      } else if (wasOpen && preserveSidebarOpen.current) {
        document.querySelector<HTMLButtonElement>('[data-slot="chat-toggle-button"]')?.click();
      } else if (wasOpen) {
        resetLauncherPosition();
      }
      wasOpen = isOpen;
    });
    observer.observe(panel, { attributes: true, attributeFilter: ["aria-hidden"] });
    return () => observer.disconnect();
  }, [resetLauncherPosition]);

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = panelWidthRef.current;
    const resize = (moveEvent: PointerEvent) => {
      const width = clamp(startWidth + startX - moveEvent.clientX, MIN_COPILOT_PANEL_WIDTH, MAX_COPILOT_PANEL_WIDTH);
      panelWidthRef.current = width;
      document.documentElement.style.setProperty("--copilot-panel-width", `${width}px`);
    };
    const stopResize = (releaseEvent: PointerEvent) => {
      if (releaseEvent.pointerId !== event.pointerId) return;
      releaseEvent.stopPropagation();
      const width = panelWidthRef.current;
      window.localStorage.setItem(COPILOT_PANEL_WIDTH_STORAGE_KEY, `${width}`);
      setPanelWidth(width);
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize, true);
    };
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize, true);
  };

  const startLauncherDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!launcherPosition) return;
    dragStart.current = {
      x: launcherPosition.x,
      y: launcherPosition.y,
      pointerX: event.clientX,
      pointerY: event.clientY,
      moved: false,
    };
    const drag = (moveEvent: PointerEvent) => {
      const start = dragStart.current;
      if (!start) return;
      start.moved ||= Math.abs(moveEvent.clientX - start.pointerX) + Math.abs(moveEvent.clientY - start.pointerY) > 4;
      setLauncherPosition(
        clampLauncherPosition({
          x: start.x + moveEvent.clientX - start.pointerX,
          y: start.y + moveEvent.clientY - start.pointerY,
        })
      );
    };
    const stopDrag = () => {
      window.removeEventListener("pointermove", drag);
      window.removeEventListener("pointerup", stopDrag);
    };
    window.addEventListener("pointermove", drag);
    window.addEventListener("pointerup", stopDrag);
  };

  useFrontendTool(
    {
      name: "get_work_item_schema",
      description:
        "Get the current project's assignable work-item states, labels, members, estimate points, and available work-item types. Use before resolving a name to an ID.",
      parameters: z.object({ projectId: z.string().uuid().optional() }),
      handler: async ({ projectId: requestedProjectId }) => {
        const targetProjectId = requestedProjectId ?? projectId;
        if (!workspace || !targetProjectId)
          return { ok: false, message: "Find a project first, then provide its project ID.", retryable: false };
        try {
          const [states, labels, members, workspaceMembers, estimates, project] = await Promise.all([
            stateService.getStates(workspace, targetProjectId),
            labelService.getProjectLabels(workspace, targetProjectId),
            memberService.fetchProjectMembers(workspace, targetProjectId),
            workspaceService.fetchWorkspaceMembers(workspace),
            estimateService.fetchProjectEstimates(workspace, targetProjectId),
            projectService.getProject(workspace, targetProjectId),
          ]);
          const projectTypes = (project as { issue_types?: { id: string; name: string }[] }).issue_types ?? [];
          const workspaceMembersById = new Map(
            workspaceMembers.map(({ member, display_name }) => [member.id, display_name])
          );
          const data = {
            states: states.slice(0, 100).map(({ id, name, group }) => ({ id, name, group })),
            labels: labels.slice(0, 100).map(({ id, name }) => ({ id, name })),
            members: members
              .slice(0, 100)
              .map(({ member }) => ({ id: member, name: workspaceMembersById.get(member) ?? member })),
            estimatePoints: (estimates ?? [])
              .flatMap((estimate) => estimate.points ?? [])
              .filter((point) => point.id && point.value)
              .slice(0, 100)
              .map((point) => ({ id: point.id!, value: point.value! })),
            workItemTypes: projectTypes.slice(0, 100).map(({ id, name }) => ({ id, name })),
          };
          return { ...toolResult("get_work_item_schema", "Retrieved work-item schema.", [targetProjectId]), data };
        } catch (error) {
          return toolError("get_work_item_schema", error);
        }
      },
    },
    [workspace, projectId]
  );

  useFrontendTool(
    {
      name: "list_projects",
      description: "List up to 20 projects in the current workspace.",
      parameters: z.object({}),
      handler: async () => {
        if (!workspace) return { ok: false, message: "A workspace is required.", retryable: false };
        try {
          const projects = await projectService.getProjectsLite(workspace);
          const data = projects.slice(0, 20).map(({ id, name, identifier }) => ({ id, name, identifier }));
          return { ...toolResult("list_projects", `Found ${data.length} projects.`), data };
        } catch (error) {
          return toolError("list_projects", error);
        }
      },
    },
    [workspace]
  );

  useFrontendTool(
    {
      name: "find_project",
      description:
        "Find up to 20 projects in the current workspace by name or identifier. Use this before work-item operations when the user names a project.",
      parameters: z.object({ query: z.string().min(1).max(255) }),
      handler: async ({ query }) => {
        if (!workspace) return { ok: false, message: "A workspace is required.", retryable: false };
        try {
          const projects = await projectService.getProjectsLite(workspace);
          const data = findProjectMatches(
            projects.map(({ id, name, identifier }) => ({ id, name, identifier })),
            query
          );
          const message = data.length === 1 ? `Found ${data[0].name}.` : `Found ${data.length} matching projects.`;
          return {
            ...toolResult(
              "find_project",
              message,
              data.map(({ id }) => id)
            ),
            data,
          };
        } catch (error) {
          return toolError("find_project", error);
        }
      },
    },
    [workspace]
  );

  useFrontendTool(
    {
      name: "create_project",
      description: "Create one project in the current workspace.",
      parameters: z.object({ name: z.string().min(1).max(255), identifier: z.string().min(1).max(20).optional() }),
      handler: async ({ name, identifier }) => {
        if (!workspace) return { ok: false, message: "A workspace is required.", retryable: false };
        try {
          const project = await projectService.createProject(workspace, {
            name,
            ...(identifier ? { identifier } : {}),
          });
          return {
            ...toolResult("create_project", `Created ${project.name}.`, [project.id]),
            data: { id: project.id, name: project.name },
          };
        } catch (error) {
          return toolError("create_project", error);
        }
      },
    },
    [workspace]
  );

  useFrontendTool(
    {
      name: "update_project",
      description: "Update the name of one project in the current workspace.",
      parameters: z.object({ projectId: z.string().uuid(), name: z.string().min(1).max(255) }),
      handler: async ({ projectId: targetProjectId, name }) => {
        if (!workspace) return { ok: false, message: "A workspace is required.", retryable: false };
        try {
          const project = await projectService.updateProject(workspace, targetProjectId, { name });
          return {
            ...toolResult("update_project", `Updated ${project.name}.`, [project.id]),
            data: { id: project.id, name: project.name },
          };
        } catch (error) {
          return toolError("update_project", error);
        }
      },
    },
    [workspace]
  );

  useFrontendTool(
    {
      name: "get_project",
      description: "Get one project by its canonical project ID.",
      parameters: z.object({ projectId: z.string().uuid() }),
      handler: async ({ projectId: targetProjectId }) => {
        if (!workspace) return { ok: false, message: "A workspace is required.", retryable: false };
        try {
          const project = await projectService.getProject(workspace, targetProjectId);
          const data = { id: project.id, name: project.name, identifier: project.identifier };
          return { ...toolResult("get_project", `Found ${project.name}.`, [project.id]), data };
        } catch (error) {
          return toolError("get_project", error);
        }
      },
    },
    [workspace]
  );

  useFrontendTool(
    {
      name: "list_work_items",
      description:
        "List up to 20 work items, optionally limited to one state bucket. Use the current project by default, or pass a canonical project ID returned by find_project.",
      parameters: z.object({
        projectId: z.string().uuid().optional(),
        stateGroup: z.enum(WORK_ITEM_STATE_GROUPS).optional(),
      }),
      handler: async ({ projectId: requestedProjectId, stateGroup }) => {
        const targetProjectId = requestedProjectId ?? projectId;
        if (!workspace || !targetProjectId)
          return { ok: false, message: "Find a project first, then provide its project ID.", retryable: false };
        try {
          const response = await issueService.getIssues(
            workspace,
            targetProjectId,
            buildWorkItemQuery(stateGroup ?? undefined)
          );
          const issues = Array.isArray(response.results) ? response.results : [];
          const data = toWorkItemRecords(issues);
          return { ...toolResult("list_work_items", `Found ${data.length} work items.`), data };
        } catch (error) {
          return toolError("list_work_items", error);
        }
      },
    },
    [workspace, projectId]
  );

  useFrontendTool(
    {
      name: "create_work_item",
      description: "Create one work item in the current project with any supported editable fields.",
      parameters: workItemMutationSchema.extend({ title: z.string().min(1).max(255) }),
      handler: async (input) => {
        if (!workspace || !projectId) return { ok: false, message: "A current project is required.", retryable: false };
        try {
          const issue = await issueService.createIssue(workspace, projectId, toWorkItemPayload(input));
          return {
            ...toolResult("create_work_item", `Created ${issue.name}.`, [issue.id]),
            data: { id: issue.id, name: issue.name },
          };
        } catch (error) {
          return toolError("create_work_item", error);
        }
      },
    },
    [workspace, projectId]
  );

  useFrontendTool(
    {
      name: "get_work_item",
      description: "Get one work item in the current project by its canonical work-item ID.",
      parameters: z.object({ issueId: z.string().uuid() }),
      handler: async ({ issueId }) => {
        if (!workspace || !projectId) return { ok: false, message: "A current project is required.", retryable: false };
        try {
          const issue = await issueService.retrieve(workspace, projectId, issueId);
          const data = toWorkItemRecords([issue])[0];
          return { ...toolResult("get_work_item", `Found ${issue.name}.`, [issue.id]), data };
        } catch (error) {
          return toolError("get_work_item", error);
        }
      },
    },
    [workspace, projectId]
  );

  useFrontendTool(
    {
      name: "open_work_item",
      description: "Navigate to a work item in the current project.",
      parameters: z.object({ issueId: z.string().uuid() }),
      handler: async ({ issueId }) => {
        if (!workspace || !projectId) return { ok: false, message: "A current project is required.", retryable: false };
        window.location.assign(`/${workspace}/projects/${projectId}/issues/${issueId}`);
        return toolResult("open_work_item", "Opening work item.", [issueId]);
      },
      followUp: false,
    },
    [workspace, projectId]
  );

  useFrontendTool(
    {
      name: "update_work_item",
      description: "Update one work item in the current project with any supported editable fields.",
      parameters: workItemMutationSchema
        .extend({ issueId: z.string().uuid() })
        .refine(({ issueId: _issueId, ...changes }) => Object.values(changes).some((value) => value !== undefined), {
          message: "Provide at least one work-item field to update.",
        }),
      handler: async ({ issueId, ...changes }) => {
        if (!workspace || !projectId) return { ok: false, message: "A current project is required.", retryable: false };
        try {
          const issue = await issueService.patchIssue(workspace, projectId, issueId, toWorkItemPayload(changes));
          return {
            ...toolResult("update_work_item", `Updated ${issue.name}.`, [issue.id]),
            data: toWorkItemRecords([issue])[0],
          };
        } catch (error) {
          return toolError("update_work_item", error);
        }
      },
    },
    [workspace, projectId]
  );

  useHumanInTheLoop(
    {
      name: "confirm_delete_work_item",
      description: "Use this tool to delete a work item. It always requires explicit user approval.",
      parameters: z.object({ issueId: z.string().uuid(), name: z.string().min(1).max(255) }),
      render: ({ args, status, respond }) => {
        const execute = async () => {
          if (!workspace || !projectId || !respond) return;
          try {
            await issueService.deleteIssue(workspace, projectId, args.issueId);
            respond(toolResult("delete_work_item", `Deleted ${args.name}.`, [args.issueId]));
          } catch {
            respond({
              ok: false,
              operation: "delete_work_item",
              affectedIds: [args.issueId],
              message: "Deletion failed.",
              retryable: false,
            });
          }
        };
        if (status !== "executing" || !respond) return <p>Preparing deletion confirmation…</p>;
        return (
          <section aria-label="Confirm work item deletion" className="border-red-500 rounded border p-3">
            <p>Delete {args.name}? This cannot be undone.</p>
            <button
              type="button"
              onClick={() =>
                respond({
                  ok: false,
                  operation: "delete_work_item",
                  affectedIds: [args.issueId],
                  message: "Deletion cancelled.",
                  retryable: false,
                })
              }
            >
              Cancel
            </button>
            <button type="button" className="ml-2" onClick={execute}>
              Delete
            </button>
          </section>
        );
      },
    },
    [workspace, projectId]
  );

  useHumanInTheLoop(
    {
      name: "confirm_delete_project",
      description: "Use this tool to delete a project. It always requires explicit user approval.",
      parameters: z.object({ projectId: z.string().uuid(), name: z.string().min(1).max(255) }),
      render: ({ args, status, respond }) => {
        const execute = async () => {
          if (!workspace || !respond) return;
          try {
            await projectService.deleteProject(workspace, args.projectId);
            respond(toolResult("delete_project", `Deleted ${args.name}.`, [args.projectId]));
          } catch {
            respond({
              ok: false,
              operation: "delete_project",
              affectedIds: [args.projectId],
              message: "Deletion failed.",
              retryable: false,
            });
          }
        };
        if (status !== "executing" || !respond) return <p>Preparing deletion confirmation…</p>;
        return (
          <section aria-label="Confirm project deletion" className="border-red-500 rounded border p-3">
            <p>Delete {args.name}? This cannot be undone.</p>
            <button
              type="button"
              onClick={() =>
                respond({
                  ok: false,
                  operation: "delete_project",
                  affectedIds: [args.projectId],
                  message: "Deletion cancelled.",
                  retryable: false,
                })
              }
            >
              Cancel
            </button>
            <button type="button" className="ml-2" onClick={execute}>
              Delete
            </button>
          </section>
        );
      },
    },
    [workspace]
  );

  return (
    <>
      <CopilotSidebar
        defaultOpen={false}
        header={{
          children: ({ closeButton, titleContent }) => (
            <header
              className="flex h-[51px] items-center justify-between border-b border-subtle bg-surface-1 px-4"
              onClickCapture={(event) => {
                if ((event.target as HTMLElement).closest('[data-testid="copilot-close-button"]')) {
                  preserveSidebarOpen.current = false;
                }
              }}
            >
              <div className="flex items-center gap-2 text-primary">
                <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.75"
                  />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
                </svg>
                <div className="text-13 font-medium">{titleContent}</div>
              </div>
              {closeButton}
            </header>
          ),
        }}
        labels={{ modalHeaderTitle: "Ten-Fold Assistant" }}
        position="right"
        width="var(--copilot-panel-width)"
        toggleButton={{
          onPointerDown: startLauncherDrag,
          onClick: (event) => {
            if (dragStart.current?.moved) event?.preventDefault();
            dragStart.current = null;
          },
          style: launcherPosition
            ? { left: launcherPosition.x, top: launcherPosition.y, right: "auto", bottom: "auto", touchAction: "none" }
            : undefined,
        }}
      />
      <div
        className="copilot-panel-resize-handle"
        onPointerDown={startResize}
        role="separator"
        aria-orientation="vertical"
      />
    </>
  );
}

export function PlaneCopilot() {
  const runtimeUrl = import.meta.env.VITE_COPILOTKIT_RUNTIME_URL || "http://localhost:8200/api/copilotkit";
  const [token, setToken] = useState("");

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: number | undefined;
    const refresh = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/me/copilot-identity/`, { credentials: "include" });
        if (!response.ok) throw new Error("Copilot identity refresh failed");
        const identity = (await response.json()) as { token: string; expires_at: string };
        if (cancelled) return;
        setToken(identity.token);
        refreshTimer = window.setTimeout(
          refresh,
          Math.max(Date.parse(identity.expires_at) - Date.now() - 30_000, 1_000)
        );
      } catch {
        if (!cancelled) refreshTimer = window.setTimeout(refresh, 5_000);
      }
    };
    void refresh();
    return () => {
      cancelled = true;
      if (refreshTimer) window.clearTimeout(refreshTimer);
    };
  }, []);

  if (!token) return null;
  return (
    <CopilotKit runtimeUrl={runtimeUrl} credentials="omit" headers={() => ({ Authorization: `Bearer ${token}` })}>
      <PlaneTools />
    </CopilotKit>
  );
}
