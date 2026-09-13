# Dropdown Interaction Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make work-item property popovers open beside their triggers and allow search, pointer selection, keyboard selection, and calendar selection across supported layouts.

**Architecture:** Headless UI owns the interaction state for each property combobox. The Popper-bound options surface owns only viewport placement and is rendered outside transformed table/board containers. Property wrappers stop propagation to prevent row navigation but never cancel the trigger activation event.

**Tech Stack:** React, Headless UI Combobox, react-popper, React portals, Playwright CLI, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-13-dropdown-interaction-ownership.md`

## Global Constraints

- Do not add dependencies or change project data, permissions, or styles unrelated to property popovers.
- Keep cancellation on destructive actions, clear buttons, and navigation links.
- Verify visible trigger-to-popup placement and real input/selection behavior in a browser before committing.

---

### Task 1: Establish the property-options rendering contract

**Files:**

- Modify: `packages/ui/src/dropdowns/combo-box.tsx`
- Modify: `apps/web/core/components/issues/issue-layouts/properties/label-dropdown.tsx`
- Test: authenticated Playwright label-property flow

**Interfaces:**

- Consumes: `ComboDropDown` button and child options nodes.
- Produces: one Headless UI interaction owner and a Popper-positioned options element that can be portaled without losing combobox context.

- [ ] **Step 1: Capture the failing browser case**

Run the label trigger in table layout, then assert that the visible search input lies directly below the trigger and that `elementFromPoint` on an option resolves to the option rather than the table/listbox shell.

- [ ] **Step 2: Verify the failure**

Expected before implementation: the menu is absent, offset, or its option is covered by another element.

- [ ] **Step 3: Implement the minimal ownership correction**

Remove custom click-default cancellation from the label trigger. Make the options node itself the Popper node, use fixed strategy, and portal that same node to `document.body`; do not place a Popper child inside a separate fixed options shell.

- [ ] **Step 4: Verify browser behavior**

Open the label menu, type `admin`, click the visible result, and assert the label appears in the row. Then reopen and use ArrowDown + Enter to confirm keyboard selection.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/dropdowns/combo-box.tsx apps/web/core/components/issues/issue-layouts/properties/label-dropdown.tsx
git commit -m "fix: unify label dropdown interaction ownership"
```

### Task 2: Migrate shared date and date-range property popovers

**Files:**

- Modify: `apps/web/core/components/dropdowns/date.tsx`
- Modify: `apps/web/core/components/dropdowns/date-range.tsx`
- Test: authenticated Playwright due-date and date-range flows

**Interfaces:**

- Consumes: the Task 1 ownership pattern.
- Produces: calendar options positioned from the visible date trigger and selectable by pointer.

- [ ] **Step 1: Capture failing calendar placement**

Open a due-date calendar from a table cell and compare the trigger and calendar bounding boxes. Repeat for a range dropdown where available.

- [ ] **Step 2: Verify the failure**

Expected before implementation: a calendar can mount in a transformed/overflow container rather than beside its trigger.

- [ ] **Step 3: Implement the same options contract**

Attach the Popper ref/styles/attributes to the `Combobox.Options` surface, use fixed strategy, and portal that exact surface to `document.body`. Keep calendar callbacks and clear-button cancellation unchanged.

- [ ] **Step 4: Verify browser behavior**

Choose September 15 from the due-date calendar and assert the row shows `Sep 15, 2026`. Repeat with a range control if the authenticated project exposes one.

- [ ] **Step 5: Commit**

```bash
git add apps/web/core/components/dropdowns/date.tsx apps/web/core/components/dropdowns/date-range.tsx
git commit -m "fix: position date property popovers reliably"
```

### Task 3: Remove interaction cancellation from shared property surfaces

**Files:**

- Modify: `apps/web/core/components/issues/issue-layouts/properties/all-properties.tsx`
- Modify: `apps/web/core/components/issues/issue-layouts/calendar/issue-block.tsx`
- Modify: `apps/web/core/components/issues/issue-layouts/kanban/block.tsx`
- Modify: `apps/web/core/components/issues/issue-detail-widgets/sub-issues/issues-list/properties.tsx`
- Modify: `apps/web/core/components/issues/workspace-draft/draft-issue-properties.tsx`
- Modify: `apps/web/core/components/modules/module-card-item.tsx`
- Test: table, board/calendar, draft/sub-issue property flows

**Interfaces:**

- Consumes: Headless UI-owned trigger activation from Tasks 1–2.
- Produces: wrappers that prevent row/card navigation without cancelling dropdown activation.

- [ ] **Step 1: Enumerate wrapper handlers**

Search for wrappers that call `stopPropagation()` followed by `preventDefault()` around StateDropdown, PriorityDropdown, LabelDropdown, DateDropdown, or DateRangeDropdown.

- [ ] **Step 2: Verify a wrapped-property failure**

In a non-table surface, open one property dropdown before changing its wrapper and confirm its trigger is blocked or its options are not interactable.

- [ ] **Step 3: Remove only wrapper default cancellation**

For each enumerated shared property wrapper, retain `stopPropagation()` and remove only the following `preventDefault()`. Do not modify action-specific event handlers.

- [ ] **Step 4: Verify browser behavior**

Open and select state or priority on table and one non-table surface. Confirm the property updates and the row/card itself does not navigate.

- [ ] **Step 5: Commit**

```bash
git add apps/web/core/components/issues apps/web/core/components/modules/module-card-item.tsx
git commit -m "fix: preserve property dropdown activation in layouts"
```

### Task 4: Full regression verification and deployment handoff

**Files:**

- Modify: `docs/superpowers/plans/2026-09-13-dropdown-interaction-ownership.md`
- Test: authenticated Playwright flows and web quality gates

**Interfaces:**

- Consumes: Tasks 1–3.
- Produces: verified commit ready for the existing production deployment script.

- [ ] **Step 1: Run authenticated browser matrix**

Exercise table state, priority search plus keyboard selection, label search plus pointer selection, due-date calendar selection, and one non-table property trigger. Save viewport screenshots only as ignored local artifacts.

- [ ] **Step 2: Run static checks**

```bash
pnpm --filter web check:types
pnpm --filter web build
pnpm exec oxfmt --check apps/web/core/components/dropdowns/date.tsx apps/web/core/components/dropdowns/date-range.tsx apps/web/core/components/issues/issue-layouts/properties/label-dropdown.tsx
git diff --check
```

- [ ] **Step 3: Record completed tasks and commit**

Mark only verified plan tasks complete, then commit the plan update with the final implementation commit.

- [ ] **Step 4: Push and deploy handoff**

Push `preview`. Run `./deploy-production.sh` only after the user confirms production deployment is authorized, because it rebuilds and migrates the live Droplet.
