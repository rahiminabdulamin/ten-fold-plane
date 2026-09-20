# Mobile Sidebar Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the primary project sidebar a mobile-only overlay so it no longer narrows workspace content.

**Architecture:** Use responsive Tailwind positioning in the existing `ResizableSidebar`. The base class creates the fixed mobile layer; `md:` utilities restore the current desktop flow, avoiding a device-detection branch or new overlay component.

**Tech Stack:** React, TypeScript, Tailwind CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-20-mobile-sidebar-overlay-design.md`

## Global Constraints

- Fixed overlay behavior applies only below `md`.
- The sidebar remains a normal layout sibling from `md` upward.
- Do not add dependencies, state, portals, or a second sidebar implementation.

## Review Focus

- A resized desktop browser at a narrow viewport gets overlay behavior without depending on its operating-system classification.
- Desktop keeps the current normal flex layout and does not receive fixed positioning.
- The collapsed transform still slides the panel off-screen.
- Existing sidebar semantics and outside-click marker remain available.
- The change does not alter stored sidebar width or resize behavior.

## File Structure

- Modify `apps/web/core/components/sidebar/resizable-sidebar.tsx`: express mobile overlay positioning through responsive classes.
- Create `apps/web/tests/mobile-sidebar-overlay.test.mjs`: pin the breakpoint classes that protect layout behavior.

### Task 1: Make the sidebar a viewport-responsive mobile layer

**Files:**

- Modify: `apps/web/core/components/sidebar/resizable-sidebar.tsx:180-190`
- Create: `apps/web/tests/mobile-sidebar-overlay.test.mjs`

**Interfaces:**

- Consumes: the existing `isCollapsed`, width style, and sidebar children.
- Produces: a fixed `#main-sidebar` below `md` and a relative sibling at `md` and wider.

- [ ] **Step 1: Write the failing regression test**

```js
assert.match(sidebar, /"fixed top-10 bottom-0 left-0 z-\[40\] md:relative md:inset-auto md:z-20"/);
assert.doesNotMatch(sidebar, /isMobile && "fixed/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test apps/web/tests/mobile-sidebar-overlay.test.mjs`

Expected: FAIL because the component gates fixed positioning on `isMobile`.

- [ ] **Step 3: Implement the smallest responsive change**

Remove `usePlatformOS` from `ResizableSidebar` and replace the conditional fixed-position class with the exact responsive class string from Step 1. Retain all existing collapsed, width, accessibility, and transition classes.

- [ ] **Step 4: Run focused verification**

Run: `node --test apps/web/tests/mobile-sidebar-overlay.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run type verification**

Run: `pnpm --filter web check:types`

Expected: PASS.

## Final verification

- [ ] Run: `node --test apps/web/tests/mobile-sidebar-overlay.test.mjs && pnpm --filter web check:types && git diff --check`

Expected: the regression test and web typecheck pass, with no whitespace errors.
