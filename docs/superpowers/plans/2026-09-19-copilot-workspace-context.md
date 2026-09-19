# Copilot Workspace Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Give the Ten-Fold Assistant a visible Workspace selector whose active value supplies the default context for Workspace-scoped work-item operations.

**Architecture:** Keep selection state inside PlaneTools, where route parameters, the Copilot sidebar header, and frontend tools already meet. A small pure helper owns selection transitions and target resolution; useAgentContext sends selected Workspace details to CopilotKit. Spreadsheet tools retain their route-bound safety boundary.

**Tech Stack:** React 19, React Router, CopilotKit v2, @plane/ui CustomSearchSelect, existing ProjectService, Zod, Vitest, TypeScript.

**Spec:** docs/superpowers/specs/2026-09-19-copilot-workspace-context-design.md

## Global Constraints

- Use Team and Workspace in user-facing copy; retain legacy workspace/project terms only in route, API, and tool parameters.
- Reuse CustomSearchSelect, ProjectService.getProjectsLite, and CopilotKit v2 useAgentContext; add no dependency, global store, or persistence.
- Selecting a Workspace does not navigate; a valid Workspace-route navigation replaces a manual selection.
- Never select an arbitrary Workspace when multiple choices exist.
- An explicit projectId for a Workspace named by the user takes precedence only for that tool call.
- Spreadsheet operations remain bound to their open route Workspace and spreadsheet.
- Preserve existing mutation guards, event/task/work-item rules, and recurring-work-item behavior.

## Review Focus

- Manual override followed by Workspace navigation must use the new route ID, not the old selected ID.
- A non-Workspace route must retain a valid selection but never resurrect a stale or cross-Team ID.
- Multiple Workspaces without a route or manual choice must remain unselected.
- Explicit named-Workspace requests must work without changing selector state.
- Destructive and spreadsheet actions must not be redirected by a selector change.

## File Structure

- Create: apps/web/core/components/copilot/workspace-context.ts — pure selection and per-call target-resolution rules.
- Create: apps/web/core/components/copilot/workspace-context.test.ts — Vitest tests for selection and precedence.
- Modify: apps/web/core/components/copilot/root.tsx — local state, selector, CopilotKit context, and eligible tool resolution.
- Modify: apps/copilot/src/runtime.ts — selected-UI-context policy.
- Modify: apps/copilot/src/runtime.test.ts — policy assertions.

### Task 1: Pure Workspace Context Contract

**Files:**

- Create: apps/web/core/components/copilot/workspace-context.ts
- Create: apps/web/core/components/copilot/workspace-context.test.ts

**Interfaces:**

- Produces WorkspaceOption, resolveSelectedWorkspaceId, and resolveWorkspaceToolTarget.
- Consumes route projectId, current selected ID, and accessible Workspace IDs; no React or service dependency.

- [ ] **Step 1: Write the failing selection tests**

```ts
import { describe, expect, it } from "vitest";

import { resolveSelectedWorkspaceId, resolveWorkspaceToolTarget } from "./workspace-context";

describe("Copilot Workspace context", () => {
  const availableIds = ["workspace-a", "workspace-b"];

  it("uses a valid Workspace route over a manual selection", () => {
    expect(
      resolveSelectedWorkspaceId({ routeProjectId: "workspace-b", selectedProjectId: "workspace-a", availableIds })
    ).toBe("workspace-b");
  });

  it("keeps a valid manual selection away from a Workspace route", () => {
    expect(
      resolveSelectedWorkspaceId({ routeProjectId: undefined, selectedProjectId: "workspace-b", availableIds })
    ).toBe("workspace-b");
  });

  it("selects exactly one Workspace and never guesses among many", () => {
    expect(
      resolveSelectedWorkspaceId({ routeProjectId: undefined, selectedProjectId: undefined, availableIds: ["only"] })
    ).toBe("only");
    expect(
      resolveSelectedWorkspaceId({ routeProjectId: undefined, selectedProjectId: undefined, availableIds })
    ).toBeNull();
  });

  it("clears inaccessible IDs and uses an explicit target for one call", () => {
    expect(
      resolveSelectedWorkspaceId({ routeProjectId: "missing", selectedProjectId: "workspace-a", availableIds })
    ).toBeNull();
    expect(resolveWorkspaceToolTarget("workspace-b", "workspace-a")).toBe("workspace-b");
    expect(resolveWorkspaceToolTarget(undefined, "workspace-a")).toBe("workspace-a");
    expect(resolveWorkspaceToolTarget(undefined, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: pnpm exec vitest run apps/web/core/components/copilot/workspace-context.test.ts

Expected: FAIL because workspace-context.ts does not exist.

- [ ] **Step 3: Implement the minimal pure contract**

```ts
export type WorkspaceOption = { id: string; name: string; identifier: string | null };

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
```

Add tests for an empty list and stale selected ID. Keep this helper free of React, API calls, and UI types.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: pnpm exec vitest run apps/web/core/components/copilot/workspace-context.test.ts

Expected: PASS for route precedence, manual retention, sole-Workspace fallback, no multi-Workspace guess, stale-ID clearing, and explicit per-call precedence.

- [ ] **Step 5: Commit**

```bash
git add apps/web/core/components/copilot/workspace-context.ts apps/web/core/components/copilot/workspace-context.test.ts
git commit -m "feat: add copilot workspace context rules"
```

### Task 2: Sidebar Selector and Model Context

**Files:**

- Modify: apps/web/core/components/copilot/root.tsx
- Test: apps/web/core/components/copilot/workspace-context.test.ts

**Interfaces:**

- Consumes Task 1's helper and WorkspaceOption.
- Produces selectedProjectId: string | null, the selector display record, and the serialized CopilotKit context.

- [ ] **Step 1: Extend the pure tests for display-context shape**

```ts
it("serializes selected Workspace context without an ID when no option is selected", () => {
  const selected = undefined;
  expect({
    teamSlug: "tenfold",
    workspaceId: selected?.id ?? null,
    workspaceName: selected?.name ?? null,
    workspaceIdentifier: selected?.identifier ?? null,
  }).toEqual({
    teamSlug: "tenfold",
    workspaceId: null,
    workspaceName: null,
    workspaceIdentifier: null,
  });
});
```

- [ ] **Step 2: Implement state, route synchronization, selector, and agent context**

1. Import CustomSearchSelect, ICustomSearchSelectOption, useAgentContext, and Task 1's helpers.
2. Add workspaceOptions, isWorkspaceOptionsLoading, and selectedProjectId local state to PlaneTools.
3. Fetch projectService.getProjectsLite(workspace) in an effect that ignores late results after unmount or Team change; map id, name, and identifier to WorkspaceOption.
4. On fetched option, Team, route-ID, and selected-ID changes, calculate resolveSelectedWorkspaceId with routeProjectId: projectId, selectedProjectId, and available IDs; update only if different.
5. Derive selectedWorkspace by ID and publish exactly this useAgentContext payload:

```ts
{
  description: "The selected UI Workspace is the authoritative default for unqualified work-item requests.",
  value: {
    teamSlug: workspace,
    workspaceId: selectedWorkspace?.id ?? null,
    workspaceName: selectedWorkspace?.name ?? null,
    workspaceIdentifier: selectedWorkspace?.identifier ?? null,
  },
}
```

6. Update the current custom header from one row to two. The second row has a visible Workspace label and compact CustomSearchSelect, with a Choose Workspace fallback, loading/disabled state, and existing close-button behavior. Its onChange only calls setSelectedProjectId; it never pushes a route.
7. Do not add a global store, new endpoint, or local-storage entry.

- [ ] **Step 3: Verify types and formatting**

Run: pnpm exec oxfmt --check apps/web/core/components/copilot/root.tsx apps/web/core/components/copilot/workspace-context.ts apps/web/core/components/copilot/workspace-context.test.ts && pnpm --filter=web check:types

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/core/components/copilot/root.tsx apps/web/core/components/copilot/workspace-context.test.ts
git commit -m "feat: add copilot workspace selector"
```

### Task 3: Selected-Workspace Tool Resolution

**Files:**

- Modify: apps/web/core/components/copilot/root.tsx
- Test: apps/web/core/components/copilot/workspace-context.test.ts

**Interfaces:**

- Consumes resolveWorkspaceToolTarget(requestedProjectId, selectedProjectId).
- Produces a selected-context default without changing existing public Zod parameters.

- [ ] **Step 1: Add explicit-target-does-not-mutate-selection test**

```ts
it("allows a named Workspace for one tool call without changing selection", () => {
  const selectedProjectId = "workspace-a";
  expect(resolveWorkspaceToolTarget("workspace-b", selectedProjectId)).toBe("workspace-b");
  expect(selectedProjectId).toBe("workspace-a");
});
```

- [ ] **Step 2: Update each eligible tool to resolve selected context**

For list_month_events, get_work_item_schema, list_work_items, create_work_item, create_work_items, and create_recurring_work_items, replace:

```ts
const targetProjectId = requestedProjectId ?? projectId;
```

with:

```ts
const targetProjectId = resolveWorkspaceToolTarget(requestedProjectId, selectedProjectId);
```

Update their dependencies to include selectedProjectId and update validation copy to say selected Workspace / Select a Workspace first.

For get_work_item, open_work_item, update_work_item, and confirm_delete_work_item, use selectedProjectId for retrieval, navigation, mutation fingerprint, deletion verification, and hook dependencies. Capture that ID in the confirmation closure at render time.

Do not change change_spreadsheet or query_spreadsheet; they retain route projectId and spreadsheetId. Do not change Workspace administration tools.

- [ ] **Step 3: Run focused web verification**

```bash
pnpm exec vitest run apps/web/core/components/copilot/workspace-context.test.ts apps/web/core/components/copilot/tool-contracts.test.ts apps/web/core/components/copilot/tool-reliability.test.ts
pnpm --filter=web check:types
pnpm exec oxlint apps/web/core/components/copilot/root.tsx apps/web/core/components/copilot/workspace-context.ts apps/web/core/components/copilot/workspace-context.test.ts --deny-warnings
```

Expected: all commands exit 0, including existing recurrence and mutation safety tests.

- [ ] **Step 4: Commit**

```bash
git add apps/web/core/components/copilot/root.tsx apps/web/core/components/copilot/workspace-context.test.ts
git commit -m "feat: scope copilot work-item tools to selected workspace"
```

### Task 4: Runtime Policy and Final Verification

**Files:**

- Modify: apps/copilot/src/runtime.ts
- Modify: apps/copilot/src/runtime.test.ts
- Review: apps/copilot/src/evals/scenarios.test.ts

**Interfaces:**

- Consumes selected UI context supplied by CopilotKit.
- Produces policy that uses selected UI Workspace for unqualified requests.

- [ ] **Step 1: Write failing runtime-policy assertions**

Replace obsolete open-page policy assertions with:

```ts
expect(DEFAULT_AGENT_PROMPT).toContain("selected UI Workspace");
expect(DEFAULT_AGENT_PROMPT).toContain("do not call list_projects or ask the user to choose");
expect(DEFAULT_AGENT_PROMPT).toContain("explicitly names a different Workspace");
expect(DEFAULT_AGENT_PROMPT).not.toContain("do not infer a Workspace from the open page");
```

- [ ] **Step 2: Run runtime test to verify it fails**

Run: pnpm --filter=@plane/copilot test -- runtime.test.ts

Expected: FAIL because old Workspace policy remains.

- [ ] **Step 3: Replace stale runtime policy minimally**

Replace the instruction requiring list_projects whenever a request lacks a Workspace name. Direct the agent to use valid selected UI Workspace context, avoid list_projects and clarification when it exists, resolve explicitly named different Workspaces through find_project, and ask for selection only when neither source provides context.

Leave recurrence, schema, mutation, event/task/work-item synonym, and factual-grounding instructions unchanged. Retain evaluation scenarios that explicitly name a Workspace; add no artificial UI-context eval unless its harness can pass CopilotKit context.

- [ ] **Step 4: Run complete automated verification**

```bash
pnpm --filter=@plane/copilot test
pnpm exec vitest run apps/web/core/components/copilot/workspace-context.test.ts apps/web/core/components/copilot/tool-contracts.test.ts apps/web/core/components/copilot/tool-reliability.test.ts
pnpm --filter=@plane/copilot check:types
pnpm --filter=web check:types
pnpm exec oxfmt --check apps/copilot/src/runtime.ts apps/copilot/src/runtime.test.ts apps/web/core/components/copilot/root.tsx apps/web/core/components/copilot/workspace-context.ts apps/web/core/components/copilot/workspace-context.test.ts
pnpm exec oxlint apps/copilot/src/runtime.ts apps/copilot/src/runtime.test.ts apps/web/core/components/copilot/root.tsx apps/web/core/components/copilot/workspace-context.ts apps/web/core/components/copilot/workspace-context.test.ts --deny-warnings
```

Expected: every command exits 0.

- [ ] **Step 5: Perform authenticated browser acceptance checks**

1. Open Copilot on Workspace A; selector visibly displays A.
2. Select B; list or create an unnamed work item and verify it uses B while the page remains A.
3. Navigate to Workspace C; selector switches to C.
4. Navigate to a non-Workspace page; valid selection remains.
5. Open a spreadsheet in A, select B, and verify spreadsheet query/change remains tied to A.
6. Explicitly name B while A is selected; verify the request resolves B only for that call and selector remains A.

- [ ] **Step 6: Commit**

```bash
git add apps/copilot/src/runtime.ts apps/copilot/src/runtime.test.ts apps/copilot/src/evals/scenarios.test.ts
git commit -m "fix: default copilot to selected workspace context"
```

## Final Review

- [ ] Confirm every acceptance criterion in docs/superpowers/specs/2026-09-19-copilot-workspace-context-design.md has a tested implementation.
- [ ] Run git diff HEAD~4..HEAD --check and git status --short; exclude unrelated changes.
- [ ] Record passing command output in the implementation handoff.
