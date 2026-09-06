import { CopilotKit, CopilotSidebar, useFrontendTool, useHumanInTheLoop } from "@copilotkit/react-core/v2";
import { API_BASE_URL } from "@plane/constants";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useParams } from "react-router";

import { IssueService } from "@/services/issue";
import { ProjectService } from "@/services/project";

import { findProjectMatches, toolError, toolResult } from "./tool-contracts";

const projectService = new ProjectService();
const issueService = new IssueService();

function PlaneTools() {
  const { workspaceSlug, projectId } = useParams();
  const workspace = typeof workspaceSlug === "string" ? workspaceSlug : "";

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
          const project = await projectService.createProject(workspace, { name, identifier });
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
        "List up to 20 work items. Use the current project by default, or pass a canonical project ID returned by find_project.",
      parameters: z.object({ projectId: z.string().uuid().optional() }),
      handler: async ({ projectId: requestedProjectId }) => {
        const targetProjectId = requestedProjectId ?? projectId;
        if (!workspace || !targetProjectId)
          return { ok: false, message: "Find a project first, then provide its project ID.", retryable: false };
        try {
          const response = await issueService.getIssues(workspace, targetProjectId, { per_page: "20" });
          const issues = Array.isArray(response.results) ? response.results : [];
          const data = issues
            .slice(0, 20)
            .map((issue) => ({ id: issue.id, name: issue.name, sequence_id: issue.sequence_id }));
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
      description: "Create one work item in the current project.",
      parameters: z.object({ title: z.string().min(1).max(255) }),
      handler: async ({ title }) => {
        if (!workspace || !projectId) return { ok: false, message: "A current project is required.", retryable: false };
        try {
          const issue = await issueService.createIssue(workspace, projectId, { name: title });
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
          const data = { id: issue.id, name: issue.name, sequence_id: issue.sequence_id };
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
      description: "Update the title of one work item in the current project.",
      parameters: z.object({ issueId: z.string().uuid(), title: z.string().min(1).max(255) }),
      handler: async ({ issueId, title }) => {
        if (!workspace || !projectId) return { ok: false, message: "A current project is required.", retryable: false };
        const issue = await issueService.patchIssue(workspace, projectId, issueId, { name: title });
        return {
          ...toolResult("update_work_item", `Updated ${issue.name}.`, [issue.id]),
          data: { id: issue.id, name: issue.name },
        };
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
    <CopilotSidebar
      defaultOpen={false}
      header={{
        children: ({ closeButton, titleContent }) => (
          <header className="flex items-center justify-between border-b border-subtle bg-surface-1 px-4 py-3">
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
      position="left"
      width={360}
    />
  );
}

export function PlaneCopilot() {
  const runtimeUrl = import.meta.env.VITE_COPILOTKIT_RUNTIME_URL || "http://localhost:8200/api/copilotkit";
  const [token, setToken] = useState("");

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: number | undefined;
    const refresh = async () => {
      const response = await fetch(`${API_BASE_URL}/api/users/me/copilot-identity/`, { credentials: "include" });
      if (!response.ok) return;
      const identity = (await response.json()) as { token: string; expires_at: string };
      if (cancelled) return;
      setToken(identity.token);
      refreshTimer = window.setTimeout(refresh, Math.max(Date.parse(identity.expires_at) - Date.now() - 30_000, 1_000));
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
