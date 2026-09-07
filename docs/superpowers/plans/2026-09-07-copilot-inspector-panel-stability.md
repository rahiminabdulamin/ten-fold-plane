# Copilot Inspector and Panel Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the assistant sidebar flicker by removing synthetic reopening and keeping CopilotSidebar inputs stable, while characterizing the optional Inspector metadata route.

**Architecture:** The browser no longer watches and clicks CopilotKit DOM nodes. It supplies stable sidebar slots and changes launcher placement through root CSS custom properties. The existing runtime handler continues to represent unavailable Inspector metadata as `204`, and a focused integration test protects that contract.

**Tech Stack:** React 19, TypeScript, CopilotKit 1.69, Vitest, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-07-copilot-inspector-panel-stability-design.md`

## Global Constraints

- Work in the current checkout.
- Add no dependency, observer, polling loop, synthetic click, or custom sidebar implementation.
- Preserve launcher dragging, width resizing, local-storage persistence, explicit close behavior, and identity authentication.
- Treat `CPK_INTELLIGENCE_API_KEY` remediation as deployment configuration, not a browser workaround.

---

### Task 1: Characterize the optional metadata endpoint

**Files:**

- Modify: `apps/copilot/src/server.test.ts`

**Interfaces:**

- Consumes: `createServer(config)` and a signed `Authorization: Bearer <token>` header.
- Produces: An authenticated `GET /api/copilotkit/inspector-metadata` response with status `200` or `204`.

- [ ] **Step 1: Write the failing test**

```ts
it("makes unavailable Inspector metadata an authenticated optional response", async () => {
  const response = await fetch(`${baseUrl}/api/copilotkit/inspector-metadata`, { headers });
  expect([200, 204]).toContain(response.status);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm --filter=@plane/copilot test -- server.test.ts`

Expected: FAIL because the metadata route is not yet characterized by the test.

- [ ] **Step 3: Keep the existing runtime handler unchanged**

The installed handler already converts an unavailable upstream Inspector response to `204`; no production-server wrapper is needed.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pnpm --filter=@plane/copilot test -- server.test.ts`

Expected: PASS.

### Task 2: Stabilize the sidebar view

**Files:**

- Modify: `apps/web/core/components/copilot/root.tsx`
- Modify: `apps/web/styles/globals.css`
- Modify: `apps/web/tests/ui-refinements.test.mjs`

**Interfaces:**

- Consumes: persisted `LauncherPosition` and existing `CopilotSidebar` slots.
- Produces: stable `header` and `toggleButton` inputs; root CSS properties `--copilot-launcher-left` and `--copilot-launcher-top`.

- [ ] **Step 1: Write the failing regression assertions**

```js
assert.doesNotMatch(copilot, /MutationObserver/);
assert.doesNotMatch(copilot, /chat-toggle-button.*click/);
assert.match(copilot, /useMemo\(\(\) => \(\{/);
assert.match(styles, /--copilot-launcher-left/);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test apps/web/tests/ui-refinements.test.mjs`

Expected: FAIL because the observer and synthetic click are still present.

- [ ] **Step 3: Implement the smallest lifecycle change**

```ts
const sidebarToggleButton = useMemo(
  () => ({ onPointerDown: startLauncherDrag, onClick: stopLauncherClick }),
  [startLauncherDrag, stopLauncherClick]
);
useEffect(
  () => document.documentElement.style.setProperty("--copilot-launcher-left", `${launcherPosition.x}px`),
  [launcherPosition]
);
```

Remove the observer/reopen effect; use CSS custom properties for the launcher coordinates and memoized slots for the sidebar.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test apps/web/tests/ui-refinements.test.mjs`

Expected: PASS.

### Task 3: Verify integrated behavior

**Files:**

- Verify: `apps/copilot/src/server.test.ts`
- Verify: `apps/web/tests/ui-refinements.test.mjs`
- Verify: `apps/web/core/components/copilot/root.tsx`

- [ ] **Step 1: Run focused suites**

Run: `pnpm --filter=@plane/copilot test && node --test apps/web/tests/ui-refinements.test.mjs`

Expected: PASS.

- [ ] **Step 2: Run type checks**

Run: `pnpm --filter=@plane/copilot check:types && pnpm --filter=@plane/web check:types`

Expected: PASS.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff --check && git diff -- apps/copilot/src/server.test.ts apps/web/core/components/copilot/root.tsx apps/web/styles/globals.css apps/web/tests/ui-refinements.test.mjs`

Expected: no whitespace errors; only the scoped lifecycle and test changes.
