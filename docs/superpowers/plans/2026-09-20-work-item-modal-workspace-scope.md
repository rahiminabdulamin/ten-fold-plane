# Work-item Modal Workspace Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow an unrestricted new work item to target a selected workspace and createable project without changing the current route.

**Architecture:** `CreateUpdateIssueModalBase` owns a modal-local workspace slug and permitted project IDs. The form renders a workspace control above the existing project control. Only the switchable creation path uses the selected slug; all compatibility-bound paths retain the route slug.

**Tech Stack:** React, TypeScript, MobX, React Hook Form, Headless UI, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-20-work-item-modal-workspace-scope-design.md`

## Global Constraints

- No dependency, endpoint, route change, global workspace switch, or unrelated-worktree change.
- Enable switching only for new unrestricted creation; keep edits, duplicates, drafts, parent/sub-work-items, cycle/module work, and explicit `allowedProjectIds` flows unchanged.
- Clear project, parent, project properties, assignees, labels, dates, estimate, type, cycle/module, and attachment IDs on scope change; retain title and text description.
- Use the chosen workspace for project loading, create, upload finalization, properties, parent lookup, and toast link.

## Review Focus

- Never submit a previous-workspace project after selection changes.
- Disable Save and show an empty state when no createable project exists.
- Never expose switching in inherited-context or restricted flows.
- Never upload old attachment IDs to the newly selected workspace.
- Toast links target the chosen workspace while the browser route stays put.

## File structure

- `apps/web/core/components/issues/issue-modal/base.tsx`: scope state, permitted project loading, reset coordination, scoped creation.
- `apps/web/core/components/issues/issue-modal/form.tsx`: selector placement, no-project state, Save disablement.
- `apps/web/core/components/issues/issue-modal/components/workspace-select.tsx`: bounded modal-local selector.
- `apps/web/core/components/issues/issue-modal/components/{index,project-select}.tsx`: export selector and accept selected-workspace project IDs.
- `apps/web/core/store/user/index.ts`: parameterize existing create-permission lookup by workspace slug.
- `apps/web/core/components/dropdowns/project/dropdown.tsx`: optional project-ID override; preserve current default.
- `apps/web/tests/work-item-modal-workspace-scope.test.mjs`: focused source-contract regressions.

### Task 1: Establish failing scope tests

**Files:** Create `apps/web/tests/work-item-modal-workspace-scope.test.mjs`.

**Produces:** contract coverage before production changes.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
test("new unrestricted work items have an isolated workspace destination", async () => {
  const [base, form, user, dropdown] = await Promise.all([
    read("core/components/issues/issue-modal/base.tsx"),
    read("core/components/issues/issue-modal/form.tsx"),
    read("core/store/user/index.ts"),
    read("core/components/dropdowns/project/dropdown.tsx"),
  ]);
  assert.match(base, /const \[selectedWorkspaceSlug, setSelectedWorkspaceSlug\] = useState/);
  assert.match(base, /getProjectsWithCreatePermissions\(selectedWorkspaceSlug\)/);
  assert.match(base, /setUploadedAssetIds\(\[\]\)/);
  assert.match(base, /workspaceSlug: selectedWorkspaceSlug/);
  assert.doesNotMatch(base, /router\.push\([^)]*selectedWorkspaceSlug/);
  assert.match(form, /isWorkspaceSwitchable && <IssueWorkspaceSelect/);
  assert.match(form, /disabled=\{!projectId \|\| isDisabled\}/);
  assert.match(user, /getProjectsWithCreatePermissions = \(workspaceSlug: string\)/);
  assert.match(dropdown, /projectIds\?: string\[\]/);
});
```

- [ ] **Step 2: Verify red** — Run `node --test apps/web/tests/work-item-modal-workspace-scope.test.mjs`; expect failure because the scope path does not exist.

### Task 2: Add selected-workspace eligibility plumbing

**Files:** Modify `apps/web/core/store/user/index.ts:270-315`; modify `apps/web/core/components/dropdowns/project/dropdown.tsx:16-43`; test `apps/web/tests/work-item-modal-workspace-scope.test.mjs`.

**Interfaces:** Produce `getProjectsWithCreatePermissions(workspaceSlug: string): Record<string, TUserPermissions> | null`. `ProjectDropdown` accepts `projectIds?: string[]`; without it, it passes `joinedProjectIds` unchanged to `ProjectDropdownBase`.

- [ ] **Step 1: Add red assertions**

```js
assert.match(user, /getProjectRolesByWorkspaceSlug\(workspaceSlug\)/);
assert.match(dropdown, /projectIds=\{props\.projectIds \?\? joinedProjectIds\}/);
```

- [ ] **Step 2: Verify red** — Run the focused test; expect the new assertions to fail.

- [ ] **Step 3: Implement the smallest parameterization**

```ts
getProjectsWithCreatePermissions = (workspaceSlug: string) => {
  const roles = this.permission.getProjectRolesByWorkspaceSlug(workspaceSlug);
  return roles ? Object.fromEntries(Object.entries(roles).filter(([, role]) => role >= EUserPermissions.MEMBER)) : null;
};
get projectsWithCreatePermissions() {
  return this.getProjectsWithCreatePermissions(this.store.router.workspaceSlug || "");
}
```

Keep `canPerformAnyCreateAction` unchanged. Add the optional prop to the existing dropdown wrapper only.

- [ ] **Step 4: Verify green** — Run focused test; expect PASS.
- [ ] **Step 5: Commit** — `git add apps/web/core/store/user/index.ts apps/web/core/components/dropdowns/project/dropdown.tsx apps/web/tests/work-item-modal-workspace-scope.test.mjs && git commit -m "feat: support scoped work item projects"`.

### Task 3: Render a local destination selector

**Files:** Create `apps/web/core/components/issues/issue-modal/components/workspace-select.tsx`; modify `components/index.ts`, `components/project-select.tsx`, `form.tsx`, `packages/i18n/src/locales/en/work-item.json`; test file.

**Interfaces:** `IssueWorkspaceSelect({ value: string, onChange: (slug: string) => void, disabled: boolean })`. `IssueProjectSelect` accepts `projectIds?: string[]`.

- [ ] **Step 1: Add red assertions**

```js
assert.match(form, /isWorkspaceSwitchable && <IssueWorkspaceSelect/);
assert.match(form, /role="status"/);
assert.match(projectSelect, /projectIds=\{projectIds\}/);
assert.match(workspaceSelect, /onChange\(workspace\.slug\)/);
```

- [ ] **Step 2: Verify red** — Run focused test; expect selector files/markup missing.
- [ ] **Step 3: Implement** — Use `useWorkspace().workspaces` and existing Headless UI dropdown styling. Render a labeled, truncated Workspace selector directly under the heading, then Project. It must not use router navigation or `updateUserProfile`. Render a translated no-createable-project `role="status"` message and disable Save when `projectId` is absent.
- [ ] **Step 4: Verify green** — Run focused test; expect PASS.
- [ ] **Step 5: Commit** — stage only these files and commit `feat: choose work item destination workspace`.

### Task 4: Scope creation and reset state

**Files:** Modify `base.tsx:45-260`, `form.tsx`, `context/issue-modal-context.tsx`, `provider.tsx`; test file.

**Interfaces:** `isWorkspaceSwitchable`, `selectedWorkspaceSlug`, `availableProjectIds`, and `handleWorkspaceChange(slug: string)` are passed base → form; context clearing uses its existing setters.

- [ ] **Step 1: Add red assertions**

```js
assert.match(base, /const isWorkspaceSwitchable = !data\?\.id && !isDraft && !cycleId && !moduleId/);
assert.match(base, /setActiveProjectId\(availableProjectIds\[0\] \?\? null\)/);
assert.match(base, /createIssue\(selectedWorkspaceSlug, payload\.project_id, payload\)/);
assert.match(base, /<CreateIssueToastActionItems\s+workspaceSlug=\{selectedWorkspaceSlug\}/);
```

- [ ] **Step 2: Verify red** — Run focused test; expect scope and reset assertions to fail.
- [ ] **Step 3: Implement guarded local scope** — Initialize from route only on dialog open. Gate with new issue, not draft, no cycle/module/parent, and no `allowedProjectIds`. Fetch partial projects for selected slug, filter by that workspace and `getProjectsWithCreatePermissions`, then choose the first permitted ID. On change, clear `setActiveProjectId`, attachment IDs, parent/context properties, and workspace-bound form fields; preserve `name` and `description_html`. For this guarded branch use selected slug in create, file-status update, property values, parent work, and toast. Keep draft/update/cycle/module branches route-scoped and do not navigate after create.
- [ ] **Step 4: Verify green** — Run focused test; expect PASS.
- [ ] **Step 5: Commit** — stage only modal files and test; commit `feat: scope work item creation to selected workspace`.

### Task 5: Verify compatibility and quality

**Files:** Verify all modified files.

- [ ] **Step 1: Run behavior contracts**

```bash
node --test apps/web/tests/work-item-modal-workspace-scope.test.mjs apps/web/tests/work-item-property-selectors.test.mjs apps/web/tests/ui-refinements.test.mjs
```

Expected: all PASS, including selector containment and modal popup behavior.

- [ ] **Step 2: Run repository checks**

```bash
pnpm --filter ./apps/web check:format
pnpm --filter ./apps/web check:lint
pnpm --filter ./apps/web check:types
git diff --check
```

Expected: all exit 0; separately report unrelated pre-existing failures.

- [ ] **Step 3: Review spec boundaries and commit** — Confirm no router/global-workspace mutation, compatibility flows remain route-scoped, old IDs/attachments are cleared, and toast uses the selected slug. Stage only feature files and commit `test: verify work item workspace scope`.
