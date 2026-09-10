# Work-item Modal Property Popovers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Create new work item property menus interactive and anchored to their triggers.

**Architecture:** Keep each menu inside its dropdown's dialog-owned React tree and raise its option surface above `ModalCore`'s layer 30. Retain each component's current Popper reference, placement, selection, and filtering logic.

**Tech Stack:** React, TypeScript, Headless UI, React Popper, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-10-work-item-modal-property-popovers-design.md`

## Global Constraints

- Work in the current checkout.
- Add no dependency or reusable abstraction.
- Do not alter menu options, selected values, keyboard handling, or date constraints.

---

### Task 1: Cover dialog-safe dropdown ownership

**Files:**

- Modify: `apps/web/tests/ui-refinements.test.mjs`
- Test: `apps/web/tests/ui-refinements.test.mjs`

**Interfaces:**

- Consumes: source files for state, priority, member, and date dropdowns.
- Produces: assertions that option surfaces are `z-40` and that member/date dropdowns do not portal to `document.body`.

- [x] **Step 1: Write the failing regression assertions**

```js
assert.match(stateDropdown, /Combobox\.Options as="ul" className="fixed z-40"/);
assert.match(priorityDropdown, /Combobox\.Options as="ul" className="fixed z-40"/);
assert.match(memberOptions, /"z-40 my-1 w-48/);
assert.match(dateDropdown, /"z-40 my-1 overflow-hidden/);
assert.doesNotMatch(memberOptions, /createPortal/);
assert.doesNotMatch(dateDropdown, /createPortal/);
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `node --test apps/web/tests/ui-refinements.test.mjs`

Expected: FAIL because state/priority are `z-10` and member/date use `createPortal` with `z-30`.

- [x] **Step 3: Implement the minimal component changes**

```tsx
<Combobox.Options as="ul" className="fixed z-40" static>
```

For member/date, remove the `createPortal(..., document.body)` wrapper and change their option-surface class from `z-30` to `z-40`.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `node --test apps/web/tests/ui-refinements.test.mjs`

Expected: PASS with zero failures.

### Task 2: Verify type safety and requirements

**Files:**

- Verify: `apps/web/core/components/dropdowns/state/base.tsx`
- Verify: `apps/web/core/components/dropdowns/priority.tsx`
- Verify: `apps/web/core/components/dropdowns/member/member-options.tsx`
- Verify: `apps/web/core/components/dropdowns/date.tsx`

- [x] **Step 1: Run the web TypeScript check**

Run: `pnpm --filter ./apps/web check:types`

Expected: exit code 0.

- [x] **Step 2: Review the diff against the specification**

Confirm all five option surfaces are dialog-owned at `z-40`, date/assignee menus no longer portal to the document body, and Popper configuration plus date constraints are unchanged.
