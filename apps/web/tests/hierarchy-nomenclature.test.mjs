import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readRepositoryFile = (path) => readFile(new URL(`../../../${path}`, import.meta.url), "utf8");

test("the translation layer renders the Ten-Fold hierarchy without changing translation keys", async () => {
  const terminology = await read("../../packages/i18n/src/terminology.ts");

  assert.ok(terminology.includes('replace(/\\bWorkspaces\\b/g, "Teams")'));
  assert.ok(terminology.includes('replace(/\\bWorkspace\\b/g, "Team")'));
  assert.ok(terminology.includes('replace(/\\bProjects\\b/g, "Workspaces")'));
  assert.ok(terminology.includes('replace(/\\bProject\\b/g, "Workspace")'));
});

test("hierarchy emails use Team for the parent and Workspace for the child", async () => {
  const [workspaceInvite, projectInvite, projectAddition] = await Promise.all([
    readRepositoryFile("apps/api/templates/emails/invitations/workspace_invitation.html"),
    readRepositoryFile("apps/api/templates/emails/invitations/project_invitation.html"),
    readRepositoryFile("apps/api/templates/emails/notifications/project_addition.html"),
  ]);

  assert.match(workspaceInvite, /team/i);
  assert.match(projectInvite, /workspace/i);
  assert.match(projectAddition, /workspace/i);
});

test("hard-coded navigation and entity controls use the rendered hierarchy", async () => {
  const [sidebar, sidebarWrapper, projectSettings, teamSettings, projectMenu, teamMenu] = await Promise.all([
    read("app/(all)/[workspaceSlug]/(projects)/sidebar.tsx"),
    read("core/components/sidebar/sidebar-wrapper.tsx"),
    read("core/components/settings/project/sidebar/header.tsx"),
    read("core/components/settings/workspace/sidebar/header.tsx"),
    read("core/components/power-k/menus/projects.tsx"),
    read("core/components/power-k/menus/workspaces.tsx"),
  ]);

  assert.match(sidebar, /showTeamSelector/);
  assert.match(sidebarWrapper, /showTeamSelector/);
  assert.match(projectSettings, />Workspace settings</);
  assert.match(teamSettings, />Team settings</);
  assert.match(projectMenu, /emptyText="No workspaces found"/);
  assert.match(teamMenu, /emptyText="No teams found"/);
});

test("renamed frontend files remain compatible with the pre-commit accessibility and promise rules", async () => {
  const [filter, multiSelect, workspaceWrapper, joinModal, leaveModal] = await Promise.all([
    read("core/components/project/dropdowns/filters/root.tsx"),
    read("core/components/project/multi-select-modal.tsx"),
    read("core/layouts/auth-layout/workspace-wrapper.tsx"),
    read("core/components/project/join-project-modal.tsx"),
    read("core/components/project/leave-project-modal.tsx"),
  ]);

  assert.doesNotMatch(filter, /autoFocus/);
  assert.match(multiSelect, /<button[\s\S]*?type="button"[\s\S]*?onClick=/);
  assert.match(workspaceWrapper, /<button[\s\S]*?type="button"[\s\S]*?onClick={handleSignOut}/);
  assert.doesNotMatch(joinModal, /tabIndex={1}/);
  assert.match(leaveModal, /data\.confirmLeave === "Leave Workspace"/);
});

test("assistant tools describe the hierarchy with Team and Workspace while retaining their API contracts", async () => {
  const root = await read("core/components/copilot/root.tsx");

  assert.match(root, /description: "List up to 20 Workspaces in the current Team\."/);
  assert.match(root, /message: "A Team is required\."/);
  assert.match(root, /name: "find_project"/);
  assert.match(root, /projectId: z\.string\(\)\.uuid\(\)/);
  assert.match(root, /projectService\.getProjectsLite\(workspace\)/);
});
