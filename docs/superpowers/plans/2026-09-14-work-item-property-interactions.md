# Work-item Property Interaction Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore usable State, Priority, and Assignee controls across Table, List, and Kanban without changing card navigation.

**Architecture:** Headless UI owns combobox state, Popper supplies fixed geometry, and Headless UI Portal mounts the panel outside transformed rows/cards. Property wrappers stop bubbling clicks to card links but do not cancel default trigger behavior.

**Tech Stack:** React, Headless UI 2.2, react-popper, Playwright CLI.

**Spec:** `docs/superpowers/specs/2026-09-14-work-item-property-interactions.md`

## Global Constraints

- No new dependencies or overlay abstraction.
- Retain existing dropdown public props and values.
- Verify normal Playwright pointer actions; do not use forced clicks as proof.
- Run typecheck, formatter/linter pre-commit hook, and fresh browser flows before commit.

---

### Task 1: Capture the failing interaction matrix

**Files:**

- Test: live browser through Playwright CLI

- [ ] **Step 1: Reproduce Table failures**

Run the State, Priority, and Assignee trigger clicks in Table and record panel bounds and the element at an option's pointer coordinate.

- [ ] **Step 2: Reproduce List and Kanban navigation failure**

Click a displayed property in each layout and verify the URL/detail panel changes, while a card-title click remains the navigation control.

### Task 2: Migrate State and Priority panels

**Files:**

- Modify: `apps/web/core/components/dropdowns/state/base.tsx`
- Modify: `apps/web/core/components/dropdowns/priority.tsx`

**Interfaces:**

- Consumes: `ComboDropDown` render child `({ open }: { open: boolean })`.
- Produces: portal-mounted `Combobox.Options` with the trigger as Popper reference.

- [ ] **Step 1: Make the Table pointer check fail against the old implementation**

Use the Task 1 browser sequence; an option click must report interception or fail to persist.

- [ ] **Step 2: Remove local panel ownership**

Replace local `isOpen` panel gates with the `ComboDropDown` `open` render slot. Keep only query state and selection callbacks.

- [ ] **Step 3: Mount the complete options panel through `Portal`**

Use `strategy: "fixed"`, `modal={false}`, a direct options ref, and Popper styles on `Combobox.Options`.

- [ ] **Step 4: Verify normal typing and pointer selection**

Open each panel, type a filter, click an option without force, and assert the displayed property changes.

### Task 3: Migrate Member options

**Files:**

- Modify: `apps/web/core/components/dropdowns/member/base.tsx`
- Modify: `apps/web/core/components/dropdowns/member/member-options.tsx`

**Interfaces:**

- Consumes: `ComboDropDown` open render slot and `MemberOptions` trigger ref.
- Produces: a portal-mounted, searchable member panel with normal pointer hit-testing.

- [ ] **Step 1: Make the Assignee open check fail against the old implementation**

Run the Task 1 Assignee trigger flow and confirm no usable searchable panel is available.

- [ ] **Step 2: Render MemberOptions only from Headless UI open state**

Remove MemberDropdownBase local toggle state and pass the reference button to MemberOptions through the render child.

- [ ] **Step 3: Register the panel with Headless UI Portal**

Place `Combobox.Options` in `Portal`, make Popper fixed, and set `modal={false}`.

- [ ] **Step 4: Verify member search and pointer selection**

Open Assignees, type into search, click an available member, and assert the field updates.

### Task 4: Stop property clicks at card boundaries

**Files:**

- Modify: `apps/web/core/components/issues/issue-layouts/properties/all-properties.tsx`
- Modify: `apps/web/core/components/issues/issue-layouts/list/block.tsx`
- Modify: `apps/web/core/components/issues/issue-layouts/kanban/block.tsx`

- [ ] **Step 1: Write the failing browser flows**

In List and Kanban, click State, Priority, and Assignee; the expected URL remains the layout URL while each popup opens.

- [ ] **Step 2: Add one click-only event boundary around properties**

Stop propagation at `IssueProperties` itself so all property controls are covered. Do not prevent default.

- [ ] **Step 3: Verify property and card behavior separately**

Confirm each property click leaves the layout route unchanged and card-title click still opens the work item.

### Task 5: Run the complete matrix and ship

**Files:**

- Modify: `docs/superpowers/specs/2026-09-14-work-item-property-interactions.md`
- Modify: `docs/superpowers/plans/2026-09-14-work-item-property-interactions.md`

- [ ] **Step 1: Run Table, List, and Kanban matrix**

Execute every row of the spec matrix with Playwright, recording failures before any final claim.

- [ ] **Step 2: Run static verification**

Run `pnpm --filter web check:types`, `git diff --check`, and the staged pre-commit hook.

- [ ] **Step 3: Commit and push**

Commit only the verified repair and push `preview`.
