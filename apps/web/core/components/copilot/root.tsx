import { CopilotKit, CopilotSidebar, useFrontendTool, useHumanInTheLoop } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { useParams } from "react-router";

import { IssueService } from "@/services/issue";
import { ProjectService } from "@/services/project";

const projectService = new ProjectService();
const issueService = new IssueService();

const result = (operation: string, message: string, affectedIds: string[] = []) => ({
  ok: true,
  operation,
  affectedIds,
  message,
  retryable: false,
});

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
        const projects = await projectService.getProjectsLite(workspace);
        return {
          ...result("list_projects", `Found ${Math.min(projects.length, 20)} projects.`),
          data: projects.slice(0, 20),
        };
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
        const project = await projectService.createProject(workspace, { name, identifier });
        return {
          ...result("create_project", `Created ${project.name}.`, [project.id]),
          data: { id: project.id, name: project.name },
        };
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
        const project = await projectService.updateProject(workspace, targetProjectId, { name });
        return {
          ...result("update_project", `Updated ${project.name}.`, [project.id]),
          data: { id: project.id, name: project.name },
        };
      },
    },
    [workspace]
  );

  useFrontendTool(
    {
      name: "list_work_items",
      description: "List up to 20 work items in the current project.",
      parameters: z.object({}),
      handler: async () => {
        if (!workspace || !projectId) return { ok: false, message: "A current project is required.", retryable: false };
        const response = await issueService.getIssues(workspace, projectId, { per_page: "20" });
        const issues = Array.isArray(response.results) ? response.results : [];
        const workItems = issues
          .slice(0, 20)
          .map((issue) => ({ id: issue.id, name: issue.name, sequence_id: issue.sequence_id }));
        return { ...result("list_work_items", `Found ${workItems.length} work items.`), data: workItems };
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
        const issue = await issueService.createIssue(workspace, projectId, { name: title });
        return {
          ...result("create_work_item", `Created ${issue.name}.`, [issue.id]),
          data: { id: issue.id, name: issue.name },
        };
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
        return result("open_work_item", "Opening work item.", [issueId]);
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
          ...result("update_work_item", `Updated ${issue.name}.`, [issue.id]),
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
            respond(result("delete_work_item", `Deleted ${args.name}.`, [args.issueId]));
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
            respond(result("delete_project", `Deleted ${args.name}.`, [args.projectId]));
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

  return <CopilotSidebar defaultOpen={false} />;
}

export function PlaneCopilot() {
  const runtimeUrl = import.meta.env.VITE_COPILOTKIT_RUNTIME_URL || "http://localhost:8200/api/copilotkit";
  return (
    <CopilotKit runtimeUrl={runtimeUrl} credentials="omit">
      <PlaneTools />
    </CopilotKit>
  );
}
