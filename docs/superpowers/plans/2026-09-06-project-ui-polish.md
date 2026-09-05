# Project UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide remaining project emoji and disabled planning settings, fit sidebar legal links, and anchor shared select popovers to their triggers.

**Architecture:** Reuse the existing feature-visibility constant at the Project Settings navigation boundary. Remove only presentational project-logo nodes and their imports. Fix the two shared Combobox wrappers by making their existing buttons the reference elements that Popper positions against.

**Tech Stack:** React, TypeScript, Headless UI Combobox, react-popper, Tailwind CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-06-project-ui-polish-design.md`

## Global Constraints

- Keep project logo metadata, Cycles, and Modules implementations intact.
- Add no dependencies or abstractions.
- Work in the current checkout and preserve unrelated changes.

---

### Task 1: Hide remaining project chrome and disabled settings

**Files:**
- Modify: `apps/web/core/components/navigation/project-header-button.tsx`
- Modify: `apps/web/core/components/settings/project/sidebar/header.tsx`
- Modify: `apps/web/core/components/settings/project/sidebar/item-categories.tsx`
- Modify: `apps/web/core/components/sidebar/sidebar-wrapper.tsx`
- Test: `apps/web/tests/ten-fold-rebrand.test.mjs`

- [ ] **Step 1: Write the failing regression assertions**

Assert the two headers do not render `Logo`, the settings sidebar filters disabled feature keys using `FEATURE_VISIBILITY`, and the legal footer uses `text-[10px]`, compact gaps, and `whitespace-nowrap`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test --test-name-pattern='project UI polish' apps/web/tests/ten-fold-rebrand.test.mjs`

Expected: FAIL because project header logo nodes, settings filtering, and compact footer styles are absent.

- [ ] **Step 3: Implement the minimal display changes**

Remove `Logo` imports and wrapper nodes from the two headers. In `item-categories.tsx`, filter each category item with `FEATURE_VISIBILITY` only for `features_cycles` and `features_modules`. Use the existing `FEATURE_VISIBILITY.CYCLES` and `FEATURE_VISIBILITY.MODULES` booleans. Change the footer class to `gap-1.5 px-2 text-[10px] whitespace-nowrap`.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test --test-name-pattern='project UI polish' apps/web/tests/ten-fold-rebrand.test.mjs`

Expected: PASS.

### Task 2: Repair shared Combobox Popper anchors

**Files:**
- Modify: `packages/ui/src/dropdowns/custom-select.tsx`
- Modify: `packages/ui/src/dropdowns/custom-search-select.tsx`
- Test: `apps/web/tests/ten-fold-rebrand.test.mjs`

- [ ] **Step 1: Extend the failing regression assertions**

Assert both shared dropdown files render `Combobox.Button` with `ref={setReferenceElement}` and do not use `as={React.Fragment}` around their trigger buttons.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test --test-name-pattern='project UI polish' apps/web/tests/ten-fold-rebrand.test.mjs`

Expected: FAIL because both components currently place the Popper reference on a button nested inside a fragment wrapper.

- [ ] **Step 3: Implement the direct trigger references**

Replace each fragment-wrapped trigger with `Combobox.Button` itself. Preserve every existing button class, `type="button"`, click handler, label, disabled state, and chevron.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test --test-name-pattern='project UI polish' apps/web/tests/ten-fold-rebrand.test.mjs`

Expected: PASS.

### Task 3: Verify the complete change

**Files:**
- Test: `apps/web/tests/ten-fold-rebrand.test.mjs`

- [ ] **Step 1: Format changed files**

Run: `pnpm --filter=web fix:format -- core/components/navigation/project-header-button.tsx core/components/settings/project/sidebar/header.tsx core/components/settings/project/sidebar/item-categories.tsx core/components/sidebar/sidebar-wrapper.tsx ../../packages/ui/src/dropdowns/custom-select.tsx ../../packages/ui/src/dropdowns/custom-search-select.tsx tests/ten-fold-rebrand.test.mjs`

- [ ] **Step 2: Run regression and static checks**

Run: `node --test apps/web/tests/ten-fold-rebrand.test.mjs && pnpm --filter=web check:types && git diff --check`

Expected: all tests pass, TypeScript exits zero, and the diff has no whitespace errors.
