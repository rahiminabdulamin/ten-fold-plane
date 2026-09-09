# Copilot Launcher Mount Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reset the floating assistant launcher to its gutter-aware bottom-right default on every whole-page mount or remount.

**Architecture:** `PlaneTools` will retain its live React state and existing drag handler, but its initialization effect will clear `tenfold-copilot-launcher-position` and set `launcherPosition` from `getDefaultLauncherPosition()`. The existing panel-width restoration remains separate and unchanged.

**Tech Stack:** React, TypeScript, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-10-copilot-launcher-mount-reset-design.md`

## Global Constraints

- Work in the current checkout.
- Add no dependencies or reusable abstraction.
- Preserve in-page launcher dragging and panel-width persistence.
- Reset only on a fresh `PlaneTools` mount/remount.

---

### Task 1: Reset launcher placement during mount initialization

**Files:**

- Modify: `apps/web/core/components/copilot/root.tsx`
- Modify: `apps/web/tests/ui-refinements.test.mjs`

**Interfaces:**

- Consumes: `getDefaultLauncherPosition(): LauncherPosition` and `COPILOT_LAUNCHER_POSITION_STORAGE_KEY`.
- Produces: mount initialization that removes the saved launcher-position key and calls `setLauncherPosition(getDefaultLauncherPosition())`.

- [x] **Step 1: Write the failing regression assertion**

```js
assert.match(
  copilot,
  /window\.localStorage\.removeItem\(COPILOT_LAUNCHER_POSITION_STORAGE_KEY\);\s*setLauncherPosition\(getDefaultLauncherPosition\(\)\);/
);
assert.doesNotMatch(
  copilot,
  /const storedPosition = window\.localStorage\.getItem\(COPILOT_LAUNCHER_POSITION_STORAGE_KEY\)/
);
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `node --test apps/web/tests/ui-refinements.test.mjs`

Expected: FAIL because initialization still reads and restores persisted launcher coordinates.

- [x] **Step 3: Implement the minimal initialization change**

```tsx
window.localStorage.removeItem(COPILOT_LAUNCHER_POSITION_STORAGE_KEY);
setLauncherPosition(getDefaultLauncherPosition());
```

Remove only the old `storedPosition` parse/restore branch. Keep the panel-width branch and the drag persistence effect unchanged.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `node --test apps/web/tests/ui-refinements.test.mjs`

Expected: PASS with zero failures.

### Task 2: Verify the complete change

**Files:**

- Verify: `apps/web/core/components/copilot/root.tsx`
- Verify: `apps/web/tests/ui-refinements.test.mjs`

- [x] **Step 1: Run focused regression tests**

Run: `node --test apps/web/tests/ui-refinements.test.mjs`

Expected: PASS with zero failures.

- [x] **Step 2: Run the web type check**

Run: `pnpm --filter ./apps/web check:types`

Expected: exit code 0.

- [x] **Step 3: Review the diff against the specification**

Confirm the launcher starts bottom-right after every mount, prior persisted launcher coordinates cannot be restored, and panel-width persistence plus in-page dragging are unchanged.
