import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("new unrestricted work items have an isolated workspace destination", async () => {
  const [base, form, user, dropdown, workspaceSelect, projectSelect] = await Promise.all([
    read("core/components/issues/issue-modal/base.tsx"),
    read("core/components/issues/issue-modal/form.tsx"),
    read("core/store/user/index.ts"),
    read("core/components/dropdowns/project/dropdown.tsx"),
    read("core/components/issues/issue-modal/components/workspace-select.tsx"),
    read("core/components/issues/issue-modal/components/project-select.tsx"),
  ]);

  assert.match(base, /const \[selectedWorkspaceSlug, setSelectedWorkspaceSlug\] = useState/);
  assert.match(base, /getProjectsWithCreatePermissions\(selectedWorkspaceSlug\)/);
  assert.match(base, /!routerProjectId/);
  assert.match(base, /setUploadedAssetIds\(\[\]\)/);
  assert.match(base, /workspaceSlug: createWorkspaceSlug/);
  assert.doesNotMatch(base, /router\.push\([^)]*selectedWorkspaceSlug/);
  assert.match(form, /isWorkspaceSwitchable && onWorkspaceChange && \(/);
  assert.match(form, /disabled=\{!projectId \|\| isDisabled\}/);
  assert.match(user, /getProjectsWithCreatePermissions = \(workspaceSlug: string\)/);
  assert.match(dropdown, /projectIds\?: string\[\]/);
  assert.doesNotMatch(form, />Destination</);
  assert.match(workspaceSelect, /className="h-7 min-w-0"/);
  assert.match(workspaceSelect, /appearance-none/);
  assert.match(workspaceSelect, /workspace\.name\.replace/);
  assert.match(projectSelect, /className="h-7 min-w-0"/);
});
