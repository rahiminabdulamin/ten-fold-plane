# Copilot Backlog Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the assistant accurately retrieve work items for a named project's requested state bucket.

**Architecture:** The existing browser-side frontend tool remains the only authenticated Plane API boundary. A small pure helper builds the supported issue query and shapes the returned state group, while the runtime prompt requires the agent to use that filter before answering.

**Tech Stack:** React, TypeScript, Zod, Vitest, CopilotKit v2.

**Spec:** `docs/superpowers/specs/2026-09-06-copilot-backlog-reliability-design.md`

## Global Constraints

- Use Plane's existing `state_group` query parameter; do not add a backend endpoint or dependency.
- Preserve canonical project-ID resolution, 20-item cap, and safe tool-result envelopes.
- Empty-result claims require a successful filtered tool response.

---

### Task 1: Testable filtered work-item contract

**Files:**

- Modify: `apps/web/core/components/copilot/tool-contracts.ts`
- Create: `apps/web/core/components/copilot/tool-contracts.test.ts`

**Interfaces:**

- Produces: `buildWorkItemQuery(stateGroup?)` and `toWorkItemRecords(issues)` for the frontend tool.

- [ ] **Step 1: Write the failing tests**

```ts
expect(buildWorkItemQuery("backlog")).toEqual({ per_page: "20", state_group: "backlog" });
expect(toWorkItemRecords([{ id: "i1", name: "Backlog item", sequence_id: 3, state: { group: "backlog" } }])).toEqual([
  { id: "i1", name: "Backlog item", sequence_id: 3, state_group: "backlog" },
]);
```

- [ ] **Step 2: Run the focused test and observe the missing-export failure**

Run: `pnpm --filter web vitest run core/components/copilot/tool-contracts.test.ts`

- [ ] **Step 3: Implement the smallest pure helpers**

```ts
export function buildWorkItemQuery(stateGroup?: WorkItemStateGroup) {
  return { per_page: "20", ...(stateGroup ? { state_group: stateGroup } : {}) };
}
```

- [ ] **Step 4: Re-run the focused test and verify it passes**

Run: `pnpm --filter web vitest run core/components/copilot/tool-contracts.test.ts`

### Task 2: Connect the typed state bucket to the agent tool

**Files:**

- Modify: `apps/web/core/components/copilot/root.tsx`
- Modify: `apps/copilot/src/runtime.ts`

**Interfaces:**

- Consumes: `buildWorkItemQuery(stateGroup?)`, `toWorkItemRecords(issues)`.
- Produces: `list_work_items({ projectId?, stateGroup? })` with an API-filtered result.

- [ ] **Step 1: Replace the inline query and record mapping**

```ts
parameters: z.object({
  projectId: z.string().uuid().optional(),
  stateGroup: z.enum(["backlog", "unstarted", "started", "completed", "cancelled"]).optional(),
});
const response = await issueService.getIssues(workspace, targetProjectId, buildWorkItemQuery(stateGroup));
```

- [ ] **Step 2: Strengthen the runtime instruction**

Require the named-project/state-bucket flow to call `find_project`, then `list_work_items` with the matching `stateGroup`, and prohibit unsupported empty-result claims.

- [ ] **Step 3: Run focused tests and type check**

Run: `pnpm --filter web vitest run core/components/copilot/tool-contracts.test.ts && pnpm --filter web check:types && pnpm --filter @plane/copilot test`

### Task 3: Final verification

**Files:** no additional files.

- [ ] **Step 1: Review the scoped diff**

Run: `git diff --check && git diff -- apps/web/core/components/copilot apps/copilot/src/runtime.ts docs/superpowers/specs/2026-09-06-copilot-backlog-reliability-design.md docs/superpowers/plans/2026-09-06-copilot-backlog-reliability.md`

- [ ] **Step 2: Report test output and the original-query coverage**

Confirm the Backlog query test proves the endpoint receives `state_group=backlog` and the output retains that state group.
