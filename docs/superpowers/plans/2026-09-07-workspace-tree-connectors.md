# Workspace Tree Connectors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give workspace rows in the main sidebar a subtle tree connector that makes the Team → Workspace hierarchy immediately legible.

**Architecture:** Keep all existing workspace data, navigation, disclosure, and drag-and-drop behavior unchanged. Add one presentational rail to the expanded workspace-list panel and use the existing `isLastChild` row information to end the final connector cleanly.

**Tech Stack:** React, TypeScript, Tailwind CSS, Node test runner.

**Spec:** In-chat specification from the 2026-09-07 request.

## Global Constraints

- Preserve existing routes, labels, drag-and-drop behavior, and accordion behavior.
- Use CSS/Tailwind only; add no component, client state, or dependency.
- Render connectors only while the workspace list disclosure is expanded.

---

### Task 1: Main Sidebar Workspace Tree

**Files:**

- Modify: `apps/web/core/components/workspace/sidebar/projects-list.tsx`
- Modify: `apps/web/core/components/workspace/sidebar/projects-list-item.tsx`
- Test: `apps/web/tests/workspace-tree-connectors.test.mjs`

**Interfaces:**

- Consumes: `isLastChild` already passed from `SidebarProjectsList` to each `SidebarProjectsListItem`.
- Produces: expanded sidebar workspace rows positioned against a shared vertical rail, with a final-row rail cutoff.

- [ ] **Step 1: Write the failing test**

```js
assert.match(projectsList, /workspace-tree-connector/);
assert.match(projectRow, /workspace-tree-branch/);
assert.match(projectRow, /isLastChild && "bottom-1\/2"/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test apps/web/tests/workspace-tree-connectors.test.mjs`

Expected: FAIL because the tree connector markup is absent.

- [ ] **Step 3: Write minimal implementation**

Add one absolute, pointer-inert vertical rail to the expanded projects panel. Add an absolute horizontal branch to each project row and use `isLastChild` to cover the rail below its final branch.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test apps/web/tests/workspace-tree-connectors.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run project verification**

Run: `pnpm --filter=web check:types && pnpm --filter=web check:lint`

Expected: both commands exit 0.
