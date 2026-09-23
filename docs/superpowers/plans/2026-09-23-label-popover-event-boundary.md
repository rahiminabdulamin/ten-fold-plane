# Label Popover Event Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve label-popover interaction events long enough for search focus and label selection to complete in create and detail contexts.

**Architecture:** Retain both existing Headless UI Combobox implementations. Apply the repository's established protected-overlay event contract directly to each `Combobox.Options` root so shared outside-click handlers ignore the menus and enclosing overlays do not receive their mouse-down events.

**Tech Stack:** React, TypeScript, Headless UI, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-label-popover-event-boundary-design.md`

## Global Constraints

- Modify only the two affected options roots and the focused regression test.
- Reuse `data-prevent-outside-click` and mouse-down propagation control already used by `CustomSearchSelect`.
- Preserve current selection, creation, focus, positioning, and outside-close APIs.
- Add no dependencies or overlay abstraction.

## Review Focus

- Clicking a create-dialog option must select or deselect it without closing first.
- Clicking or typing in the detail-panel search must not dismiss the portaled menu.
- Clicking a detail-panel option must reach Headless UI's selection handler.
- Label creation controls must remain inside the protected event boundary.
- A click genuinely outside the options root must still close through existing handlers.

---

### Task 1: Protect Label Popover Interaction Events

**Files:**

- Modify: `apps/web/core/components/issues/label-popover-interactivity.test.ts`
- Modify: `apps/web/core/components/issues/select/base.tsx:193`
- Modify: `apps/web/core/components/issues/issue-layouts/properties/label-dropdown.tsx:212`

**Interfaces:**

- Consumes: `[data-prevent-outside-click]` handling in `@plane/hooks` and React mouse-down bubbling.
- Produces: protected label-menu surfaces whose internal pointer events reach Headless UI before enclosing overlay handlers.

- [ ] **Step 1: Extend the regression test**

```ts
expect(content).toContain("data-prevent-outside-click");
expect(content).toContain("onMouseDown={(event) => event.stopPropagation()}");
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm --filter=web exec vitest run core/components/issues/label-popover-interactivity.test.ts`
Expected: FAIL because neither affected options root implements the complete event-boundary contract.

- [ ] **Step 3: Apply the event boundary to both options roots**

```tsx
<Combobox.Options
  data-prevent-outside-click
  onMouseDown={(event) => event.stopPropagation()}
  // existing props remain unchanged
>
```

- [ ] **Step 4: Run the focused regression test**

Run: `pnpm --filter=web exec vitest run core/components/issues/label-popover-interactivity.test.ts`
Expected: PASS with 1 test file and 1 test.

- [ ] **Step 5: Run focused static checks**

Run: `pnpm exec oxlint --deny-warnings apps/web/core/components/issues/select/base.tsx apps/web/core/components/issues/issue-layouts/properties/label-dropdown.tsx apps/web/core/components/issues/label-popover-interactivity.test.ts`
Expected: 0 warnings and 0 errors.

Run: `pnpm exec oxfmt --check apps/web/core/components/issues/select/base.tsx apps/web/core/components/issues/issue-layouts/properties/label-dropdown.tsx apps/web/core/components/issues/label-popover-interactivity.test.ts docs/superpowers/specs/2026-09-23-label-popover-event-boundary-design.md docs/superpowers/plans/2026-09-23-label-popover-event-boundary.md`
Expected: all files use the correct format.

- [ ] **Step 6: Run web type checking**

Run: `pnpm --filter=web check:types`
Expected: PASS, or report unrelated failures with exact paths.

- [ ] **Step 7: Commit**

```bash
git add apps/web/core/components/issues/select/base.tsx apps/web/core/components/issues/issue-layouts/properties/label-dropdown.tsx apps/web/core/components/issues/label-popover-interactivity.test.ts docs/superpowers/specs/2026-09-23-label-popover-event-boundary-design.md docs/superpowers/plans/2026-09-23-label-popover-event-boundary.md
git commit -m "fix: preserve label popover interactions"
```
