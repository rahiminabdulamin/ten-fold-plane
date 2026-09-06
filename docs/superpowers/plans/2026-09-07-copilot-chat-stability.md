# Copilot Chat Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Copilot sidebar open through recoverable failures and make its 14px chat UI compact and stable while composing.

**Architecture:** `PlaneTools` tracks whether the uncontrolled CopilotKit sidebar was deliberately closed and reopens it only after an unexpected hide. `PlaneCopilot` retains the last successful identity token while its refresh loop retries failures. CSS supplies a narrowly scoped 14px type scale and stable composer dimensions without changing CopilotKit itself.

**Tech Stack:** React, TypeScript, CopilotKit v2, CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-07-copilot-chat-stability-design.md`

## Global Constraints

- Work in the current checkout.
- Add no dependency or generalized UI abstraction.
- Preserve deliberate sidebar close behavior.
- Use 14px for chat content and controls; retain 12px only for secondary metadata.

---

### Task 1: Preserve sidebar intent and recover identity refresh

**Files:**

- Modify: `apps/web/core/components/copilot/root.tsx`
- Test: `apps/web/tests/ui-refinements.test.mjs`

**Interfaces:**

- Produces: `preserveSidebarOpen: React.RefObject<boolean>` used by the mutation observer and explicit close-button capture handler.
- Produces: a refresh failure path that keeps the existing `token` and schedules `refresh` after 5 seconds.

- [ ] **Step 1: Write the failing regression assertions**

```js
assert.match(copilot, /const preserveSidebarOpen = useRef\(false\)/);
assert.match(copilot, /data-testid="copilot-close-button"/);
assert.match(copilot, /chat-toggle-button/);
assert.match(copilot, /catch \{[\s\S]*window\.setTimeout\(refresh, 5_000\)/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test apps/web/tests/ui-refinements.test.mjs`

Expected: FAIL because preserved sidebar intent and the retry catch are absent.

- [ ] **Step 3: Add the minimal state and retry implementation**

```tsx
const preserveSidebarOpen = useRef(false);
// Clear it only for CopilotKit's explicit close button.
// Reopen the toggle only when the sidebar becomes hidden unexpectedly.
```

```ts
try {
  const response = await fetch(/* identity endpoint */);
  if (!response.ok) throw new Error("Copilot identity refresh failed");
  // retain existing success behavior
} catch {
  if (!cancelled) refreshTimer = window.setTimeout(refresh, 5_000);
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test apps/web/tests/ui-refinements.test.mjs`

Expected: PASS.

### Task 2: Normalize compact typography, spacing, and composer size

**Files:**

- Modify: `apps/web/styles/globals.css`
- Test: `apps/web/tests/ui-refinements.test.mjs`

**Interfaces:**

- Produces: scoped `font-size: 14px` rules for CopilotKit message descendants and compact bubble/layout rules.
- Produces: stable textarea `box-sizing`, `min-height`, `max-height`, and `resize` rules.

- [ ] **Step 1: Write the failing regression assertions**

```js
assert.match(
  styles,
  /\[data-copilotkit\] \[data-testid\^="copilot-"\]\[data-testid\$="-message"\][\s\S]*font-size:\s*14px/
);
assert.match(styles, /min-height:\s*40px !important/);
assert.match(styles, /max-height:\s*160px !important/);
assert.match(styles, /resize:\s*none !important/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test apps/web/tests/ui-refinements.test.mjs`

Expected: FAIL because the compact message and stable-composer hooks are absent.

- [ ] **Step 3: Add the smallest scoped CSS overrides**

```css
[data-copilotkit] [data-testid^="copilot-"][data-testid$="-message"] {
  font-size: 14px;
  line-height: 1.45;
}

[data-copilotkit] textarea {
  box-sizing: border-box;
  min-height: 40px !important;
  max-height: 160px !important;
  resize: none !important;
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test apps/web/tests/ui-refinements.test.mjs`

Expected: PASS.

### Task 3: Verify the complete change

**Files:**

- Verify: `apps/web/core/components/copilot/root.tsx`
- Verify: `apps/web/styles/globals.css`
- Verify: `apps/web/tests/ui-refinements.test.mjs`

- [ ] **Step 1: Run focused regression tests**

Run: `node --test apps/web/tests/ui-refinements.test.mjs`

Expected: PASS with zero failures.

- [ ] **Step 2: Run the web type check**

Run: `pnpm --filter ./apps/web check:types`

Expected: exit code 0.

- [ ] **Step 3: Review the diff against the specification**

Verify preserved sidebar intent, refresh retry, 14px text, reduced spacing, and stable composer dimensions are each present with no unrelated changes.
